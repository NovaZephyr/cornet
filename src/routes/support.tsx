import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, LifeBuoy } from "lucide-react";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Soporte — Cornet" },
      { name: "description", content: "Contacta al equipo de soporte de Cornet." },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <AppShell>
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:py-16">
        <header className="mb-8 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <LifeBuoy className="h-7 w-7" />
          </span>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Centro de ayuda</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">¿Necesitas ayuda?</h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Estamos aquí para ayudarte con tu cuenta, tus publicaciones o cualquier problema que tengas usando Cornet.
          </p>
        </header>

        <section className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold">Soporte por correo electrónico</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Escríbenos y describe el problema con el mayor detalle posible. Si corresponde, incluye enlaces y capturas de pantalla.
              </p>
              <a className="mt-4 inline-block break-all font-medium text-primary underline-offset-4 hover:underline" href="mailto:support@cornet.anonaddy.com">
                support@cornet.anonaddy.com
              </a>
              <div className="mt-5">
                <Button asChild>
                  <a href="mailto:support@cornet.anonaddy.com?subject=Soporte%20de%20Cornet">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Contactar con soporte
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Para proteger tu cuenta, nunca envíes tu contraseña ni códigos de verificación por correo.
        </p>
      </main>
    </AppShell>
  );
}
