/** Legal page — intended use, limits, responsibility, data handling. */

import type { Strings } from "../i18n";

export function LegalPage({ s }: { s: Strings }) {
  return (
    <div className="doc-page">
      <h1>{s.legalTitle}</h1>
      <p className="doc-lead">{s.legalLead}</p>

      <div className="doc-section">
        <h2>{s.legalIntendedTitle}</h2>
        <p>{s.legalIntendedText}</p>
      </div>

      <div className="doc-section">
        <h2>{s.legalNotTitle}</h2>
        <p>{s.legalNotText}</p>
      </div>

      <div className="doc-section">
        <h2>{s.legalRespTitle}</h2>
        <p>{s.legalRespText}</p>
      </div>

      <div className="doc-section">
        <h2>{s.legalDataTitle}</h2>
        <p>{s.legalDataText}</p>
      </div>

      <div className="doc-section">
        <h2>{s.legalEscTitle}</h2>
        <p>{s.legalEscText}</p>
      </div>
    </div>
  );
}
