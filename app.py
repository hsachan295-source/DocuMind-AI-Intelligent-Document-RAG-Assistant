"""
app.py — FastAPI backend for the PDF RAG Assistant web UI.

Endpoints:
  POST /upload    — receive PDF, run ingestion in background thread
  POST /ask       — answer a question using the RAG agent
  GET  /status    — ingestion progress / readiness check
  GET  /          — serves static/index.html (the web UI)

Run with:
    uvicorn app:app --reload --port 8000
Then open http://localhost:8000
"""

import os
import shutil
import asyncio
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader
from langchain_core.documents import Document
import docx
from langchain_text_splitters import RecursiveCharacterTextSplitter
from config import vectorstore, index as pinecone_index, add_documents_safely
from rag_agent import ask, ask_with_sources

# ── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(title="Document RAG Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Thread pool: one thread for ingest, one for LLM inference
executor = ThreadPoolExecutor(max_workers=2)

# Shared single-user state
state: dict = {
    "status": "idle",      # idle | processing | ready | error
    "filename": None,
    "pages": 0,
    "chunks": 0,
    "error": None,
}


# ── Ingestion (blocking — runs in thread pool) ───────────────────────────────
def _run_ingest(file_path: str) -> None:
    try:
        path_lower = file_path.lower()
        if path_lower.endswith(".docx") or path_lower.endswith(".doc"):
            try:
                doc = docx.Document(file_path)
                full_text = "\n\n".join([p.text for p in doc.paragraphs if p.text.strip()])
                pages = [Document(page_content=full_text, metadata={"source": file_path, "page": 1})]
            except Exception:
                loader = Docx2txtLoader(file_path)
                pages = loader.load()
        elif path_lower.endswith(".txt"):
            loader = TextLoader(file_path, encoding="utf-8")
        else:
            loader = PyPDFLoader(file_path)

        pages = loader.load()
        state["pages"] = len(pages)

        # Split into chunks (3000 chars for optimal retrieval & fast ingestion)
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=3000,
            chunk_overlap=300,
            separators=["\n\n", "\n", " ", ""],
        )
        chunks = splitter.split_documents(pages)
        state["chunks"] = len(chunks)

        # Clear previous vectors so re-uploading doesn't create duplicates
        try:
            pinecone_index.delete(delete_all=True)
        except Exception:
            pass  # index may be empty — that's fine

        # Embed + upsert (Instant FastEmbed local embeddings with zero rate limits)
        add_documents_safely(vectorstore, chunks, batch_size=100, delay_seconds=0.0)
        state["status"] = "ready"

    except Exception as exc:
        state["status"] = "error"
        state["error"]  = str(exc)


# ── Routes — defined BEFORE the static mount ────────────────────────────────
@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    allowed_exts = (".pdf", ".docx", ".doc", ".txt")
    if not file.filename.lower().endswith(allowed_exts):
        raise HTTPException(status_code=400, detail="Only PDF, Word (.docx/.doc), and Text (.txt) files are supported.")

    dest = UPLOAD_DIR / file.filename
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    state.update({
        "status":   "processing",
        "filename": file.filename,
        "pages":    0,
        "chunks":   0,
        "error":    None,
    })

    loop = asyncio.get_running_loop()
    loop.run_in_executor(executor, _run_ingest, str(dest))

    return {"message": "Upload received. Ingestion started.", "filename": file.filename}


class QuestionBody(BaseModel):
    question: str


@app.post("/ask")
async def ask_question(body: QuestionBody):
    if state["status"] != "ready":
        raise HTTPException(
            status_code=400,
            detail="Document not ready yet. Upload a document and wait for processing to complete.",
        )
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        loop = asyncio.get_running_loop()
        res = await loop.run_in_executor(executor, ask_with_sources, body.question.strip())
        return {
            "answer": res["answer"],
            "filename": state["filename"],
            "sources": res.get("sources", [])
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/status")
async def get_status():
    return state


# ── Static / Frontend UI — must be mounted LAST ──────────────────────────────
frontend_dir = "frontend" if Path("frontend").exists() else "static"
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="static")

