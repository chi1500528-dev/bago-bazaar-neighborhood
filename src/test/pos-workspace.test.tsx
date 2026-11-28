import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { translate } from "@/lib/i18n/dict";

const writes = vi.hoisted(() => ({ checkout: vi.fn(), receive: vi.fn() }));
vi.mock("@/lib/app-state", () => ({
  useApp: () => ({
    lang: "en",
    t: (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) =>
      translate("en", key, vars),
  }),
}));
vi.mock("@/lib/pos", () => ({
  pos: { day: vi.fn(), checkout: writes.checkout },
  notInstalled: () => false,
}));
vi.mock("@/lib/stock", () => ({
  stock: { cost: vi.fn(), receive: writes.receive },
  newStockKey: () => "test-only-key",
}));
vi.mock("@/components/site/bits", () => ({
  MediaImg: () => null,
  EmptyState: () => null,
}));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

import { PosSell } from "@/components/site/pos";
import { StockActions } from "@/components/site/stock-actions";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function client() {
  const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  qc.setQueryData(
    ["pos-products", "test-shop"],
    [
      {
        id: "test-product",
        name: "Test item",
        sku: null,
        barcode: null,
        price: 7500,
        sale_price: null,
        stock: 4,
        images: [],
      },
    ],
  );
  qc.setQueryData(["pos-day", "test-shop"], {
    data: { revenue: 0, count: 0, voided: 0, by_method: {}, sales: [] },
    error: null,
  });
  qc.setQueryData(["product-cost", "test-product"], { data: null, error: null });
  return qc;
}

describe("workspace validation without writes", () => {
  it("keeps both desktop and sheet checkout disabled when received cash is less than 7,500 MMK", () => {
    const qc = client();
    render(
      <QueryClientProvider client={qc}>
        <PosSell shopId="test-shop" />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add Test item" }));
    fireEvent.change(screen.getByLabelText(translate("en", "pos.received")), {
      target: { value: "5000" },
    });
    const checkout = screen
      .getAllByRole("button", { name: translate("en", "pos.finish") })
      .find((button) => button.hasAttribute("disabled"));
    expect(checkout).toBeDisabled();
    const openSheet = screen
      .getAllByRole("button")
      .find((button) => button.textContent?.includes("1 items"));
    if (!openSheet) throw new Error("Missing checkout sheet trigger");
    fireEvent.click(openSheet);
    expect(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: translate("en", "pos.finish"),
      }),
    ).toBeDisabled();
    expect(writes.checkout).not.toHaveBeenCalled();
    qc.clear();
  });

  it("does not allow receiving zero stock and never creates a stock record during validation", () => {
    const qc = client();
    render(
      <QueryClientProvider client={qc}>
        <StockActions product={{ id: "test-product", name: "Test item", stock: 4 }} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: translate("en", "stk.receive") }));
    const save = screen.getByRole("button", { name: translate("en", "stk.receive_save") });
    expect(save).toBeDisabled();
    const qty = screen.getByRole("dialog").querySelector("input");
    if (!qty) throw new Error("Missing stock quantity input");
    fireEvent.change(qty, { target: { value: "0" } });
    expect(save).toBeDisabled();
    expect(writes.receive).not.toHaveBeenCalled();
    qc.clear();
  });
});
