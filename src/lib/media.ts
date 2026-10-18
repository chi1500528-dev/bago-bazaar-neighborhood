import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toRelayUrl } from "@/lib/sb-relay";

// Images live in the private "media" bucket; paths are stored in the DB and
// turned into short-lived signed URLs for display.
export function useMediaUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["media", path],
    enabled: !!path && !path.startsWith("http") && typeof window !== "undefined",
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.storage.from("media").createSignedUrl(path!, 3600);
      return data?.signedUrl ? toRelayUrl(data.signedUrl) : null;
    },
  });
}

export async function uploadMedia(userId: string, file: File) {
  if (file.size > 5 * 1024 * 1024) throw new Error("File too large (max 5MB)");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}
