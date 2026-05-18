/**
 * Orchestration glue: extracted letter text -> brain -> structured summary,
 * and finished summary -> brain -> English translation.
 *
 * No memory. No autonomy. The app extracts text in the browser, then asks the
 * host brain to do the reading via the `llm.complete` bridge. Read-only.
 */

import { llmComplete } from "./brainBridge";
import { SUMMARIZE_INSTRUCTIONS, translateInstructions } from "./prompts";

/**
 * Summarize a letter. `letterText` is the text layer extracted client-side by
 * pdf.js. Rejects with an Error whose message is a bridge error code.
 */
export async function summarizeLetter(letterText: string): Promise<string> {
  const result = await llmComplete([
    {
      role: "user",
      content: `${SUMMARIZE_INSTRUCTIONS}\n\nHere is the medical letter:\n\n${letterText}`,
    },
  ]);
  return result.text;
}

/**
 * Translate a finished structured summary to English. Rejects with an Error
 * whose message is a bridge error code.
 */
export async function translateSummary(summary: string): Promise<string> {
  const result = await llmComplete([
    { role: "user", content: translateInstructions(summary) },
  ]);
  return result.text;
}
