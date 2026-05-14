-- Two fixes for books Realtime not delivering to collaborators:
--
-- 1. REPLICA IDENTITY FULL — records every column in WAL so Realtime
--    can evaluate RLS policies fully for UPDATE events.
--
-- 2. Replace the collaborator books policy with one that calls a
--    SECURITY DEFINER helper. The helper runs without RLS, which avoids
--    the "nested RLS" problem where Supabase Realtime fails to evaluate
--    a subquery that itself reads an RLS-protected table (book_shares).
--    This is the same pattern used by Supabase internally for realtime auth.

ALTER TABLE public.books REPLICA IDENTITY FULL;

-- Helper: runs as the function owner (bypasses book_shares RLS)
CREATE OR REPLACE FUNCTION public.is_accepted_collaborator(p_book_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.book_shares
    WHERE book_id        = p_book_id
      AND shared_with_id = p_user_id
      AND status         = 'accepted'
  );
$$;

-- Drop the policy added in migration 025 (used raw subquery)
DROP POLICY IF EXISTS "collaborators can view books" ON public.books;

-- Re-create using the SECURITY DEFINER helper
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'books'
      AND policyname = 'collaborators can view books'
  ) THEN
    CREATE POLICY "collaborators can view books"
    ON public.books
    FOR SELECT
    USING (
      auth.uid() = user_id
      OR public.is_accepted_collaborator(id, auth.uid())
    );
  END IF;
END $$;

-- Ensure books is in the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'books'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.books;
  END IF;
END $$;
