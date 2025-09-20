import os
import re
import json
import math
from pathlib import Path
from typing import Dict, Any, Tuple, List

import oci
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from docling.document_converter import DocumentConverter


def sanitize_for_json(data):
    """Ensure all values are JSON serializable."""
    if isinstance(data, float):
        if math.isnan(data) or math.isinf(data):
            return "NaN"
        return data
    elif isinstance(data, dict):
        return {str(k): sanitize_for_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_for_json(v) for v in data]
    else:
        try:
            json.dumps(data)
            return data
        except Exception:
            return str(data)


class DocumentProcessor:
    def __init__(self, config_file: str = "config.ini", profile: str = "DEFAULT"):
        """
        Initialize OCI Generative AI Client + Docling + Embeddings.
        """
        if not Path(config_file).exists():
            raise FileNotFoundError("❌ config.ini not found. Please set up OCI credentials.")

        # Load OCI config
        self.config = oci.config.from_file(config_file, profile)
        self.compartment_id = self.config.get("compartment_id", None)
        if not self.compartment_id:
            raise ValueError("compartment_id missing in config.ini")

        # Service endpoint
        self.endpoint = "https://inference.generativeai.us-chicago-1.oci.oraclecloud.com"

        # OCI client
        self.client = oci.generative_ai_inference.GenerativeAiInferenceClient(
            config=self.config,
            service_endpoint=self.endpoint,
            retry_strategy=oci.retry.NoneRetryStrategy(),
            timeout=(10, 240),
        )

        # Docling converter
        self.converter = DocumentConverter()

        # Embedding model (MiniLM = 384 dims)
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")

        # FAISS index (L2 distance)
        self.index = faiss.IndexFlatL2(384)
        self.index_metadata: List[Dict[str, Any]] = []

    # -------------------------------
    # DOC CONVERSION
    # -------------------------------
    def extract_with_docling(self, file_path: str) -> Tuple[str, Dict[str, Any]]:
        """
        Convert file → Markdown and extract metadata.
        """
        try:
            conv_result = self.converter.convert(file_path)
            markdown = conv_result.document.export_to_markdown()
            metadata = {
                "file_type": os.path.splitext(file_path)[-1].lstrip("."),
                "layout": getattr(conv_result, "layout_type", "Unknown"),
                "language": getattr(conv_result, "language", "Unknown"),
            }
            return markdown, metadata
        except Exception as e:
            raise RuntimeError(f"Docling extraction failed: {e}")

    # -------------------------------
    # OCI LLM CALL
    # -------------------------------
    def _call_oci_llm(self, prompt: str) -> str:
        """Helper to call OCI Generative AI with a text prompt."""
        content = oci.generative_ai_inference.models.TextContent()
        content.text = prompt
        message = oci.generative_ai_inference.models.Message()
        message.role = "USER"
        message.content = [content]

        chat_request = oci.generative_ai_inference.models.GenericChatRequest()
        chat_request.api_format = oci.generative_ai_inference.models.BaseChatRequest.API_FORMAT_GENERIC
        chat_request.messages = [message]
        chat_request.max_tokens = 4000
        chat_request.temperature = 0
        chat_request.top_p = 1
        chat_request.top_k = 0

        chat_detail = oci.generative_ai_inference.models.ChatDetails()
        chat_detail.serving_mode = oci.generative_ai_inference.models.OnDemandServingMode(
            model_id="ocid1.generativeaimodel.oc1.us-chicago-1.amaaaaaask7dceya3bsfz4ogiuv3yc7gcnlry7gi3zzx6tnikg6jltqszm2q"
        )
        chat_detail.chat_request = chat_request
        chat_detail.compartment_id = self.compartment_id

        response = self.client.chat(chat_detail)

        # Extract first text response
        if hasattr(response.data, "chat_response") and response.data.chat_response.choices:
            choice = response.data.chat_response.choices[0]
            if choice.message.content:
                for item in choice.message.content:
                    if hasattr(item, "text") and item.text.strip():
                        return item.text.strip()
        raise RuntimeError("No valid response from OCI LLM")

    # -------------------------------
    # STRUCTURED JSON EXTRACTION
    # -------------------------------
    def extract_json_with_schema(self, markdown: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        Use OCI LLM to extract structured JSON according to a schema.
        """
        schema_str = json.dumps(schema, indent=2)
        prompt = f"""
        You are a JSON extraction assistant.
        Extract structured data from the following Markdown content.
        Match this JSON schema exactly. 
        If any field cannot be found, return "NaN".

        --- Document (Markdown) ---
        {markdown}

        --- Schema ---
        {schema_str}

        Return ONLY valid JSON that follows the schema.
        """
        raw = self._call_oci_llm(prompt)

        try:
            extracted = json.loads(raw)
        except Exception:
            # fallback → map schema keys with NaN
            extracted = {key: "NaN" for key in schema.keys()}

        # ensure all schema keys present
        validated = {key: extracted.get(key, "NaN") for key in schema.keys()}
        return validated

    # -------------------------------
    # PIPELINE
    # -------------------------------
    def process_document(self, file_path: str) -> Dict[str, Any]:
        """
        Full pipeline:
        1. Convert file → Markdown
        2. Use LLM to structure Markdown
        3. Extract metadata (file_type, language, customer_info, layout, semantics)
        4. Store embeddings in FAISS with client name tag
        """
        # Step 1: Extract markdown with Docling
        markdown, doc_metadata = self.extract_with_docling(file_path)

        # Step 2: LLM - Structure markdown
        struct_prompt = f"""
    Clean and structure the following Markdown content into a readable, consistent format.
    
    ✅ Rules for tables:
    - Every table must have a valid header row.
    - Immediately below the header, add a separator row with the same number of columns (use ---).
    - Each row must have the exact same number of cells as the header.
    - Do NOT add extra or trailing pipes at the beginning or end of lines.
    - Preserve headings and bullet points outside of tables.

    --- Markdown ---
    {markdown}
    """

        structured_markdown = self._call_oci_llm(struct_prompt)

        # Step 3: Metadata extraction
        filename = os.path.basename(file_path)
        customer_name = re.sub(r"\..*$", "", filename)  # filename without extension

        meta_prompt = f"""
        You are an assistant extracting document metadata.
        Given this filename "{filename}" and markdown content, return a JSON with:
        - language (string)
        - customer_info (string, inferred from filename or content)
        - semantics (string: short description of document purpose/meaning)
        - layout (string: one of [table-heavy, form-like, narrative, mixed])

        Markdown content:
        {markdown}
        """
        raw_meta = self._call_oci_llm(meta_prompt)

        try:
            meta_json = json.loads(raw_meta)
        except Exception:
            # fallback metadata
            meta_json = {
                "file_type": doc_metadata.get("file_type", "NaN"),
                "language": doc_metadata.get("language", "NaN"),
                "layout": doc_metadata.get("layout", "NaN"),
                "semantics": "NaN",
                "customer_info": customer_name,
            }

        # Normalize metadata
        normalized_meta = {
            "language": meta_json.get("language", doc_metadata.get("language", "NaN")),
            "layout": meta_json.get("layout", doc_metadata.get("layout", "NaN")),
            "semantics": meta_json.get("semantics", "NaN"),
            "customer_info": meta_json.get("customer_info", customer_name),
        }

        # Step 4: FAISS (if needed for local search)
        embedding = self.embedder.encode(structured_markdown)
        embedding = np.array([embedding], dtype="float32")
        self.index.add(embedding)
        self.index_metadata.append({
            "client_name": normalized_meta["customer_info"],
            "layout": normalized_meta["layout"],
            "file_path": filename,
        })

        # Step 5: Return results
        return {
            "structured_markdown": structured_markdown,
            "metadata": normalized_meta,
            "faiss_index_size": self.index.ntotal,
        }

    # -------------------------------
    # SEARCH
    # -------------------------------
    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Search FAISS index for most relevant documents.
        """
        if self.index.ntotal == 0:
            return []

        query_vec = self.embedder.encode(query)
        query_vec = np.array([query_vec], dtype="float32")

        distances, indices = self.index.search(query_vec, top_k)
        results = []
        for i, idx in enumerate(indices[0]):
            if idx == -1:
                continue
            metadata = self.index_metadata[idx]
            results.append({
                "rank": i + 1,
                "distance": float(distances[0][i]),
                "metadata": metadata,
            })
        return results
