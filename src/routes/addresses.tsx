import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useApp } from "@/lib/app-state";
import { townshipsQuery } from "@/lib/queries";
import { addressesQueryKey, addressesTable, fetchAddresses, type Address } from "@/lib/addresses";
import { useTownshipName } from "@/components/site/cards";
import { EmptyState } from "@/components/site/bits";
import { RequireAuth } from "@/components/site/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/addresses")({
  head: () => ({
    meta: [
      { title: "Shipping addresses · Bago Market" },
      {
        name: "description",
        content: "Save delivery addresses for faster checkout on Bago Market.",
      },
      { property: "og:title", content: "Shipping addresses · Bago Market" },
      { property: "og:description", content: "Your saved delivery addresses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Addresses />
    </RequireAuth>
  ),
});

const blank = {
  label: "",
  recipient_name: "",
  phone: "",
  township_id: "",
  address: "",
  is_default: false,
};

function Addresses() {
  const { t, pick, session } = useApp();
  const qc = useQueryClient();
  const twName = useTownshipName();
  const towns = useQuery(townshipsQuery);
  const q = useQuery({ queryKey: addressesQueryKey(session?.user.id), queryFn: fetchAddresses });
  const [edit, setEdit] = useState<(typeof blank & { id?: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["addresses"] });

  const clearDefault = async (keep?: string) => {
    let r = addressesTable().update({ is_default: false }).eq("user_id", session!.user.id);
    if (keep) r = r.neq("id", keep);
    await r;
  };
  const save = async () => {
    if (!edit) return;
    if (!edit.recipient_name.trim() || !edit.address.trim() || !edit.township_id) {
      toast.error(t("checkout.required"));
      return;
    }
    if (!/^[0-9+\-\s]{6,20}$/.test(edit.phone.trim())) {
      toast.error(t("checkout.phone_invalid"));
      return;
    }
    setBusy(true);
    const first = !(q.data ?? []).length;
    const payload = {
      label: edit.label.trim() || null,
      recipient_name: edit.recipient_name.trim(),
      phone: edit.phone.trim(),
      township_id: edit.township_id,
      address: edit.address.trim(),
      is_default: edit.is_default || first,
    };
    const { data, error } = edit.id
      ? await addressesTable().update(payload).eq("id", edit.id).select("id").single()
      : await addressesTable()
          .insert({ ...payload, user_id: session!.user.id })
          .select("id")
          .single();
    if (!error && payload.is_default) await clearDefault(data.id);
    setBusy(false);
    if (error) {
      toast.error(t("err.generic"));
      return;
    }
    toast.success(t("account.saved"));
    setEdit(null);
    refresh();
  };
  const remove = async (a: Address) => {
    const { error } = await addressesTable().delete().eq("id", a.id);
    if (error) {
      toast.error(t("err.generic"));
      return;
    }
    refresh();
  };
  const makeDefault = async (a: Address) => {
    await clearDefault(a.id);
    await addressesTable().update({ is_default: true }).eq("id", a.id);
    refresh();
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("addr.title")}</h1>
        {!edit && (
          <Button size="sm" onClick={() => setEdit({ ...blank })}>
            <Plus className="size-4" />
            {t("addr.add")}
          </Button>
        )}
      </div>
      {edit && (
        <div className="surface space-y-3 p-5">
          <div className="space-y-1.5">
            <Label>
              {t("addr.label")} {t("common.optional")}
            </Label>
            <Input
              placeholder={t("addr.label_ph")}
              value={edit.label}
              onChange={(e) => setEdit({ ...edit, label: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("checkout.name")}</Label>
              <Input
                autoComplete="name"
                value={edit.recipient_name}
                onChange={(e) => setEdit({ ...edit, recipient_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("checkout.phone")}</Label>
              <Input
                type="tel"
                inputMode="tel"
                value={edit.phone}
                onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("checkout.township")}</Label>
            <select
              className="h-10 w-full rounded-md border bg-card px-2 text-sm"
              value={edit.township_id}
              onChange={(e) => setEdit({ ...edit, township_id: e.target.value })}
            >
              <option value="">—</option>
              {towns.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {pick(x.name_my, x.name_en)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("checkout.address")}</Label>
            <Textarea
              rows={2}
              value={edit.address}
              onChange={(e) => setEdit({ ...edit, address: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={edit.is_default}
              onChange={(e) => setEdit({ ...edit, is_default: e.target.checked })}
            />
            {t("addr.make_default")}
          </label>
          <div className="flex gap-2">
            <Button onClick={save} disabled={busy}>
              {t("common.save")}
            </Button>
            <Button variant="outline" onClick={() => setEdit(null)}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      )}
      {q.isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : !(q.data ?? []).length && !edit ? (
        <EmptyState text={t("addr.empty")} />
      ) : (
        <ul className="space-y-3">
          {q.data!.map((a) => (
            <li key={a.id} className="surface flex gap-3 p-4">
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">
                  {a.label || a.recipient_name}
                  {a.is_default && (
                    <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold">
                      {t("addr.default")}
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground">
                  {a.recipient_name} · {a.phone}
                </p>
                <p className="text-muted-foreground">
                  {[a.address, twName(a.township_id)].filter(Boolean).join(", ")}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {!a.is_default && (
                    <Button size="sm" variant="ghost" onClick={() => makeDefault(a)}>
                      <Star className="size-4" />
                      {t("addr.make_default")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setEdit({
                        id: a.id,
                        label: a.label ?? "",
                        recipient_name: a.recipient_name,
                        phone: a.phone,
                        township_id: a.township_id ?? "",
                        address: a.address,
                        is_default: a.is_default,
                      })
                    }
                  >
                    <Pencil className="size-4" />
                    {t("common.edit")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => remove(a)}
                  >
                    <Trash2 className="size-4" />
                    {t("common.delete")}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
