from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from typing import Optional
from app.auth.jwt import get_current_user
from app.db.supabase import get_supabase
from app.utils.pdf import generate_pdf
from app.utils.excel import generate_excel

router = APIRouter()


def _fetch_entries(sb, book_id: str, user_id: str, date_from: str, date_to: str,
                   entry_type=None, contact_name=None, category=None, payment_mode=None):
    q = (
        sb.table("entries")
        .select("*")
        .eq("book_id", book_id)
        .eq("user_id", user_id)
    )
    if date_from:     q = q.gte("entry_date", date_from)
    if date_to:       q = q.lte("entry_date", date_to)
    if entry_type:    q = q.eq("type", entry_type)
    if contact_name:  q = q.eq("contact_name", contact_name)
    if category:      q = q.eq("category", category)
    if payment_mode:  q = q.eq("payment_mode", payment_mode)
    return q.order("entry_date").order("entry_time").execute().data or []


@router.get("/{book_id}/report/pdf")
async def pdf_report(
    book_id: str,
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    entry_type: Optional[str] = Query(None),
    contact_name: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    payment_mode: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user),
):
    sb = get_supabase()
    book_res = sb.table("books").select("name, currency").eq("id", book_id).eq("user_id", user_id).single().execute()
    if not book_res.data:
        raise HTTPException(status_code=404, detail="Book not found")

    entries = _fetch_entries(sb, book_id, user_id, date_from, date_to,
                             entry_type, contact_name, category, payment_mode)
    total_in  = sum(float(e["amount"]) for e in entries if e["type"] == "in")
    total_out = sum(float(e["amount"]) for e in entries if e["type"] == "out")
    summary = {"total_in": total_in, "total_out": total_out, "net_balance": total_in - total_out}
    active_filters = {
        "entry_type": entry_type, "contact_name": contact_name,
        "category": category, "payment_mode": payment_mode,
    }

    pdf_bytes = generate_pdf(book_res.data["name"], book_res.data["currency"], entries, summary, date_from, date_to, filters=active_filters)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=cashbook-report.pdf"},
    )


@router.get("/{book_id}/report/excel")
async def excel_report(
    book_id: str,
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    entry_type: Optional[str] = Query(None),
    contact_name: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    payment_mode: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user),
):
    sb = get_supabase()
    book_res = sb.table("books").select("name, currency").eq("id", book_id).eq("user_id", user_id).single().execute()
    if not book_res.data:
        raise HTTPException(status_code=404, detail="Book not found")

    entries = _fetch_entries(sb, book_id, user_id, date_from, date_to,
                             entry_type, contact_name, category, payment_mode)
    total_in  = sum(float(e["amount"]) for e in entries if e["type"] == "in")
    total_out = sum(float(e["amount"]) for e in entries if e["type"] == "out")
    summary = {"total_in": total_in, "total_out": total_out, "net_balance": total_in - total_out}
    active_filters = {
        "entry_type": entry_type, "contact_name": contact_name,
        "category": category, "payment_mode": payment_mode,
    }

    excel_bytes = generate_excel(book_res.data["name"], book_res.data["currency"], entries, summary, date_from, date_to, filters=active_filters)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=cashbook-report.xlsx"},
    )
