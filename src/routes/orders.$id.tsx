import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { RequireAuth } from "@/components/site/shell";
import { OrderDetail } from "@/components/site/order-detail";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order status · Bago Market" },
      { name: "description", content: "Live status of your Bago Market order." },
      { property: "og:title", content: "Order status · Bago Market" },
      { property: "og:description", content: "Track your order." },
    ],
  }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const { t } = useApp();
  return (
    <RequireAuth>
      <div className="py-6">
        <Link to="/orders" className="mb-3 inline-block text-sm text-primary hover:underline">← {t("orders.title")}</Link>
        <OrderDetail id={id} as="customer" />
      </div>
    </RequireAuth>
  );
}
