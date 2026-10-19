import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const PHOTO_BUCKET = 'photos';
// 100 files a round; 50 rounds is far more photos than one person uploads.
const PAGE = 100;
const MAX_ROUNDS = 50;

/**
 * Removes every photo in one member's folder (`<family id>/<member id>`) with the
 * service role. Returns an error message, or null when the folder is empty.
 */
export async function removePhotoFolder(db: SupabaseClient, folder: string): Promise<string | null> {
  for (let round = 0; ; round++) {
    if (round === MAX_ROUNDS) return 'too many photos to remove';
    const { data: files, error: listError } = await db.storage.from(PHOTO_BUCKET).list(folder, { limit: PAGE });
    if (listError) return listError.message;
    if (!files || files.length === 0) return null;
    const { data: removed, error: removeError } = await db.storage
      .from(PHOTO_BUCKET)
      .remove(files.map((f) => `${folder}/${f.name}`));
    if (removeError) return removeError.message;
    // Nothing removed means the next list returns the same files: stop instead of looping.
    if (!removed || removed.length === 0) return 'photos could not be removed';
  }
}
