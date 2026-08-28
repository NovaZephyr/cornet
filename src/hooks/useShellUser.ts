import { useAuth } from "@/hooks/useAuth";

export function useShellUser() {
  const { user, profile, roles, isAdmin, signOut } = useAuth();

  const username = profile?.username ?? "";
  const isStaff = isAdmin || roles.includes("moderator");

  return {
    user,
    profile,
    username,
    isStaff,
    signOut,
  };
}
