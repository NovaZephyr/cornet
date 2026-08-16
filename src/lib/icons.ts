import {
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Megaphone,
  Wrench,
  Bell,
  Sparkles,
  Zap,
  ShieldAlert,
  Clock,
  PartyPopper,
  Rocket,
  Heart,
  Star,
  type LucideIcon,
} from "lucide-react";

// Iconos disponibles para que los admins elijan en el banner del sitio.
// Guarda solo el "id" (string) en la base de datos; este mapa lo resuelve
// al componente real para renderizar.
export const BANNER_ICONS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "alert-triangle", label: "Alerta", Icon: AlertTriangle },
  { id: "info", label: "Información", Icon: Info },
  { id: "check-circle", label: "Resuelto", Icon: CheckCircle2 },
  { id: "x-circle", label: "Error", Icon: XCircle },
  { id: "megaphone", label: "Anuncio", Icon: Megaphone },
  { id: "wrench", label: "Mantenimiento", Icon: Wrench },
  { id: "bell", label: "Notificación", Icon: Bell },
  { id: "sparkles", label: "Novedad", Icon: Sparkles },
  { id: "zap", label: "Urgente", Icon: Zap },
  { id: "shield-alert", label: "Seguridad", Icon: ShieldAlert },
  { id: "clock", label: "Programado", Icon: Clock },
  { id: "party-popper", label: "Celebración", Icon: PartyPopper },
  { id: "rocket", label: "Lanzamiento", Icon: Rocket },
  { id: "heart", label: "Comunidad", Icon: Heart },
  { id: "star", label: "Destacado", Icon: Star },
];

export function getBannerIcon(id: string | null | undefined): LucideIcon | null {
  if (!id) return null;
  return BANNER_ICONS.find((i) => i.id === id)?.Icon ?? null;
}
