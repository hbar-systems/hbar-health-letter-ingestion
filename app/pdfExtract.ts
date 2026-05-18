/**
 * Client-side PDF text extraction via pdf.js (Mozilla, Apache-2.0).
 *
 * The brain-app model installs a pre-built static bundle — no Python, no
 * server, no system dependencies. The original FastAPI module extracted text
 * with pdfplumber and fell back to Tesseract OCR for scanned PDFs. Neither can
 * ship in a brain-app, so v0 does extraction in the browser and supports
 * DIGITAL (text-layer) PDFs only. Scanned/image PDFs yield little or no text
 * and are reported as such — OCR is a v1 follow-up.
 *
 * The pdf.js worker is bundled by Vite via the `?worker` import below, so it
 * resolves correctly under the brain-app's nested iframe base path.
 */

import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

/** Below this many non-whitespace chars, treat the PDF as scanned/empty. */
export const TEXT_THRESHOLD = 200;

export interface ExtractResult {
  text: string;
  /** true when the text layer is too thin to summarize (likely scanned). */
  tooThin: boolean;
}

/**
 * Extract the text layer of a digital PDF. Joins page text with blank lines;
 * preserves in-page line breaks where pdf.js reports them (hasEOL).
 */
export async function extractPdfText(file: File): Promise<ExtractResult> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;

  const pages: string[] = [];
  try {
    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => {
          if (!("str" in item)) return "";
          return item.str + (item.hasEOL ? "\n" : " ");
        })
        .join("")
        .trim();
      if (pageText) pages.push(pageText);
    }
  } finally {
    await pdf.destroy();
  }

  const text = pages.join("\n\n");
  const meaningful = text.replace(/\s/g, "").length;
  return { text, tooThin: meaningful < TEXT_THRESHOLD };
}
