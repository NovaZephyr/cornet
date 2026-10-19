import { useState, type ReactNode } from "react";
import { Ban, Clock3, ShieldAlert, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ModerationStatus = "active" | "warning" | "suspended" | "banned";

export function AccountModerationGate({ children }: { children: ReactNode }) {
  const { user, profile, loading, refresh, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  if (loading || !user || !profile) return <>{children}</>;

  const status: ModerationStatus = profile.is_banned ? "banned" : profile.moderation_status ?? "active";
  if (status === "active") return <>{children}</>;

  const suspendedUntil = status === "suspended" && profile.moderation_suspended_until
    ? new Date(profile.moderation_suspended_until)
    : null;
  const suspensionEnded = Boolean(suspendedUntil && suspendedUntil.getTime() <= Date.now());
  const canReactivate = status === "warning" || (status === "suspended" && suspensionEnded);

  const reactivate = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("reactivate_my_account");
      if (error) throw error;
      if (!data) {
        toast.error("Tu cuenta todavía no se puede reactivar.");
        return;
      }
      await refresh();
      toast.success("Tu cuenta fue reactivada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo reactivar la cuenta.");
    } finally {
      setBusy(false);
    }
  };

  const Icon = status === "banned" ? Ban : status === "suspended" ? Clock3 : ShieldAlert;
  const title = status === "banned"
    ? "Tu cuenta está baneada"
    : status === "suspended"
      ? "Tu cuenta está suspendida temporalmente"
      : "Tu cuenta tiene una advertencia";
  const description = status === "banned"
    ? "Esta cuenta no puede reactivarse desde Cornet."
    : status === "suspended"
      ? suspensionEnded
        ? "El tiempo de suspensión terminó. Ya puedes reactivar tu cuenta."
        : "La opción para reactivar tu cuenta estará disponible cuando termine la suspensión."
      : "Revisa el motivo de la advertencia y reactiva tu cuenta para continuar.";

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl sm:p-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Estado de la cuenta</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>

        {profile.moderation_reason && (
          <div className="mt-5 rounded-xl border border-border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Motivo</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{profile.moderation_reason}</p>
          </div>
        )}

        {suspendedUntil && (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="h-4 w-4 shrink-0" />
            Termina el {new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeStyle: "short" }).format(suspendedUntil)}
          </p>
        )}

        {canReactivate && (
          <Button className="mt-6 w-full" onClick={() => void reactivate()} disabled={busy}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            {busy ? "Reactivando…" : "Reactivar mi cuenta"}
          </Button>
        )}

        <Button variant="ghost" className="mt-3 w-full" onClick={() => void signOut()}>
          Cerrar sesión
        </Button>
      </section>
    </main>
  );
}
