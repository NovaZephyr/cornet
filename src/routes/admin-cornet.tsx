import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar } from "@/components/Media";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { rememberAccount } from "@/lib/account-switcher";

const OFFICIAL_ACCOUNT_ID = "39fd9ef5-3716-4896-a555-a673abc712f4";

export const Route = createFileRoute("/admin-cornet")({ component: AdminCornetPage });

function AdminCornetPage() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user || !isAdmin) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl py-24 text-center">
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Esta zona es solo para administradores.</p>
        </div>
      </AppShell>
    );
  }

  const switchToOfficial = async () => {
    if (user.id === OFFICIAL_ACCOUNT_ID) {
      toast.info("Ya estás usando la cuenta oficial de Cornet.");
      return;
    }

    if (profile) {
      rememberAccount({
        id: user.id,
        email: user.email ?? "",
        username: profile.username,
        displayName: profile.display_name,
        avatarPath: profile.avatar_path,
      });
    }

    await signOut();
    toast.success("Sesión administrativa cerrada. Inicia sesión con la cuenta oficial de Cornet.");
    void navigate({ to: "/auth" });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl py-8">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold">Cuenta oficial de Cornet</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Acceso administrativo a la cuenta oficial <strong>@cornet</strong>.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-background p-4">
            <ChannelAvatar name="Cornet" size={52} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Cornet</p>
              <p className="text-sm text-muted-foreground">@cornet · cuenta oficial</p>
            </div>
            <Button onClick={() => void switchToOfficial()} className="rounded-full">
              Cambiar a Cornet
            </Button>
          </div>

          <div className="mt-5 rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
            Para proteger la cuenta, Cornet se abre mediante el inicio de sesión normal. No se guardan contraseñas, tokens ni credenciales de la cuenta oficial en el navegador.
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => void navigate({ to: "/c/$username", params: { username: "cornet" } })}>
              Ver canal oficial <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" className="rounded-full" onClick={() => void navigate({ to: "/admin" })}>
              Volver al panel
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
