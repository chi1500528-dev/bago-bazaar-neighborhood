import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bike, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { cartTotals, errorKey, formatMMK, type DeliveryMethod } from "@/lib/domain/rules";
import { townshipsQuery, useCartShop } from "@/lib/queries";
import { EmptyState, StickyActionBar } from "@/components/site/bits";
import { useTownshipName } from "@/components/site/cards";
import { RequireAuth } from "@/components/site/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout · Bago Market" },
      { name: "description", content: "Choose shop delivery or pickup and place your order." },
      { property: "og:title", content: "Checkout · Bago Market" },
      { property: "og:description", content: "Complete your Bago Market order." },
    ],
  }),
  component: () => <RequireAuth><Checkout /></RequireAuth>,
});

function Checkout() {
  const { t, lang, pick, cart, clearCart, session, township } = useApp();
  const navigate = useNavigate();
  const shop = useCartShop(cart[0]?.shopId);
  const towns = useQuery(townshipsQuery);
  const twName = useTownshipName();
  const [method, setMethod] = useState<DeliveryMethod | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", township: township ?? "", address: "", note: "" });
  const [errors, setErrors] = useState<Partial<Record<"name"|"phone"|"township"|"address"|"note", string>>>({});
  const [busy, setBusy] = useState(false);
  const key = useRef<string>("");

  useEffect(() => {
    key.current = crypto.randomUUID();
  }, []);
  useEffect(() => {
    if (shop.data && method === null) setMethod(shop.data.offers_delivery ? "delivery" : "pickup");
  }, [shop.data, method]);
  useEffect(() => {
    if (!session) return;
    supabase.from("profiles").select("full_name, phone").eq("id", session.user.id).maybeSingle().then(({ data }) => {
      if (data) setForm((f) => ({ ...f, name: f.name || data.full_name || "", phone: f.phone || data.phone || "" }));
    });
  }, [session]);

  if (cart.length === 0) return <div className="py-10"><EmptyState text={t("cart.empty")} /></div>;
  if (!shop.data) return <p className="py-16 text-center text-sm text-muted-foreground">{t("common.loading")}</p>;
  const s = shop.data;
  const totals = cartTotals(cart);

  const submit = async () => {
    const e: { name?: string; phone?: string; address?: string; township?: string } = {};
    if (!form.name.trim()) e.name = t("checkout.required");
    if (!/^[0-9+\-\s]{6,20}$/.test(form.phone.trim())) e.phone = t("checkout.phone_invalid");
    if (method === "delivery" && !form.address.trim()) e.address = t("checkout.required");
    if (method === "delivery" && !form.township) e.township = t("checkout.required");
    setErrors(e);
    if (Object.keys(e).length || !method) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("place_order", {
      p_shop_id: s.id,
      p_items: cart.map((l) => ({ product_id: l.productId, quantity: l.quantity })),
      p_method: method,
      p_recipient_name: form.name,
      p_phone: form.phone,
      p_township_id: (method === "delivery" ? form.township : s.township_id) || (null as unknown as string),
      p_address: method === "delivery" ? form.address : "",
      p_note: form.note,
      p_idempotency_key: key.current,
    });
    setBusy(false);
    if (error || !data) {
      toast.error(t(errorKey(error?.message)));
      return;
    }
    clearCart();
    toast.success(t("checkout.success"));
    navigate({ to: "/orders/$id", params: { id: data } });
  };

  const field = (k: keyof typeof form, label: string, el: React.ReactNode) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      {el}
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <div className="grid gap-6 py-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <h1 className="text-xl font-bold">{t("checkout.title")}</h1>
        <section className="space-y-3">
          <h2 className="font-semibold">{t("checkout.method")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {([["delivery", Bike, s.offers_delivery], ["pickup", Store, s.offers_pickup]] as const).map(([m, Icon, ok]) => (
              <button key={m} disabled={!ok} onClick={() => setMethod(m)}
                className={cn("surface flex items-start gap-3 p-4 text-left transition-colors disabled:opacity-40", method === m && "border-primary ring-2 ring-primary/15")}>
                <Icon className="mt-0.5 size-5 text-primary" />
                <span>
                  <span className="block font-medium">{t(m === "delivery" ? "checkout.delivery" : "checkout.pickup")}</span>
                  <span className="text-xs text-muted-foreground">{m === "delivery" ? t("cart.delivery_fee_note") : s.name}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
        <section className="surface grid gap-4 p-5 sm:grid-cols-2">
          {field("name", t("checkout.name"), <Input id="name" autoComplete="name" className="h-11" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />)}
          {field("phone", t("checkout.phone"), <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" className="h-11" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />)}
          {method === "delivery" ? (
            <>
              {field("township", t("checkout.township"), (
                <select id="township" value={form.township} onChange={(e) => setForm({ ...form, township: e.target.value })} className="h-11 w-full rounded-md border bg-card px-2 text-sm">
                  <option value="">—</option>
                  {towns.data?.map((x) => <option key={x.id} value={x.id}>{pick(x.name_my, x.name_en)}</option>)}
                </select>
              ))}
              <div className="sm:col-span-2">{field("address", t("checkout.address"), <Textarea id="address" autoComplete="street-address" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />)}</div>
            </>
          ) : (
            <div className="rounded-md bg-primary-soft p-3 text-sm sm:col-span-2">
              <p className="font-medium">{t("checkout.pickup_info")}</p>
              <p>{[s.address, twName(s.township_id)].filter(Boolean).join(", ")}</p>
              {s.pickup_info && <p className="text-muted-foreground">{s.pickup_info}</p>}
              {s.phone && <p>{s.phone}</p>}
            </div>
          )}
          <div className="sm:col-span-2">{field("note", `${t("checkout.note")} ${t("common.optional")}`, <Textarea id="note" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />)}</div>
        </section>
        <section className="rounded-lg border border-gold/40 bg-gold-soft p-4 text-sm text-gold-foreground">
          <p className="font-medium">{t("checkout.payment")}</p>
          <p>{t("checkout.payment_cod")}</p>
        </section>
      </div>
      <aside className="surface h-fit space-y-3 p-5">
        <h2 className="font-semibold">{t("checkout.summary")}</h2>
        <p className="text-sm text-muted-foreground">{s.name}</p>
        <ul className="space-y-1.5 text-sm">
          {cart.map((l) => (
            <li key={l.productId} className="flex justify-between gap-3"><span className="line-clamp-1">{l.quantity} × {l.name}</span><span className="shrink-0">{formatMMK(l.unitPrice * l.quantity, lang)}</span></li>
          ))}
        </ul>
        <div className="space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between"><span>{t("cart.subtotal")}</span><span>{formatMMK(totals.subtotal, lang)}</span></div>
          {method === "delivery" && <p className="text-xs text-muted-foreground">{t("cart.delivery_fee_note")}</p>}
          <div className="flex justify-between pt-1 text-base font-bold"><span>{t("cart.total")}</span><span className="text-primary">{formatMMK(totals.total, lang)}</span></div>
        </div>
        <Button size="lg" className="hidden w-full md:inline-flex" disabled={busy || !method} onClick={submit}>{busy ? t("checkout.placing") : t("checkout.place")}</Button>
        <Link to="/cart" className="block py-2 text-center text-xs text-muted-foreground hover:underline">{t("common.back")}</Link>
      </aside>
      <StickyActionBar>
        <span className="min-w-0 flex-1"><span className="block text-xs text-muted-foreground">{t("cart.total")}</span><span className="text-lg font-bold text-primary">{formatMMK(totals.total, lang)}</span></span>
        <Button size="lg" className="h-12 shrink-0" disabled={busy || !method} onClick={submit}>{busy ? t("checkout.placing") : t("checkout.place")}</Button>
      </StickyActionBar>
    </div>
  );
}
