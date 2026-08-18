import { createRoot, type Root } from "react-dom/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SOCIAL_PLATFORMS, SocialLinksEditor, normalizeSocialLinks, type SocialLink } from "@/components/SocialLinksEditor";
import { Button } from "@/components/ui/button";

const HOST_ID = "cn-social-links-runtime";
let mountedPath = "";
let mountedRoot: Root | null = null;
let mountedHost: HTMLElement | null = null;
let refreshTimer: number | null = null;

function safeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function SocialLinksEditorRuntime() {
  const [value, setValue] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getUser().then(async ({ data: auth }) => {
      if (!auth.user || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data, error } = await supabase.from("profiles").select("social_links").eq("id", auth.user.id).maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("[Cornet] social links load failed", error);
        toast.error("No se pudieron cargar tus redes sociales");
      } else {
        setValue(normalizeSocialLinks(data?.social_links));
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const sanitized = normalizeSocialLinks(value).map((item) => ({ platform: item.platform, url: safeHttpUrl(item.url) ?? "" })).filter((item) => item.url);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Inicia sesión para guardar tus redes sociales");
      const { error } = await supabase.from("profiles").update({ social_links: sanitized } as never).eq("id", auth.user.id);
      if (error) throw error;
      setValue(sanitized);
      toast.success("Redes sociales guardadas");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron guardar las redes sociales");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-6">
      {loading ? <p className="text-sm text-muted-foreground">Cargando redes sociales…</p> : <>
        <SocialLinksEditor value={value} onChange={setValue} />
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">Solo se aceptan enlaces HTTP/HTTPS.</p>
          <Button type="button" disabled={saving} onClick={() => void save()}>{saving ? "Guardando…" : "Guardar redes sociales"}</Button>
        </div>
      </>}
    </section>
  );
}

function PublicSocialLinksRuntime({ username }: { username: string }) {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void supabase.from("profiles").select("social_links").eq("username", username).maybeSingle().then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.warn("[Cornet] public social links failed", error.message);
      setLinks(normalizeSocialLinks(data?.social_links));
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [username]);

  if (!loaded || links.length === 0) return null;

  const visible = links.map((link) => {
    const meta = SOCIAL_PLATFORMS.find((item) => item.value === link.platform);
    const href = safeHttpUrl(link.url);
    return meta && href ? { ...link, meta, href } : null;
  }).filter(Boolean) as Array<SocialLink & { meta: typeof SOCIAL_PLATFORMS[number]; href: string }>;

  if (!visible.length) return null;

  return (
    <section className="cn-runtime-social-links rounded-xl border border-border bg-surface p-4">
      <div className="mb-3"><h2 className="text-sm font-semibold">Redes sociales</h2><p className="mt-1 text-xs text-muted-foreground">Encuentra al creador en otras plataformas.</p></div>
      <div className="flex flex-wrap gap-2">
        {visible.map(({ platform, meta, href }) => {
          const Icon = meta.Icon;
          return <a key={platform} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium transition hover:bg-surface-hover"><Icon className="h-4 w-4" /><span>{meta.label}</span></a>;
        })}
      </div>
    </section>
  );
}

function cleanup() {
  mountedRoot?.unmount();
  mountedRoot = null;
  mountedHost?.remove();
  mountedHost = null;
  mountedPath = "";
}

function mountForCurrentRoute() {
  const path = window.location.pathname;
  if (path === mountedPath && mountedHost?.isConnected) return;
  cleanup();

  if (path === "/settings") {
    const target = document.querySelector("main form")?.parentElement;
    if (!target || document.getElementById(HOST_ID)) return;
    const host = document.createElement("div");
    host.id = HOST_ID;
    host.className = "mt-4";
    target.insertAdjacentElement("afterend", host);
    mountedHost = host;
    mountedPath = path;
    mountedRoot = createRoot(host);
    mountedRoot.render(<SocialLinksEditorRuntime />);
    return;
  }

  const match = path.match(/^\/c\/([^/]+)$/);
  if (!match) return;
  const target = document.querySelector(".cn-cosmic-left") || document.querySelector(".cn-2012-body") || document.querySelector(".cn-2012-channel-inner");
  if (!target || document.getElementById(HOST_ID)) return;
  const host = document.createElement("div");
  host.id = HOST_ID;
  host.className = "mt-4";
  target.appendChild(host);
  mountedHost = host;
  mountedPath = path;
  mountedRoot = createRoot(host);
  mountedRoot.render(<PublicSocialLinksRuntime username={decodeURIComponent(match[1])} />);
}

function scheduleMount() {
  if (refreshTimer !== null) window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null;
    mountForCurrentRoute();
  }, 120);
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", scheduleMount);
  window.addEventListener("hashchange", scheduleMount);
  const observer = new MutationObserver(scheduleMount);
  observer.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(scheduleMount, 250);
}
