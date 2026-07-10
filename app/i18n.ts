/**
 * UI-only i18n for Eingangspost (letter ingestion).
 *
 * Only the interface chrome is translated — form labels, buttons, helper text,
 * status/error messages, and the About/Legal pages. The clinical summary and
 * reply are ALWAYS generated in the letter's own language by the brain (the
 * prompts in prompts.ts stay German); the Befund-Karte section labels
 * (Absender, Patient, Hauptdiagnosen …) come from the model output and are
 * left German so parsing stays reliable.
 *
 * STORAGE_KEY is shared across every hbar.health app so the operator's DE/EN
 * choice carries between them.
 */

export type Lang = "de" | "en";

const STORAGE_KEY = "hbar-health-lang";

export function getStoredLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "en") return "en";
  } catch {
    // SSR or blocked localStorage — fall back
  }
  return "de";
}

export function storeLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

export interface Strings {
  // Locale for date formatting
  locale: string;

  // Shell / nav
  navEingangspost: string;
  navAbout: string;
  navLegal: string;
  footer: string;
  langToggleTitle: string;

  // Upload view
  uploadHeading: string;
  uploadSubheading: string;
  dropPrimary: string;
  fileNote1: string;
  fileNote2: string;
  orPaste: string;
  pastePlaceholder: string;
  summarizeTextBtn: string;

  // Loading view
  loadingAnalyzing: string;
  loadingReadingPdf: string;
  loadingOcrPrep: string;
  loadingSummarizing: string;
  loadingSub: string;
  loadingOcrPage: (page: number, total: number) => string;

  // Error view
  errorTitle: string;
  retryBtn: string;

  // Local extraction errors
  errOnlyPdf: string;
  errTooLarge: string;
  errPdfOpen: string;
  errOcrEmpty: string;
  errNoText: string;

  // Bridge errors
  errNotInBrain: string;
  errPermissionDenied: string;
  errPermitFailed: string;
  errMissingMessages: string;
  errTimeout: string;
  errNetwork: string;
  errFailed: string;
  errFallback: (code: string) => string;

  // Result view
  resultTitle: string;
  copy: string;
  copied: string;
  translating: string;
  showOriginal: string;
  translateToEnglish: string;
  processAnother: string;
  befundHeader: string;
  befundCreated: string;
  emptyValue: string;

  // Workflow actions
  printBtn: string;
  addToRecord: string;
  toastAddedToRecord: string;
  forwardToConsult: string;
  toastForwarded: string;

  // Reply block
  replyHeading: string;
  replyPlaceholder: string;
  replyDrafting: string;
  draftReplyBtn: string;
  copyReply: string;

  // About page
  aboutTitle: string;
  aboutLead: string;
  aboutDoesTitle: string;
  aboutDoes1: string;
  aboutDoes2: string;
  aboutDoes3: string;
  aboutDoes4: string;
  aboutDoes5: string;
  aboutNotTitle: string;
  aboutNot1: string;
  aboutNot2: string;
  aboutNot3: string;
  aboutNot4: string;
  aboutSafeTitle: string;
  aboutSafe1: string;
  aboutSafe2: string;
  aboutSafe3: string;

  // Legal page
  legalTitle: string;
  legalLead: string;
  legalIntendedTitle: string;
  legalIntendedText: string;
  legalNotTitle: string;
  legalNotText: string;
  legalRespTitle: string;
  legalRespText: string;
  legalDataTitle: string;
  legalDataText: string;
  legalEscTitle: string;
  legalEscText: string;
}

const de: Strings = {
  locale: "de-DE",

  navEingangspost: "Eingangspost",
  navAbout: "Über",
  navLegal: "Rechtliches",
  footer: "Lokal verarbeitet · Keine Patientendaten werden über diese Sitzung hinaus gespeichert oder übertragen",
  langToggleTitle: "Sprache wechseln",

  uploadHeading: "Eingehender Brief",
  uploadSubheading:
    "PDF hochladen oder Text einfügen — für eine strukturierte Zusammenfassung und, auf Wunsch, ein Antwortschreiben.",
  dropPrimary: "PDF hier ablegen oder zum Auswählen klicken.",
  fileNote1: "Digitale PDFs werden direkt gelesen.",
  fileNote2:
    "Gescannte Briefe werden im Browser per OCR erkannt — keine Übertragung an externe Dienste.",
  orPaste: "oder Text einfügen",
  pastePlaceholder: "Brieftext hier einfügen…",
  summarizeTextBtn: "Text zusammenfassen",

  loadingAnalyzing: "Brief wird analysiert…",
  loadingReadingPdf: "PDF wird gelesen…",
  loadingOcrPrep: "Gescanntes PDF — OCR wird vorbereitet…",
  loadingSummarizing: "Klinische Zusammenfassung wird erstellt…",
  loadingSub:
    "Der Text wird in Ihrem Browser extrahiert; die Zusammenfassung erstellt Ihr Brain.",
  loadingOcrPage: (page, total) =>
    `Gescanntes PDF — Seite ${page} von ${total} wird per OCR gelesen…`,

  errorTitle: "Verarbeitung fehlgeschlagen",
  retryBtn: "Erneut versuchen",

  errOnlyPdf:
    "Es werden nur PDF-Dateien akzeptiert. Bitte laden Sie eine .pdf-Datei hoch.",
  errTooLarge: "Datei zu groß. Die maximale Größe beträgt 50 MB.",
  errPdfOpen:
    "Dieses PDF konnte nicht geöffnet werden. Die Datei ist möglicherweise beschädigt oder passwortgeschützt.",
  errOcrEmpty:
    "Es konnte kein lesbarer Text extrahiert werden, auch nicht per OCR. Der Scan ist möglicherweise zu schlecht oder die Seite leer.",
  errNoText: "Aus diesem PDF konnte kein Text extrahiert werden.",

  errNotInBrain:
    "Diese App muss innerhalb eines Brains laufen — sie ist derzeit nicht eingebettet.",
  errPermissionDenied:
    "Der App fehlt die Berechtigung 'llm.invoke'. Bitte unter Apps im Brain prüfen.",
  errPermitFailed:
    "Das Brain konnte keine Berechtigung erteilen (Governance-Kernel nicht erreichbar).",
  errMissingMessages: "Interner Fehler: Es wurde keine Eingabe an das Brain übergeben.",
  errTimeout: "Die Anfrage an das Brain hat das Zeitlimit überschritten.",
  errNetwork: "Netzwerkfehler bei der Verbindung zum Brain.",
  errFailed: "Das Brain konnte die Zusammenfassung nicht erstellen.",
  errFallback: (code) => `Erstellung der Zusammenfassung fehlgeschlagen: ${code}`,

  resultTitle: "Befund-Karte",
  copy: "Kopieren",
  copied: "Kopiert",
  translating: "Übersetze…",
  showOriginal: "Original anzeigen",
  translateToEnglish: "Ins Englische übersetzen",
  processAnother: "Weiteren Brief verarbeiten",
  befundHeader: "Eingehender Brief — strukturierte Zusammenfassung",
  befundCreated: "Erstellt",
  emptyValue: "Nicht angegeben",

  printBtn: "Drucken",
  addToRecord: "In Patientenakte übernehmen",
  toastAddedToRecord: "In die Patientenakte übernommen (Demo).",
  forwardToConsult: "An Konsil weiterleiten",
  toastForwarded: "An laufendes Konsil weitergeleitet.",

  replyHeading: "Antwortschreiben (optional)",
  replyPlaceholder:
    "Stichpunkte für die Antwort (optional) — z. B. Termin bestätigt, Medikation angepasst…",
  replyDrafting: "Erstelle Antwort…",
  draftReplyBtn: "Antwort entwerfen",
  copyReply: "Antwort kopieren",

  aboutTitle: "Über Eingangspost",
  aboutLead:
    "Eingangspost für eine deutsche Hausarztpraxis — einen eingehenden Klinik- oder Facharztbrief lesen und eine strukturierte klinische Zusammenfassung erhalten.",
  aboutDoesTitle: "Was es tut",
  aboutDoes1:
    "Liest einen PDF-Brief (Entlassbrief, Verlegungsbrief, Arztbrief) — digital oder gescannt. Der Text wird in Ihrem Browser extrahiert und niemals hochgeladen.",
  aboutDoes2:
    "Gescannte / reine Bild-PDFs werden per On-Device-OCR gelesen (tesseract.js, Deutsch) — ebenfalls vollständig im Browser.",
  aboutDoes3:
    "Bittet das Brain um eine strukturierte Zusammenfassung: Patient, Absender, Diagnosen, Entlassmedikation, für die Hausärztin/den Hausarzt erforderliche Schritte, Hinweise.",
  aboutDoes4:
    "Hebt die beiden wichtigsten Zeilen hervor — empfohlenes Procedere und offene Punkte — als markierte Blöcke.",
  aboutDoes5:
    "Übersetzt eine fertige Zusammenfassung auf Wunsch ins Englische.",
  aboutNotTitle: "Was es NICHT tut",
  aboutNot1: "Stellt keine Diagnose, keine Triage, keine klinischen Entscheidungen.",
  aboutNot2: "Speichert keine Briefe oder Zusammenfassungen — nichts wird dauerhaft abgelegt.",
  aboutNot3:
    "Sendet nichts an ein CDN oder an Dritte — die OCR-Engine und das Sprachmodell laufen über die App bzw. das Brain.",
  aboutNot4: "Kein Chat, keine freie Eingabe.",
  aboutSafeTitle: "Sichere Nutzung",
  aboutSafe1:
    "Jede Zusammenfassung als Entwurf behandeln — gegen den Brief lesen.",
  aboutSafe2:
    "Der Block „empfohlenes Procedere“ ist ein Ausgangspunkt, keine Checkliste.",
  aboutSafe3: "Keine echten Patientenidentifikatoren in diesem Prototyp verwenden.",

  legalTitle: "Rechtliche Hinweise",
  legalLead:
    "Rechtliche Hinweise — bitte lesen, bevor Sie diese App mit echter Korrespondenz verwenden.",
  legalIntendedTitle: "Bestimmungsgemäße Verwendung",
  legalIntendedText:
    "Diese App ist ein Prototyp, der aus einem eingehenden medizinischen Brief eine strukturierte Lesehilfe erstellt. Sie unterstützt eine Ärztin/einen Arzt bei der Sichtung von Korrespondenz. Sie erzeugt nur eine Zusammenfassung, die einer ärztlichen Prüfung gegen den Originalbrief bedarf.",
  legalNotTitle: "Nicht bestimmungsgemäße Verwendung",
  legalNotText:
    "Diese App ist NICHT bestimmt für Diagnosestellung, Therapieentscheidungen, EHR-Integration, Produktiveinsatz oder Weitergabe an Dritte.",
  legalRespTitle: "Verantwortlichkeit",
  legalRespText:
    "Die Verantwortung für alle klinischen Entscheidungen liegt ausschließlich bei der behandelnden Ärztin/dem behandelnden Arzt. Die Zusammenfassung kann Inhalte auslassen oder falsch lesen; sie ersetzt nicht das Lesen des Briefes.",
  legalDataTitle: "Datenverarbeitung",
  legalDataText:
    "Das PDF wird vollständig in Ihrem Browser verarbeitet — die Datei selbst wird niemals hochgeladen. Der extrahierte Brieftext wird über die App-Bridge an Ihr Brain gesendet, damit dessen Modell die Zusammenfassung erstellen kann; er wird im Arbeitsspeicher verarbeitet und von dieser App nicht dauerhaft gespeichert. Verwenden Sie in diesem Prototyp keine echten Patientenidentifikatoren.",
  legalEscTitle: "Eskalationsauslöser",
  legalEscText:
    "Folgendes erfordert vor dem Fortfahren eine rechtliche Prüfung: Speicherung von Patientendaten, Einsatz in einer Klinik, Integration in bestehende Systeme oder Verwendung mit echten Patientendaten.",
};

const en: Strings = {
  locale: "en-GB",

  navEingangspost: "Eingangspost",
  navAbout: "About",
  navLegal: "Legal",
  footer: "Parsed locally · No patient data is stored or transmitted beyond this session",
  langToggleTitle: "Switch language",

  uploadHeading: "Incoming letter",
  uploadSubheading:
    "Upload a PDF or paste text — for a structured summary and, if you want, a reply letter.",
  dropPrimary: "Drop a PDF here or click to choose.",
  fileNote1: "Digital PDFs are read directly.",
  fileNote2:
    "Scanned letters are recognised in the browser via OCR — nothing is sent to external services.",
  orPaste: "or paste text",
  pastePlaceholder: "Paste letter text here…",
  summarizeTextBtn: "Summarise text",

  loadingAnalyzing: "Analysing letter…",
  loadingReadingPdf: "Reading PDF…",
  loadingOcrPrep: "Scanned PDF — preparing OCR…",
  loadingSummarizing: "Generating clinical summary…",
  loadingSub:
    "The text is extracted in your browser; the summary is generated by your brain.",
  loadingOcrPage: (page, total) =>
    `Scanned PDF — reading page ${page} of ${total} via OCR…`,

  errorTitle: "Processing failed",
  retryBtn: "Try again",

  errOnlyPdf: "Only PDF files are accepted. Please upload a .pdf file.",
  errTooLarge: "File too large. The maximum size is 50 MB.",
  errPdfOpen:
    "This PDF could not be opened. The file may be corrupted or password-protected.",
  errOcrEmpty:
    "No readable text could be extracted, not even via OCR. The scan may be too poor or the page empty.",
  errNoText: "No text could be extracted from this PDF.",

  errNotInBrain:
    "This app must run inside a brain — it is currently not embedded.",
  errPermissionDenied:
    "The app lacks the 'llm.invoke' permission. Please check under Apps in the brain.",
  errPermitFailed:
    "The brain could not grant a permit (governance kernel unreachable).",
  errMissingMessages: "Internal error: no input was passed to the brain.",
  errTimeout: "The request to the brain timed out.",
  errNetwork: "Network error connecting to the brain.",
  errFailed: "The brain could not generate the summary.",
  errFallback: (code) => `Generating the summary failed: ${code}`,

  resultTitle: "Findings card",
  copy: "Copy",
  copied: "Copied",
  translating: "Translating…",
  showOriginal: "Show original",
  translateToEnglish: "Translate to English",
  processAnother: "Process another letter",
  befundHeader: "Incoming letter — structured summary",
  befundCreated: "Generated",
  emptyValue: "Not specified",

  printBtn: "Print",
  addToRecord: "Add to patient record",
  toastAddedToRecord: "Added to the patient record (demo).",
  forwardToConsult: "Forward to consult",
  toastForwarded: "Forwarded to the ongoing consult.",

  replyHeading: "Reply letter (optional)",
  replyPlaceholder:
    "Bullet points for the reply (optional) — e.g. appointment confirmed, medication adjusted…",
  replyDrafting: "Drafting reply…",
  draftReplyBtn: "Draft reply",
  copyReply: "Copy reply",

  aboutTitle: "About Eingangspost",
  aboutLead:
    "Letter ingestion for a German GP practice — read an incoming hospital or specialist letter and get a structured clinical summary.",
  aboutDoesTitle: "What it does",
  aboutDoes1:
    "Reads a PDF letter (Entlassbrief, Verlegungsbrief, Arztbrief) — digital or scanned. Text is extracted in your browser, never uploaded.",
  aboutDoes2:
    "Scanned / image-only PDFs are read with on-device OCR (tesseract.js, German) — also entirely in the browser.",
  aboutDoes3:
    "Asks the brain to return a structured summary: patient, sender, diagnoses, discharge medication, action required by the GP, flags.",
  aboutDoes4:
    "Surfaces the two lines that matter most — action required and flags — as highlighted blocks.",
  aboutDoes5: "Translates a finished summary to English on request.",
  aboutNotTitle: "What it does NOT do",
  aboutNot1: "Does not diagnose, triage, or make clinical decisions.",
  aboutNot2: "Does not store letters or summaries — nothing is persisted.",
  aboutNot3:
    "Does not send anything to a CDN or third party — the OCR engine and language model are bundled with the app and brain.",
  aboutNot4: "No chat, no free-form input.",
  aboutSafeTitle: "Safe usage",
  aboutSafe1: "Treat every summary as a draft — read it against the letter.",
  aboutSafe2: "The recommended-action block is a starting point, not a checklist.",
  aboutSafe3: "Do not use real patient identifiers in this prototype.",

  legalTitle: "Legal Notice",
  legalLead:
    "Legal notice — please read before using this app with any real correspondence.",
  legalIntendedTitle: "Intended use",
  legalIntendedText:
    "This app is a prototype that produces a structured reading aid from an incoming medical letter. It supports a physician in triaging correspondence. It generates only a summary that requires physician review against the original letter.",
  legalNotTitle: "Not intended for",
  legalNotText:
    "This app is NOT intended for diagnosis, therapy decisions, EHR integration, production deployment, or distribution to third parties.",
  legalRespTitle: "Responsibility",
  legalRespText:
    "Responsibility for all clinical decisions lies solely with the treating physician. The summary may omit or misread content; it does not replace reading the letter.",
  legalDataTitle: "Data handling",
  legalDataText:
    "The PDF is parsed entirely in your browser — the file itself is never uploaded. The extracted letter text is sent to your brain over the app bridge so the brain's model can generate the summary; it is processed in memory and not persisted by this app. Do not use real patient identifiers in this prototype.",
  legalEscTitle: "Escalation triggers",
  legalEscText:
    "The following require legal review before proceeding: storing patient data, deploying to a clinic, integrating with existing systems, or use with real patient data.",
};

const strings: Record<Lang, Strings> = { de, en };

export function t(lang: Lang): Strings {
  return strings[lang];
}
