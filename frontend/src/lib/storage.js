/**
 * Storage abstraction for entry attachments (images and PDFs).
 *
 * Current provider: Supabase Storage, accessed via the FastAPI backend.
 *
 * To migrate to another provider (S3, Cloudinary, R2, etc.):
 *  1. Add a new key to PROVIDERS below, implementing the same { upload, remove } interface.
 *  2. Change ACTIVE_PROVIDER to the new key.
 *  3. Run a migration script that:
 *       SELECT id, attachment_path, attachment_provider
 *       FROM entries
 *       WHERE attachment_path IS NOT NULL AND attachment_provider = 'supabase';
 *     For each row: download from Supabase using attachment_path, upload to the
 *     new provider, then UPDATE attachment_url + attachment_path + attachment_provider.
 */

import { apiUploadAttachment, apiDeleteAttachment } from './api';

const PROVIDERS = {
  supabase: {
    async upload({ entryId, uri, mimeType, filename }) {
      const data = await apiUploadAttachment(uri, mimeType, filename, entryId);
      return { url: data.attachment_url, path: data.path, provider: 'supabase' };
    },
    async remove({ path }) {
      await apiDeleteAttachment(path);
    },
  },

  // Example S3 provider stub — implement and switch ACTIVE_PROVIDER to enable:
  // s3: {
  //   async upload({ entryId, uri, mimeType, filename }) { ... returns { url, path, provider: 's3' } },
  //   async remove({ path }) { ... },
  // },
};

export const ACTIVE_PROVIDER = 'supabase';

export const uploadAttachment = (params) => PROVIDERS[ACTIVE_PROVIDER].upload(params);
export const removeAttachment = (params) => PROVIDERS[ACTIVE_PROVIDER].remove(params);
