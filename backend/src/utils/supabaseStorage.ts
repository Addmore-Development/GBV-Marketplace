// ============================================================
// backend/src/utils/supabaseStorage.ts
// ============================================================
// Railway's filesystem is ephemeral — anything multer saves to local
// disk (uploads/...) is wiped on every redeploy/restart, even though
// the DB row referencing it survives. This pushes the file up to
// Supabase Storage instead, which is what actually makes it durable.
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'centre-uploads';

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Reads a file multer already wrote to local disk, uploads it to
// Supabase Storage under destPath, deletes the local (ephemeral) copy,
// and returns the public URL to store on the DB row.
export async function uploadLocalFileToSupabase(
  localPath: string,
  destPath: string,
  mimetype: string
): Promise<string> {
  if (!supabase) {
    throw new Error(
      'Supabase storage is not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  const buffer = fs.readFileSync(localPath);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(destPath, buffer, { contentType: mimetype, upsert: true });

  if (error) throw error;

  // Best-effort cleanup — the local copy would be wiped on the next
  // deploy anyway, but no reason to leave it sitting there until then.
  fs.unlink(localPath, () => {});

  const { data } = supabase.storage.from(bucket).getPublicUrl(destPath);
  return data.publicUrl;
}