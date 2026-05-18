/**
 * Prompt text for the two brain calls: summarize an incoming letter, and
 * translate a finished summary to English.
 *
 * These are sent as the body of a single `user` message through the
 * `llm.complete` bridge (see brainBridge.ts) — the brain runs them under its
 * own persona, RAG-retrieving over the practice corpus. Fixed, literal
 * instructions; no chat, no free-form generation.
 */

/**
 * Summarization instructions. Prepended to the extracted letter text. The
 * English section headers are fixed so the summary parses reliably (see
 * sections.ts); the CONTENT is written in the letter's own language.
 */
export const SUMMARIZE_INSTRUCTIONS = `You are a clinical document assistant for a German GP practice.
You will receive the full text of an incoming medical letter
(Arztbrief, Verlegungsbrief, or Entlassbrief) from a hospital
or specialist.

Extract and return ONLY the following, in this exact structure,
using these exact English section headers:

PATIENT
- Name:
- Date of birth:
- Case/Patient number (if present):

RECEIVED FROM
- Institution:
- Department:
- Date of letter:

PRIMARY DIAGNOSES
(list each diagnosis concisely, one per line)

CURRENT MEDICATIONS AT DISCHARGE/REFERRAL
(list drug name, dose, frequency — one per line)
(if not present, write: Not specified)

ACTION REQUIRED BY GP
(list every explicit recommendation or follow-up instruction
from the letter — these are the most important lines)

FLAGS
(list anything urgent, unusual, or that requires immediate
attention — conflicting information, missing data,
abnormal values explicitly highlighted by the sender)
(if nothing flagged, write: None)

Rules:
- Keep the section headers in English exactly as shown above.
- Write the CONTENT in the same language as the letter (German or English).
- Be concise — the GP does not need the full narrative.
- Never invent information not present in the letter.
- If a section has no relevant content, write: Not specified
- The ACTION REQUIRED section is the most critical — never omit or shorten it.
- Do not use markdown formatting of any kind — no ##, no **, no *, no _.
- Use only plain text and the exact section headers shown above.`;

/** Build the translation prompt for a finished structured summary. */
export function translateInstructions(summary: string): string {
  return (
    "Translate the following structured clinical summary to English. " +
    "Keep the exact section headers (PATIENT, RECEIVED FROM, etc.) and structure. " +
    "Translate only the content — do not add, remove, or summarise anything. " +
    "Do not use markdown formatting.\n\n" +
    summary
  );
}
