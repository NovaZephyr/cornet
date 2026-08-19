import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, KeyRound, Mail, Plus, Trash2, UserRound, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar } from "@/components/Media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { forgetAccount, getRememberedAccounts, maskEmail, rememberAccount, type RememberedAccount } from "@/lib/account-switcher";

export const Route = createFileRoute("/account-security")({ component: AccountSecurityPage });

function AccountSecurityPage() {
  const { user, profile, refresh, signOut } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<RememberedAccount[]>([]);
  const [showEmail, setShowEmail] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => setAccounts(getRememberedAccounts()), []);

  useEffect(() => {
    if (user?.email && profile) {
      rememberAccount({ id: user.id, email: user.email, username: profile.username, displayName: profile.display_name, avatarPath: profile.avatar_path });
      setAccounts(getRememberedAccounts());
    }
  }, [user, profile]);

  if (!user) return <AppShell><div className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="text-2xl font-bold">Inicia sesión</h1><p className="mt-2 text-muted-foreground">Necesitas una sesión activa para administrar tus cuentas.</p><Button asChild className="mt-6"><Link to="/auth">Iniciar sesión</Link></Button></div></AppShell>;

  const switchAccount = async (account: RememberedAccount) => {
    if (account.id === user.id) return;
    await signOut();
    void navigate({ to: "/auth", search: { account: account.email } as never });
  };

  const removeAccount = (id: string) => {
    forgetAccount(id);
    setAccounts(getRememberedAccounts());
    toast.success("Cuenta quitada de este dispositivo");
  };

  const updateEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email || email === user.email) return;
    setEmailBusy(true);
    const { error } = await supabase.auth.updateUser({ email });
    setEmailBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Solicitud de cambio de correo enviada. Revisa tu correo si Supabase requiere confirmación.");
    setNewEmail("");
    rememberAccount({ id: user.id, email, username: profile?.username, displayName: profile?.display_name, avatarPath: profile?.avatar_path });
    setAccounts(getRememberedAccounts());
  };

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) return toast.error("Usa una contraseña de al menos 8 caracteres.");
    if (!currentPassword) return toast.error("Introduce tu contraseña actual para continuar.");
    setPasswordBusy(true);
    const email = user.email;
    if (!email) {
      setPasswordBusy(false);
      return toast.error("No hay un correo asociado a esta cuenta.");
    }
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (verifyError) {
      setPasswordBusy(false);
      return toast.error("La contraseña actual no es correcta.");
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordBusy(false);
    if (error) return toast.error(error.message);
    setCurrentPassword("");
    setNewPassword("");
    toast.success("Contraseña actualizada. Tu sesión puede renovarse por seguridad.");
  };

  return <AppShell>
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3"><Button variant="ghost" size="icon" asChild><Link to="/settings"><ArrowLeft className="h-4 w-4" /></Link></Button><div><h1 className="text-2xl font-bold">Cuenta y seguridad</h1><p className="text-sm text-muted-foreground">Gestiona tus cuentas de este dispositivo y protege tu acceso.</p></div></div>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><UserRound className="h-5 w-5" />Cuentas</h2><p className="mt-1 text-sm text-muted-foreground">Solo se guardan identificadores locales. Nunca guardamos contraseñas ni tokens.</p></div><Button asChild variant="outline"><Link to="/auth"><Plus className="mr-2 h-4 w-4" />Agregar cuenta</Link></Button></div>
        <div className="mt-4 space-y-2">
          {accounts.length === 0 && <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No hay otras cuentas recordadas todavía.</p>}
          {accounts.map((account) => <div key={account.id} className="flex items-center gap-3 rounded-xl border p-3"><ChannelAvatar path={account.avatarPath} name={account.displayName || account.username || "Cuenta"} size={40} /><div className="min-w-0 flex-1"><strong className="block truncate">{account.displayName || account.username || "Cuenta"}</strong><span className="block truncate text-xs text-muted-foreground">@{account.username || "usuario"} · {maskEmail(account.email)}</span></div>{account.id === user.id ? <span className="text-xs font-semibold text-primary">Actual</span> : <Button variant="outline" size="sm" onClick={() => void switchAccount(account)}>Cambiar</Button>}<Button variant="ghost" size="icon" onClick={() => removeAccount(account.id)} aria-label="Quitar cuenta de este dispositivo"><Trash2 className="h-4 w-4" /></Button></div>)}
        </div>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5 shadow-sm"><h2 className="flex items-center gap-2 text-lg font-semibold"><Mail className="h-5 w-5" />Correo electrónico</h2><p className="mt-1 text-sm text-muted-foreground">Tu correo está oculto por defecto.</p><div className="mt-4 flex items-center gap-2 rounded-xl bg-muted/60 p-3"><code className="min-w-0 flex-1 truncate text-sm">{showEmail ? user.email : maskEmail(user.email ?? "")}</code><Button variant="ghost" size="icon" onClick={() => setShowEmail((value) => !value)} aria-label={showEmail ? "Ocultar correo" : "Mostrar correo"}>{showEmail ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div><form onSubmit={updateEmail} className="mt-4 space-y-3"><Label htmlFor="new-email">Nuevo correo</Label><Input id="new-email" type="email" placeholder="nuevo@correo.com" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} /><Button type="submit" disabled={emailBusy || !newEmail.trim()}>{emailBusy ? "Guardando…" : "Cambiar correo"}</Button></form></div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm"><h2 className="flex items-center gap-2 text-lg font-semibold"><KeyRound className="h-5 w-5" />Contraseña</h2><p className="mt-1 text-sm text-muted-foreground">La contraseña actual nunca se puede recuperar ni revelar. Solo puedes reemplazarla.</p><div className="mt-4 rounded-xl bg-muted/60 p-3 text-sm tracking-[0.25em]">••••••••••</div><form onSubmit={updatePassword} className="mt-4 space-y-3"><div><Label htmlFor="current-password">Contraseña actual</Label><Input id="current-password" type="password" autoComplete="current-password" className="mt-2" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></div><div><Label htmlFor="new-password">Nueva contraseña</Label><div className="mt-2 flex gap-2"><Input id="new-password" type={showNewPassword ? "text" : "password"} autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><Button type="button" variant="outline" size="icon" onClick={() => setShowNewPassword((value) => !value)} aria-label={showNewPassword ? "Ocultar nueva contraseña" : "Mostrar nueva contraseña"}>{showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></div><Button type="submit" disabled={passwordBusy}>{passwordBusy ? "Actualizando…" : "Cambiar contraseña"}</Button></form></div>
      </section>
    </div>
  </AppShell>;
}
