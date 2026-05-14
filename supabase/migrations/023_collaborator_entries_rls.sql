-- Allow accepted collaborators to SELECT entries of books shared with them.
-- This is required for Supabase Realtime postgres_changes to deliver entry events
-- to collaborators (Realtime respects RLS: if you can't SELECT the row, you don't
-- receive the event). Permissive SELECT policies combine with OR, so this extends
-- the existing "auth.uid() = user_id" policy without replacing it.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'entries'
      AND policyname = 'collaborators can view entries'
  ) THEN
    CREATE POLICY "collaborators can view entries"
    ON public.entries
    FOR SELECT
    USING (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1
        FROM public.book_shares bs
        WHERE bs.book_id              = entries.book_id
          AND bs.shared_with_id        = auth.uid()
          AND bs.status               = 'accepted'
      )
    );
  END IF;
END $$;
