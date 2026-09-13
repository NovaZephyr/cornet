import type { ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { CoreErrorBoundary } from "./CoreErrorBoundary";

type CornetCoreProps = {
  children: ReactNode;
};

/**
 * Cornet's dependency heart.
 *
 * Keep application-wide providers here instead of in the route root. The router
 * remains responsible only for routing, while Core owns shared runtime state.
 */
export function CornetCore({ children }: CornetCoreProps) {
  const router = useRouter();
  const queryClient = (router.options.context as { queryClient: QueryClient }).queryClient;

  return (
    <CoreErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </CoreErrorBoundary>
  );
}
