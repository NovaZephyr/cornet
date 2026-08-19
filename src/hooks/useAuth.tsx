import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { rememberAccount } from "@/lib/account-switcher";
import "@/lib/social-links-runtime";

export type AppRole = "admin" | "moderator" | "partner" | "user";
export type ChannelStyle =
  | "corenetwork" | "classic-2009" | "standard-2012" | "cosmic-panda" | "liquid-glass"
  | "onechannel-2013" | "feather-profile" | "creator-studio" | "profile-card"
  | "community-profile" | "video-channel" | "music-channel" | "gaming-channel"
  | "minimal-profile" | "channel-2015" | "channel-2019"
  | "early-youtube-2005" | "star-rating-2007" | "transition-2010" | "material-lite-2015"
  | "modern-minimal-2020" | "terminal" | "bento-grid" | "magazine" | "cinephile";
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
  const queryClient = useQueryClient();
  const currentUserIdRef = useRef<string | null>(null);
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
    const nextProfile = (p as Profile) ?? null;
    setProfile(nextProfile);
    setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
    const currentAuthUser = (await supabase.auth.getUser()).data.user;
    if (currentAuthUser?.email && nextProfile) {
      rememberAccount({
        id: currentAuthUser.id,
        email: currentAuthUser.email,
        username: nextProfile.username,
        displayName: nextProfile.display_name,
        avatarPath: nextProfile.avatar_path,
      });
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const nextUser = newSession?.user ?? null;
      const nextUserId = nextUser?.id ?? null;
      const identityChanged = currentUserIdRef.current !== nextUserId;
      currentUserIdRef.current = nextUserId;

      setSession(newSession);
      setUser(nextUser);
      if (identityChanged) {
        queryClient.clear();
      } else if (nextUserId) {
        void queryClient.invalidateQueries();
      }
      setTimeout(() => void load(nextUserId ?? undefined), 0);
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      const initialUserId = data.session?.user?.id ?? null;
      currentUserIdRef.current = initialUserId;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      await load(initialUserId ?? undefined);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const value = useMemo<AuthState>(() => ({
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
      currentUserIdRef.current = null;
      queryClient.clear();
    },
  }), [user, session, profile, roles, loading, queryClient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
