-- Create a public storage bucket for user profile avatars.
-- Public = URLs never expire; no auth required to read.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Authenticated users may upload / overwrite / delete their own avatar.
-- Path must start with the user's own UUID (enforced by folder check).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'avatars_auth_write'
  ) THEN
    CREATE POLICY "avatars_auth_write" ON storage.objects
      FOR ALL TO authenticated
      USING  (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
      WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

-- Public read — bucket is already public, but this policy makes intent explicit.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'avatars_public_read'
  ) THEN
    CREATE POLICY "avatars_public_read" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'avatars');
  END IF;
END $$;
