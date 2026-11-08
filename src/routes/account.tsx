import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Bell, ChevronRight, FileText, Globe, Info, LogOut, MessageSquare, Receipt, ShieldCheck, Store, Trash2, UserRound, Lock,
} from "lucide-react";
import { deleteOwnAccount } from "@/lib/account.functions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { LangSwitch, RequireAuth } from "@/components/site/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { playChime, setSoundOn, soundOn, useUnreadCounts } from "@/lib/notify";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My account · Bago Market" },
      { name: "description", content: "Manage your Bago Market profile, settings and language." },
      { property: "og:title", content: "My account · Bago Market" },
      { property: "og:description", content: "Your Bago Market account settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <RequireAuth><Account /></RequireAuth>,
});

type Icon = ComponentType<{ className?: string }>;

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="surface divide-y divide-border/70 overflow-hidden p-0">{children}</div>
    </section>
  );
}

function IconBox({ icon: I }: { icon: Icon }) {
  return <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><I className="size-[18px]" /></span>;
}

function Row({ to, icon, label, badge }: { to: string; icon: Icon; label: string; badge?: number }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent/60">
      <IconBox icon={icon} />
      <span className="flex-1 text-sm font-medium">{label}</span>
      {!!badge && <span className="grid min-w-5 place-items-center rounded-full bg-gold px-1.5 text-[11px] font-bold text-gold-foreground">{badge}</span>}
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

function Account() {
  const { t, session, roles } = useApp();
  const counts = useUnreadCounts();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState({ full_name: "", phone: "" });
  const [sound, setSound] = useState(true);
  useEffect(() => setSound(soundOn()), []);
  useEffect(() => {
    supabase.from("profiles").select("full_name, phone").eq("id", session!.user.id).maybeSingle().then(({ data }) => {
      if (data) setF({ full_name: data.full_name ?? "", phone: data.phone ?? "" });
    });
  }, [session]);
  const save = async () => {
    const { error } = await supabase.from("profiles").update(f).eq("id", session!.user.id);
    if (error) { toast.error(t("err.generic")); return; }
    toast.success(t("account.saved"));
  };
  const [deleting, setDeleting] = useState(false);
  const remove = async () => {
    setDeleting(true);
    try {
      const token = session?.access_token;
      if (!token) throw new Error("no session");
      await deleteOwnAccount({ data: { token } });
      await supabase.auth.signOut();
      toast.success(t("account.deleted"));
      navigate({ to: "/" });
    } catch {
      toast.error(t("err.generic"));
      setDeleting(false);
    }
  };
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  const name = f.full_name || session?.user.email?.split("@")[0] || "";
  const initials = name.trim().slice(0, 2).toUpperCase();
  const role = roles.includes("admin") ? t("account.role_admin") : t("account.role_customer");

  return (
    <div className="mx-auto max-w-lg space-y-6 py-6">
      <div className="surface flex items-center gap-4 p-5">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">{initials}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{name}</p>
          <p className="truncate text-sm text-muted-foreground">{session?.user.email}</p>
          <span className="mt-1 inline-block rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-foreground">{role}</span>
        </div>
      </div>

      <Group title={t("account.g_activity")}>
        <Row to="/orders" icon={Receipt} label={t("orders.title")} />
        <Row to="/messages" icon={MessageSquare} label={t("chat.title")} badge={counts.messages} />
        <Row to="/merchant" icon={Store} label={t("nav.merchant")} badge={counts.shopMessages + counts.newOrders} />
        {roles.includes("admin") && <Row to="/admin" icon={ShieldCheck} label={t("nav.admin")} />}
      </Group>

      <Group title={t("account.g_settings")}>
        <div className="space-y-4 px-4 py-4">
          <div className="flex items-center gap-3"><IconBox icon={UserRound} /><span className="text-sm font-medium">{t("account.personal")}</span></div>
          <div className="space-y-1.5"><Label>{t("auth.name")}</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>{t("checkout.phone")}</Label><Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <Button onClick={save} className="w-full">{t("common.save")}</Button>
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <IconBox icon={Globe} />
          <span className="flex-1 text-sm font-medium">{t("account.language")}</span>
          <LangSwitch />
        </div>
        <label className="flex cursor-pointer items-center gap-3 px-4 py-3.5">
          <IconBox icon={Bell} />
          <span className="flex-1 text-sm font-medium">{t("account.sound")}</span>
          <Switch checked={sound} onCheckedChange={(v) => { setSoundOn(v); setSound(v); if (v) playChime(); }} />
        </label>
      </Group>

      <Group title={t("account.g_support")}>
        <Row to="/about" icon={Info} label={t("footer.about")} />
        <Row to="/privacy" icon={Lock} label={t("footer.privacy")} />
        <Row to="/terms" icon={FileText} label={t("footer.terms")} />
      </Group>

      <div className="space-y-3">
        <Button variant="outline" className="w-full gap-2" onClick={signOut}><LogOut className="size-4" />{t("nav.signout")}</Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button disabled={deleting} className="mx-auto flex items-center gap-1.5 py-2 text-sm font-medium text-destructive hover:underline">
              <Trash2 className="size-4" />{t("account.delete")}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("account.delete_confirm")}</AlertDialogTitle>
              <AlertDialogDescription>{t("account.delete_hint")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel_btn")}</AlertDialogCancel>
              <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("account.delete_yes")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
