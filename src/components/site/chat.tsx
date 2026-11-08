import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type Conversation = {
  id: string; shop_id: string; customer_id: string; customer_name: string | null;
  last_message: string | null; last_message_at: string; customer_last_read: string; shop_last_read: string;
  shops?: { name: string; slug: string } | null;
};
type Msg = { id: string; sender_id: string; body: string; created_at: string; product_id: string | null };

const POLL = 4000; // Realtime is not relayed on blocked networks, so poll.

export function ChatThread({ conversationId, side, product }: { conversationId: string; side: "customer" | "shop"; product?: { id: string; name: string } | null }) {
  const { t, session } = useApp();
  const qc = useQueryClient();
  const me = session?.user.id;
  const [text, setText] = useState("");
  const [attach, setAttach] = useState(product ?? null);
  const end = useRef<HTMLDivElement>(null);
  const msgs = useQuery({
    queryKey: ["messages", conversationId],
    refetchInterval: POLL,
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("id, sender_id, body, created_at, product_id")
        .eq("conversation_id", conversationId).order("created_at").limit(500);
      if (error) throw error;
      return data as Msg[];
    },
  });
  const count = msgs.data?.length ?? 0;
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
    if (count) supabase.from("conversations").update(side === "customer" ? { customer_last_read: new Date().toISOString() } : { shop_last_read: new Date().toISOString() }).eq("id", conversationId).then(() => qc.invalidateQueries({ queryKey: ["conversations"] }));
  }, [count, conversationId, side, qc]);
  const send = useMutation({
    mutationFn: async () => {
      const body = (attach ? `[${attach.name}]\n` : "") + text.trim();
      const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, body, product_id: attach?.id ?? null, sender_id: me! });
      if (error) throw error;
    },
    onSuccess: () => { setText(""); setAttach(null); qc.invalidateQueries({ queryKey: ["messages", conversationId] }); qc.invalidateQueries({ queryKey: ["conversations"] }); },
    onError: () => toast.error(t("err.generic")),
  });
  const fmt = (s: string) => new Date(s).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {msgs.isLoading && <p className="text-center text-sm text-muted-foreground">{t("common.loading")}</p>}
        {count === 0 && !msgs.isLoading && <p className="py-8 text-center text-sm text-muted-foreground">{t("chat.empty")}</p>}
        {msgs.data?.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
              <div className={cn("max-w-[80%] whitespace-pre-line break-words rounded-2xl px-3.5 py-2 text-sm", mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground")}>
                {m.body}
                {m.product_id && <Link to="/p/$id" params={{ id: m.product_id }} className={cn("mt-1 block text-xs underline", mine ? "text-primary-foreground/90" : "text-primary")}>{t("chat.view_product")}</Link>}
              </div>
              <span className="mt-0.5 px-1 text-[11px] text-muted-foreground">{fmt(m.created_at)}</span>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      <form className="border-t bg-card p-3" onSubmit={(e) => { e.preventDefault(); if (text.trim() && !send.isPending) send.mutate(); }}>
        {attach && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-1.5 text-xs">
            <span className="truncate">{t("chat.about")}: <b>{attach.name}</b></span>
            <button type="button" className="text-muted-foreground" onClick={() => setAttach(null)} aria-label="×">×</button>
          </div>
        )}
        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1900} placeholder={t("chat.placeholder")}
            className="h-11 min-w-0 flex-1 rounded-full border bg-background px-4 text-sm outline-none focus:border-primary" />
          <Button type="submit" size="icon" className="size-11 shrink-0 rounded-full" disabled={!text.trim() || send.isPending} aria-label={t("chat.send")}><Send className="size-4" /></Button>
        </div>
      </form>
    </div>
  );
}

/** "Chat with shop" button that opens a drawer. Creates the conversation on first open. */
export function ChatWithShop({ shopId, shopName, ownerId, product, className, iconOnly }: { shopId: string; shopName: string; ownerId?: string; product?: { id: string; name: string }; className?: string; iconOnly?: boolean }) {
  const { t, session } = useApp();
  const [open, setOpen] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  if (ownerId && session?.user.id === ownerId) return null;
  const start = async () => {
    if (!session) { toast(t("chat.signin")); return; }
    setOpen(true);
    if (convId) return;
    const uid = session.user.id;
    const found = await supabase.from("conversations").select("id").eq("shop_id", shopId).eq("customer_id", uid).maybeSingle();
    if (found.data) { setConvId(found.data.id); return; }
    const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle();
    const { data, error } = await supabase.from("conversations").insert({ shop_id: shopId, customer_id: uid, customer_name: prof?.full_name || session.user.email || null, product_id: product?.id ?? null }).select("id").single();
    if (error) { toast.error(t("err.generic")); setOpen(false); return; }
    setConvId(data.id);
  };
  return (
    <>
      {session ? (
        <Button variant="outline" size={iconOnly ? "icon" : "default"} aria-label={t("chat.with_shop")} className={cn("gap-2", className)} onClick={start}><MessageCircle className={iconOnly ? "size-5" : "size-4"} />{!iconOnly && t("chat.with_shop")}</Button>
      ) : (
        <Button asChild variant="outline" size={iconOnly ? "icon" : "default"} aria-label={t("chat.with_shop")} className={cn("gap-2", className)}><Link to="/auth"><MessageCircle className={iconOnly ? "size-5" : "size-4"} />{!iconOnly && t("chat.with_shop")}</Link></Button>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b p-4"><SheetTitle>{shopName}</SheetTitle></SheetHeader>
          {convId ? <ChatThread conversationId={convId} side="customer" product={product ?? null} /> : <p className="p-6 text-center text-sm text-muted-foreground">{t("common.loading")}</p>}
        </SheetContent>
      </Sheet>
    </>
  );
}

export function isUnread(c: Conversation, side: "customer" | "shop") {
  if (!c.last_message) return false;
  return new Date(c.last_message_at) > new Date(side === "customer" ? c.customer_last_read : c.shop_last_read);
}

/** Inbox list + selected thread. Used by customers (/messages) and merchants (dashboard tab). */
export function ChatInbox({ side, shopId }: { side: "customer" | "shop"; shopId?: string }) {
  const { t, session } = useApp();
  const [sel, setSel] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["conversations", side, shopId ?? session?.user.id],
    enabled: !!session,
    refetchInterval: POLL * 2,
    queryFn: async () => {
      let q = supabase.from("conversations").select("id, shop_id, customer_id, customer_name, last_message, last_message_at, customer_last_read, shop_last_read, shops(name, slug)").not("last_message", "is", null).order("last_message_at", { ascending: false }).limit(100);
      q = side === "shop" ? q.eq("shop_id", shopId!) : q.eq("customer_id", session!.user.id);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Conversation[];
    },
  });
  const current = list.data?.find((c) => c.id === sel);
  const title = (c: Conversation) => side === "shop" ? (c.customer_name || t("chat.customer")) : (c.shops?.name ?? "");
  if (list.isLoading) return <p className="py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</p>;
  if (!list.data?.length) return <p className="surface p-8 text-center text-sm text-muted-foreground">{t("chat.no_conversations")}</p>;
  return (
    <div className="surface grid h-[70vh] min-h-[420px] overflow-hidden md:grid-cols-[280px_1fr]">
      <ul className={cn("overflow-y-auto border-r", sel && "hidden md:block")}>
        {list.data.map((c) => (
          <li key={c.id}>
            <button onClick={() => setSel(c.id)} className={cn("flex w-full flex-col items-start gap-0.5 border-b px-4 py-3 text-left hover:bg-accent", sel === c.id && "bg-accent")}>
              <span className="flex w-full items-center gap-2 text-sm font-semibold">
                <span className="truncate">{title(c)}</span>
                {isUnread(c, side) && <span className="ml-auto size-2.5 shrink-0 rounded-full bg-gold" aria-label={t("chat.new")} />}
              </span>
              <span className="line-clamp-1 text-xs text-muted-foreground">{c.last_message}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className={cn("min-h-0 flex-col", sel ? "flex" : "hidden md:flex")}>
        {current ? (
          <>
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <button className="text-sm text-primary md:hidden" onClick={() => setSel(null)}>← {t("chat.back")}</button>
              <span className="truncate font-semibold">{title(current)}</span>
            </div>
            <ChatThread key={current.id} conversationId={current.id} side={side} />
          </>
        ) : <p className="m-auto text-sm text-muted-foreground">{t("chat.pick")}</p>}
      </div>
    </div>
  );
}
