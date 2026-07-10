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
import { summarizeLetter, translateSummary, draftReply } from "./summarize";
import { bridgeErrorMessage } from "./brainBridge";
import { SECTIONS, parseSummary } from "./sections";
import { AboutPage } from "./pages/AboutPage";
import { LegalPage } from "./pages/LegalPage";
import { type Lang, type Strings, getStoredLang, storeLang, t } from "./i18n";
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

function SectionContent({ body, s }: { body: string; s: Strings }) {
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) {
    return <p className="empty">{s.emptyValue}</p>;
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
function BefundKarte({
  text,
  generatedAt,
  s,
}: {
  text: string;
  generatedAt: string;
  s: Strings;
}) {
  const parsed = parseSummary(text);
  const present = SECTIONS.filter((sec) => parsed[sec.key] !== undefined);

  return (
    <div className="befund-karte">
      <div className="befund-head">
        <h2 className="befund-header">{s.befundHeader}</h2>
        {generatedAt && (
          <div className="befund-meta">
            {s.befundCreated} {generatedAt}
          </div>
        )}
      </div>

      {present.length === 0 ? (
        <div className="befund-section">
          <div className="befund-content befund-raw">{text.trim()}</div>
        </div>
      ) : (
        present.map((sec) => (
          <div key={sec.key} className="befund-section">
            <div className="befund-label">{sec.label}</div>
            <div className="befund-content">
              <SectionContent body={parsed[sec.key]!} s={s} />
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

function HomePage({ s }: { s: Strings }) {
  const [view, setView] = useState<View>("upload");
  const [loadingMsg, setLoadingMsg] = useState(s.loadingAnalyzing);
  const [errorMsg, setErrorMsg] = useState("");
  const [rawSummary, setRawSummary] = useState("");
  const [translated, setTranslated] = useState("");
  const [isTranslated, setIsTranslated] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedAt, setGeneratedAt] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState("");
  // Paste-text intake (alternative to upload) + reply drafting.
  const [pasteText, setPasteText] = useState("");
  const [letterText, setLetterText] = useState("");
  const [replyPoints, setReplyPoints] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyCopied, setReplyCopied] = useState(false);

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
    setPasteText("");
    setLetterText("");
    setReplyPoints("");
    setReplyText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setView("upload");
  }, []);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg(s.errOnlyPdf);
      setView("error");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg(s.errTooLarge);
      setView("error");
      return;
    }

    setRawSummary("");
    setTranslated("");
    setIsTranslated(false);
    setLoadingMsg(s.loadingReadingPdf);
    setView("loading");

    let pdf: LoadedPdf;
    try {
      pdf = await loadPdf(file);
    } catch {
      setErrorMsg(s.errPdfOpen);
      setView("error");
      return;
    }

    let letterText: string;
    try {
      const extracted = await pdf.extractText();
      if (extracted.tooThin) {
        // No usable text layer — scanned/image PDF. Fall back to on-device OCR.
        setLoadingMsg(s.loadingOcrPrep);
        letterText = await ocrPdf(
          pdf.numPages,
          (i) => pdf.renderPage(i),
          ({ page, total }) => setLoadingMsg(s.loadingOcrPage(page, total))
        );
        if (isThin(letterText)) throw new Error("ocr_empty");
      } else {
        letterText = extracted.text;
      }
    } catch (e) {
      const msg =
        e instanceof Error && e.message === "ocr_empty" ? s.errOcrEmpty : s.errNoText;
      setErrorMsg(msg);
      setView("error");
      return;
    } finally {
      await pdf.destroy();
    }

    setLetterText(letterText);
    setLoadingMsg(s.loadingSummarizing);
    try {
      const summary = await summarizeLetter(letterText);
      setRawSummary(summary);
      setGeneratedAt(
        new Date().toLocaleString(s.locale, { dateStyle: "medium", timeStyle: "short" })
      );
      setView("result");
    } catch (e) {
      setErrorMsg(bridgeErrorMessage(e, s));
      setView("error");
    }
  }, [s]);

  // Paste-text intake — summarize typed/pasted letter text (no PDF/OCR).
  const processText = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setRawSummary("");
    setTranslated("");
    setIsTranslated(false);
    setReplyText("");
    setLetterText(trimmed);
    setLoadingMsg(s.loadingSummarizing);
    setView("loading");
    try {
      const summary = await summarizeLetter(trimmed);
      setRawSummary(summary);
      setGeneratedAt(
        new Date().toLocaleString(s.locale, { dateStyle: "medium", timeStyle: "short" })
      );
      setView("result");
    } catch (e) {
      setErrorMsg(bridgeErrorMessage(e, s));
      setView("error");
    }
  }, [s]);

  const handleReply = useCallback(async () => {
    if (!letterText) return;
    setReplyLoading(true);
    try {
      const r = await draftReply(letterText, replyPoints);
      setReplyText(r);
    } catch (e) {
      setToast(bridgeErrorMessage(e, s));
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(""), 3000);
    } finally {
      setReplyLoading(false);
    }
  }, [letterText, replyPoints, s]);

  const copyReply = async () => {
    if (!replyText) return;
    try {
      await navigator.clipboard.writeText(replyText);
      setReplyCopied(true);
      setTimeout(() => setReplyCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

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
      setErrorMsg(bridgeErrorMessage(e, s));
      setView("error");
    } finally {
      setTranslating(false);
    }
  };

  // -- Upload --------------------------------------------------------------
  if (view === "upload") {
    return (
      <div className="view-pad">
        <div className="upload-heading">{s.uploadHeading}</div>
        <div className="upload-subheading">{s.uploadSubheading}</div>
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
          <div className="drop-primary">{s.dropPrimary}</div>
        </div>
        <div className="file-note">
          <span>{s.fileNote1}</span>
          <span>{s.fileNote2}</span>
        </div>

        {/* Or paste the letter text directly (no upload needed). */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.5rem 0 0.75rem" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(127,127,127,0.3)" }} />
          <span style={{ fontSize: "0.8rem", color: "#8a8a8a" }}>{s.orPaste}</span>
          <div style={{ flex: 1, height: 1, background: "rgba(127,127,127,0.3)" }} />
        </div>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={s.pastePlaceholder}
          style={{
            width: "100%",
            minHeight: 120,
            padding: "0.6rem 0.7rem",
            fontSize: "0.9rem",
            borderRadius: 8,
            boxSizing: "border-box",
            resize: "vertical",
            background: "rgba(127,127,127,0.08)",
            color: "inherit",
            border: "1px solid rgba(127,127,127,0.35)",
            fontFamily: "inherit",
          }}
        />
        <button
          className="btn btn-primary"
          style={{ marginTop: "0.7rem" }}
          disabled={!pasteText.trim()}
          onClick={() => processText(pasteText)}
        >
          {s.summarizeTextBtn}
        </button>
      </div>
    );
  }

  // -- Loading -------------------------------------------------------------
  if (view === "loading") {
    return (
      <div className="view-loading">
        <div className="spinner" />
        <div className="loading-title">{loadingMsg}</div>
        <div className="loading-sub">{s.loadingSub}</div>
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
        <div className="error-title">{s.errorTitle}</div>
        <div className="error-message">{errorMsg}</div>
        <button className="btn btn-primary" onClick={reset}>
          {s.retryBtn}
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
          {s.resultTitle}
          {isTranslated && <span className="translate-badge">EN</span>}
        </div>
        <div className="result-actions">
          <button className={`btn btn-ghost${copied ? " copied" : ""}`} onClick={handleCopy}>
            <CopyIcon />
            {copied ? s.copied : s.copy}
          </button>
          <button className="btn btn-ghost" onClick={handleTranslate} disabled={translating}>
            <TranslateIcon />
            {translating
              ? s.translating
              : isTranslated
                ? s.showOriginal
                : s.translateToEnglish}
          </button>
          <button className="btn btn-primary" onClick={reset}>
            {s.processAnother}
          </button>
        </div>
      </div>

      <BefundKarte text={displayText} generatedAt={generatedAt} s={s} />

      <div className="workflow-actions">
        <button className="btn btn-work" onClick={() => window.print()}>
          <PrintIcon />
          {s.printBtn}
        </button>
        <button
          className="btn btn-work"
          onClick={() => showToast(s.toastAddedToRecord)}
        >
          <FileIcon />
          {s.addToRecord}
        </button>
        <button
          className="btn btn-work"
          onClick={() => showToast(s.toastForwarded)}
        >
          <ForwardIcon />
          {s.forwardToConsult}
        </button>
      </div>

      {/* Antwortschreiben — draft a reply to this letter (folded in from Praxis-Tools) */}
      <div style={{ marginTop: "1.5rem", borderTop: "1px solid rgba(127,127,127,0.25)", paddingTop: "1.25rem" }}>
        <div style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          {s.replyHeading}
        </div>
        <textarea
          value={replyPoints}
          onChange={(e) => setReplyPoints(e.target.value)}
          placeholder={s.replyPlaceholder}
          style={{
            width: "100%",
            minHeight: 70,
            padding: "0.55rem 0.7rem",
            fontSize: "0.88rem",
            borderRadius: 8,
            boxSizing: "border-box",
            resize: "vertical",
            background: "rgba(127,127,127,0.08)",
            color: "inherit",
            border: "1px solid rgba(127,127,127,0.35)",
            fontFamily: "inherit",
          }}
        />
        <button
          className="btn btn-primary"
          style={{ marginTop: "0.6rem" }}
          disabled={replyLoading}
          onClick={handleReply}
        >
          {replyLoading ? s.replyDrafting : s.draftReplyBtn}
        </button>
        {replyText && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem 1.1rem",
              background: "rgba(127,127,127,0.06)",
              border: "1px solid rgba(127,127,127,0.25)",
              borderRadius: 8,
            }}
          >
            <div style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem", lineHeight: 1.6 }}>{replyText}</div>
            <button className="btn btn-ghost" style={{ marginTop: "0.6rem" }} onClick={copyReply}>
              <CopyIcon />
              {replyCopied ? s.copied : s.copyReply}
            </button>
          </div>
        )}
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
  const [lang, setLang] = useState<Lang>(getStoredLang);
  const s = t(lang);

  const toggleLang = () => {
    const next: Lang = lang === "de" ? "en" : "de";
    setLang(next);
    storeLang(next);
  };

  return (
    <div className="app-shell">
      <header>
        <Link to="/" className="wordmark">
          hbar<span>.</span>health
        </Link>
        <div className="header-nav">
          <NavLink to="/" end className={navClass}>
            {s.navEingangspost}
          </NavLink>
          <NavLink to="/about" className={navClass}>
            {s.navAbout}
          </NavLink>
          <NavLink to="/legal" className={navClass}>
            {s.navLegal}
          </NavLink>
          <button
            type="button"
            className="lang-toggle"
            onClick={toggleLang}
            title={s.langToggleTitle}
          >
            {lang === "de" ? "DE → EN" : "EN → DE"}
          </button>
        </div>
      </header>
      <main>
        <div className="content-card">
          <Routes>
            <Route path="/" element={<HomePage s={s} />} />
            <Route path="/about" element={<AboutPage s={s} />} />
            <Route path="/legal" element={<LegalPage s={s} />} />
          </Routes>
        </div>
      </main>
      <footer>{s.footer}</footer>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(
  <HashRouter>
    <App />
  </HashRouter>
);
