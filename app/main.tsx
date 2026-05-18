/**
 * Eingangspost — hbar.health letter-ingestion brain-app.
 *
 * Upload a digital PDF letter -> pdf.js extracts the text in-browser -> the
 * brain returns a structured clinical summary via the `llm.complete` bridge.
 * Read-only counterpart to the Arztbrief app (which writes letters).
 *
 * HashRouter, not BrowserRouter — the app runs as a sandboxed iframe served
 * from /api/bf/apps/<id>/; hash routing is self-contained at any base path.
 */

import { useCallback, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, NavLink, Link } from "react-router-dom";

import { extractPdfText } from "./pdfExtract";
import { summarizeLetter, translateSummary } from "./summarize";
import { bridgeErrorMessage } from "./brainBridge";
import { SECTIONS, parseSummary, isNoFlags, type SectionKey } from "./sections";
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

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" strokeWidth="2" {...stroke}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
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

function SectionContent({ body }: { body: string | undefined }) {
  if (!body || !body.trim()) {
    return <p className="empty">Not specified</p>;
  }
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return (
    <>
      {lines.map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </>
  );
}

function SummaryView({ text }: { text: string }) {
  const parsed = parseSummary(text);

  // No recognized section headers — show the raw summary verbatim.
  if (Object.keys(parsed).length === 0) {
    return <div className="summary-raw">{text.trim()}</div>;
  }

  const extraClass = (key: SectionKey, body: string | undefined): string => {
    if (key === "action") return " section-action";
    if (key === "flags") return isNoFlags(body) ? " section-flags no-flags" : " section-flags";
    return "";
  };

  return (
    <div className="summary-body">
      {SECTIONS.map((s) => {
        const body = parsed[s.key];
        return (
          <div key={s.key} className={`summary-section${extraClass(s.key, body)}`}>
            <div className="section-label">{s.label}</div>
            <div className="section-content">
              <SectionContent body={body} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Home page — upload / loading / result / error state machine
// ---------------------------------------------------------------------------

type View = "upload" | "loading" | "result" | "error";

const SCANNED_PDF_MESSAGE =
  "No text layer found in this PDF — it looks like a scan or image. " +
  "This version reads digital PDFs only; scanned-document support (OCR) is planned.";

function HomePage() {
  const [view, setView] = useState<View>("upload");
  const [loadingMsg, setLoadingMsg] = useState("Analysing letter…");
  const [errorMsg, setErrorMsg] = useState("");
  const [rawSummary, setRawSummary] = useState("");
  const [translated, setTranslated] = useState("");
  const [isTranslated, setIsTranslated] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedAt, setGeneratedAt] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setErrorMsg("Only PDF files are accepted. Please upload a .pdf file.");
      setView("error");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg("File too large. Maximum size is 50 MB.");
      setView("error");
      return;
    }

    setRawSummary("");
    setTranslated("");
    setIsTranslated(false);
    setLoadingMsg("Extracting text from PDF…");
    setView("loading");

    let letterText: string;
    try {
      const extracted = await extractPdfText(file);
      if (extracted.tooThin) {
        setErrorMsg(SCANNED_PDF_MESSAGE);
        setView("error");
        return;
      }
      letterText = extracted.text;
    } catch {
      setErrorMsg("Could not read this PDF. The file may be corrupt or password-protected.");
      setView("error");
      return;
    }

    setLoadingMsg("Generating clinical summary…");
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
        <div className="upload-heading">Incoming letter</div>
        <div className="upload-subheading">
          Upload a PDF to generate a structured clinical summary.
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
          <div className="drop-primary">Drop PDF here</div>
          <div className="drop-secondary">
            or <strong>click to browse</strong>
          </div>
        </div>
        <div className="file-constraints">
          Digital PDF only · Max 50 MB · Parsed in your browser, file never uploaded
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
          Text is extracted locally; the summary is generated by your brain.
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
        <div className="error-title">Processing failed</div>
        <div className="error-message">{errorMsg}</div>
        <button className="btn btn-primary" onClick={reset}>
          Try again
        </button>
      </div>
    );
  }

  // -- Result --------------------------------------------------------------
  const displayText = isTranslated ? translated : rawSummary;
  return (
    <>
      <div className="result-header">
        <div>
          <div className="result-title">
            Clinical Summary
            {isTranslated && <span className="translate-badge">EN</span>}
          </div>
          <div className="print-meta">Generated {generatedAt}</div>
        </div>
        <div className="result-actions">
          <button className="btn btn-ghost" onClick={() => window.print()} title="Download as PDF">
            <DownloadIcon />
            Download PDF
          </button>
          <button className={`btn btn-ghost${copied ? " copied" : ""}`} onClick={handleCopy}>
            <CopyIcon />
            {copied ? "Copied" : "Copy"}
          </button>
          <button className="btn btn-ghost" onClick={handleTranslate} disabled={translating}>
            <TranslateIcon />
            {translating
              ? "Translating…"
              : isTranslated
                ? "Show original"
                : "Translate to English"}
          </button>
          <button className="btn btn-primary" onClick={reset}>
            Process another letter
          </button>
        </div>
      </div>
      <SummaryView text={displayText} />
      <div className="print-footer">
        hbar.health — Clinical Summary · Generated from an incoming letter. Draft
        reading aid — verify against the original. No patient data is stored.
      </div>
    </>
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
