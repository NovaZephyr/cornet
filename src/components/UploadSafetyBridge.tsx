import { useEffect, useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PENDING_KEY = "corenetwork-pending-age-restricted";

export function UploadSafetyBridge() {
  const { user } = useAuth();
  const href = useRouterState({ select: (s) => s.location.href });
  const [restricted, setRestricted] = useState(false);
  const [loading, setLoading] = useState(false);
  const url = useMemo(() => new URL(href, "http://localhost"), [href]);
  const search = url.searchParams;
  const editCode = search.get("edit");
  const createMode = search.get("create") === "1" || search.get("create") === "true";
  const uploadMode = url.pathname === "/upload";

  useEffect(() => {
    if (!user || !uploadMode) return;
    let active = true;
    const load = async () => {
      if (editCode) {
        const { data } = await supabase.from("videos").select("age_restricted").eq("code", editCode).eq("user_id", user.id).maybeSingle();
        if (active) setRestricted(Boolean(data?.age_restricted));
        return;
      }
      if (createMode) {
        setRestricted(localStorage.getItem(PENDING_KEY) === "1");
        return;
      }
      const pending = localStorage.getItem(PENDING_KEY);
      if (pending !== "1") return;
      const { data } = await supabase.from("videos").select("id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!data) return;
      const ageMs = Date.now() - new Date(data.created_at).getTime();
      if (ageMs < 10 * 60 * 1000) {
        const { error } = await supabase.from("videos").update({ age_restricted: true }).eq("id", data.id).eq("user_id", user.id);
        if (!error) localStorage.removeItem(PENDING_KEY);
      }
      if (active) setRestricted(false);
    };
    void load();
    return () => { active = false; };
  }, [user?.id, uploadMode, editCode, createMode, href]);

  if (!user || !uploadMode) return null;

  const toggle = async (checked: boolean) => {
    setRestricted(checked);
    if (editCode) {
      setLoading(true);
      const { error } = await supabase.from("videos").update({ age_restricted: checked }).eq("code", editCode).eq("user_id", user.id);
      setLoading(false);
      if (error) return void toast.error(error.message);
      toast.success(checked ? "Restricción de edad activada" : "Restricción de edad desactivada");
      return;
    }
    if (checked) localStorage.setItem(PENDING_KEY, "1");
    else localStorage.removeItem(PENDING_KEY);
  };

  return <section className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4" data-no-translate>
    <div className="flex items-start gap-3">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold">Safety / Restricción de edad</h2>
        <p className="mt-1 text-sm text-muted-foreground">Marca el video como contenido restringido para mayores de 18 años. Se mostrará una advertencia antes de reproducirlo.</p>
        <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={restricted} disabled={loading} onChange={(e) => void toggle(e.target.checked)} className="h-4 w-4" />
          <span>Este video es para mayores de 18 años</span>
        </label>
      </div>
    </div>
  </section>;
}
