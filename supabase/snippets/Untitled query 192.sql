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
        WHERE bs.book_id        = entries.book_id
          AND bs.shared_with_id = auth.uid()
          AND bs.status         = 'accepted'
      )
    );
  END IF;
END $$;
