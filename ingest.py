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


def ingest(pdf_path: str, chunk_size: int = 2700, chunk_overlap: int = 360) -> None:
    path = Path(pdf_path)
    if not path.exists():
        print(f"[ingest] ERROR: File not found — '{pdf_path}'")
        sys.exit(1)

    # ── 1. Load Document ───────────────────────────────────────────────────
    print(f"[ingest] Loading '{path.name}' …")
    loader = PyPDFLoader(str(path))
    pages  = loader.load()
    print(f"[ingest] {len(pages)} page(s) loaded.")

    # ── 2. Structure-Aware Split into Chunks ───────────────────────────────
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=[
            "\n# ",           # Markdown H1 / Major Section Title
            "\n## ",          # Markdown H2 / Subsection Title
            "\n### ",         # Markdown H3 / Sub-subsection Title
            "\n\n\n",         # Multi-paragraph logical break
            "\n\n",           # Paragraph boundary
            "\n",             # Line break
            " ",              # Space
            ""
        ],
    )
    chunks = splitter.split_documents(pages)

    # Enrich metadata with chunk_index & section heading
    for idx, chunk in enumerate(chunks, 1):
        chunk.metadata["chunk_index"] = idx
        lines = [l.strip() for l in chunk.page_content.split("\n") if l.strip()]
        for line in lines[:4]:
            if (line.startswith(("#", "SECTION", "Section", "PART", "Part")) or
                (len(line) < 80 and line.isupper() and len(line) > 4) or
                (len(line) > 3 and line[:3].strip().replace(".", "").isdigit())):
                chunk.metadata["section"] = line[:100]
                break

    avg_chars = sum(len(c.page_content) for c in chunks) // max(1, len(chunks))
    avg_tokens = int(avg_chars / 3.5)

    print("=" * 60)
    print(f"[INGEST DIAGNOSTICS] File: {path.name}")
    print(f" -> Total Pages: {len(pages)}")
    print(f" -> Total Chunks: {len(chunks)}")
    print(f" -> Avg Chunk Size: {avg_chars} chars (~{avg_tokens} tokens)")
    print(f" -> Settings: chunk_size={chunk_size} chars (~900 tokens), overlap={chunk_overlap} chars (~120 tokens)")
    print("=" * 60)

    # ── 3. Embed & upsert to Pinecone ───────────────────────────────────────
    print("[ingest] Embedding and uploading to Pinecone …")
    add_documents_safely(vectorstore, chunks, batch_size=100, delay_seconds=0.0)
    print(f"[ingest] Done. {len(chunks)} vectors stored in Pinecone.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest a document into Pinecone via FastEmbed.")
    parser.add_argument("--file",          required=True, help="Path to the PDF/document file.")
    parser.add_argument("--chunk-size",    type=int, default=2700, help="Characters per chunk (default: 2700 ~900 tokens).")
    parser.add_argument("--chunk-overlap", type=int, default=360,  help="Overlap between chunks (default: 360 ~120 tokens).")
    args = parser.parse_args()

    ingest(args.file, args.chunk_size, args.chunk_overlap)
