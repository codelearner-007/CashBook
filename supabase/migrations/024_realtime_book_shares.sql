-- Enable Supabase Realtime for book_shares and entries tables.
-- By default new tables are NOT included in the realtime publication.
-- Without this, postgres_changes subscriptions silently receive nothing.
-- Guards against "already a member" errors if tables were added manually.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'book_shares'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.book_shares;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.entries;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'books'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.books;
  END IF;
END $$;
