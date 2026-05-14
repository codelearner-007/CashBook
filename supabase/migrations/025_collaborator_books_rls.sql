-- Allow accepted collaborators to SELECT the books row for books shared with them.
-- Required for Supabase Realtime postgres_changes to deliver book UPDATE events
-- to collaborators (Realtime respects RLS: if you can't SELECT the row, you don't
-- receive the event). Permissive SELECT policies combine with OR, so this extends
-- the existing owner policy without replacing it.

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
      OR EXISTS (
        SELECT 1
        FROM public.book_shares bs
        WHERE bs.book_id        = books.id
          AND bs.shared_with_id = auth.uid()
          AND bs.status         = 'accepted'
      )
    );
  END IF;
END $$;
