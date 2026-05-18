# hbar.health — Eingangspost (letter ingestion)

Created: 2026-03-23 · Converted to a brain-app: 2026-05-18

App #2 of the hbar.health demo. A doctor uploads an **incoming** PDF letter
(Entlassbrief, Verlegungsbrief, Arztbrief) and gets a structured clinical
summary — diagnoses, discharge medication, *action required by the GP*, and
flags. The counterpart to the Arztbrief app: that one *writes* letters, this
one *reads* them.

**This is a draft reading aid. It does not diagnose, triage, or decide.**

---

## What it is

An installable **brain-app** — a pre-built static `ui_bundle` that runs as a
sandboxed iframe inside a BrainFoundry brain. No backend, no Python, no
system dependencies:

1. **PDF text extraction** runs client-side, in the browser, via
   [pdf.js](https://mozilla.github.io/pdf.js/) (Apache-2.0). The file itself
   is never uploaded.
2. **Scanned / image-only PDFs** are read with on-device OCR — pdf.js
   rasterizes each page and [tesseract.js](https://tesseract.projectnaptha.com/)
   (Apache-2.0, WASM port of Tesseract) recognizes the text. The OCR engine,
   WASM core, and German language model are vendored in `public/tesseract/`
   and served from the app's own bundle — nothing is fetched from a CDN.
3. **Summarization and translation** go through the `llm.complete` bridge
   intent — the app posts the extracted text to the host brain, which
   generates the summary on the operator's BYOK model, RAG-retrieving over the
   practice corpus.

It was originally a standalone FastAPI app (pdfplumber + native Tesseract + a
direct Anthropic call). That shape cannot install into a brain — brains run on
small ARM VMs with no pip/apt at install time — so it was re-architected as a
pure frontend, mirroring the Arztbrief app (`systems/hbar.health/repos/app`).
The native Tesseract dependency is replaced by the WASM build, which ships
inside the bundle.

## Install

In a brain: **Settings → Apps**, paste this repo's URL
(`https://github.com/hbar-systems/hbar-health-letter-ingestion`), approve.
The install pins a commit SHA and serves the committed `dist/` bundle.

Requires a brain with the `llm.complete` bridge intent (brainfoundry-nous
`>=0.8.4`). Updating an installed app = uninstall + reinstall.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # tsc + vite build -> dist/
```

`dist/` is committed (not gitignored) — it is the `ui_bundle` the brain
serves. Rebuild and commit it on every change.

## Structure

```
brain-app.yaml   – manifest (id, tab, permissions, ui_bundle)
index.html       – Vite entry
app/
  main.tsx        – router, shell, upload/loading/result/error views
  pdfExtract.ts   – PDF open: text-layer extraction + page rasterization
  ocr.ts          – on-device OCR for scanned PDFs (tesseract.js)
  brainBridge.ts  – llm.complete postMessage client
  summarize.ts    – orchestration: text -> brain -> summary / translation
  prompts.ts      – summarize + translate instructions
  sections.ts     – section model + tolerant summary parser
  styles.css      – UI styles
  pages/          – About, Legal
public/tesseract/ – vendored OCR assets (WASM core, worker, deu model)
dist/            – built static bundle (committed; the ui_bundle)
test_data/       – synthetic Entlassbrief (digital PDF, fictional patient)
```

## Scope

- **Digital and scanned PDFs.** A digital text layer is used directly; when
  it is absent (a scan), each page is OCR'd in the browser. OCR is capped at
  20 pages and uses the German (`deu`) model.
- No patient data is stored, and nothing is sent to a CDN. The PDF is parsed
  in-browser; the extracted text is sent only to the brain, as the prompt
  body, and is not persisted.
- Not for diagnosis, EHR integration, production use, or real patient data.
