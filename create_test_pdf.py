"""
create_test_pdf.py — Generates a synthetic German Entlassbrief for pipeline testing.

Usage:
    pip install reportlab
    python create_test_pdf.py

Output: test_data/synthetic_entlassbrief.pdf

All patient data is entirely fictional. Do not use real patient information.
"""

from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER, TA_JUSTIFY

OUTPUT_DIR = Path(__file__).parent / "test_data"
OUTPUT_PATH = OUTPUT_DIR / "synthetic_entlassbrief.pdf"


def build():
    OUTPUT_DIR.mkdir(exist_ok=True)

    doc = SimpleDocTemplate(
        str(OUTPUT_PATH),
        pagesize=A4,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    header_style = ParagraphStyle(
        "HeaderStyle",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#444444"),
        leading=13,
    )
    institution_style = ParagraphStyle(
        "InstitutionStyle",
        parent=styles["Normal"],
        fontSize=11,
        fontName="Helvetica-Bold",
        leading=15,
    )
    dept_style = ParagraphStyle(
        "DeptStyle",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#555555"),
        leading=13,
    )
    to_style = ParagraphStyle(
        "ToStyle",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
    )
    subject_style = ParagraphStyle(
        "SubjectStyle",
        parent=styles["Normal"],
        fontSize=10.5,
        fontName="Helvetica-Bold",
        leading=14,
    )
    body_style = ParagraphStyle(
        "BodyStyle",
        parent=styles["Normal"],
        fontSize=9.5,
        leading=14,
        alignment=TA_JUSTIFY,
    )
    heading2_style = ParagraphStyle(
        "Heading2Style",
        parent=styles["Normal"],
        fontSize=10,
        fontName="Helvetica-Bold",
        leading=14,
        spaceAfter=2,
    )
    list_style = ParagraphStyle(
        "ListStyle",
        parent=styles["Normal"],
        fontSize=9.5,
        leading=14,
        leftIndent=12,
    )
    footer_style = ParagraphStyle(
        "FooterStyle",
        parent=styles["Normal"],
        fontSize=8.5,
        textColor=colors.HexColor("#666666"),
        leading=12,
    )

    story = []

    # ── Sender block ───────────────────────────────────────────────
    story.append(Paragraph("Universitätsklinikum Beispielstadt", institution_style))
    story.append(Paragraph("Medizinische Klinik II – Kardiologie und Angiologie", dept_style))
    story.append(Paragraph("Klinikstraße 1 · 80331 Beispielstadt", dept_style))
    story.append(Paragraph("Tel: 089 / 123456-200 · Fax: 089 / 123456-299", dept_style))
    story.append(Paragraph("E-Mail: kardiologie@uk-beispielstadt.de", dept_style))
    story.append(Spacer(1, 0.4 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CCCCCC")))
    story.append(Spacer(1, 0.5 * cm))

    # ── Recipient + date (two-column table) ────────────────────────
    recipient_text = (
        "<b>An:</b><br/>"
        "Dr. med. Petra Müller<br/>"
        "Hausarztpraxis Mitte<br/>"
        "Hauptstraße 42<br/>"
        "12345 Musterstadt"
    )
    date_text = (
        "Beispielstadt, 20. Februar 2026<br/>"
        "<br/>"
        "<b>Unser Zeichen:</b> KA/2026/08847<br/>"
        "<b>Ihr Patient:</b> Hans-Werner Becker"
    )

    addr_table = Table(
        [[Paragraph(recipient_text, to_style), Paragraph(date_text, header_style)]],
        colWidths=["55%", "45%"],
    )
    addr_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(addr_table)
    story.append(Spacer(1, 0.7 * cm))

    # ── Subject line ───────────────────────────────────────────────
    story.append(Paragraph(
        "Entlassbrief – stationärer Aufenthalt 12.02.2026 bis 19.02.2026",
        subject_style,
    ))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        "Patient: <b>Hans-Werner Becker</b> &nbsp;·&nbsp; "
        "geb. <b>14.03.1952</b> &nbsp;·&nbsp; "
        "Patientennr.: <b>KH-2026-08847</b>",
        body_style,
    ))
    story.append(Spacer(1, 0.6 * cm))

    # ── Salutation ─────────────────────────────────────────────────
    story.append(Paragraph("Sehr geehrte Frau Kollegin,", body_style))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "wir berichten über den oben genannten Patienten (72 Jahre, männlich), "
        "der sich vom 12. bis 19. Februar 2026 zur stationären Behandlung in "
        "unserer Klinik befand. Wir danken Ihnen für die freundliche Überweisung.",
        body_style,
    ))
    story.append(Spacer(1, 0.5 * cm))

    # ── Diagnoses ──────────────────────────────────────────────────
    story.append(Paragraph("Diagnosen", heading2_style))
    for dx in [
        "1. Nicht-ST-Hebungsinfarkt (NSTEMI) (ICD: I21.4) — Akutereignis",
        "2. Arterielle Hypertonie, bekannt, medikamentös eingestellt (ICD: I10)",
        "3. Diabetes mellitus Typ 2, bekannt (ICD: E11.9), zuletzt HbA1c 7,8 %",
    ]:
        story.append(Paragraph(dx, list_style))
    story.append(Spacer(1, 0.5 * cm))

    # ── Clinical course ────────────────────────────────────────────
    story.append(Paragraph("Klinischer Verlauf", heading2_style))
    story.append(Paragraph(
        "Herr Becker stellte sich am 12.02.2026 gegen 03:40 Uhr in unserer Notaufnahme "
        "mit akutem Thoraxschmerz, Dyspnoe und Schweißausbrüchen vor. Im 12-Kanal-EKG "
        "zeigten sich neue ST-Senkungen in V4–V6 sowie ein neu aufgetretener "
        "Linksschenkelblock. Die hochsensitiven Troponinwerte (hsTnI) waren mit "
        "1.842 ng/l (Referenz < 34 ng/l) deutlich erhöht.",
        body_style,
    ))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "Es erfolgte eine notfallmäßige Koronarangiographie, die eine hochgradige "
        "(90-prozentige) Stenose des Ramus interventricularis anterior (RIVA) zeigte. "
        "Die anderen Koronargefäße waren ohne signifikante Stenosen. Es wurde eine "
        "perkutane transluminale Koronarangioplastie (PTCA) mit Implantation eines "
        "medikamentenfreisetzenden Stents (DES, 3,0 × 20 mm, Everolimus-beschichtet) "
        "durchgeführt. Der Eingriff verlief komplikationslos mit gutem angiographischen "
        "Ergebnis (TIMI-3-Fluss).",
        body_style,
    ))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "Der postinterventionelle Verlauf war unkompliziert. Echokardiographisch zeigte "
        "sich eine leichtgradig reduzierte linksventrikuläre systolische Funktion "
        "(EF 48 %). Eine Verlegung auf die Normalstation erfolgte am 14.02.2026. "
        "Die Mobilisation verlief problemlos. Hinsichtlich des Diabetes wurde der "
        "behandelnde Diabetologe konsiliarisch hinzugezogen.",
        body_style,
    ))
    story.append(Spacer(1, 0.5 * cm))

    # ── Medications ────────────────────────────────────────────────
    story.append(Paragraph("Medikation bei Entlassung", heading2_style))
    meds = [
        ("ASS (Acetylsalicylsäure)",   "100 mg",   "1-0-0",   "dauerhaft"),
        ("Ticagrelor",                  "90 mg",    "1-0-1",   "mind. 12 Monate — NICHT absetzen ohne kardiol. Rücksprache"),
        ("Bisoprolol",                  "5 mg",     "1-0-0",   "dauerhaft"),
        ("Ramipril",                    "5 mg",     "1-0-0",   "dauerhaft"),
        ("Atorvastatin",                "40 mg",    "0-0-1",   "dauerhaft"),
        ("Pantoprazol",                 "40 mg",    "1-0-0",   "für 3 Monate"),
        ("Metformin",                   "500 mg",   "1-0-1",   "nach Rücksprache mit Diabetologen fortführen"),
    ]
    med_table = Table(
        [["Medikament", "Dosis", "Schema", "Hinweis"]] +
        [[Paragraph(m[0], list_style), m[1], m[2], Paragraph(m[3], footer_style)] for m in meds],
        colWidths=["32%", "12%", "12%", "44%"],
        hAlign="LEFT",
    )
    med_table.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, 0), colors.HexColor("#F0F4F8")),
        ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (-1, 0), 8.5),
        ("FONTSIZE",     (0, 1), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAFAFA")]),
        ("GRID",         (0, 0), (-1, -1), 0.4, colors.HexColor("#DDDDDD")),
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",   (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(med_table)
    story.append(Spacer(1, 0.5 * cm))

    # ── Recommendations ────────────────────────────────────────────
    story.append(Paragraph("Empfehlungen / Weiteres Vorgehen", heading2_style))
    recs = [
        "Duale Thrombozytenaggregationshemmung (ASS + Ticagrelor) für mindestens 12 Monate "
        "unbedingt beibehalten — kein Absetzen ohne vorherige kardiologische Rücksprache. "
        "Risiko einer In-Stent-Thrombose bei vorzeitigem Absetzen.",
        "Kardiologische Nachkontrolle in 4 Wochen — bitte Überweisung ausstellen. "
        "Ziel: Echokardiographie-Kontrolle, EKG, Laborkontrolle.",
        "HbA1c-Kontrolle und diabetologische Mitbetreuung in 6 Wochen empfohlen. "
        "Metformin-Dosisanpassung je nach Nierenfunktion (aktuell Kreatinin 1,1 mg/dl).",
        "Blutdruckkontrolle bei jedem Praxisbesuch. Zielwert systolisch < 130 mmHg.",
        "Fahrverbot für 4 Wochen aufgrund des akuten kardialen Ereignisses — "
        "Patient wurde darüber aufgeklärt.",
        "Laborkontrolle in 2 Wochen: Blutbild, Nierenwerte, Elektrolyte, Transaminasen "
        "(Statin-Kontrolle), Lipidstatus.",
        "Lebensstilberatung: Nikotinabstinenz, mediterrane Ernährung, körperliche Belastung "
        "graduell steigern ab Woche 4, kardiale Rehabilitation empfohlen.",
    ]
    for i, rec in enumerate(recs, 1):
        story.append(Paragraph(f"{i}. {rec}", list_style))
        story.append(Spacer(1, 0.1 * cm))
    story.append(Spacer(1, 0.4 * cm))

    # ── Closing ────────────────────────────────────────────────────
    story.append(Paragraph(
        "Bei Fragen stehen wir Ihnen jederzeit zur Verfügung. "
        "Wir bedanken uns für das entgegengebrachte Vertrauen.",
        body_style,
    ))
    story.append(Spacer(1, 0.6 * cm))
    story.append(Paragraph("Mit freundlichen kollegialen Grüßen,", body_style))
    story.append(Spacer(1, 0.8 * cm))
    story.append(Paragraph(
        "<b>Prof. Dr. med. Klaus Herzmann</b><br/>"
        "Leitender Oberarzt, Kardiologie und Angiologie<br/>"
        "Universitätsklinikum Beispielstadt",
        body_style,
    ))
    story.append(Spacer(1, 0.4 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CCCCCC")))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "Dieses Dokument enthält fiktive Patientendaten. Ausschließlich zur "
        "technischen Erprobung des hbar.health-Systems erstellt. "
        "Kein Bezug zu realen Personen oder Einrichtungen.",
        footer_style,
    ))

    doc.build(story)
    print(f"✓ Test PDF created: {OUTPUT_PATH}")


if __name__ == "__main__":
    build()
