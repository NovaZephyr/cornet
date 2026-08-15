import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar o crear cuenta — CoreNetwork" },
      {
        name: "description",
        content: "Inicia sesión o crea tu cuenta para subir videos y personalizar tu canal.",
      },
      { property: "og:title", content: "Entrar o crear cuenta — CoreNetwork" },
      { property: "og:description", content: "Accede a tu canal en CoreNetwork." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: "/" });
  }, [user, navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("¡Bienvenido de vuelta!");
    void navigate({ to: "/" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { username, display_name: username },
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (!data.session) {
      setSent(true);
      return;
    }
    void navigate({ to: "/" });
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("No se pudo iniciar sesión con Google");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel promocional — oculto en mobile */}
      <div className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(circle at 15% 20%, hsl(var(--primary)) 0%, transparent 45%), radial-gradient(circle at 85% 80%, hsl(var(--primary)) 0%, transparent 50%)",
          }}
        />
        <div className="relative">
          <Link to="/" className="flex items-center gap-1.5">
            <span className="flex h-6 w-9 items-center justify-center rounded-md bg-primary-foreground">
              <span className="ml-0.5 h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-primary" />
            </span>
            <span className="text-xl font-bold tracking-tighter text-primary-foreground">
              CoreNetwork
            </span>
          </Link>
        </div>

        <div className="relative max-w-md">
          <p className="text-4xl font-extrabold leading-[1.1] tracking-tight text-primary-foreground">
            No te pierdas lo que otros postean
          </p>
          <p className="mt-4 text-sm text-primary-foreground/80">
            Sube tus videos, sigue a tus creadores favoritos y arma tu canal a tu manera.
          </p>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-primary-foreground/70">
          <span>© {new Date().getFullYear()} CoreNetwork</span>
        </div>
      </div>

      {/* Panel de formulario */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center justify-center gap-1.5 lg:hidden">
            <span className="flex h-6 w-9 items-center justify-center rounded-md bg-primary">
              <span className="ml-0.5 h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-primary-foreground" />
            </span>
            <span className="text-xl font-bold tracking-tighter">CoreNetwork</span>
          </Link>

          {sent ? (
            <div className="text-center">
              <h1 className="text-lg font-semibold">Revisa tu correo</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Te enviamos un enlace de confirmación a {email}. Confírmalo para entrar.
              </p>
            </div>
          ) : (
            <Tabs defaultValue="signin">
              <h1 className="mb-6 text-center text-2xl font-bold tracking-tight">
                Inicia sesión
              </h1>

              <TabsList className="mb-2 grid w-full grid-cols-2">
                <TabsTrigger value="signin">Iniciar sesión</TabsTrigger>
                <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={signIn} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="sr-only">Correo</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="Correo electrónico"
                      className="h-12 rounded-full bg-muted px-5"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="sr-only">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      placeholder="Contraseña"
                      className="h-12 rounded-full bg-muted px-5"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => toast.info("Escríbenos a soporte para recuperar tu cuenta.")}
                    >
                      ¿Olvidaste la contraseña?
                    </button>
                  </div>
                  <Button type="submit" disabled={busy} className="h-12 w-full rounded-full text-base font-semibold">
                    Inicia sesión
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={signUp} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="sr-only">Nombre de canal</Label>
                    <Input
                      id="username"
                      required
                      placeholder="Nombre de canal"
                      className="h-12 rounded-full bg-muted px-5"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email2" className="sr-only">Correo</Label>
                    <Input
                      id="email2"
                      type="email"
                      required
                      placeholder="Correo electrónico"
                      className="h-12 rounded-full bg-muted px-5"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password2" className="sr-only">Contraseña</Label>
                    <Input
                      id="password2"
                      type="password"
                      required
                      minLength={6}
                      placeholder="Contraseña"
                      className="h-12 rounded-full bg-muted px-5"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={busy} className="h-12 w-full rounded-full text-base font-semibold">
                    Registrarse
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {!sent && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> o <span className="h-px flex-1 bg-border" />
              </div>
              <Button
                variant="outline"
                className="h-12 w-full rounded-full"
                onClick={() => void google()}
              >
                Continuar con Google
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
