from datetime import datetime
from io import BytesIO
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

TEAL_HEX   = "39AAAA"
GREEN_HEX  = "15803D"
RED_HEX    = "B91C1C"
GREY_HEX   = "F8FAFC"
TEAL_LIGHT = "F4FAFA"
BORDER_HEX = "E2E8F0"
DARK_HEX   = "0F172A"
MUTED_HEX  = "64748B"


def _fill(hex_color: str) -> PatternFill:
    return PatternFill("solid", fgColor=hex_color)


def _border(color: str = BORDER_HEX, style: str = "thin") -> Border:
    s = Side(border_style=style, color=color)
    return Border(left=s, right=s, top=s, bottom=s)


def _apply_all(cell, fill=None, font=None, alignment=None, number_format=None, border=None):
    if fill:            cell.fill = fill
    if font:            cell.font = font
    if alignment:       cell.alignment = alignment
    if number_format:   cell.number_format = number_format
    if border:          cell.border = border


def generate_excel(book_name: str, currency: str, entries: list, summary: dict, date_from=None, date_to=None) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "CashBook Report"

    sym = currency or ""
    currency_fmt = f'"{sym} " #,##0.00'
    bd = _border()

    # ── Title block (rows 1-4) ────────────────────────────────────────────────
    ws.merge_cells("A1:I1")
    ws["A1"] = "CashBook  —  Financial Report"
    ws["A1"].font = Font(bold=True, size=18, color=TEAL_HEX)
    ws["A1"].alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[1].height = 32

    ws.merge_cells("A2:I2")
    ws["A2"] = f"Book: {book_name}"
    ws["A2"].font = Font(bold=True, size=11, color=DARK_HEX)
    ws["A2"].alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[2].height = 18

    ws.merge_cells("A3:I3")
    end_date = date_to or datetime.now().strftime("%Y-%m-%d")
    ws["A3"] = f"Period: {date_from or 'All time'}  →  {end_date}"
    ws["A3"].font = Font(size=9, color=MUTED_HEX)
    ws["A3"].alignment = Alignment(horizontal="left", vertical="center")

    ws.merge_cells("A4:I4")
    ws["A4"] = f"Total Transactions: {len(entries)}"
    ws["A4"].font = Font(size=9, color=MUTED_HEX)

    # ── Summary block (rows 6-7) ──────────────────────────────────────────────
    net = summary["net_balance"]
    net_color = GREEN_HEX if net >= 0 else RED_HEX

    summary_labels = ["Total Income", "Total Expenses", "Net Balance"]
    summary_values = [summary["total_in"], summary["total_out"], net]
    summary_colors = [GREEN_HEX, RED_HEX, net_color]

    for col_offset, (label, value, color) in enumerate(zip(summary_labels, summary_values, summary_colors)):
        col = col_offset + 1

        lbl_cell = ws.cell(row=6, column=col, value=label)
        _apply_all(lbl_cell,
                   fill=_fill(TEAL_HEX),
                   font=Font(bold=True, size=9, color="FFFFFF"),
                   alignment=Alignment(horizontal="center", vertical="center"),
                   border=bd)

        val_cell = ws.cell(row=6 + 1, column=col, value=value)
        _apply_all(val_cell,
                   fill=_fill(TEAL_LIGHT),
                   font=Font(bold=True, size=13, color=color),
                   number_format=currency_fmt,
                   alignment=Alignment(horizontal="center", vertical="center"),
                   border=bd)

    ws.row_dimensions[6].height = 18
    ws.row_dimensions[7].height = 22

    # ── Column headers (row 9) ────────────────────────────────────────────────
    headers = ["Date", "Time", "Remark", "Category", "Contact", "Payment Mode", "Cash In", "Cash Out", "Balance"]
    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=9, column=col, value=h)
        _apply_all(cell,
                   fill=_fill(TEAL_HEX),
                   font=Font(bold=True, color="FFFFFF", size=9),
                   alignment=Alignment(horizontal="center", vertical="center"),
                   border=bd)
    ws.row_dimensions[9].height = 20

    # ── Data rows (from row 10) ───────────────────────────────────────────────
    running  = 0.0
    total_in = 0.0
    total_out = 0.0

    for row_idx, e in enumerate(entries, 10):
        amt   = float(e["amount"])
        is_in = e["type"] == "in"
        if is_in:
            running   += amt
            total_in  += amt
            in_val, out_val = amt, None
        else:
            running   -= amt
            total_out += amt
            in_val, out_val = None, amt

        row_fill = _fill("FFFFFF") if (row_idx % 2 == 0) else _fill(GREY_HEX)

        def _c(col, val, fmt=None, bold=False, color=DARK_HEX, center=False):
            c = ws.cell(row=row_idx, column=col, value=val)
            c.fill = row_fill
            c.font = Font(size=9, bold=bold, color=color)
            c.alignment = Alignment(horizontal="center" if center else "left", vertical="center", wrap_text=False)
            c.border = _border(BORDER_HEX, "hair")
            if fmt:
                c.number_format = fmt
            return c

        _c(1, str(e.get("entry_date", ""))[:10])
        _c(2, str(e.get("entry_time") or "")[:5], center=True)
        _c(3, e.get("remark") or "")
        _c(4, e.get("category") or "")
        _c(5, e.get("contact_name") or "")
        _c(6, e.get("payment_mode") or "")

        if in_val is not None:
            _c(7, in_val,  currency_fmt, bold=False, color=GREEN_HEX, center=True)
        else:
            _c(7, None)

        if out_val is not None:
            _c(8, out_val, currency_fmt, bold=False, color=RED_HEX, center=True)
        else:
            _c(8, None)

        _c(9, running, currency_fmt, bold=True, color=GREEN_HEX if running >= 0 else RED_HEX, center=True)

        ws.row_dimensions[row_idx].height = 16

    # ── Totals row ────────────────────────────────────────────────────────────
    tr = len(entries) + 10
    for col in range(1, 10):
        cell = ws.cell(row=tr, column=col)
        cell.fill = _fill(TEAL_HEX)
        cell.font = Font(bold=True, color="FFFFFF", size=9)
        cell.border = bd
        cell.alignment = Alignment(horizontal="center", vertical="center")

    ws.cell(row=tr, column=1, value="TOTAL")
    ws.cell(row=tr, column=7, value=total_in).number_format = currency_fmt
    ws.cell(row=tr, column=8, value=total_out).number_format = currency_fmt
    ws.cell(row=tr, column=9, value=running).number_format = currency_fmt
    ws.row_dimensions[tr].height = 18

    # ── Generated-by note ─────────────────────────────────────────────────────
    note_row = tr + 2
    ws.merge_cells(f"A{note_row}:I{note_row}")
    ws.cell(row=note_row, column=1,
            value=f"Generated by CashBook  |  {datetime.now().strftime('%B %d, %Y  %I:%M %p')}").font = Font(
        size=8, color="94A3B8", italic=True)

    # ── Column widths ─────────────────────────────────────────────────────────
    col_widths = [13, 8, 30, 15, 15, 16, 16, 16, 16]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    # ── Freeze pane at row 10 (below headers) & auto-filter ──────────────────
    ws.freeze_panes = "A10"
    if len(entries) > 0:
        ws.auto_filter.ref = f"A9:I{tr - 1}"

    # ── Sheet tab color ───────────────────────────────────────────────────────
    ws.sheet_properties.tabColor = TEAL_HEX

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()
