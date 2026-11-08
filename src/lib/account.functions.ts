import { createServerFn } from "@tanstack/react-start";

/** Permanently deletes the caller's own account. The caller is identified by their access token, verified server-side. */
export const deleteOwnAccount = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => {
    if (!d || typeof d.token !== "string" || d.token.length < 20) throw new Error("Invalid request");
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u, error } = await supabaseAdmin.auth.getUser(data.token);
    if (error || !u.user) throw new Error("Not signed in");
    const uid = u.user.id;
    // Close any shops the user owns so they disappear from the market.
    await supabaseAdmin.from("shops").update({ is_active: false }).eq("owner_id", uid);
    const del = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (del.error) throw new Error("Delete failed");
    return { ok: true };
  });
