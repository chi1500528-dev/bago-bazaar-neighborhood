import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Bago Market" },
      { name: "description", content: "Sign in or create a Bago Market account." },
      { property: "og:title", content: "Sign in · Bago Market" },
      { property: "og:description", content: "Access your Bago Market account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t, session } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/", replace: true });
  }, [session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
      });
      if (error) toast.error(error.message);
      else if (!data.session) setSent(true);
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="mb-6 text-center text-xl font-bold">{mode === "in" ? t("auth.title") : t("auth.signup_title")}</h1>
      {sent ? (
        <OtpStep email={email} onBack={() => setSent(false)} />
      ) : (
        <form onSubmit={submit} className="surface space-y-4 p-5">
          {mode === "up" && (
            <div className="space-y-1.5"><Label htmlFor="n">{t("auth.name")}</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          )}
          <div className="space-y-1.5"><Label htmlFor="e">{t("auth.email")}</Label><Input id="e" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="space-y-1.5"><Label htmlFor="p">{t("auth.password")}</Label><Input id="p" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? t("common.loading") : mode === "in" ? t("auth.signin") : t("auth.signup")}</Button>
          <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="block w-full text-center text-sm text-primary hover:underline">
            {mode === "in" ? t("auth.to_signup") : t("auth.to_signin")}
          </button>
        </form>
      )}
    </div>
  );
}

function OtpStep({ email, onBack }: { email: string; onBack: () => void }) {
  const { t } = useApp();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(60);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
    if (error) toast.error(t("auth.otp_invalid"));
    setBusy(false);
  };

  const resend = async () => {
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: window.location.origin } });
    if (error) toast.error(error.message);
    else { toast.success(t("auth.otp_sent")); setWait(60); }
  };

  return (
    <form onSubmit={verify} className="surface space-y-4 p-5">
      <div className="text-center">
        <h2 className="font-semibold">{t("auth.otp_title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.otp_hint")} <span className="font-medium text-foreground">{email}</span></p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="otp">{t("auth.otp_code")}</Label>
        <Input id="otp" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={8} pattern="[0-9]{6,8}"
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
          className="h-12 text-center text-2xl tracking-[0.5em]" required />
      </div>
      <Button type="submit" className="w-full" disabled={busy || code.length < 6}>{busy ? t("common.loading") : t("auth.otp_verify")}</Button>
      <div className="flex justify-between text-sm">
        <button type="button" onClick={onBack} className="text-muted-foreground hover:underline">{t("auth.otp_change")}</button>
        <button type="button" onClick={resend} disabled={wait > 0} className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline">
          {wait > 0 ? `${t("auth.otp_resend_in")} ${wait}` : t("auth.otp_resend")}
        </button>
      </div>
    </form>
  );
}
