import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { passwordOk } from "@/lib/domain/rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password · Bago Market" },
      { name: "description", content: "Set a new password for your Bago Market account." },
      { property: "og:title", content: "Reset password · Bago Market" },
      { property: "og:description", content: "Set a new password for your Bago Market account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const { t, session, authReady } = useApp();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [waited, setWaited] = useState(false);
  useEffect(() => { const id = setTimeout(() => setWaited(true), 3000); return () => clearTimeout(id); }, []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordOk(pw)) { toast.error(t("auth.pw_weak")); return; }
    if (pw !== confirm) { toast.error(t("auth.pw_mismatch")); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("auth.reset_done"));
    navigate({ to: "/", replace: true });
  };
  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="mb-6 text-center font-display text-2xl font-semibold">{t("auth.reset_title")}</h1>
      <div className="surface p-5 sm:p-6">
        {!session ? (
          <p className="text-center text-sm text-muted-foreground">{authReady && waited ? t("auth.reset_invalid") : t("common.loading")}</p>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="np">{t("auth.password")}</Label>
              <Input id="np" type="password" autoComplete="new-password" className="h-11" value={pw} onChange={(e) => setPw(e.target.value)} required />
              <p className="text-xs text-muted-foreground">{t("auth.pw_rule")}</p></div>
            <div className="space-y-1.5"><Label htmlFor="nc">{t("auth.confirm")}</Label>
              <Input id="nc" type="password" autoComplete="new-password" className="h-11" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
            <Button type="submit" className="h-11 w-full" disabled={busy}>{busy ? t("common.loading") : t("auth.reset_save")}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
