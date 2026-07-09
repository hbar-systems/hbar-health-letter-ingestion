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
 * German section headers are fixed so the Befund-Karte parses reliably (see
 * sections.ts); the CONTENT is written in the letter's own language.
 */
export const SUMMARIZE_INSTRUCTIONS = `Du bist ein klinischer Dokumentenassistent für eine deutsche Hausarztpraxis.
Du erhältst den vollständigen Text eines eingehenden ärztlichen Briefes
(Arztbrief, Verlegungsbrief oder Entlassbrief) aus einer Klinik oder von
einer Fachärztin/einem Facharzt.

Extrahiere und gib AUSSCHLIESSLICH das Folgende zurück, in genau dieser
Struktur und mit genau diesen deutschen Abschnittsüberschriften:

Absender
- Einrichtung:
- Abteilung:
- Datum des Briefes:

Patient
- Name:
- Geburtsdatum:
- Fallnummer (falls vorhanden):

Aufenthaltszeitraum
(nur bei einem Entlassbrief: Aufnahme- und Entlassdatum;
sonst diesen Abschnitt ganz weglassen)

Hauptdiagnosen
(jede Diagnose knapp, eine pro Zeile)

Therapie / Maßnahmen
(durchgeführte Behandlungen, Eingriffe und Maßnahmen)

Medikation bei Entlassung
(Wirkstoff, Dosis, Frequenz — eine pro Zeile)
(falls nicht vorhanden, schreibe: Nicht angegeben)

Empfohlenes Procedere für die Hausärztin/den Hausarzt
(jede ausdrückliche Empfehlung oder Verlaufskontrolle aus dem Brief —
das sind die wichtigsten Zeilen)

Offene Punkte / Anschlussbedarf
(ausstehende Befunde, Termine, Unklarheiten oder widersprüchliche Angaben;
falls keine, schreibe: Keine)

Regeln:
- Übernimm die Abschnittsüberschriften exakt wie oben gezeigt.
- Schreibe den INHALT in der Sprache des Briefes (Deutsch oder Englisch).
- Fasse dich kurz — die Hausärztin/der Hausarzt braucht nicht die volle Erzählung.
- Erfinde niemals Informationen, die nicht im Brief stehen.
- Lass einen Abschnitt aus, wenn der Brief dazu nichts enthält
  (außer Medikation und Offene Punkte, dort schreibe "Nicht angegeben" bzw. "Keine").
- Der Abschnitt "Empfohlenes Procedere" ist der wichtigste — niemals weglassen oder kürzen.
- Verwende keinerlei Markdown-Formatierung — kein ##, kein **, kein *, kein _.
- Nutze nur reinen Text und die exakten Abschnittsüberschriften oben.`;

/** Build the reply-draft prompt: incoming letter + optional doctor bullets -> formal reply. */
export function replyInstructions(letterText: string, points: string): string {
  return `Du bist ein klinischer Dokumentenassistent für eine deutsche Hausarztpraxis. Formuliere einen kurzen, formellen Antwortbrief (Antwortschreiben) an den Absender des folgenden eingehenden Briefes.

Regeln:
- Verwende NUR Informationen aus dem eingehenden Brief und den Stichpunkten des Arztes. Erfinde nichts.
- Formeller, kollegialer deutscher Briefstil (Anrede "Sehr geehrte Kollegin, sehr geehrter Kollege," bzw. namentlich falls im Brief genannt; Grußformel "Mit kollegialen Grüßen").
- Kurz und sachlich. Keine neuen Diagnosen, Befunde oder Therapieempfehlungen erfinden.
- Beginne den Text mit der Zeile: ENTWURF — ärztliche Prüfung und Freigabe erforderlich.
- Keine Markdown-Formatierung (kein ##, **, *, _).

Eingehender Brief:
${letterText}

Stichpunkte des Arztes für die Antwort:
${points.trim() || "(keine — kurze Empfangsbestätigung und Rückmeldung an den Absender)"}`;
}

/** Build the translation prompt for a finished structured summary. */
export function translateInstructions(summary: string): string {
  return (
    "Translate the following structured clinical summary to English. " +
    "Keep the section headers (Absender, Patient, Hauptdiagnosen, etc.) " +
    "in German exactly as written and keep the structure. " +
    "Translate only the content — do not add, remove, or summarise anything. " +
    "Do not use markdown formatting.\n\n" +
    summary
  );
}
