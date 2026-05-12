-- Migration 017: Payment Mode Balances
-- Adds total_in, total_out, net_balance to payment_modes.
-- A trigger keeps them in sync whenever entries are inserted/updated/deleted.

-- ── Add balance columns ───────────────────────────────────────────────────────

alter table public.payment_modes
  add column if not exists total_in    numeric(14,2) not null default 0,
  add column if not exists total_out   numeric(14,2) not null default 0,
  add column if not exists net_balance numeric(14,2) not null default 0;

-- ── Trigger function ──────────────────────────────────────────────────────────

create or replace function public.update_payment_mode_balance()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.payment_mode_id is not null then
      update public.payment_modes set
        total_in    = total_in    + case when NEW.type = 'in'  then NEW.amount else 0 end,
        total_out   = total_out   + case when NEW.type = 'out' then NEW.amount else 0 end,
        net_balance = net_balance + case when NEW.type = 'in'  then NEW.amount else -NEW.amount end
      where id = NEW.payment_mode_id;
    end if;
    return NEW;
  end if;

  if TG_OP = 'DELETE' then
    if OLD.payment_mode_id is not null then
      update public.payment_modes set
        total_in    = total_in    - case when OLD.type = 'in'  then OLD.amount else 0 end,
        total_out   = total_out   - case when OLD.type = 'out' then OLD.amount else 0 end,
        net_balance = net_balance - case when OLD.type = 'in'  then OLD.amount else -OLD.amount end
      where id = OLD.payment_mode_id;
    end if;
    return OLD;
  end if;

  if TG_OP = 'UPDATE' then
    -- Reverse old mode contribution
    if OLD.payment_mode_id is not null then
      update public.payment_modes set
        total_in    = total_in    - case when OLD.type = 'in'  then OLD.amount else 0 end,
        total_out   = total_out   - case when OLD.type = 'out' then OLD.amount else 0 end,
        net_balance = net_balance - case when OLD.type = 'in'  then OLD.amount else -OLD.amount end
      where id = OLD.payment_mode_id;
    end if;
    -- Apply new mode contribution
    if NEW.payment_mode_id is not null then
      update public.payment_modes set
        total_in    = total_in    + case when NEW.type = 'in'  then NEW.amount else 0 end,
        total_out   = total_out   + case when NEW.type = 'out' then NEW.amount else 0 end,
        net_balance = net_balance + case when NEW.type = 'in'  then NEW.amount else -NEW.amount end
      where id = NEW.payment_mode_id;
    end if;
    return NEW;
  end if;
end;
$$;

drop trigger if exists trg_update_payment_mode_balance on public.entries;
create trigger trg_update_payment_mode_balance
  after insert or update or delete on public.entries
  for each row execute function public.update_payment_mode_balance();

-- ── Backfill existing data ────────────────────────────────────────────────────

update public.payment_modes pm set
  total_in = coalesce((
    select sum(e.amount) from public.entries e
    where e.payment_mode_id = pm.id and e.type = 'in'
  ), 0),
  total_out = coalesce((
    select sum(e.amount) from public.entries e
    where e.payment_mode_id = pm.id and e.type = 'out'
  ), 0),
  net_balance = coalesce((
    select sum(case when e.type = 'in' then e.amount else -e.amount end)
    from public.entries e
    where e.payment_mode_id = pm.id
  ), 0);
