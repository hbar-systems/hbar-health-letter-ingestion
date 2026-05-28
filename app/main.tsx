/**
 * Eingangspost — hbar.health letter-ingestion brain-app.
 *
 * Upload a PDF letter -> pdf.js extracts the text in-browser (or tesseract.js
 * OCRs it, if the PDF is a scan) -> the brain returns a structured clinical
 * summary via the `llm.complete` bridge. Read-only counterpart to the
 * Arztbrief app (which writes letters).
 *
 * HashRouter, not BrowserRouter — the app runs as a sandboxed iframe served
 * from /api/bf/apps/<id>/; hash routing is self-contained at any base path.
 */

import { useCallback, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, NavLink, Link } from "react-router-dom";

import { loadPdf, isThin, type LoadedPdf } from "./pdfExtract";
import { ocrPdf } from "./ocr";
import { summarizeLetter, translateSummary } from "./summarize";
import { bridgeErrorMessage } from "./brainBridge";
import { SECTIONS, parseSummary } from "./sections";
import { AboutPage } from "./pages/AboutPage";
import { LegalPage } from "./pages/LegalPage";
import "./styles.css";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function UploadIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" strokeWidth="1.5" {...stroke}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <polyline points="9 15 12 12 15 15" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" strokeWidth="1.5" {...stroke}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2" {...stroke}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2" {...stroke}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  );
}

function ForwardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2" {...stroke}>
      <polyline points="15 17 20 12 15 7" />
      <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" strokeWidth="2" {...stroke}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function TranslateIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" strokeWidth="2" {...stroke}>
      <path d="M5 8l6 6" />
      <path d="M4 14l6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="M22 22l-5-10-5 10" />
      <path d="M14 18h6" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Summary rendering
// ---------------------------------------------------------------------------

function SectionContent({ body }: { body: string }) {
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) {
    return <p className="empty">Nicht angegeben</p>;
  }
  return (
    <>
      {lines.map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </>
  );
}

/**
 * The Befund-Karte — a styled clinical reading note. Renders only the sections
 * the brain actually returned (Aufenthaltszeitraum, for instance, only appears
 * for a discharge letter). If no section header is recognized at all, the raw
 * summary is shown verbatim inside the same card.
 */
function BefundKarte({ text, generatedAt }: { text: string; generatedAt: string }) {
  const parsed = parseSummary(text);
  const present = SECTIONS.filter((s) => parsed[s.key] !== undefined);

  return (
    <div className="befund-karte">
      <div className="befund-head">
        <h2 className="befund-header">
          Eingehender Brief — strukturierte Zusammenfassung
        </h2>
        {generatedAt && <div className="befund-meta">Erstellt {generatedAt}</div>}
      </div>

      {present.length === 0 ? (
        <div className="befund-section">
          <div className="befund-content befund-raw">{text.trim()}</div>
        </div>
      ) : (
        present.map((s) => (
          <div key={s.key} className="befund-section">
            <div className="befund-label">{s.label}</div>
            <div className="befund-content">
              <SectionContent body={parsed[s.key]!} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Home page — upload / loading / result / error state machine
// ---------------------------------------------------------------------------

type View = "upload" | "loading" | "result" | "error";

function HomePage() {
  const [view, setView] = useState<View>("upload");
  const [loadingMsg, setLoadingMsg] = useState("Brief wird analysiert…");
  const [errorMsg, setErrorMsg] = useState("");
  const [rawSummary, setRawSummary] = useState("");
  const [translated, setTranslated] = useState("");
  const [isTranslated, setIsTranslated] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedAt, setGeneratedAt] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  }, []);

  const reset = useCallback(() => {
    setRawSummary("");
    setTranslated("");
    setIsTranslated(false);
    setTranslating(false);
    setCopied(false);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setView("upload");
  }, []);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("Es werden nur PDF-Dateien akzeptiert. Bitte laden Sie eine .pdf-Datei hoch.");
      setView("error");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg("Datei zu groß. Die maximale Größe beträgt 50 MB.");
      setView("error");
      return;
    }

    setRawSummary("");
    setTranslated("");
    setIsTranslated(false);
    setLoadingMsg("PDF wird gelesen…");
    setView("loading");

    let pdf: LoadedPdf;
    try {
      pdf = await loadPdf(file);
    } catch {
      setErrorMsg("Dieses PDF konnte nicht geöffnet werden. Die Datei ist möglicherweise beschädigt oder passwortgeschützt.");
      setView("error");
      return;
    }

    let letterText: string;
    try {
      const extracted = await pdf.extractText();
      if (extracted.tooThin) {
        // No usable text layer — scanned/image PDF. Fall back to on-device OCR.
        setLoadingMsg("Gescanntes PDF — OCR wird vorbereitet…");
        letterText = await ocrPdf(
          pdf.numPages,
          (i) => pdf.renderPage(i),
          ({ page, total }) =>
            setLoadingMsg(`Gescanntes PDF — Seite ${page} von ${total} wird per OCR gelesen…`)
        );
        if (isThin(letterText)) throw new Error("ocr_empty");
      } else {
        letterText = extracted.text;
      }
    } catch (e) {
      const msg =
        e instanceof Error && e.message === "ocr_empty"
          ? "Es konnte kein lesbarer Text extrahiert werden, auch nicht per OCR. Der Scan ist möglicherweise zu schlecht oder die Seite leer."
          : "Aus diesem PDF konnte kein Text extrahiert werden.";
      setErrorMsg(msg);
      setView("error");
      return;
    } finally {
      await pdf.destroy();
    }

    setLoadingMsg("Klinische Zusammenfassung wird erstellt…");
    try {
      const summary = await summarizeLetter(letterText);
      setRawSummary(summary);
      setGeneratedAt(
        new Date().toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })
      );
      setView("result");
    } catch (e) {
      setErrorMsg(bridgeErrorMessage(e));
      setView("error");
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleCopy = async () => {
    const text = isTranslated ? translated : rawSummary;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  const handleTranslate = async () => {
    if (!rawSummary) return;
    if (isTranslated) {
      setIsTranslated(false);
      return;
    }
    if (translated) {
      setIsTranslated(true);
      return;
    }
    setTranslating(true);
    try {
      const en = await translateSummary(rawSummary);
      setTranslated(en);
      setIsTranslated(true);
    } catch (e) {
      setErrorMsg(bridgeErrorMessage(e));
      setView("error");
    } finally {
      setTranslating(false);
    }
  };

  // -- Upload --------------------------------------------------------------
  if (view === "upload") {
    return (
      <div className="view-pad">
        <div className="upload-heading">Eingehender Brief</div>
        <div className="upload-subheading">
          PDF hochladen, um eine strukturierte klinische Zusammenfassung zu erstellen.
        </div>
        <div
          className={`drop-zone${dragOver ? " drag-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDragEnd={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="file-input"
            onChange={onFileChange}
          />
          <div className="drop-icon">
            <UploadIcon />
          </div>
          <div className="drop-primary">PDF hier ablegen oder zum Auswählen klicken.</div>
        </div>
        <div className="file-note">
          <span>Digitale PDFs werden direkt gelesen.</span>
          <span>
            Gescannte Briefe werden im Browser per OCR erkannt — keine Übertragung
            an externe Dienste.
          </span>
        </div>
      </div>
    );
  }

  // -- Loading -------------------------------------------------------------
  if (view === "loading") {
    return (
      <div className="view-loading">
        <div className="spinner" />
        <div className="loading-title">{loadingMsg}</div>
        <div className="loading-sub">
          Der Text wird in Ihrem Browser extrahiert; die Zusammenfassung erstellt Ihr Brain.
        </div>
      </div>
    );
  }

  // -- Error ---------------------------------------------------------------
  if (view === "error") {
    return (
      <div className="view-error">
        <div className="error-icon">
          <ErrorIcon />
        </div>
        <div className="error-title">Verarbeitung fehlgeschlagen</div>
        <div className="error-message">{errorMsg}</div>
        <button className="btn btn-primary" onClick={reset}>
          Erneut versuchen
        </button>
      </div>
    );
  }

  // -- Result --------------------------------------------------------------
  const displayText = isTranslated ? translated : rawSummary;
  return (
    <div className="result-view">
      <div className="result-header">
        <div className="result-title">
          Befund-Karte
          {isTranslated && <span className="translate-badge">EN</span>}
        </div>
        <div className="result-actions">
          <button className={`btn btn-ghost${copied ? " copied" : ""}`} onClick={handleCopy}>
            <CopyIcon />
            {copied ? "Kopiert" : "Kopieren"}
          </button>
          <button className="btn btn-ghost" onClick={handleTranslate} disabled={translating}>
            <TranslateIcon />
            {translating
              ? "Übersetze…"
              : isTranslated
                ? "Original anzeigen"
                : "Ins Englische übersetzen"}
          </button>
          <button className="btn btn-primary" onClick={reset}>
            Weiteren Brief verarbeiten
          </button>
        </div>
      </div>

      <BefundKarte text={displayText} generatedAt={generatedAt} />

      <div className="workflow-actions">
        <button className="btn btn-work" onClick={() => window.print()}>
          <PrintIcon />
          Drucken
        </button>
        <button
          className="btn btn-work"
          onClick={() => showToast("In die Patientenakte übernommen (Demo).")}
        >
          <FileIcon />
          In Patientenakte übernehmen
        </button>
        <button
          className="btn btn-work"
          onClick={() => showToast("An laufendes Konsil weitergeleitet.")}
        >
          <ForwardIcon />
          An Konsil weiterleiten
        </button>
      </div>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

function navClass({ isActive }: { isActive: boolean }): string {
  return isActive ? "nav-link active" : "nav-link";
}

function App() {
  return (
    <div className="app-shell">
      <header>
        <Link to="/" className="wordmark">
          hbar<span>.</span>health
        </Link>
        <div className="header-nav">
          <NavLink to="/" end className={navClass}>
            Eingangspost
          </NavLink>
          <NavLink to="/about" className={navClass}>
            About
          </NavLink>
          <NavLink to="/legal" className={navClass}>
            Legal
          </NavLink>
        </div>
      </header>
      <main>
        <div className="content-card">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/legal" element={<LegalPage />} />
          </Routes>
        </div>
      </main>
      <footer>
        Parsed locally · No patient data is stored or transmitted beyond this session
      </footer>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(
  <HashRouter>
    <App />
  </HashRouter>
);
