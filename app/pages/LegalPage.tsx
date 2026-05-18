/** Legal page — intended use, limits, responsibility, data handling. */

export function LegalPage() {
  return (
    <div className="doc-page">
      <h1>Legal Notice</h1>
      <p className="doc-lead">
        Rechtliche Hinweise — please read before using this app with any real
        correspondence.
      </p>

      <div className="doc-section">
        <h2>Intended use</h2>
        <p>
          This app is a prototype that produces a structured reading aid from
          an incoming medical letter. It supports a physician in triaging
          correspondence. It generates only a summary that requires physician
          review against the original letter.
        </p>
      </div>

      <div className="doc-section">
        <h2>Not intended for</h2>
        <p>
          This app is NOT intended for diagnosis, therapy decisions, EHR
          integration, production deployment, or distribution to third
          parties.
        </p>
      </div>

      <div className="doc-section">
        <h2>Responsibility</h2>
        <p>
          Responsibility for all clinical decisions lies solely with the
          treating physician. The summary may omit or misread content; it does
          not replace reading the letter.
        </p>
      </div>

      <div className="doc-section">
        <h2>Data handling</h2>
        <p>
          The PDF is parsed entirely in your browser — the file itself is never
          uploaded. The extracted letter text is sent to your brain over the
          app bridge so the brain&apos;s model can generate the summary; it is
          processed in memory and not persisted by this app. Do not use real
          patient identifiers in this prototype.
        </p>
      </div>

      <div className="doc-section">
        <h2>Escalation triggers</h2>
        <p>
          The following require legal review before proceeding: storing
          patient data, deploying to a clinic, integrating with existing
          systems, or use with real patient data.
        </p>
      </div>
    </div>
  );
}
