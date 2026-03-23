"""
main.py — FastAPI application for hbar.health Letter Ingestion module.

Endpoints:
  GET  /           — Serves the single-page frontend
  POST /summarize  — Accepts PDF upload, streams structured clinical summary (SSE)
  POST /translate  — Streams English translation of a summary (SSE)
"""

from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel

import summarizer

app = FastAPI(
    title="hbar.health — Letter Ingestion",
    description="Structured summarization of incoming medical letters for German GP practices.",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
)

FRONTEND_PATH = Path(__file__).parent / "frontend" / "index.html"

SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",   # disables nginx buffering if behind a proxy
}


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def index():
    if not FRONTEND_PATH.exists():
        raise HTTPException(status_code=500, detail="Frontend not found.")
    return FRONTEND_PATH.read_text(encoding="utf-8")


@app.post("/summarize")
async def summarize_letter(file: UploadFile = File(...)):
    """Accept a PDF upload and stream a structured clinical summary as SSE.

    Errors during extraction are sent as SSE {"error": "..."} events.
    No patient data persists after this request completes.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await file.read()

    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    if len(pdf_bytes) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 50 MB.")

    return StreamingResponse(
        summarizer.summarize_stream(pdf_bytes),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )


class TranslateRequest(BaseModel):
    text: str


@app.post("/translate")
async def translate_summary(req: TranslateRequest):
    """Stream an English translation of a structured summary as SSE."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="No text provided.")

    return StreamingResponse(
        summarizer.translate_stream(req.text),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )
