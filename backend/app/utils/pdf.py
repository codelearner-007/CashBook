from datetime import datetime
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

PAGE_WIDTH, PAGE_HEIGHT = A4

TEAL       = colors.HexColor("#39AAAA")
TEAL_LIGHT = colors.HexColor("#F4FAFA")
TEAL_MID   = colors.HexColor("#DFF0F0")
GREEN      = colors.HexColor("#15803D")
RED        = colors.HexColor("#B91C1C")
GREY       = colors.HexColor("#F8FAFC")
BORDER     = colors.HexColor("#E2E8F0")
DARK       = colors.HexColor("#0F172A")
MUTED      = colors.HexColor("#64748B")
SUBTLE     = colors.HexColor("#94A3B8")


def _draw_footer(canv, doc):
    canv.saveState()
    now = datetime.now().strftime("%B %d, %Y  %I:%M %p")
    canv.setFont("Helvetica", 6.5)
    canv.setFillColor(SUBTLE)
    canv.line(0.5 * inch, 0.52 * inch, PAGE_WIDTH - 0.5 * inch, 0.52 * inch)
    canv.drawString(0.5 * inch, 0.35 * inch, f"Generated: {now}  |  CashBook Financial Report")
    canv.drawRightString(PAGE_WIDTH - 0.5 * inch, 0.35 * inch, f"Page {doc.page}")
    canv.restoreState()


def generate_pdf(book_name: str, currency: str, entries: list, summary: dict, date_from=None, date_to=None) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=0.5 * inch, rightMargin=0.5 * inch,
        topMargin=0.6 * inch, bottomMargin=0.75 * inch,
    )

    title_style = ParagraphStyle("CB_Title", fontSize=22, fontName="Helvetica-Bold", textColor=TEAL, spaceAfter=2)
    sub_style   = ParagraphStyle("CB_Sub",   fontSize=9,  fontName="Helvetica",      textColor=MUTED, spaceAfter=0)
    book_style  = ParagraphStyle("CB_Book",  fontSize=11, fontName="Helvetica-Bold", textColor=DARK,  spaceAfter=0)
    date_style  = ParagraphStyle("CB_Date",  fontSize=8,  fontName="Helvetica",      textColor=MUTED, spaceAfter=0)
    sm_style    = ParagraphStyle("CB_Sm",    fontSize=8,  fontName="Helvetica",      textColor=MUTED, spaceAfter=0)

    elements = []

    # ── Title ─────────────────────────────────────────────────────────────────
    elements.append(Paragraph("CashBook", title_style))
    elements.append(Paragraph("Financial Report", sub_style))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph(book_name, book_style))
    elements.append(Spacer(1, 4))

    end_date = date_to or datetime.now().strftime("%Y-%m-%d")
    period = f"Period: {date_from or 'All time'}  →  {end_date}"
    elements.append(Paragraph(period, date_style))
    elements.append(Spacer(1, 16))

    # ── Summary table ─────────────────────────────────────────────────────────
    sym = currency or ""
    net = summary["net_balance"]
    net_color = GREEN if net >= 0 else RED

    pw = PAGE_WIDTH - 1.0 * inch   # usable width
    s_data = [
        ["Total Income", "Total Expenses", "Net Balance"],
        [
            f"{sym} {summary['total_in']:,.2f}",
            f"{sym} {summary['total_out']:,.2f}",
            f"{sym} {net:,.2f}",
        ],
    ]
    s_table = Table(s_data, colWidths=[pw / 3, pw / 3, pw / 3])
    s_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  TEAL),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  colors.white),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0),  9),
        ("BACKGROUND",    (0, 1), (-1, 1),  TEAL_LIGHT),
        ("FONTNAME",      (0, 1), (-1, 1),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 1), (-1, 1),  12),
        ("TEXTCOLOR",     (0, 1), (0, 1),   GREEN),
        ("TEXTCOLOR",     (1, 1), (1, 1),   RED),
        ("TEXTCOLOR",     (2, 1), (2, 1),   net_color),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("BOX",           (0, 0), (-1, -1), 0.5, BORDER),
        ("LINEBELOW",     (0, 0), (-1, 0),  0.5, TEAL_MID),
        ("INNERGRID",     (0, 0), (-1, -1), 0.5, BORDER),
    ]))
    elements.append(s_table)
    elements.append(Spacer(1, 8))
    elements.append(Paragraph(f"Total transactions: {len(entries)}", sm_style))
    elements.append(Spacer(1, 14))

    # ── Entries table ─────────────────────────────────────────────────────────
    headers = ["Date / Time", "Remark", "Category", "Contact", "Mode", "Cash In", "Cash Out", "Balance"]
    rows = [headers]

    running = 0.0
    for e in entries:
        amt = float(e["amount"])
        if e["type"] == "in":
            running += amt
            in_str, out_str = f"{sym} {amt:,.2f}", ""
        else:
            running -= amt
            in_str, out_str = "", f"{sym} {amt:,.2f}"

        date_str = str(e.get("entry_date", ""))[:10]
        time_str = str(e.get("entry_time") or "")[:5]
        date_display = f"{date_str}\n{time_str}" if time_str else date_str

        rows.append([
            date_display,
            (e.get("remark") or "")[:34],
            (e.get("category") or "")[:14],
            (e.get("contact_name") or "")[:14],
            (e.get("payment_mode") or "")[:10],
            in_str,
            out_str,
            f"{sym} {running:,.2f}",
        ])

    # Totals row
    total_in  = sum(float(e["amount"]) for e in entries if e["type"] == "in")
    total_out = sum(float(e["amount"]) for e in entries if e["type"] == "out")
    rows.append([
        "TOTAL", "", "", "", "",
        f"{sym} {total_in:,.2f}",
        f"{sym} {total_out:,.2f}",
        f"{sym} {running:,.2f}",
    ])

    col_w = [0.90*inch, 1.55*inch, 0.80*inch, 0.80*inch, 0.65*inch, 0.88*inch, 0.88*inch, 0.91*inch]
    n = len(rows)
    t = Table(rows, colWidths=col_w, repeatRows=1)
    t.setStyle(TableStyle([
        # Header row
        ("BACKGROUND",    (0, 0), (-1, 0),  TEAL),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  colors.white),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0),  8),
        # Data rows
        ("FONTNAME",      (0, 1), (-1, -2), "Helvetica"),
        ("FONTSIZE",      (0, 1), (-1, -1), 7.5),
        ("ROWBACKGROUNDS",(0, 1), (-1, -2), [colors.white, GREY]),
        # Totals row
        ("BACKGROUND",    (0, n-1), (-1, n-1), TEAL_LIGHT),
        ("FONTNAME",      (0, n-1), (-1, n-1), "Helvetica-Bold"),
        ("TEXTCOLOR",     (5, n-1), (5, n-1),  GREEN),
        ("TEXTCOLOR",     (6, n-1), (6, n-1),  RED),
        ("TEXTCOLOR",     (7, n-1), (7, n-1),  net_color),
        # Alignment
        ("ALIGN",         (5, 0), (-1, -1), "RIGHT"),
        ("ALIGN",         (0, 0), (4, -1),  "LEFT"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        # Grid
        ("GRID",          (0, 0), (-1, -1), 0.3, BORDER),
        ("LINEBELOW",     (0, 0), (-1, 0),  0.5, colors.white),
        # Padding
        ("TOPPADDING",    (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING",   (0, 0), (-1, -1), 4),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 4),
    ]))
    elements.append(t)

    doc.build(elements, onFirstPage=_draw_footer, onLaterPages=_draw_footer)
    return buf.getvalue()
