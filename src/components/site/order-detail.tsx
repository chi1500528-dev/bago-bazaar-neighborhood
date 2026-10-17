import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { customerCanCancel, errorKey, formatMMK, merchantNextStatuses, type OrderStatus } from "@/lib/domain/rules";
import { MediaImg, StatusBadge } from "./bits";
import { useTownshipName } from "./cards";
import { Button } from "@/components/ui/button";

export function OrderDetail({ id, as }: { id: string; as: "customer" | "merchant" }) {
  const { t, lang } = useApp();
  const qc = useQueryClient();
  const tw = useTownshipName();
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders")
        .select("*, shops(name, slug, phone, address, pickup_info), order_items(*), order_status_history(*)")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    const ch = supabase.channel(`order-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, () => qc.invalidateQueries({ queryKey: ["order", id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  if (q.isLoading) return <p className="py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</p>;
  const o = q.data;
  if (!o) return <p className="py-10 text-center text-sm text-muted-foreground">{t("auth.forbidden")}</p>;
  const status = o.status as OrderStatus;
  const next = as === "merchant" ? merchantNextStatuses(status, o.delivery_method) : customerCanCancel(status) ? (["cancelled"] as OrderStatus[]) : [];

  const change = async (s: OrderStatus) => {
    setBusy(true);
    const { error } = await supabase.rpc("update_order_status", { p_order_id: o.id, p_status: s });
    setBusy(false);
    if (error) { toast.error(t(errorKey(error.message))); return; }
    qc.invalidateQueries();
  };

  const history = [...(o.order_status_history ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t("orders.number", { n: o.order_no })}</h1>
          <p className="text-sm text-muted-foreground">{o.shops?.name} · {new Date(o.created_at).toLocaleString(lang === "my" ? "my-MM" : "en-GB")}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      {next.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {next.map((s) => (
            <Button key={s} disabled={busy} variant={s === "cancelled" ? "outline" : "default"} onClick={() => change(s)}>
              {s === "cancelled" && as === "customer" ? t("orders.cancel") : t(`status.${s}` as "status.pending")}
            </Button>
          ))}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="surface space-y-1 p-4 text-sm">
          <p className="font-semibold">{t(o.delivery_method === "delivery" ? "checkout.delivery" : "checkout.pickup")}</p>
          <p>{o.recipient_name} · <a href={`tel:${o.phone}`} className="hover:underline">{o.phone}</a></p>
          {o.delivery_method === "delivery" ? <p>{[o.address, tw(o.township_id)].filter(Boolean).join(", ")}</p> : <p className="text-muted-foreground">{[o.shops?.address, o.shops?.pickup_info].filter(Boolean).join(" · ")}</p>}
          {o.note && <p className="text-muted-foreground">“{o.note}”</p>}
          <p className="pt-2 text-xs text-muted-foreground">{t("checkout.payment_cod")}</p>
        </div>
        <div className="surface p-4 text-sm">
          <p className="mb-2 font-semibold">{t("orders.history")}</p>
          <ol className="space-y-1.5">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between gap-3"><span>{t(`status.${h.status}` as "status.pending")}</span><span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString(lang === "my" ? "my-MM" : "en-GB")}</span></li>
            ))}
          </ol>
        </div>
      </div>
      <div className="surface p-4">
        <p className="mb-3 font-semibold">{t("orders.items")}</p>
        <ul className="divide-y">
          {o.order_items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 py-2 text-sm">
              <MediaImg path={it.image_url} alt={it.name} className="size-12 shrink-0 rounded" />
              <span className="flex-1">{it.quantity} × {it.name}</span>
              <span>{formatMMK(it.line_total, lang)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between"><span>{t("cart.subtotal")}</span><span>{formatMMK(o.subtotal, lang)}</span></div>
          <div className="flex justify-between"><span>{t("cart.delivery_fee")}</span><span>{formatMMK(o.delivery_fee, lang)}</span></div>
          <div className="flex justify-between font-bold"><span>{t("cart.total").replace(/\s*\(.*\)/, "")}</span><span className="text-primary">{formatMMK(o.total, lang)}</span></div>
        </div>
      </div>
    </div>
  );
}
