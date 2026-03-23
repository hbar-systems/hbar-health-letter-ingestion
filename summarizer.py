"""
summarizer.py — PDF extraction and Claude API summarization.

Extraction strategy:
  1. Try pdfplumber (fast, accurate for digital PDFs)
  2. If result is thin (<200 meaningful chars), fall back to pytesseract OCR
     (handles scanned image-based PDFs)

All functions stream output via async generators using SSE format:
  {"chunk": "..."}   — text fragment
  {"done": true}     — generation complete
  {"error": "..."}   — failure

No extracted text or summaries are persisted. All processing is in-memory.
"""

import asyncio
import io
import json

import pdfplumber
import pytesseract
from pdf2image import convert_from_bytes
from anthropic import AsyncAnthropic
from dotenv import load_dotenv

load_dotenv()

_client = AsyncAnthropic()

SYSTEM_PROMPT = """\
You are a clinical document assistant for a German GP practice.
You will receive the full text of an incoming medical letter
(Arztbrief, Verlegungsbrief, or Entlassbrief) from a hospital
or specialist.

Your job is to extract and return ONLY the following, in this
exact structure:

PATIENT
- Name:
- Date of birth:
- Case/Patient number (if present):

RECEIVED FROM
- Institution:
- Department:
- Date of letter:

PRIMARY DIAGNOSES
(list each diagnosis concisely, one per line)

CURRENT MEDICATIONS AT DISCHARGE/REFERRAL
(list drug name, dose, frequency — one per line)
(if not present, write: Not specified)

ACTION REQUIRED BY GP
(list every explicit recommendation or follow-up instruction
from the letter — these are the most important lines)

FLAGS
(list anything urgent, unusual, or that requires immediate
attention — conflicting information, missing data,
abnormal values explicitly highlighted by the sender)
(if nothing flagged, write: None)

Rules:
- Write in the same language as the letter (German or English)
- Be concise — the GP does not need the full narrative
- Never invent information not present in the letter
- If a section has no relevant content, write: Not specified
- The ACTION REQUIRED section is the most critical —
  never omit or shorten it
- Do not use markdown formatting of any kind — no ##, no **, no *, no _
- Use only plain text and the exact section headers shown above\
"""

# Minimum character count to consider pdfplumber output usable.
_TEXT_THRESHOLD = 200


def _extract_pdfplumber(pdf_bytes: bytes) -> str:
    parts = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                parts.append(text.strip())
    return "\n\n".join(parts)


def _extract_ocr(pdf_bytes: bytes) -> str:
    """OCR fallback for scanned PDFs. 200 DPI is sufficient for printed text."""
    images = convert_from_bytes(pdf_bytes, dpi=200)
    parts = []
    for image in images:
        text = pytesseract.image_to_string(image, lang="deu+eng")
        if text.strip():
            parts.append(text.strip())
    return "\n\n".join(parts)


def extract_text(pdf_bytes: bytes) -> str:
    text = _extract_pdfplumber(pdf_bytes)
    if len(text.replace(" ", "").replace("\n", "")) < _TEXT_THRESHOLD:
        text = _extract_ocr(pdf_bytes)
    return text


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


async def summarize_stream(pdf_bytes: bytes):
    """Async generator: extract text then stream Claude summarization as SSE."""
    try:
        text = await asyncio.to_thread(extract_text, pdf_bytes)
    except Exception as e:
        yield _sse({"error": f"Text extraction failed: {e}"})
        return

    if not text.strip():
        yield _sse({"error": "No text could be extracted from this PDF. "
                             "Please ensure it is a readable PDF or a clear scan."})
        return

    async with _client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Here is the medical letter:\n\n{text}"}],
    ) as stream:
        async for chunk in stream.text_stream:
            yield _sse({"chunk": chunk})

    yield _sse({"done": True})


async def translate_stream(summary_text: str):
    """Async generator: stream Claude translation of a summary to English as SSE."""
    async with _client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{
            "role": "user",
            "content": (
                "Translate the following structured clinical summary to English. "
                "Keep the exact section headers (PATIENT, RECEIVED FROM, etc.) and structure. "
                "Translate only the content — do not add, remove, or summarise anything. "
                "Do not use markdown formatting.\n\n"
                + summary_text
            ),
        }],
    ) as stream:
        async for chunk in stream.text_stream:
            yield _sse({"chunk": chunk})

    yield _sse({"done": True})
