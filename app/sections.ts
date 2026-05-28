/**
 * Section model for the structured clinical summary (the "Befund-Karte"),
 * plus a tolerant parser.
 *
 * The summary comes back from the brain — which runs under its own persona —
 * so it may not reproduce the requested headers byte-for-byte, and it will not
 * always emit every section (e.g. Aufenthaltszeitraum only exists for a
 * discharge letter). The parser detects header lines by normalized, alias-based
 * matching (the German headers we request, plus likely variants and the older
 * English forms) and captures each body up to the next header. Only the
 * sections actually present are rendered; if none is recognized, the caller
 * falls back to rendering the raw text.
 */

export type SectionKey =
  | "absender"
  | "patient"
  | "aufenthalt"
  | "diagnosen"
  | "therapie"
  | "medikation"
  | "procedere"
  | "offen";

export interface SectionDef {
  key: SectionKey;
  /** Display label in the Befund-Karte. */
  label: string;
  /** Lowercased header forms to match against. */
  aliases: string[];
}

export const SECTIONS: SectionDef[] = [
  {
    key: "absender",
    label: "Absender",
    aliases: ["absender", "absendende klinik", "absendende einrichtung", "einsender", "sender", "received from"],
  },
  {
    key: "patient",
    label: "Patient",
    aliases: ["patient", "patientin", "patient/in"],
  },
  {
    key: "aufenthalt",
    label: "Aufenthaltszeitraum",
    aliases: ["aufenthaltszeitraum", "aufenthalt", "stationärer aufenthalt", "behandlungszeitraum"],
  },
  {
    key: "diagnosen",
    label: "Hauptdiagnosen",
    aliases: ["hauptdiagnosen", "hauptdiagnose", "diagnosen", "diagnose", "primary diagnoses", "diagnoses"],
  },
  {
    key: "therapie",
    label: "Therapie / Maßnahmen",
    aliases: [
      "therapie / maßnahmen",
      "therapie / massnahmen",
      "therapie und maßnahmen",
      "therapie",
      "maßnahmen",
      "massnahmen",
      "durchgeführte maßnahmen",
      "behandlung",
    ],
  },
  {
    key: "medikation",
    label: "Medikation bei Entlassung",
    aliases: [
      "medikation bei entlassung",
      "entlassmedikation",
      "medikation bei entlassung/überweisung",
      "medikation",
      "medikamente",
      "current medications",
    ],
  },
  {
    key: "procedere",
    label: "Empfohlenes Procedere für die Hausärztin/den Hausarzt",
    aliases: [
      "empfohlenes procedere für die hausärztin/den hausarzt",
      "empfohlenes procedere",
      "empfohlenes vorgehen",
      "weiteres vorgehen",
      "procedere",
      "prozedere",
      "empfehlungen",
      "action required by gp",
    ],
  },
  {
    key: "offen",
    label: "Offene Punkte / Anschlussbedarf",
    aliases: [
      "offene punkte / anschlussbedarf",
      "offene punkte",
      "anschlussbedarf",
      "offene fragen",
      "hinweise",
      "flags",
    ],
  },
];

export type ParsedSummary = Partial<Record<SectionKey, string>>;

/**
 * Is this line a section header? Strip markdown noise and a trailing colon,
 * then match the normalized line against the aliases. A match is exact, or a
 * word-boundary prefix (alias followed by a space or a slash) — so a short
 * alias like "empfohlenes procedere" still catches the full
 * "Empfohlenes Procedere für die Hausärztin/den Hausarzt" header, while
 * "diagnose" does not swallow "Diagnosen" mid-word.
 */
function headerKey(line: string): SectionKey | null {
  const norm = line
    .replace(/^[#*>\s-]+/, "")
    .replace(/[*:#\s]+$/, "")
    .trim()
    .toLowerCase();
  if (!norm || norm.length > 64) return null;
  for (const s of SECTIONS) {
    for (const a of s.aliases) {
      if (norm === a) return s.key;
      if (norm.startsWith(a)) {
        const rest = norm.slice(a.length);
        if (rest.startsWith(" ") || rest.startsWith("/")) return s.key;
      }
    }
  }
  return null;
}

/** Parse a raw summary into a map of section key -> body text. */
export function parseSummary(raw: string): ParsedSummary {
  const collected: Partial<Record<SectionKey, string[]>> = {};
  let current: SectionKey | null = null;

  for (const line of raw.split("\n")) {
    if (/^-{2,}$/.test(line.trim())) continue; // skip "---" separators
    const k = headerKey(line);
    if (k) {
      current = k;
      collected[k] = collected[k] || [];
      continue;
    }
    if (current) collected[current]!.push(line);
  }

  const out: ParsedSummary = {};
  for (const s of SECTIONS) {
    const body = (collected[s.key] || []).join("\n").trim();
    if (body) out[s.key] = body;
  }
  return out;
}
