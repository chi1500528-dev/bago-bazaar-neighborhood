import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toRelayUrl } from "@/lib/sb-relay";

// Images live in the private "media" bucket; paths are stored in the DB and
// turned into signed URLs. Signed URLs are long-lived and remembered in
// localStorage so the SAME URL is reused across visits — that lets the phone's
// HTTP cache serve the picture instantly instead of downloading it again.
const TTL_S = 7 * 24 * 3600; // URL valid 7 days
const REUSE_MS = 6 * 24 * 3600 * 1000; // reuse for 6 days, then refresh
const LS_KEY = "bm-media-urls-v1";

type Cache = Record<string, { u: string; t: number }>;
function readCache(): Cache {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}") as Cache;
  } catch {
    return {};
  }
}
function remember(path: string, u: string) {
  try {
    const c = readCache();
    c[path] = { u, t: Date.now() };
    const keys = Object.keys(c);
    if (keys.length > 800) for (const k of keys.sort((a, b) => c[a]!.t - c[b]!.t).slice(0, 200)) delete c[k];
    localStorage.setItem(LS_KEY, JSON.stringify(c));
  } catch {
    /* storage full or blocked */
  }
}
function cached(path: string): string | null {
  const hit = readCache()[path];
  return hit && Date.now() - hit.t < REUSE_MS ? hit.u : null;
}

export function useMediaUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["media", path],
    enabled: !!path && !path.startsWith("http") && typeof window !== "undefined",
    staleTime: REUSE_MS,
    gcTime: 24 * 3600 * 1000,
    queryFn: async () => {
      const hit = cached(path!);
      if (hit) return hit;
      const { data } = await supabase.storage.from("media").createSignedUrl(path!, TTL_S);
      if (!data?.signedUrl) return null;
      const u = toRelayUrl(data.signedUrl);
      remember(path!, u);
      return u;
    },
  });
}

// Shrink photos in the browser before upload so customers download ~100 KB
// instead of multi-MB camera files.
async function compressImage(file: File, maxSide = 1400, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export async function uploadMedia(userId: string, file: File) {
  if (file.size > 15 * 1024 * 1024) throw new Error("File too large (max 15MB)");
  const out = await compressImage(file);
  const isWebp = out !== file;
  const ext = isWebp ? "webp" : file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("media")
    .upload(path, out, { contentType: isWebp ? "image/webp" : file.type, cacheControl: "31536000" });
  if (error) throw error;
  return path;
}
