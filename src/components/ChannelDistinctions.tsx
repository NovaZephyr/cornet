import type { ReactNode } from "react";
import { BadgeCheck, Gavel, Handshake, Music2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChannelDistinctionsProps = {
  isVerified?: boolean | null;
  isMusic?: boolean | null;
  roles?: string[] | null;
  className?: string;
  iconClassName?: string;
};

function Distinction({ label, children, iconClassName }: { label: string; children: ReactNode; iconClassName?: string }) {
  return <span title={label} aria-label={label} className="inline-flex items-center justify-center"><span className={cn("inline-flex h-5 w-5 items-center justify-center", iconClassName)}>{children}</span></span>;
}

export function ChannelDistinctions({ isVerified, isMusic, roles, className, iconClassName }: ChannelDistinctionsProps) {
  const items: ReactNode[] = [];
  if (isVerified) items.push(<Distinction key="verified" label="Canal verificado" iconClassName={iconClassName}><BadgeCheck className="h-full w-full" /></Distinction>);
  if ((roles ?? []).includes("partner")) items.push(<Distinction key="partner" label="Partner" iconClassName={iconClassName}><Handshake className="h-full w-full" /></Distinction>);
  if ((roles ?? []).includes("moderator")) items.push(<Distinction key="moderator" label="Moderador" iconClassName={iconClassName}><Gavel className="h-full w-full" /></Distinction>);
  if ((roles ?? []).includes("admin")) items.push(<Distinction key="admin" label="Administrador" iconClassName={iconClassName}><ShieldCheck className="h-full w-full" /></Distinction>);
  if (isMusic) items.push(<Distinction key="music" label="Canal de música" iconClassName={iconClassName}><Music2 className="h-full w-full" /></Distinction>);
  if (!items.length) return null;
  return <span className={cn("inline-flex items-center gap-1 align-middle text-primary", className)}>{items}</span>;
}
