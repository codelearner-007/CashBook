-- Add provider-agnostic attachment metadata to entries.
-- attachment_path:     the file path within the storage provider (e.g., "{user_id}/{storage_id}/attachment.jpg")
-- attachment_provider: which provider holds the file ('supabase', 's3', 'cloudinary', …)
--
-- Migration guide: to move files to another provider, query
--   SELECT id, attachment_path, attachment_provider FROM entries
--   WHERE attachment_path IS NOT NULL AND attachment_provider = 'supabase';
-- download each file, upload to the new provider, then UPDATE the three attachment_* columns.

ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS attachment_path     TEXT,
  ADD COLUMN IF NOT EXISTS attachment_provider TEXT DEFAULT 'supabase';
