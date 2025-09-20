import os
import re
import json
import tempfile
import uuid
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from supabase import create_client, Client

from processor import DocumentProcessor, sanitize_for_json

load_dotenv()

# === FastAPI Init ===
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Supabase Init ===
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Supabase credentials missing in .env")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# === Processor Init (OCI LLM + Docling) ===
processor = DocumentProcessor(config_file="config.ini", profile="DEFAULT")


@app.post("/process-document/")
async def process_document(file: UploadFile = File(...), schema_json: str = Form(...)):
    """
    Upload pipeline:
    1. Accept file + schema JSON
    2. Extract markdown + metadata
    3. Structure markdown with LLM
    4. Store layout embeddings in Supabase
    5. Suggest prompt from Supabase (if exists)
    """
    try:
        schema = json.loads(schema_json)
        doc_id = str(uuid.uuid4()) # Generate a unique ID for the document

        # Save file temporarily
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # Run pipeline in processor
        result = processor.process_document(tmp_path)

        safe_metadata = sanitize_for_json(result["metadata"])
        safe_markdown = sanitize_for_json(result["structured_markdown"])

        # Detect file type from filename
        file_ext_match = re.search(r"\.([^.]+)$", file.filename)
        file_ext = file_ext_match.group(1) if file_ext_match else ""
        client_name = safe_metadata.get("customer_info")
        layout_columns = list(schema.keys())

        # Create text to be embedded
        embedding_text = f"ID: {doc_id}, Client: {client_name}, Columns: {', '.join(layout_columns)}"
        
        # Generate embedding
        embedding = processor.embedder.encode(embedding_text).tolist()

        # Store layout + embeddings in Supabase
        supabase.table("documents").insert({
            "id": doc_id,
            "client_name": client_name,
            "document_type": file_ext,
            "language": safe_metadata.get("language"),
            "layout": safe_metadata.get("layout"),
            "semantics": embedding,
             # Store the generated embedding
        }).execute()

        # Fetch suggested prompt for this layout
        prompt_resp = supabase.table("prompts").select("prompt").eq("layout", safe_metadata.get("layout")).limit(1).execute()
        suggested_prompt = prompt_resp.data[0]["prompt"] if prompt_resp.data else None

        # Generate structured JSON (based on schema textarea input)
        schema_prompt = f"""
        Extract structured JSON according to this schema:
        {json.dumps(schema, indent=2)}

        Document Markdown:
        {result["structured_markdown"]}
        """
        structured_json = processor.extract_json_with_schema(result["structured_markdown"], schema)

        return {
            "status": "success",
            "filename": file.filename,
            "metadata": safe_metadata,
            "structured_markdown": safe_markdown,
            "generated_json": structured_json,
            "suggested_prompt": suggested_prompt,
        }

    except json.JSONDecodeError:
        return {"status": "error", "message": "Invalid schema JSON format"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/try-prompt/")
async def try_prompt(data: dict):
    """
    Try a user-supplied prompt without saving it.
    """
    prompt = data.get("prompt")
    structured_markdown = data.get("structured_markdown")
    if not prompt or not structured_markdown:
        return {"status": "error", "message": "Missing prompt or markdown"}

    try:
        final_prompt = f"""
        Apply this prompt to the document:

        Prompt:
        {prompt}

        Document:
        {structured_markdown}
        """
        response = processor._call_oci_llm(final_prompt)
        return {"status": "success", "result": response}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/save-prompt/")
async def save_prompt(data: dict):
    """
    Save a new prompt tied to a layout into Supabase.
    """
    layout = data.get("layout")
    prompt = data.get("prompt")

    if not layout or not prompt:
        return {"status": "error", "message": "Missing layout or prompt"}

    try:
        supabase.table("prompts").insert({
            "layout": layout,
            "prompt": prompt,
        }).execute()
        return {"status": "success", "message": "Prompt saved"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
