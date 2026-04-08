// Image URL helper — ImageKit delivery removed.
// Images are served directly from Supabase Storage via unoptimized next/image.
// This function is a no-op pass-through kept for import compatibility.
export function toImageKitUrl(rawUrl: string): string {
  return rawUrl;
}
