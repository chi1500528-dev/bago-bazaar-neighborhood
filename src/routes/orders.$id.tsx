import { createFileRoute } from "@tanstack/react-router";
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
  return (
    <RequireAuth>
      <div className="py-6">
        <OrderDetail id={id} as="customer" />
      </div>
    </RequireAuth>
  );
}
