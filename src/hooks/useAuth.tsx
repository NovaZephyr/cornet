import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "moderator" | "partner" | "user";
export type ChannelStyle = "corenetwork" | "channel-1" | "channel-2" | "cosmic-panda";
export type ChannelInfoLayout = "left" | "right" | "top" | "hidden";

export type SocialLink = { platform: string; url: string };

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  description: string;
  avatar_path: string | null;
  banner_path: string | null;
  background_path: string | null;
  gif_path: string | null;
  social_links: SocialLink[] | null;
  is_banned: boolean;
  warnings_count: number;
  accent_color: string;
  is_verified: boolean;
  is_music_channel: boolean;
  channel_style: ChannelStyle;
  channel_primary_color: string;
  channel_secondary_color: string;
  channel_surface_color: string;
  channel_text_color: string;
  channel_info_layout: ChannelInfoLayout;
  subscriber_count: number;
  created_at: string;
};

type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  isPartner: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      setRoles([]);
      return;
    }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((p as Profile) ?? null);
    setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setTimeout(() => {
        void load(newSession?.user?.id);
      }, 0);
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      await load(data.session?.user?.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      session,
      profile,
      roles,
      loading,
      isAdmin: roles.includes("admin"),
      isPartner: roles.includes("partner"),
      refresh: () => load(user?.id),
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setRoles([]);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, session, profile, roles, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
