/**
 * Section model for the clinical summary, plus a tolerant parser.
 *
 * The summary comes back from the brain — which runs under its own persona —
 * so it may not reproduce the requested headers byte-for-byte. The parser
 * detects header lines by normalized, alias-based matching (English + likely
 * German equivalents) and captures each body up to the next header. If no
 * section is recognized at all, the caller falls back to rendering raw text.
 */

export type SectionKey =
  | "patient"
  | "receivedFrom"
  | "diagnoses"
  | "medications"
  | "action"
  | "flags";

export interface SectionDef {
  key: SectionKey;
  /** Display label in the result view. */
  label: string;
  /** Lowercased header forms to match against. */
  aliases: string[];
}

export const SECTIONS: SectionDef[] = [
  {
    key: "patient",
    label: "Patient",
    aliases: ["patient", "patientin"],
  },
  {
    key: "receivedFrom",
    label: "Received from",
    aliases: ["received from", "received", "absender", "von", "sender"],
  },
  {
    key: "diagnoses",
    label: "Primary diagnoses",
    aliases: ["primary diagnoses", "diagnoses", "diagnosen", "hauptdiagnosen", "diagnose"],
  },
  {
    key: "medications",
    label: "Current medications",
    aliases: [
      "current medications at discharge/referral",
      "current medications",
      "medications",
      "medikation",
      "medikamente",
      "entlassmedikation",
    ],
  },
  {
    key: "action",
    label: "Action required by GP",
    aliases: [
      "action required by gp",
      "action required",
      "weiteres vorgehen",
      "procedere",
      "prozedere",
      "empfehlungen",
    ],
  },
  {
    key: "flags",
    label: "Flags",
    aliases: ["flags", "hinweise", "auffälligkeiten", "warnungen"],
  },
];

export type ParsedSummary = Partial<Record<SectionKey, string>>;

/**
 * Is this line a section header? Strip markdown noise and a trailing colon,
 * then match the whole normalized line (or "<alias> /…") against the aliases.
 */
function headerKey(line: string): SectionKey | null {
  const norm = line
    .replace(/^[#*>\s-]+/, "")
    .replace(/[*:#\s]+$/, "")
    .trim()
    .toLowerCase();
  if (!norm || norm.length > 52) return null;
  for (const s of SECTIONS) {
    for (const a of s.aliases) {
      if (norm === a || norm.startsWith(a + " /") || norm.startsWith(a + "/")) {
        return s.key;
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

/** True when the FLAGS section is empty or an explicit "none". */
export function isNoFlags(body: string | undefined): boolean {
  return !body || /^(none|keine)\.?$/i.test(body.trim());
}
