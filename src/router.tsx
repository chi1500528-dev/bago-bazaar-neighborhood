import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { installSupabaseRelay } from "./lib/sb-relay";

export const getRouter = () => {
  installSupabaseRelay();
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
