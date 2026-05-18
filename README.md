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
2. **Summarization and translation** go through the `llm.complete` bridge
   intent — the app posts the extracted text to the host brain, which
   generates the summary on the operator's BYOK model, RAG-retrieving over the
   practice corpus.

It was originally a standalone FastAPI app (pdfplumber + Tesseract OCR + a
direct Anthropic call). That shape cannot install into a brain — brains run on
small ARM VMs with no pip/npm at install time — so it was re-architected as a
pure frontend, mirroring the Arztbrief app (`systems/hbar.health/repos/app`).

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
  pdfExtract.ts   – client-side PDF text extraction (pdf.js)
  brainBridge.ts  – llm.complete postMessage client
  summarize.ts    – orchestration: text -> brain -> summary / translation
  prompts.ts      – summarize + translate instructions
  sections.ts     – section model + tolerant summary parser
  styles.css      – UI styles
  pages/          – About, Legal
dist/            – built static bundle (committed; the ui_bundle)
test_data/       – synthetic Entlassbrief (digital PDF, fictional patient)
```

## Scope

- **v0 reads digital (text-layer) PDFs only.** Scanned / image-only PDFs yield
  no text and are reported as such. OCR is a v1 follow-up — Tesseract is a
  system dependency and cannot ship in a brain-app.
- No patient data is stored. The PDF is parsed in-browser; the extracted text
  is sent to the brain only as the prompt body and is not persisted.
- Not for diagnosis, EHR integration, production use, or real patient data.
