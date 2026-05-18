/** About page — what the app does, what it does not, how to use it safely. */

export function AboutPage() {
  return (
    <div className="doc-page">
      <h1>About Eingangspost</h1>
      <p className="doc-lead">
        Letter ingestion for a German GP practice — read an incoming hospital
        or specialist letter and get a structured clinical summary.
      </p>

      <div className="doc-section">
        <h2>What it does</h2>
        <ul>
          <li>
            Reads a digital PDF letter (Entlassbrief, Verlegungsbrief,
            Arztbrief) — text is extracted in your browser, never uploaded.
          </li>
          <li>
            Asks the brain to return a structured summary: patient, sender,
            diagnoses, discharge medication, action required by the GP, flags.
          </li>
          <li>
            Surfaces the two lines that matter most — Action Required and
            Flags — as highlighted blocks.
          </li>
          <li>Translates a finished summary to English on request.</li>
        </ul>
      </div>

      <div className="doc-section">
        <h2>What it does NOT do</h2>
        <ul>
          <li>Does not diagnose, triage, or make clinical decisions.</li>
          <li>Does not store letters or summaries — nothing is persisted.</li>
          <li>
            Does not read scanned / image-only PDFs in this version — only
            PDFs with a real text layer. OCR is a planned follow-up.
          </li>
          <li>No chat, no free-form input.</li>
        </ul>
      </div>

      <div className="doc-section">
        <h2>Safe usage</h2>
        <ul>
          <li>Treat every summary as a draft — read it against the letter.</li>
          <li>The Action Required block is a starting point, not a checklist.</li>
          <li>Do not use real patient identifiers in this prototype.</li>
        </ul>
      </div>
    </div>
  );
}
