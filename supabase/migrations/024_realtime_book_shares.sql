-- Enable Supabase Realtime for the book_shares table.
-- By default new tables are NOT included in the realtime publication.
-- Without this, postgres_changes subscriptions on book_shares silently receive nothing.

ALTER PUBLICATION supabase_realtime ADD TABLE public.book_shares;
