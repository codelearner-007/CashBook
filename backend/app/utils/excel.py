from io import BytesIO
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter


PRIMARY_HEX  = "3B5BDB"
GREEN_HEX    = "2E7D32"
RED_HEX      = "C62828"
GREY_HEX     = "F8F9FA"
HEADER_FONT  = Font(bold=True, color="FFFFFF", size=10)
SUMMARY_FONT = Font(bold=True, size=10)


def _fill(hex_color: str) -> PatternFill:
    return PatternFill("solid", fgColor=hex_color)


def generate_excel(book_name: str, currency: str, entries: list, summary: dict, date_from=None, date_to=None) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Report"

    # ── Header ────────────────────────────────────────────────────────────────
    ws.merge_cells("A1:G1")
    ws["A1"] = f"CashBook — {book_name}"
    ws["A1"].font = Font(bold=True, size=14, color=PRIMARY_HEX)

    ws.merge_cells("A2:G2")
    ws["A2"] = f"Period: {date_from or 'All time'}  →  {date_to or 'today'}"
    ws["A2"].font = Font(size=10)

    # ── Summary ───────────────────────────────────────────────────────────────
    ws["A4"] = "Total In";     ws["A4"].font = SUMMARY_FONT
    ws["B4"] = summary["total_in"];  ws["B4"].number_format = f'"{currency}" #,##0.00'
    ws["C4"] = "Total Out";    ws["C4"].font = SUMMARY_FONT
    ws["D4"] = summary["total_out"]; ws["D4"].number_format = f'"{currency}" #,##0.00'
    ws["E4"] = "Net Balance";  ws["E4"].font = SUMMARY_FONT
    ws["F4"] = summary["net_balance"]; ws["F4"].number_format = f'"{currency}" #,##0.00'

    # ── Column headers ────────────────────────────────────────────────────────
    headers = ["Date", "Remark", "Category", "Payment Mode", "Cash In", "Cash Out", "Balance"]
    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=6, column=col, value=h)
        cell.font = HEADER_FONT
        cell.fill = _fill(PRIMARY_HEX)
        cell.alignment = Alignment(horizontal="center")

    # ── Data rows ─────────────────────────────────────────────────────────────
    balance = 0.0
    for row_idx, e in enumerate(entries, 7):
        amt = float(e["amount"])
        if e["type"] == "in":
            balance += amt
            in_amt, out_amt = amt, None
        else:
            balance -= amt
            in_amt, out_amt = None, amt

        fill = _fill("FFFFFF") if (row_idx % 2 == 0) else _fill(GREY_HEX)

        def _cell(col, val, fmt=None):
            c = ws.cell(row=row_idx, column=col, value=val)
            c.fill = fill
            if fmt:
                c.number_format = fmt
            return c

        _cell(1, str(e.get("entry_date", ""))[:10])
        _cell(2, e.get("remark") or "")
        _cell(3, e.get("category") or "")
        _cell(4, e.get("payment_mode") or "")

        in_cell  = _cell(5, in_amt,  "#,##0.00")
        out_cell = _cell(6, out_amt, "#,##0.00")
        bal_cell = _cell(7, balance, "#,##0.00")

        if in_amt:  in_cell.font  = Font(color=GREEN_HEX)
        if out_amt: out_cell.font = Font(color=RED_HEX)
        bal_cell.font = Font(color=GREEN_HEX if balance >= 0 else RED_HEX, bold=True)

    # ── Auto column widths ────────────────────────────────────────────────────
    for col in ws.columns:
        max_len = max((len(str(c.value or "")) for c in col), default=8)
        ws.column_dimensions[get_column_letter(col[0].column)].width = min(max_len + 4, 40)

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()
