/**
 * On-device OCR for scanned (image-only) PDFs, via tesseract.js — a WASM port
 * of Tesseract. No system dependency, no server: it runs entirely in the
 * browser, so it ships inside a brain-app's static bundle.
 *
 * The original FastAPI module used the native Tesseract binary, which cannot
 * install into a brain (small ARM VM, no apt at install time). tesseract.js
 * replaces it with the same engine compiled to WASM.
 *
 * All assets — WASM core, worker script, German language model — are vendored
 * in `public/tesseract/` and served from the app's own bundle. Nothing is
 * fetched from a CDN at runtime: the scan, like every other input, stays on
 * the operator's machine.
 *
 * tesseract.js is loaded with a dynamic import so its weight stays out of the
 * main chunk — it only loads when a scanned PDF is actually encountered.
 */

import type { Worker } from "tesseract.js";

/** OCR is slow; cap pages so a huge scan can't hang the tab indefinitely. */
export const OCR_PAGE_CAP = 20;

export interface OcrProgress {
  page: number;
  total: number;
}

/**
 * Absolute URL of the vendored Tesseract asset directory.
 *
 * `public/tesseract/` -> `dist/tesseract/`, served at `<iframe-base>/tesseract/`.
 * document.baseURI is the iframe document URL (ends in '/'), so this resolves
 * correctly regardless of the brain-app mount path (/api/bf/apps/<id>/).
 */
function tesseractDir(): string {
  return new URL("tesseract/", document.baseURI).href;
}

/**
 * OCR a scanned PDF page by page. `renderPage` rasterizes page i (1-based) to
 * a canvas; this recognizes each one and joins the text. Rejects on engine
 * failure (e.g. a vendored asset failed to load).
 */
export async function ocrPdf(
  pageCount: number,
  renderPage: (index: number) => Promise<HTMLCanvasElement>,
  onProgress: (p: OcrProgress) => void
): Promise<string> {
  const total = Math.min(pageCount, OCR_PAGE_CAP);
  const dir = tesseractDir();

  const { createWorker, OEM } = await import("tesseract.js");
  const worker: Worker = await createWorker("deu", OEM.LSTM_ONLY, {
    workerPath: dir + "worker.min.js",
    corePath: dir + "tesseract-core-simd-lstm.wasm.js",
    langPath: dir,
  });

  try {
    const parts: string[] = [];
    for (let i = 1; i <= total; i += 1) {
      onProgress({ page: i, total });
      const canvas = await renderPage(i);
      const { data } = await worker.recognize(canvas);
      // Release the page bitmap before moving on — scans are large.
      canvas.width = 0;
      canvas.height = 0;
      const text = data.text.trim();
      if (text) parts.push(text);
    }
    return parts.join("\n\n");
  } finally {
    await worker.terminate();
  }
}
