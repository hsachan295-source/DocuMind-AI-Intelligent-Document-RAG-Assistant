"""
config.py — Shared setup for embeddings, Pinecone index, and vector store.

Embeddings model: models/gemini-embedding-001 (3072 dimensions)
Pinecone index is auto-created or validated on startup (3072-dim, cosine metric).
"""

import os
import time
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore

# ── 1. Load environment variables ──────────────────────────────────────────
load_dotenv()

GOOGLE_API_KEY     = os.environ.get("GOOGLE_API_KEY", "").strip()
PINECONE_API_KEY   = os.environ["PINECONE_API_KEY"].strip()
INDEX_NAME         = os.getenv("PINECONE_INDEX_NAME", "ragtext").strip()

EMBEDDING_MODEL    = "all-MiniLM-L6-v2"
EMBEDDING_DIM      = 384

# ── 2. Local HuggingFace embeddings (Fast & 0 Rate Limits) ───────────────────
embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

# ── 3. Pinecone client & index management ───────────────────────────────────
pc = Pinecone(api_key=PINECONE_API_KEY)

existing_indexes = [idx.name for idx in pc.list_indexes()]

if INDEX_NAME in existing_indexes:
    desc = pc.describe_index(INDEX_NAME)
    if desc.dimension != EMBEDDING_DIM:
        print(f"[config] Dimension mismatch (existing={desc.dimension}, required={EMBEDDING_DIM}). Recreating index '{INDEX_NAME}'...")
        pc.delete_index(INDEX_NAME)
        time.sleep(2)
        existing_indexes.remove(INDEX_NAME)

if INDEX_NAME not in existing_indexes:
    print(f"[config] Creating Pinecone index '{INDEX_NAME}' ({EMBEDDING_DIM}-dim, cosine) ...")
    pc.create_index(
        name=INDEX_NAME,
        dimension=EMBEDDING_DIM,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )
    while not pc.describe_index(INDEX_NAME).status["ready"]:
        time.sleep(1)
    print(f"[config] Index '{INDEX_NAME}' is ready.")
else:
    print(f"[config] Using existing Pinecone index '{INDEX_NAME}'.")

index = pc.Index(INDEX_NAME)

# ── 4. LangChain vector store wrapper ──────────────────────────────────────
vectorstore = PineconeVectorStore(index=index, embedding=embeddings)


def add_documents_safely(vstore, chunks, batch_size: int = 100, delay_seconds: float = 0.0) -> None:
    """
    Upserts documents into Pinecone vectorstore in batches.
    Uses local HuggingFace embeddings for instant 2-3 second ingestion with zero rate limits.
    """
    total = len(chunks)
    for i in range(0, total, batch_size):
        batch = chunks[i : i + batch_size]
        max_retries = 3
        for attempt in range(max_retries):
            try:
                vstore.add_documents(batch)
                break
            except Exception as e:
                err_str = str(e)
                if ("429" in err_str or "RESOURCE_EXHAUSTED" in err_str) and attempt < max_retries - 1:
                    time.sleep(3)
                else:
                    raise e
        if delay_seconds > 0 and i + batch_size < total:
            time.sleep(delay_seconds)

