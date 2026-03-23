# hbar.health — Letter Ingestion & Summarization

First module of hbar.health: a local AI tool for German GP practices that processes incoming medical letters (Arztbriefe, Verlegungsbriefe, Entlassbriefe) and returns a structured clinical summary.

**No patient data is stored.** Everything runs on localhost, in memory, per session.

---

## What it does

Upload a PDF → receive a structured summary with:

- Patient demographics
- Sending institution and department
- Primary diagnoses
- Discharge/referral medications
- Action required by GP (most critical section)
- Flags — anything urgent or unusual

---

## Requirements

### System dependencies

**macOS:**
```bash
brew install tesseract tesseract-lang poppler
```

**Ubuntu/Debian:**
```bash
apt-get install tesseract-ocr tesseract-ocr-deu poppler-utils
```

> Tesseract is only used as a fallback for scanned (image-based) PDFs.
> Digital PDFs are handled by pdfplumber without Tesseract.

### Python

Python 3.10+ recommended.

---

## Setup

```bash
# 1. Navigate to this directory
cd modules/letter-ingestion

# 2. Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate        # macOS/Linux
# .venv\Scripts\activate         # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Add your API key
#    Open .env and replace the placeholder:
ANTHROPIC_API_KEY=your_key_here
```

---

## Run

```bash
uvicorn main:app --reload
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## Test with synthetic data

A realistic synthetic Entlassbrief (Cardiology, fictional patient) is included in `test_data/`.

To regenerate it:
```bash
pip install reportlab
python3 create_test_pdf.py
```

---

## Project structure

```
letter-ingestion/
├── .env                     API key (never commit)
├── .gitignore
├── main.py                  FastAPI app (serves UI + /summarize endpoint)
├── summarizer.py            PDF extraction + Claude API call
├── requirements.txt
├── create_test_pdf.py       Generates synthetic test PDF (reportlab)
├── test_data/
│   └── synthetic_entlassbrief.pdf
└── frontend/
    └── index.html           Single-page UI
```

---

## Privacy & data handling

- All processing is in-memory. No files are written to disk during summarization.
- The PDF bytes and extracted text exist only for the duration of the API request.
- Nothing is logged beyond standard uvicorn access logs (no content, no patient data).
- The Anthropic API call transmits the extracted letter text. If this is a concern, run the model locally (future module option).

---

## PDF support

| PDF type | Handled by |
|---|---|
| Digital (text layer) | pdfplumber |
| Scanned (image-based) | pytesseract + pdf2image (OCR fallback) |

OCR uses the `deu+eng` Tesseract language models at 300 DPI.
