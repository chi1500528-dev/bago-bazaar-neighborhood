import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { translate, type Lang, type TKey } from "@/lib/i18n/dict";
import { addToCart as addRule, type CartLine } from "@/lib/domain/rules";

type Role = "admin" | "merchant" | "customer";

interface AppState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: TKey, v?: Record<string, string | number>) => string;
  /** Pick Myanmar or English field, falling back to the other. */
  pick: (my?: string | null, en?: string | null) => string;
  township: string | null;
  setTownship: (id: string | null) => void;
  session: Session | null;
  authReady: boolean;
  roles: Role[];
  cart: CartLine[];
  addToCart: (l: CartLine, opts?: { replace?: boolean }) => "ok" | "other_shop" | "out_of_stock";
  setQty: (productId: string, qty: number) => void;
  removeLine: (productId: string) => void;
  clearCart: () => void;
}

const Ctx = createContext<AppState | null>(null);

function readLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [lang, setLangState] = useState<Lang>("my");
  const [township, setTownshipState] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLangState(readLS<Lang>("bm.lang", "my"));
    setTownshipState(readLS<string | null>("bm.township", null));
    setCart(readLS<CartLine[]>("bm.cart", []));
    setHydrated(true);
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        if (event !== "SIGNED_OUT") qc.invalidateQueries();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);

  useEffect(() => {
    if (hydrated) localStorage.setItem("bm.cart", JSON.stringify(cart));
  }, [cart, hydrated]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const uid = session?.user.id;
  const { data: roles = [] } = useQuery({
    queryKey: ["roles", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid!);
      return (data ?? []).map((r) => r.role as Role);
    },
  });

  // Load saved profile language once signed in.
  useEffect(() => {
    if (!uid) return;
    supabase
      .from("profiles")
      .select("language, township_id")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.language === "my" || data?.language === "en") {
          setLangState(data.language);
          localStorage.setItem("bm.lang", JSON.stringify(data.language));
        }
      });
  }, [uid]);

  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      localStorage.setItem("bm.lang", JSON.stringify(l));
      if (uid) supabase.from("profiles").update({ language: l }).eq("id", uid).then(() => {});
    },
    [uid],
  );

  const setTownship = useCallback((id: string | null) => {
    setTownshipState(id);
    localStorage.setItem("bm.township", JSON.stringify(id));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      lang,
      setLang,
      t: (k, v) => translate(lang, k, v),
      pick: (my, en) => (lang === "my" ? my || en || "" : en || my || ""),
      township,
      setTownship,
      session,
      authReady,
      roles,
      cart,
      addToCart: (l, opts) => {
        const base = opts?.replace ? [] : cart;
        const r = addRule(base, l);
        if (!r.ok) return r.reason;
        setCart(r.lines);
        return "ok";
      },
      setQty: (id, q) =>
        setCart((c) => c.map((l) => (l.productId === id ? { ...l, quantity: Math.max(1, Math.min(q, l.stock)) } : l))),
      removeLine: (id) => setCart((c) => c.filter((l) => l.productId !== id)),
      clearCart: () => setCart([]),
    }),
    [lang, setLang, township, setTownship, session, authReady, roles, cart],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
}
