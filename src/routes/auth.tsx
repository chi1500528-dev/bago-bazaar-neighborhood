import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Check, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { passwordOk } from "@/lib/domain/rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Bago Market" },
      { name: "description", content: "Sign in or create a Bago Market account." },
      { property: "og:title", content: "Sign in · Bago Market" },
      { property: "og:description", content: "Access your Bago Market account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "in" | "up" | "forgot";

function AuthPage() {
  const { t, session } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("in");
  useEffect(() => {
    if (!session) return;
    let off = false;
    // Shop owners go straight to My Shop; everyone else to the market.
    supabase.from("shops").select("id").eq("owner_id", session.user.id).limit(1).then(({ data }) => {
      if (off) return;
      if (data && data.length) {
        sessionStorage.setItem("bm-owner-landed", "1");
        navigate({ to: "/merchant", search: {}, replace: true });
      } else navigate({ to: "/", replace: true });
    });
    return () => { off = true; };
  }, [session, navigate]);
  const title = mode === "in" ? t("auth.title") : mode === "up" ? t("auth.signup_title") : t("auth.forgot_title");
  return (
    <div className="mx-auto max-w-md px-1 py-10">
      <div className="mb-6 text-center">
        <img src="/logo.png" alt="" className="mx-auto mb-3 size-14 rounded-2xl" />
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
      </div>
      {mode !== "forgot" && (
        <div role="tablist" className="mb-4 grid grid-cols-2 rounded-full border bg-muted/50 p-1 text-sm font-medium">
          {(["in", "up"] as const).map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
              className={`rounded-full py-2 transition ${mode === m ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"}`}>
              {m === "in" ? t("auth.signin") : t("auth.signup")}
            </button>
          ))}
        </div>
      )}
      <div className="surface p-5 sm:p-6">
        {mode === "in" && <SignIn onForgot={() => setMode("forgot")} />}
        {mode === "up" && <SignUp />}
        {mode === "forgot" && <Forgot onBack={() => setMode("in")} />}
      </div>
      {mode !== "forgot" && (
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 block w-full text-center text-sm text-primary hover:underline">
          {mode === "in" ? t("auth.to_signup") : t("auth.to_signin")}
        </button>
      )}
    </div>
  );
}

function PasswordInput({ id, value, onChange, autoComplete, invalid }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean }) {
  const { t } = useApp();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} value={value} aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)} className="h-11 pr-11" required />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? t("auth.hide") : t("auth.show")}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function SignIn({ onForgot }: { onForgot: () => void }) {
  const { t } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const rid = useId();
  useEffect(() => {
    const saved = localStorage.getItem("bm.remember-email");
    if (saved) setEmail(saved);
  }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    sessionStorage.removeItem("bm-owner-landed"); // owners land on My Shop right after signing in
    if (remember) { localStorage.setItem("bm.remember-email", email.trim()); localStorage.removeItem("bm.no-remember"); }
    else { localStorage.removeItem("bm.remember-email"); localStorage.setItem("bm.no-remember", "1"); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5"><Label htmlFor="e">{t("auth.email")}</Label>
        <Input id="e" type="email" autoComplete="email" className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      <div className="space-y-1.5"><Label htmlFor="p">{t("auth.password")}</Label>
        <PasswordInput id="p" value={password} onChange={setPassword} autoComplete="current-password" /></div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <label htmlFor={rid} className="flex items-center gap-2"><Checkbox id={rid} checked={remember} onCheckedChange={(v) => setRemember(v === true)} />{t("auth.remember")}</label>
        <button type="button" onClick={onForgot} className="text-primary hover:underline">{t("auth.forgot")}</button>
      </div>
      <Button type="submit" className="h-11 w-full" disabled={busy}>{busy ? t("common.loading") : t("auth.signin")}</Button>
    </form>
  );
}

function SignUp() {
  const { t } = useApp();
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "", code: "" });
  const [terms, setTerms] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);
  const tid = useId();
  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);
  const pwBad = f.password.length > 0 && !passwordOk(f.password);
  const mismatch = f.confirm.length > 0 && f.confirm !== f.password;

  const sendCode = async () => {
    const email = f.email.trim();
    if (!email || !f.name.trim()) { toast.error(t("checkout.required")); return; }
    if (!passwordOk(f.password)) { toast.error(t("auth.pw_weak")); return; }
    if (f.confirm !== f.password) { toast.error(t("auth.pw_mismatch")); return; }
    if (!terms) { toast.error(t("auth.terms_required")); return; }
    setBusy("send");
    const res = sentTo === email
      ? await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signUp({ email, password: f.password, options: { emailRedirectTo: window.location.origin, data: { full_name: f.name.trim() } } });
    setBusy(null);
    if (res.error) { toast.error(res.error.message); return; }
    setSentTo(email); setWait(60);
    toast.success(t("auth.otp_sent"));
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terms) { toast.error(t("auth.terms_required")); return; }
    if (!sentTo || f.code.length < 6) { toast.error(t("auth.code_needed")); return; }
    setBusy("verify");
    const { error } = await supabase.auth.verifyOtp({ email: sentTo, token: f.code, type: "signup" });
    setBusy(null);
    if (error) toast.error(t("auth.otp_invalid"));
  };
  return (
    <form onSubmit={verify} className="space-y-4" noValidate>
      <div className="space-y-1.5"><Label htmlFor="n">{t("auth.name")}</Label>
        <Input id="n" className="h-11" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
      <div className="space-y-1.5"><Label htmlFor="ue">{t("auth.email")}</Label>
        <Input id="ue" type="email" className="h-11" autoComplete="email" value={f.email}
          onChange={(e) => { setF({ ...f, email: e.target.value }); }} required /></div>
      <div className="space-y-1.5"><Label htmlFor="up">{t("auth.password")}</Label>
        <PasswordInput id="up" value={f.password} onChange={(v) => setF({ ...f, password: v })} autoComplete="new-password" invalid={pwBad} />
        <p className={`flex items-center gap-1 text-xs ${passwordOk(f.password) ? "text-primary" : pwBad ? "text-destructive" : "text-muted-foreground"}`}>
          {passwordOk(f.password) && <Check className="size-3.5" />}{t("auth.pw_rule")}</p></div>
      <div className="space-y-1.5"><Label htmlFor="uc">{t("auth.confirm")}</Label>
        <PasswordInput id="uc" value={f.confirm} onChange={(v) => setF({ ...f, confirm: v })} autoComplete="new-password" invalid={mismatch} />
        {mismatch && <p className="text-xs text-destructive">{t("auth.pw_mismatch")}</p>}</div>
      <label htmlFor={tid} className="flex items-start gap-2 text-sm leading-relaxed">
        <Checkbox id={tid} checked={terms} onCheckedChange={(v) => setTerms(v === true)} className="mt-0.5" />
        <span>{t("auth.terms_a")} <Link to="/terms" target="_blank" className="text-primary underline">{t("auth.terms_link")}</Link> {t("auth.terms_and")} <Link to="/privacy" target="_blank" className="text-primary underline">{t("auth.privacy_link")}</Link> {t("auth.terms_b")}</span>
      </label>
      <div className="space-y-1.5 rounded-xl border border-dashed p-3">
        <Label htmlFor="otp" className="flex items-center gap-1.5"><Mail className="size-4" />{t("auth.otp_code")}</Label>
        <div className="flex gap-2">
          <Input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="••••••" disabled={!sentTo}
            value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.replace(/\D/g, "").slice(0, 8) })}
            className="h-11 flex-1 text-center text-lg tracking-[0.4em]" />
          <Button type="button" variant="outline" className="h-11 shrink-0" onClick={sendCode} disabled={busy !== null || wait > 0}>
            {busy === "send" ? t("common.loading") : wait > 0 ? `${wait}s` : sentTo ? t("auth.otp_resend") : t("auth.send_code")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{sentTo ? <>{t("auth.otp_hint")} <span className="font-medium text-foreground">{sentTo}</span></> : t("auth.code_hint")}</p>
      </div>
      <Button type="submit" className="h-11 w-full" disabled={busy !== null || !sentTo || f.code.length < 6 || !terms}>
        {busy === "verify" ? t("common.loading") : t("auth.signup")}</Button>
    </form>
  );
}

function Forgot({ onBack }: { onBack: () => void }) {
  const { t } = useApp();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  };
  return sent ? (
    <div className="space-y-4 text-center">
      <p className="text-sm">{t("auth.forgot_sent")}</p>
      <Button variant="outline" className="w-full" onClick={onBack}>{t("auth.back_signin")}</Button>
    </div>
  ) : (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("auth.forgot_hint")}</p>
      <div className="space-y-1.5"><Label htmlFor="fe">{t("auth.email")}</Label>
        <Input id="fe" type="email" autoComplete="email" className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      <Button type="submit" className="h-11 w-full" disabled={busy}>{busy ? t("common.loading") : t("auth.forgot_send")}</Button>
      <button type="button" onClick={onBack} className="block w-full text-center text-sm text-muted-foreground hover:underline">{t("auth.back_signin")}</button>
    </form>
  );
}
