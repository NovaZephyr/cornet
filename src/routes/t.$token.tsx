import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/t/$token")({ component: TemporaryFileRedirect });

function TemporaryFileRedirect() {
  const { token } = Route.useParams();

  useEffect(() => {
    if (!token) return;
    const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/b2-temp-download?id=${encodeURIComponent(token)}`;
    window.location.replace(endpoint);
  }, [token]);

  return (
    <AppShell>
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <h1 className="mt-4 text-xl font-semibold">Abriendo archivo…</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          CoreNetwork está preparando un enlace seguro para este archivo temporal.
        </p>
      </div>
    </AppShell>
  );
}
