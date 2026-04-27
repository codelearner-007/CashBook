from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch


def generate_pdf(book_name: str, currency: str, entries: list, summary: dict, date_from=None, date_to=None) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=0.5 * inch, rightMargin=0.5 * inch,
        topMargin=0.5 * inch, bottomMargin=0.5 * inch,
    )
    styles = getSampleStyleSheet()
    primary = colors.HexColor("#3B5BDB")
    green   = colors.HexColor("#2E7D32")
    red     = colors.HexColor("#C62828")
    grey_bg = colors.HexColor("#F8F9FA")
    elements = []

    # ── Header ────────────────────────────────────────────────────────────────
    title_style = ParagraphStyle("Title", fontSize=16, fontName="Helvetica-Bold", textColor=primary)
    elements.append(Paragraph(f"CashBook — {book_name}", title_style))
    elements.append(Spacer(1, 4))

    date_label = f"{date_from or 'All time'}  →  {date_to or 'today'}"
    elements.append(Paragraph(date_label, styles["Normal"]))
    elements.append(Spacer(1, 14))

    # ── Summary row ───────────────────────────────────────────────────────────
    sym = currency
    s_data = [
        ["Total In", "Total Out", "Net Balance"],
        [
            f"{sym} {summary['total_in']:,.2f}",
            f"{sym} {summary['total_out']:,.2f}",
            f"{sym} {summary['net_balance']:,.2f}",
        ],
    ]
    s_table = Table(s_data, colWidths=[2.2 * inch, 2.2 * inch, 2.2 * inch])
    s_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), primary),
        ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
        ("FONTNAME",   (0, 0), (-1, -1), "Helvetica-Bold"),
        ("ALIGN",      (0, 0), (-1, -1), "CENTER"),
        ("BOX",        (0, 0), (-1, -1), 1, colors.black),
        ("GRID",       (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("FONTSIZE",   (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(s_table)
    elements.append(Spacer(1, 18))

    # ── Entries table ─────────────────────────────────────────────────────────
    rows = [["Date", "Remark", "Category", "Mode", "Cash In", "Cash Out", "Balance"]]
    balance = 0.0
    for e in entries:
        amt = float(e["amount"])
        if e["type"] == "in":
            balance += amt
            in_amt, out_amt = f"{amt:,.0f}", ""
        else:
            balance -= amt
            in_amt, out_amt = "", f"{amt:,.0f}"

        rows.append([
            str(e.get("entry_date", ""))[:10],
            (e.get("remark") or "")[:35],
            e.get("category") or "",
            e.get("payment_mode") or "",
            in_amt,
            out_amt,
            f"{balance:,.0f}",
        ])

    col_w = [0.95 * inch, 2.05 * inch, 1.0 * inch, 0.8 * inch, 0.85 * inch, 0.85 * inch, 0.9 * inch]
    t = Table(rows, colWidths=col_w, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  colors.HexColor("#EEF2FF")),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 8),
        ("GRID",          (0, 0), (-1, -1), 0.4, colors.lightgrey),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, grey_bg]),
        ("ALIGN",         (4, 0), (-1, -1), "RIGHT"),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(t)

    doc.build(elements)
    return buf.getvalue()
