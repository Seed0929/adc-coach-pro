import { supabase } from "@/integrations/supabase/client";

const BUCKET = "avatars";
// Long-lived signed URL (~10 years) so the stored URL keeps working across the app.
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

/**
 * Uploads a profile picture to the user's private folder and returns a
 * long-lived signed URL that can be stored on the profile and rendered anywhere.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) throw error ?? new Error("Could not create image URL");

  return data.signedUrl;
}

/** Removes every avatar file in the user's folder. */
export async function removeAvatarFiles(userId: string): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).list(userId);
  if (error) throw error;
  if (!data?.length) return;
  await supabase.storage.from(BUCKET).remove(data.map((f) => `${userId}/${f.name}`));
}