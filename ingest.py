"""
ingest.py — One-time script to load a PDF, chunk it, embed with Gemini,
            and upload vectors to Pinecone.

Usage:
    python ingest.py --file ./story.pdf
    python ingest.py --file ./story.pdf --chunk-size 800 --chunk-overlap 150

Re-ingesting the same file WILL create duplicate vectors.
To reset: delete vectors in Pinecone Console, or run with a new index name.
"""

import argparse
import sys
from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# config.py initialises embeddings + vectorstore (and creates the index if needed)
from config import vectorstore, add_documents_safely


def ingest(pdf_path: str, chunk_size: int = 3000, chunk_overlap: int = 300) -> None:
    path = Path(pdf_path)
    if not path.exists():
        print(f"[ingest] ERROR: File not found — '{pdf_path}'")
        sys.exit(1)

    # ── 1. Load PDF ─────────────────────────────────────────────────────────
    print(f"[ingest] Loading '{path.name}' …")
    loader = PyPDFLoader(str(path))
    pages  = loader.load()
    print(f"[ingest] {len(pages)} page(s) loaded.")

    # ── 2. Split into chunks ────────────────────────────────────────────────
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""],
    )
    chunks = splitter.split_documents(pages)
    print(f"[ingest] {len(chunks)} chunk(s) created "
          f"(size={chunk_size}, overlap={chunk_overlap}).")

    # ── 3. Embed & upsert to Pinecone ───────────────────────────────────────
    print("[ingest] Embedding and uploading to Pinecone … (this may take a moment)")
    add_documents_safely(vectorstore, chunks, batch_size=100, delay_seconds=0.0)
    print(f"[ingest] Done. {len(chunks)} vectors stored in Pinecone.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest a PDF into Pinecone via local embeddings.")
    parser.add_argument("--file",          required=True, help="Path to the PDF file.")
    parser.add_argument("--chunk-size",    type=int, default=3000, help="Characters per chunk (default: 3000).")
    parser.add_argument("--chunk-overlap", type=int, default=300,  help="Overlap between chunks (default: 300).")
    args = parser.parse_args()

    ingest(args.file, args.chunk_size, args.chunk_overlap)
