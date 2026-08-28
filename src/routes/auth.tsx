import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayCircle, Users, BarChart2, Mail, Lock, Tag, ArrowLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar o crear cuenta — Cornet" },
      {
        name: "description",
        content: "Inicia sesión o crea tu cuenta para subir videos y personalizar tu canal.",
      },
      { property: "og:title", content: "Entrar o crear cuenta — Cornet" },
      { property: "og:description", content: "Accede a tu canal en Cornet." },
    ],
  }),
  component: AuthPage,
});

// Site Key pública de Cloudflare Turnstile (Dashboard de Cloudflare → Turnstile).
// La validación real la hace Supabase Auth nativamente — Dashboard de Supabase →
// Authentication → Attack Protection → Enable Captcha protection → Turnstile.
const TURNSTILE_SITE_KEY = "0x4AAAAAAEQ5ZW7lCUTxm4os";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

function loadTurnstileScript(onReady: () => void) {
  if (window.turnstile) {
    onReady();
    return;
  }
  const existing = document.getElementById("turnstile-script");
  if (existing) {
    existing.addEventListener("load", onReady, { once: true });
    return;
  }
  const script = document.createElement("script");
  script.id = "turnstile-script";
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
  script.async = true;
  script.defer = true;
  script.onload = onReady;
  document.head.appendChild(script);
}

// `active` = la pestaña que contiene este widget está actualmente visible.
// El widget solo se monta cuando active pasa a true — así no intentamos
// renderizarlo dentro de un TabsContent que todavía no existe en el DOM.
function useTurnstile(onToken: (token: string) => void, active: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!active || widgetId.current !== null) return;
    let cancelled = false;
    let attempts = 0;

    const tryRender = () => {
      if (cancelled || widgetId.current !== null) return;
      if (!containerRef.current || !window.turnstile) {
        if (attempts++ < 50) setTimeout(tryRender, 100);
        return;
      }
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    };

    loadTurnstileScript(tryRender);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const reset = () => {
    if (window.turnstile && widgetId.current !== null) {
      window.turnstile.reset(widgetId.current);
    }
  };

  return { containerRef, reset };
}

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  const { containerRef: signinCaptchaRef, reset: resetSigninCaptcha } = useTurnstile(
    setCaptchaToken,
    tab === "signin",
  );
  const { containerRef: signupCaptchaRef, reset: resetSignupCaptcha } = useTurnstile(
    setCaptchaToken,
    tab === "signup",
  );

  useEffect(() => {
    if (user) void navigate({ to: "/" });
  }, [user, navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      toast.error("Completa la verificación anti-robots");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });
    setBusy(false);
    resetSigninCaptcha();
    setCaptchaToken("");
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("¡Bienvenido de vuelta!");
    void navigate({ to: "/" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedRules) {
      toast.error("Debes aceptar las Normas de la comunidad para crear una cuenta");
      return;
    }
    if (!captchaToken) {
      toast.error("Completa la verificación anti-robots");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { username, display_name: username },
        captchaToken,
      },
    });
    setBusy(false);
    resetSignupCaptcha();
    setCaptchaToken("");
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setSent(true);
      return;
    }
    void navigate({ to: "/" });
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error("No se pudo iniciar sesión con Google");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background lg:grid lg:grid-cols-2">
      {/* Panel promocional — oculto en mobile */}
      <div className="relative hidden overflow-hidden border-r border-border bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.28),transparent_42%),radial-gradient(circle_at_80%_75%,hsl(var(--primary)/0.16),transparent_45%)] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(circle at 15% 20%, hsl(var(--primary)) 0%, transparent 45%), radial-gradient(circle at 85% 80%, hsl(var(--primary)) 0%, transparent 50%)",
          }}
        />
        <div className="relative">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-11 items-center justify-center rounded-lg bg-primary-foreground/90 backdrop-blur-sm">
              <span className="ml-0.5 h-0 w-0 border-y-[5px] border-l-[9px] border-y-transparent border-l-primary" />
            </div>
            <span className="text-2xl font-bold tracking-tighter text-primary-foreground">
              Cornet
            </span>
          </Link>
        </div>

        <div className="relative flex flex-1 flex-col justify-center p-8 max-w-xl">
          <h1 className="mb-4 text-5xl font-bold tracking-tighter text-primary-foreground leading-[1.1]">
            Descubre lo que importa
          </h1>
          <p className="mb-6 text-lg text-primary-foreground/90">
            Plataforma para creadores y comunidades. Sube videos, conecta con tu audiencia y crece tu canal.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-primary-foreground/80">
              <div className="flex h-8 w-8 items-center justify-center bg-primary/20 rounded-lg">
                <PlayCircle className="h-4 w-4 text-primary" />
              </div>
              <span>Subir y compartir videos fácilmente</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-primary-foreground/80">
              <div className="flex h-8 w-8 items-center justify-center bg-primary/20 rounded-lg">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <span>Conectar con creadores y comunidades</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-primary-foreground/80">
              <div className="flex h-8 w-8 items-center justify-center bg-primary/20 rounded-lg">
                <BarChart2 className="h-4 w-4 text-primary" />
              </div>
              <span>Personalizar tu experiencia</span>
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-primary-foreground/60">
          <span>© {new Date().getFullYear()} Cornet</span>
        </div>
      </div>

      {/* Panel de formulario */}
      <div className="relative flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md space-y-7 rounded-3xl border border-border/80 bg-card/70 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <Link to="/" className="mb-2 flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground lg:hidden"><ArrowLeft className="h-4 w-4" /> Volver a Cornet</Link><Link to="/" className="mb-6 flex items-center justify-center gap-2 lg:hidden">
            <div className="flex h-8 w-11 items-center justify-center rounded-lg bg-primary/90 backdrop-blur-sm">
              <span className="ml-0.5 h-0 w-0 border-y-[5px] border-l-[9px] border-y-transparent border-l-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tighter">Cornet</span>
          </Link>

          {sent ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 mb-4">
                <span className="text-primary">✓</span>
              </div>
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Revisa tu correo
              </h1>
              <p className="text-sm text-muted-foreground">
                Te enviamos un enlace de confirmación a <span className="font-medium">{email}</span>. Confírmalo para entrar.
              </p>
            </div>
          ) : (
            <Tabs
              value={tab}
              onValueChange={(v) => {
                setTab(v as "signin" | "signup");
                setCaptchaToken("");
              }}
              className="w-full"
            >
              <h1 className="mb-4 text-center text-2xl font-bold tracking-titter text-foreground">
                Inicia sesión
              </h1>

              <TabsList className="mb-4 grid w-full grid-cols-2 text-sm font-medium">
                <TabsTrigger value="signin" className="px-4 py-2 rounded-full transition-all hover:bg-primary/10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Iniciar sesión
                </TabsTrigger>
                <TabsTrigger value="signup" className="px-4 py-2 rounded-full transition-all hover:bg-primary/10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Crear cuenta
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="animate-tab-content">
                <form onSubmit={signIn} className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="sr-only">Correo</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="Correo electrónico"
                        className="h-12 w-full pl-12 pr-4 rounded-xl bg-background/70 border border-border/80 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                        <Mail className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="password" className="sr-only">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type="password"
                        required
                        placeholder="Contraseña"
                        className="h-12 w-full pl-12 pr-4 rounded-xl bg-muted/80 backdrop-blur-sm border border-muted/40 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                        <Lock className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      className="text-primary/80 hover:text-primary hover:underline transition-colors"
                      onClick={() => toast.info("Escríbenos a soporte para recuperar tu cuenta.")}
                    >
                      ¿Olvidaste la contraseña?
                    </button>
                  </div>

                  <div ref={signinCaptchaRef} className="mt-4 flex justify-center" />

                  <Button
                    type="submit"
                    disabled={busy}
                    className="h-12 w-full rounded-xl text-base font-semibold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all duration-200 hover:bg-primary/90"
                  >
                    Inicia sesión
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={signUp} className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="username" className="sr-only">Nombre de canal</Label>
                    <div className="relative">
                      <Input
                        id="username"
                        required
                        placeholder="Nombre de canal"
                        className="h-12 w-full pl-12 pr-4 rounded-xl bg-muted/80 backdrop-blur-sm border border-muted/40 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                        <Tag className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="email2" className="sr-only">Correo</Label>
                    <div className="relative">
                      <Input
                        id="email2"
                        type="email"
                        required
                        placeholder="Correo electrónico"
                        className="h-12 w-full pl-12 pr-4 rounded-xl bg-muted/80 backdrop-blur-sm border border-muted/40 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                        <Mail className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="password2" className="sr-only">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="password2"
                        type="password"
                        required
                        minLength={6}
                        placeholder="Contraseña"
                        className="h-12 w-full pl-12 pr-4 rounded-xl bg-muted/80 backdrop-blur-sm border border-muted/40 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                        <Lock className="h-4 w-4" />
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pt-2">
                    <Checkbox
                      id="accept-rules"
                      checked={acceptedRules}
                      onCheckedChange={(v) => setAcceptedRules(v === true)}
                      className="h-4 w-4 text-primary transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/50"
                    />
                    <div className="flex flex-col">
                      <Label htmlFor="accept-rules" className="text-sm font-normal text-muted-foreground">
                        He leído y acepto las{" "}
                      </Label>
                      <Link
                        to="/rules"
                        target="_blank"
                        className="text-primary hover:underline transition-colors duration-200"
                      >
                        Normas de la comunidad
                      </Link>
                      <span className="text-sm font-normal text-muted-foreground">
                        de Cornet.
                      </span>
                    </div>
                  </div>

                  <div ref={signupCaptchaRef} className="mt-4 flex justify-center" />

                  <Button
                    type="submit"
                    disabled={busy || !acceptedRules}
                    className="h-12 w-full rounded-xl text-base font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:bg-primary/90"
                  >
                    Registrarse
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {!sent && (
            <>
              <div className="my-8 flex items-center gap-4 text-sm text-muted-foreground">
                <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-border to-transparent" />
                <span>o</span>
                <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>
              <Button
                variant="outline"
                className="h-12 w-full rounded-xl border border-muted/60 hover:border-primary/80 hover:bg-primary/5 transition-all duration-200 flex items-center justify-center gap-3"
                onClick={() => void google()}
              >
                <span className="text-primary">G</span>
                <span>Continuar con Google</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
