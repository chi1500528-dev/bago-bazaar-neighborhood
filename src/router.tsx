import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";
import { installSupabaseRelay } from "./lib/sb-relay";

export const getRouter = () => {
  installSupabaseRelay();
  const queryClient = new QueryClient({
    defaultOptions: {
      // Flaky mobile networks: keep showing data we already have and retry quietly.
      queries: { staleTime: 60_000, gcTime: 30 * 60_000, retry: 3, retryDelay: (n) => Math.min(1000 * 2 ** n, 8000), refetchOnWindowFocus: false },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  // Data fetched on the server is sent inside the first page, so shops & products show immediately.
  setupRouterSsrQueryIntegration({ router, queryClient });
  return router;
};
