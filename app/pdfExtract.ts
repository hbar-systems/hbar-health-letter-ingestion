/**
 * Client-side PDF handling via pdf.js (Mozilla, Apache-2.0).
 *
 * The brain-app model installs a pre-built static bundle — no Python, no
 * server. `loadPdf` opens a PDF once and exposes both paths:
 *   - extractText() — the digital text layer (fast, exact);
 *   - renderPage()  — a rasterized page canvas, fed to OCR (see ocr.ts) when
 *                     the text layer is too thin (scanned / image-only PDF).
 *
 * The pdf.js worker is bundled by Vite via the `?worker` import below, so it
 * resolves correctly under the brain-app's nested iframe base path.
 */

import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
import type { PDFDocumentProxy } from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

/** Below this many non-whitespace chars, treat the text as scanned/empty. */
export const TEXT_THRESHOLD = 200;

/** Render scale for OCR — pdf.js base is 72 DPI, so 2.8x ≈ 200 DPI. */
const OCR_RENDER_SCALE = 2.8;

export interface ExtractResult {
  text: string;
  /** true when the text layer is too thin to summarize (likely scanned). */
  tooThin: boolean;
}

export interface LoadedPdf {
  numPages: number;
  /** Extract the digital text layer (all pages). */
  extractText(): Promise<ExtractResult>;
  /** Rasterize one page (1-based) to a canvas, for OCR. */
  renderPage(index: number): Promise<HTMLCanvasElement>;
  /** Release the pdf.js document. */
  destroy(): Promise<void>;
}

/** True when a string has too little real text to be a usable letter. */
export function isThin(text: string): boolean {
  return text.replace(/\s/g, "").length < TEXT_THRESHOLD;
}

/** Open a PDF once; reuse it for both text extraction and page rendering. */
export async function loadPdf(file: File): Promise<LoadedPdf> {
  const buf = await file.arrayBuffer();
  const doc: PDFDocumentProxy = await pdfjsLib.getDocument({
    data: new Uint8Array(buf),
  }).promise;

  return {
    numPages: doc.numPages,

    async extractText() {
      const pages: string[] = [];
      for (let i = 1; i <= doc.numPages; i += 1) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => {
            if (!("str" in item)) return "";
            return item.str + (item.hasEOL ? "\n" : " ");
          })
          .join("")
          .trim();
        if (pageText) pages.push(pageText);
        page.cleanup();
      }
      const text = pages.join("\n\n");
      return { text, tooThin: isThin(text) };
    },

    async renderPage(index) {
      const page = await doc.getPage(index);
      const viewport = page.getViewport({ scale: OCR_RENDER_SCALE });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas_unavailable");
      await page.render({ canvasContext: ctx, viewport }).promise;
      page.cleanup();
      return canvas;
    },

    async destroy() {
      await doc.destroy();
    },
  };
}
