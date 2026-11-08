import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { isUnread, type Conversation } from "@/components/site/chat";

const SOUND_KEY = "bm.sound";
let ctx: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function soundOn() {
  try { return localStorage.getItem(SOUND_KEY) !== "off"; } catch { return true; }
}
export function setSoundOn(on: boolean) {
  try { localStorage.setItem(SOUND_KEY, on ? "on" : "off"); } catch { /* ignore */ }
}

/** Soft two-note bell, generated in code (no file to download). */
export function playChime(kind: "message" | "order" = "message") {
  if (!soundOn()) return;
  const a = audio();
  if (!a) return;
  if (a.state === "suspended") void a.resume();
  const notes = kind === "order" ? [784, 988, 1319] : [880, 1175];
  notes.forEach((f, i) => {
    const t = a.currentTime + i * 0.16;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = "sine";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + 0.65);
  });
  try { navigator.vibrate?.(kind === "order" ? [120, 60, 120] : 80); } catch { /* ignore */ }
}

type OrderLite = { id: string; shop_id: string; customer_id: string; status: string; recipient_name: string; updated_at: string };
type Feed = { me: string; myShops: string[]; convs: Conversation[]; orders: OrderLite[] };

export function useNotifyFeed() {
  const { session } = useApp();
  const me = session?.user.id;
  return useQuery({
    queryKey: ["notify-feed", me],
    enabled: !!me,
    refetchInterval: 8000,
    refetchIntervalInBackground: true,
    queryFn: async (): Promise<Feed> => {
      const shops = await supabase.from("shops").select("id").eq("owner_id", me!);
      const myShops = (shops.data ?? []).map((s) => s.id);
      const convs = await supabase.from("conversations")
        .select("id, shop_id, customer_id, customer_name, last_message, last_message_at, customer_last_read, shop_last_read, shops(name, slug)")
        .not("last_message", "is", null).order("last_message_at", { ascending: false }).limit(100);
      let oq = supabase.from("orders").select("id, shop_id, customer_id, status, recipient_name, updated_at").order("updated_at", { ascending: false }).limit(100);
      oq = myShops.length ? oq.or(`customer_id.eq.${me},shop_id.in.(${myShops.join(",")})`) : oq.eq("customer_id", me!);
      const orders = await oq;
      return { me: me!, myShops, convs: (convs.data ?? []) as unknown as Conversation[], orders: (orders.data ?? []) as OrderLite[] };
    },
  });
}

export function sideOf(c: Conversation, me: string): "customer" | "shop" {
  return c.customer_id === me ? "customer" : "shop";
}

/** Counts used by badges. */
export function useUnreadCounts() {
  const f = useNotifyFeed().data;
  if (!f) return { messages: 0, shopMessages: 0, newOrders: 0 };
  const unread = f.convs.filter((c) => isUnread(c, sideOf(c, f.me)));
  return {
    messages: unread.filter((c) => c.customer_id === f.me).length,
    shopMessages: unread.filter((c) => c.customer_id !== f.me).length,
    newOrders: f.orders.filter((o) => f.myShops.includes(o.shop_id) && o.status === "pending").length,
  };
}

/** Mounted once: compares each poll with the last one and alerts on anything new. */
export function Notifier() {
  const { t } = useApp();
  const navigate = useNavigate();
  const feed = useNotifyFeed();
  const prev = useRef<{ msg: Map<string, string>; ord: Map<string, string> } | null>(null);
  const [, force] = useState(0);

  // Unlock audio on first tap (browsers block sound until the user interacts).
  useEffect(() => {
    const unlock = () => { const a = audio(); if (a?.state === "suspended") void a.resume(); };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => { window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  }, []);

  useEffect(() => {
    const f = feed.data;
    if (!f) return;
    const msg = new Map(f.convs.map((c) => [c.id, c.last_message_at]));
    const ord = new Map(f.orders.map((o) => [o.id, o.status]));
    const p = prev.current;
    prev.current = { msg, ord };
    if (!p) return; // first load: no alerts for old items
    let sound: "message" | "order" | null = null;
    for (const c of f.convs) {
      const side = sideOf(c, f.me);
      if (p.msg.get(c.id) !== c.last_message_at && isUnread(c, side)) {
        const from = side === "shop" ? (c.customer_name || t("chat.customer")) : (c.shops?.name ?? "");
        const viewing = typeof window !== "undefined" && (window.location.pathname === "/messages" || window.location.pathname === "/merchant");
        if (!viewing) toast(`${t("notify.new_message")} · ${from}`, {
          description: c.last_message ?? "",
          action: { label: t("notify.open"), onClick: () => navigate({ to: side === "shop" ? "/merchant" : "/messages" }) },
        });
        sound ??= "message";
      }
    }
    for (const o of f.orders) {
      const before = p.ord.get(o.id);
      const mine = f.myShops.includes(o.shop_id);
      if (mine && before === undefined) {
        toast.success(`${t("notify.new_order")} · ${o.recipient_name}`, { action: { label: t("notify.open"), onClick: () => navigate({ to: "/merchant" }) } });
        sound = "order";
      } else if (o.customer_id === f.me && !mine && before !== undefined && before !== o.status) {
        toast(`${t("notify.order_update")}: ${t(`status.${o.status}` as "status.pending")}`, { action: { label: t("notify.open"), onClick: () => navigate({ to: "/orders/$id", params: { id: o.id } }) } });
        sound ??= "message";
      }
    }
    if (sound) { playChime(sound); force((n) => n + 1); }
  }, [feed.data, t, navigate]);

  return null;
}
