-- Migration 013: Real per-user storage calculation
-- Two security-definer functions called by GET /api/v1/admin/users.
-- Replaces the fake estimate (0.2 + entry_count * 0.0005 MB) with actual bytes.

-- ── DB row-size function ───────────────────────────────────────────────────────
-- pg_column_size(row.*) returns the uncompressed in-memory datum size — a
-- reliable proxy for on-disk usage (TOAST compresses large values separately,
-- but those are rare for CashBook's text fields).

create or replace function public.get_user_data_bytes(p_user_id uuid)
returns bigint language sql security definer as $$
  select
    coalesce((select sum(pg_column_size(e.*))  from public.entries       e  where e.user_id  = p_user_id), 0) +
    coalesce((select sum(pg_column_size(b.*))  from public.books         b  where b.user_id  = p_user_id), 0) +
    coalesce((select sum(pg_column_size(c.*))  from public.categories    c  where c.user_id  = p_user_id), 0) +
    coalesce((select sum(pg_column_size(p.*))  from public.profiles      p  where p.id       = p_user_id), 0) +
    coalesce((select sum(pg_column_size(pm.*)) from public.payment_modes pm where pm.user_id = p_user_id), 0) +
    coalesce((select sum(pg_column_size(cu.*)) from public.customers     cu where cu.user_id = p_user_id), 0) +
    coalesce((select sum(pg_column_size(su.*)) from public.suppliers     su where su.user_id = p_user_id), 0)
$$;

-- ── Storage file-size function ─────────────────────────────────────────────────
-- Reads storage.objects directly (security definer bypasses RLS).
-- Covers 'attachments' (entry photos) and 'avatars' (profile photos).
-- name column holds the full path: {user_id}/... so LIKE filter is exact.

create or replace function public.get_user_storage_bytes(p_user_id uuid)
returns bigint language sql security definer as $$
  select coalesce(sum((metadata->>'size')::bigint), 0)
  from storage.objects
  where bucket_id in ('attachments', 'avatars')
    and name like (p_user_id::text || '/%')
$$;
