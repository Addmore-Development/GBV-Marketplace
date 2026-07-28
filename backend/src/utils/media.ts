// ============================================================
// backend/src/utils/media.ts
// Uploaded files (product images, evidence, recordings) are stored with a
// relative path like "/uploads/products/abc123.jpg". That's fine to keep
// in the database, but the frontend runs on a different origin than the
// API, so a relative path resolves against the wrong host and the image
// never loads. This turns a stored path into an absolute URL using
// whatever host actually served the current request — works locally,
// on Render, or behind any proxy, with no extra config.
// ============================================================
import { Request } from 'express';

export function toAbsoluteMediaUrl(req: Request, path: string | null | undefined): string | null {
  if (!path) return path ?? null;
  // Already absolute (e.g. a placeholder image URL, or a Supabase/S3 URL) — leave it alone.
  if (/^https?:\/\//i.test(path)) return path;
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}