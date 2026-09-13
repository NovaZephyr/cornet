import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./cosmic-panda-channel-interactions";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Keep frequently changing Cornet data fresh without refetching on every render.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 1,
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 4_000),
      },
      mutations: {
        retry: 0,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Route preloads may reuse fresh data for a short window, avoiding duplicate
    // requests when moving quickly between feeds, channels and Watch.
    defaultPreloadStaleTime: 10_000,
  });

  return router;
};
