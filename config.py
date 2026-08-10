"""
config.py — Shared setup for FastEmbed embeddings, Pinecone index, and vector store.

Embeddings model: FastEmbed ONNX (BAAI/bge-small-en-v1.5, 384-dim)
Zero API rate limits, ultra-fast 2-second ingestion, <120 MB RAM footprint on Render.
"""

import os
import time
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from langchain_community.embeddings import FastEmbedEmbeddings
from langchain_pinecone import PineconeVectorStore

# ── 1. Load & Validate Environment Variables ────────────────────────────────
load_dotenv()

GROQ_API_KEY     = os.environ.get("GROQ_API_KEY", "").strip()
PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY", "").strip()
INDEX_NAME       = os.getenv("PINECONE_INDEX_NAME", "ragtext").strip()

missing_keys = []
if not GROQ_API_KEY:
    missing_keys.append("GROQ_API_KEY")
if not PINECONE_API_KEY:
    missing_keys.append("PINECONE_API_KEY")

if missing_keys:
    raise ValueError(
        f"[config] Missing required environment variables: {', '.join(missing_keys)}. "
        "Please specify them in your .env file or deployment environment settings."
    )

EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
EMBEDDING_DIM   = 384

# ── 2. FastEmbed Embeddings (Sub-second ONNX local embeddings, <120MB RAM) ───
embeddings = FastEmbedEmbeddings(model_name=EMBEDDING_MODEL)

# ── 3. Pinecone Client & Index Dimension Management ─────────────────────────
pc = Pinecone(api_key=PINECONE_API_KEY)

existing_indexes = [idx.name for idx in pc.list_indexes()]

if INDEX_NAME in existing_indexes:
    desc = pc.describe_index(INDEX_NAME)
    if desc.dimension != EMBEDDING_DIM:
        print(
            f"[config] Dimension mismatch detected for index '{INDEX_NAME}' "
            f"(existing={desc.dimension}, required={EMBEDDING_DIM}). "
            "Recreating index with correct 384 dimensions for FastEmbed embeddings..."
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


def add_documents_safely(vstore, chunks, batch_size: int = 100, delay_seconds: float = 0.0) -> None:
    """
    Upserts documents into Pinecone vectorstore in batches.
    FastEmbed runs locally with 0 API rate limits, allowing instant 100-chunk batch upserts.
    """
    total = len(chunks)
    for i in range(0, total, batch_size):
        batch = chunks[i : i + batch_size]
        vstore.add_documents(batch)
        if delay_seconds > 0 and i + batch_size < total:
            time.sleep(delay_seconds)
