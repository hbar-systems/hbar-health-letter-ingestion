/** About page — what the app does, what it does not, how to use it safely. */

import type { Strings } from "../i18n";

export function AboutPage({ s }: { s: Strings }) {
  return (
    <div className="doc-page">
      <h1>{s.aboutTitle}</h1>
      <p className="doc-lead">{s.aboutLead}</p>

      <div className="doc-section">
        <h2>{s.aboutDoesTitle}</h2>
        <ul>
          <li>{s.aboutDoes1}</li>
          <li>{s.aboutDoes2}</li>
          <li>{s.aboutDoes3}</li>
          <li>{s.aboutDoes4}</li>
          <li>{s.aboutDoes5}</li>
        </ul>
      </div>

      <div className="doc-section">
        <h2>{s.aboutNotTitle}</h2>
        <ul>
          <li>{s.aboutNot1}</li>
          <li>{s.aboutNot2}</li>
          <li>{s.aboutNot3}</li>
          <li>{s.aboutNot4}</li>
        </ul>
      </div>

      <div className="doc-section">
        <h2>{s.aboutSafeTitle}</h2>
        <ul>
          <li>{s.aboutSafe1}</li>
          <li>{s.aboutSafe2}</li>
          <li>{s.aboutSafe3}</li>
        </ul>
      </div>
    </div>
  );
}
