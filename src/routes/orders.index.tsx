import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-state";
import { formatMMK } from "@/lib/domain/rules";
import { EmptyState, StatusBadge } from "@/components/site/bits";
import { RequireAuth } from "@/components/site/shell";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "My orders · Bago Market" },
      { name: "description", content: "Track your Bago Market orders." },
      { property: "og:title", content: "My orders · Bago Market" },
      { property: "og:description", content: "See the status of your orders." },
    ],
  }),
  component: () => <RequireAuth><Orders /></RequireAuth>,
});

function Orders() {
  const { t, lang, session } = useApp();
  const q = useQuery({
    queryKey: ["my-orders", session?.user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id, order_no, status, total, created_at, shops(name)")
        .eq("customer_id", session!.user.id).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="py-6">
      <h1 className="mb-4 text-[26px] font-semibold leading-[1.5] md:text-[30px]">{t("orders.title")}</h1>
      {q.isLoading ? <p className="text-sm text-muted-foreground">{t("common.loading")}</p> : (q.data ?? []).length === 0 ? <EmptyState text={t("orders.empty")} /> : (
        <ul className="divide-y rounded-lg border bg-card">
          {q.data!.map((o) => (
            <li key={o.id}>
              <Link to="/orders/$id" params={{ id: o.id }} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-muted/50">
                <div><p className="font-medium">{t("orders.number", { n: o.order_no })}</p><p className="text-[13px] text-muted-foreground">{o.shops?.name}</p></div>
                <div className="flex items-center gap-3"><span className="text-sm font-medium">{formatMMK(o.total, lang)}</span><StatusBadge status={o.status} /></div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
