"""
config.py — Shared setup for embeddings, Pinecone index, and vector store.

Embeddings model: Google Gemini Embedding API (models/gemini-embedding-001, 768-dim)
Pinecone index is auto-created or validated on startup (768-dim, cosine metric).
"""

import os
import time
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import PineconeVectorStore

# ── 1. Load & Validate Environment Variables ────────────────────────────────
load_dotenv()

GOOGLE_API_KEY   = os.environ.get("GOOGLE_API_KEY", "").strip()
GROQ_API_KEY     = os.environ.get("GROQ_API_KEY", "").strip()
PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY", "").strip()
INDEX_NAME       = os.getenv("PINECONE_INDEX_NAME", "ragtext").strip()

missing_keys = []
if not GOOGLE_API_KEY:
    missing_keys.append("GOOGLE_API_KEY")
if not GROQ_API_KEY:
    missing_keys.append("GROQ_API_KEY")
if not PINECONE_API_KEY:
    missing_keys.append("PINECONE_API_KEY")

if missing_keys:
    raise ValueError(
        f"[config] Missing required environment variables: {', '.join(missing_keys)}. "
        "Please specify them in your .env file or deployment environment settings."
    )

EMBEDDING_MODEL = "models/gemini-embedding-001"
EMBEDDING_DIM   = 768

# ── 2. Google Gemini API Embeddings (Zero PyTorch/CUDA overhead) ──────────────
embeddings = GoogleGenerativeAIEmbeddings(
    model=EMBEDDING_MODEL,
    google_api_key=GOOGLE_API_KEY,
    output_dimensionality=EMBEDDING_DIM,
)

# ── 3. Pinecone Client & Index Dimension Management ─────────────────────────
pc = Pinecone(api_key=PINECONE_API_KEY)

existing_indexes = [idx.name for idx in pc.list_indexes()]

if INDEX_NAME in existing_indexes:
    desc = pc.describe_index(INDEX_NAME)
    if desc.dimension != EMBEDDING_DIM:
        print(
            f"[config] Dimension mismatch detected for index '{INDEX_NAME}' "
            f"(existing={desc.dimension}, required={EMBEDDING_DIM}). "
            "Recreating index with correct 768 dimensions for Google Gemini embeddings..."
        )
        pc.delete_index(INDEX_NAME)
        time.sleep(3)
        existing_indexes.remove(INDEX_NAME)

if INDEX_NAME not in existing_indexes:
    print(f"[config] Creating Pinecone index '{INDEX_NAME}' ({EMBEDDING_DIM}-dim, cosine metric)...")
    pc.create_index(
        name=INDEX_NAME,
        dimension=EMBEDDING_DIM,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )
    while not pc.describe_index(INDEX_NAME).status["ready"]:
        time.sleep(1)
    print(f"[config] Pinecone index '{INDEX_NAME}' is ready.")
else:
    print(f"[config] Using existing Pinecone index '{INDEX_NAME}' ({EMBEDDING_DIM}-dim).")

index = pc.Index(INDEX_NAME)

# ── 4. LangChain Vector Store Wrapper ──────────────────────────────────────
vectorstore = PineconeVectorStore(index=index, embedding=embeddings)


def add_documents_safely(vstore, chunks, batch_size: int = 15, delay_seconds: float = 0.5) -> None:
    """
    Upserts documents into Pinecone vectorstore in small batches with retry & backoff handling.
    Batch size 15 with subtle delay ensures fast ingestion without API rate limit errors (429 RESOURCE_EXHAUSTED).
    """
    total = len(chunks)
    for i in range(0, total, batch_size):
        batch = chunks[i : i + batch_size]
        max_retries = 5
        for attempt in range(max_retries):
            try:
                vstore.add_documents(batch)
                break
            except Exception as e:
                err_str = str(e)
                if ("429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower()) and attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 3
                    print(f"[config] Gemini rate limit encountered (attempt {attempt+1}/{max_retries}). Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    raise e
        if delay_seconds > 0 and i + batch_size < total:
            time.sleep(delay_seconds)
