import os
import re
import json
import math
from pathlib import Path
from typing import Dict, Any, Tuple
import oci
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

def get_file_type(filename: str) -> str:
    """Extract file type (extension) using regex, e.g., pdf, xlsx, docx."""
    match = re.search(r'\.([^.]+)$', filename)
    return match.group(1).lower() if match else "unknown"
class DocumentProcessor:
    def __init__(self, config_file: str = "config.ini", profile: str = "DEFAULT"):
        """
        Initialize OCI Generative AI Client + Docling.
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
            timeout=(10, 240)
        )

        # Docling converter
        self.converter = DocumentConverter()

    def extract_with_docling(self, file_path: str) -> Tuple[str, Dict[str, Any]]:
        """
        Convert file → Markdown and return raw markdown + basic metadata.
        """
        try:
            conv_result = self.converter.convert(file_path)
            markdown = conv_result.document.export_to_markdown()
            metadata = {
                "language": getattr(conv_result, "language", "Unknown"),
            }
            return markdown, metadata
        except Exception as e:
            raise RuntimeError(f"Docling extraction failed: {e}")

    def _call_oci_llm(self, prompt: str) -> str:
        """Call OCI Generative AI with a text prompt and return response text."""
        content = oci.generative_ai_inference.models.TextContent()
        content.text = prompt
        message = oci.generative_ai_inference.models.Message()
        message.role = "USER"
        message.content = [content]

        chat_request = oci.generative_ai_inference.models.GenericChatRequest()
        chat_request.api_format = oci.generative_ai_inference.models.BaseChatRequest.API_FORMAT_GENERIC
        chat_request.messages = [message]
        chat_request.max_tokens = 2000
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

        if hasattr(response.data, "chat_response") and response.data.chat_response.choices:
            choice = response.data.chat_response.choices[0]
            if choice.message.content:
                for item in choice.message.content:
                    if hasattr(item, "text") and item.text.strip():
                        return item.text.strip()
        raise RuntimeError("No valid response from OCI LLM")

    def process_document(self, file_path: str) -> Dict[str, Any]:
        """
        1. Docling → Markdown
        2. Regex → File type
        3. LLM → Extract language, client_name, layout
        4. Return markdown + metadata
        """
        markdown, doc_metadata = self.extract_with_docling(file_path)
        filename = os.path.basename(file_path)

        # Extract file type using regex
        file_type = get_file_type(filename)

        # LLM prompt to extract metadata
        meta_prompt = f"""
        You are a metadata extractor.
        From the following document filename and content, return ONLY a JSON object:

        {{
          "language": "<document language>",
          "client_name": "<company name or client name>",
          "layout": ["<column1>", "<column2>", "<column3>", ...]  # column headers if any
        }}

        Filename: {filename}
        Content: {markdown}
        """
        raw_meta = self._call_oci_llm(meta_prompt)

        try:
            meta_json = json.loads(raw_meta)
        except:
            meta_json = {
                "language": doc_metadata.get("language", "NaN"),
                "layout": [],
                "client_name": re.sub(r"\..*$", "", filename),
            }

        normalized_meta = {
            "file_type": file_type,  # from regex
            "language": meta_json.get("language", doc_metadata.get("language", "NaN")),
            "layout": meta_json.get("layout", []),
            "client_name": meta_json.get("client_name", re.sub(r"\..*$", "", filename)),
        }

        return {
            "structured_markdown": markdown,
            "metadata": normalized_meta,
        }

    def extract_json_with_schema(
        self,
        structured_markdown: str,
        schema: Dict[str, Any],
        suggested_prompt: str = None
    ) -> Dict[str, Any]:
        """
        Apply schema to structured markdown and return JSON.
        If suggested_prompt is available, apply it along with the base schema extraction.
        """
        # Create a sample JSON with empty values based on schema
        sample_json = {}
        for key in schema:
            sample_json[key] = ""
            
        if suggested_prompt:
            schema_prompt = f"""
    You are a document data extraction expert.
    
    Use the following instruction to improve extraction: "{suggested_prompt}"

    Extract structured data from the document into JSON that EXACTLY follows this schema:
    {json.dumps(schema, indent=2)}
    
    Expected output format:
    {json.dumps(sample_json, indent=2)}

    Pay special attention to the Language field. It should be the primary language 
    used in the document content. Use ISO language codes (e.g., 'en' for English, 
    'es' for Spanish, etc.) if possible.

    Special Instructions for OrderDetailNotes field:
    1. Extract Order Information such as:
       - Order Information
       - Order type
       - Special handling instructions
       - Priority level
       - Order status
       - Customer requirements
       - Urgent
    2. Format as key-value pairs
    3. If no order information found, return empty string ("")

    Special Instructions for DeliveryDate field:
    1. First, look for explicit delivery date in the document
    2. If delivery date not found, use Cargo Ready Date
    3. If cargo ready date not found, use preparation date
    4. If no date is found, return null
    5. Maintain date format as found in document

    Special Instructions for OrderDetailNotes field:
    1. DO NOT summarize the document
    2. ONLY extract urgent/important notes like "urgent delivery", "handle with care", etc.
    3. If no urgent/important notes found, return empty string ("")

    Special Instructions for UnitOfMeasure field:
    1. Look for standard units of measurement (e.g., "pcs", "kg", "lbs", "m", "ft", "each", "box", "set", "ea")
    2. Convert common variations to standard format:
        - pieces/piece → "pcs"
        - kilograms/kilo → "kg"
        - pounds → "lbs"
        - meters → "m"
        - feet → "ft"
        - boxes → "box"
        - sets → "set"
    3. If no unit found, return empty string ("")
    4. Maintain case sensitivity as shown in examples

    Document:
    {structured_markdown}
    
    Return ONLY the JSON object with no additional text, explanations, or markdown formatting.
    """
        else:
            schema_prompt = f"""
    You are a document data extraction expert.
    
    Extract structured data from the following document into JSON.
    The JSON must EXACTLY follow this schema with these exact field names:
    {json.dumps(schema, indent=2)}
    
    Expected output format:
    {json.dumps(sample_json, indent=2)}

    Pay special attention to the Language field. It should be the primary language 
    used in the document content. Use ISO language codes (e.g., 'en' for English, 
    'es' for Spanish, etc.) if possible.

    Special Instructions for OrderDetailNotes field:
    1. Extract Order Information such as:
       - Order Information
       - Order type
       - Special handling instructions
       - Priority level
       - Order status
       - Customer requirements
       - Urgent
    2. Format as key-value pairs
    3. If no order information found, return empty string ("")

    Special Instructions for DeliveryDate field:
    1. First, look for explicit delivery date in the document
    2. If delivery date not found, use Cargo Ready Date
    3. If cargo ready date not found, use preparation date
    4. If no date is found, return null
    5. Maintain date format as found in document

    Special Instructions for OrderDetailNotes field:
    1. DO NOT provide a summary of the document
    2. ONLY extract urgent or important notes (e.g., "urgent delivery", "priority shipment", "handle with care")
    3. If no urgent/important notes are found, return empty string ("")
    4. Focus on actionable or critical information only

    Special Instructions for UnitOfMeasure field:
    1. Look for standard units of measurement (e.g., "pcs", "kg", "lbs", "m", "ft", "each", "box", "set")
    2. Convert common variations to standard format:
        - pieces/piece → "pcs"
        - kilograms/kilo → "kg"
        - pounds → "lbs"
        - meters → "m"
        - feet → "ft"
        - boxes → "box"
        - sets → "set"
    3. If no unit found, return empty string ("")
    4. Maintain case sensitivity as shown in examples

    Document:
    {structured_markdown}
    
    Return ONLY the JSON object with no additional text, explanations, or markdown formatting.
    If you cannot find a value for a field, leave it as an empty string.
    """

        raw_json = self._call_oci_llm(schema_prompt)

        try:
            # Clean the response to ensure it's valid JSON
            cleaned_json = raw_json.strip()
            # Remove any markdown code block indicators
            cleaned_json = re.sub(r'^```json\s*', '', cleaned_json)
            cleaned_json = re.sub(r'\s*```$', '', cleaned_json)
            
            parsed_json = json.loads(cleaned_json)
            
            # Ensure all schema keys are present
            for key in schema:
                if key not in parsed_json:
                    parsed_json[key] = ""
                    
            return parsed_json
        except Exception as e:
            return {"error": f"Failed to parse JSON: {str(e)}", "raw": raw_json}

    def find_suggested_prompt(self, current_client: str, current_layout: str, cursor) -> str:
        """
        Find suggested prompt by:
        1. First checking for exact client name match
        2. Then using LLM to compare layouts for similarity
        """
        # Step 1: Check for exact client name match first
        cursor.execute(
            "SELECT user_prompt FROM documents WHERE client_name = ? AND user_prompt IS NOT NULL LIMIT 1",
            (current_client,)
        )
        row = cursor.fetchone()
        if row:
            return row[0]
        
        # Step 2: Get all documents with saved prompts for layout comparison
        cursor.execute(
            "SELECT client_name, layout, user_prompt FROM documents WHERE user_prompt IS NOT NULL"
        )
        candidates = cursor.fetchall()
        
        if not candidates:
            return None
            
        # Step 3: Use LLM to find the most similar layout
        current_layout_parsed = json.loads(current_layout) if isinstance(current_layout, str) else current_layout
        
        best_prompt = None
        best_similarity_score = 0
        
        for candidate_client, candidate_layout, candidate_prompt in candidates:
            try:
                candidate_layout_parsed = json.loads(candidate_layout) if isinstance(candidate_layout, str) else candidate_layout
                
                # Use LLM to compare layouts
                comparison_prompt = f"""
                Compare these two document layouts and return a similarity score from 0 to 100.
                Consider column names, data types, and overall structure.
                Return ONLY a number between 0-100, no explanations.
                
                Layout 1: {json.dumps(current_layout_parsed)}
                Layout 2: {json.dumps(candidate_layout_parsed)}
                
                Similarity score (0-100):
                """
                
                score_text = self._call_oci_llm(comparison_prompt)
                
                # Extract numeric score
                import re
                score_match = re.search(r'\b(\d+(?:\.\d+)?)\b', score_text)
                if score_match:
                    similarity_score = float(score_match.group(1))
                    if similarity_score > best_similarity_score and similarity_score >= 70:  # Threshold for similarity
                        best_similarity_score = similarity_score
                        best_prompt = candidate_prompt
                        
            except Exception as e:
                # Skip this candidate if there's an error
                continue
        return best_prompt