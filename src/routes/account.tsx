import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { townshipsQuery } from "@/lib/queries";
import { LangSwitch, RequireAuth } from "@/components/site/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My account · Bago Market" },
      { name: "description", content: "Manage your Bago Market profile and language." },
      { property: "og:title", content: "My account · Bago Market" },
      { property: "og:description", content: "Your Bago Market account settings." },
    ],
  }),
  component: () => <RequireAuth><Account /></RequireAuth>,
});

function Account() {
  const { t, pick, session, roles, setTownship } = useApp();
  const towns = useQuery(townshipsQuery);
  const [f, setF] = useState({ full_name: "", phone: "", township_id: "" });
  useEffect(() => {
    supabase.from("profiles").select("full_name, phone, township_id").eq("id", session!.user.id).maybeSingle().then(({ data }) => {
      if (data) setF({ full_name: data.full_name ?? "", phone: data.phone ?? "", township_id: data.township_id ?? "" });
    });
  }, [session]);
  const save = async () => {
    const { error } = await supabase.from("profiles").update({ ...f, township_id: f.township_id || null }).eq("id", session!.user.id);
    if (error) return toast.error(t("err.generic"));
    if (f.township_id) setTownship(f.township_id);
    toast.success(t("account.saved"));
  };
  return (
    <div className="mx-auto max-w-lg space-y-5 py-6">
      <h1 className="text-xl font-bold">{t("account.title")}</h1>
      <div className="surface space-y-4 p-5">
        <p className="text-sm text-muted-foreground">{session?.user.email}</p>
        <div className="space-y-1.5"><Label>{t("auth.name")}</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>{t("checkout.phone")}</Label><Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div className="space-y-1.5">
          <Label>{t("nav.township")}</Label>
          <select value={f.township_id} onChange={(e) => setF({ ...f, township_id: e.target.value })} className="h-9 w-full rounded-md border bg-card px-2 text-sm">
            <option value="">—</option>
            {towns.data?.map((x) => <option key={x.id} value={x.id}>{pick(x.name_my, x.name_en)}</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><Label>{t("account.language")}</Label><div><LangSwitch /></div></div>
        <Button onClick={save}>{t("common.save")}</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link to="/orders">{t("orders.title")}</Link></Button>
        <Button asChild variant="outline"><Link to="/merchant">{t("nav.merchant")}</Link></Button>
        {roles.includes("admin") && <Button asChild variant="outline"><Link to="/admin">{t("nav.admin")}</Link></Button>}
      </div>
    </div>
  );
}
