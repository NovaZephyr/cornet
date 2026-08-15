import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ShieldOff,
  Cake,
  Copyright,
  UserX,
  Bot,
  HeartCrack,
  Lock,
  Flag,
  KeyRound,
  Eye,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "Normas de la comunidad — TocinoTube" },
      {
        name: "description",
        content: "Las reglas que mantienen a TocinoTube un lugar seguro y divertido para todos.",
      },
      { property: "og:title", content: "Normas de la comunidad — TocinoTube" },
      { property: "og:description", content: "Conoce las normas antes de subir tu primer video." },
    ],
  }),
  component: RulesPage,
});

interface Rule {
  icon: LucideIcon;
  title: string;
  description: string;
}

const rules: Rule[] = [
  {
    icon: AlertTriangle,
    title: "No compartir contenido shockante",
    description:
      "Nada de gore, violencia explícita ni imágenes diseñadas para impactar o traumatizar. Si dudas si algo es demasiado fuerte, probablemente lo sea.",
  },
  {
    icon: ShieldOff,
    title: "No compartir contenido inapropiado",
    description:
      "Contenido sexual, explícito o pensado para adultos no tiene lugar acá. TocinoTube es para creadores y audiencias de todas las edades permitidas.",
  },
  {
    icon: Cake,
    title: "Solo personas mayores de 13 años",
    description:
      "Necesitas al menos 13 años para tener una cuenta. Si detectamos que eres menor, tu cuenta será eliminada para protegerte.",
  },
  {
    icon: Copyright,
    title: "Nada de contenido protegido por derechos de autor",
    description:
      "No subas música, clips o material que no te pertenezca. Los YTPMV/YTPH y videos de broma están permitidos siempre que tengas permiso del autor original.",
  },
  {
    icon: UserX,
    title: "Cuentas alternativas están prohibidas",
    description:
      "Cada persona debe tener una sola cuenta. Crear alts para evadir sanciones, votar varias veces o engañar al sistema resultará en la suspensión de todas tus cuentas.",
  },
  {
    icon: Bot,
    title: "El contenido con IA se etiqueta",
    description:
      "El contenido generado por inteligencia artificial llevará una etiqueta visible y tendrá menor alcance en las recomendaciones.",
  },
  {
    icon: HeartCrack,
    title: "No subir contenido de maltrato",
    description:
      "Cero tolerancia a videos que muestren maltrato animal, abuso, bullying o cualquier forma de daño real a otra persona o ser vivo.",
  },
  {
    icon: Lock,
    title: "No compartas información personal de otros",
    description:
      "No se permite subir ni promocionar contenido que exponga datos personales de terceros: direcciones, teléfonos, documentos u otra info identificable.",
  },
  {
    icon: Flag,
    title: "No abuses del sistema de reportes",
    description:
      "Los reportes son para contenido que realmente rompe las normas. Reportar en masa por venganza o para molestar a otros creadores tiene consecuencias.",
  },
  {
    icon: KeyRound,
    title: "No compartas tus datos con nadie",
    description:
      "Nunca des tu contraseña, correo ni códigos de verificación a otra persona, ni siquiera a alguien que diga ser del equipo de TocinoTube.",
  },
  {
    icon: Eye,
    title: "No engañes a tu audiencia",
    description:
      "Los títulos y miniaturas deben representar lo que realmente hay en el video. El clickbait engañoso que no coincide con el contenido está prohibido.",
  },
  {
    icon: PartyPopper,
    title: "¡Diviértete en CoreNetwork!",
    description:
      "Al final del día, esto es para pasarla bien: crea, comparte y disfruta la comunidad respetando a los demás.",
  },
];

function RulesPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-primary">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <Link to="/" className="mb-6 inline-flex items-center gap-1.5">
            <span className="flex h-6 w-9 items-center justify-center rounded-md bg-primary-foreground">
              <span className="ml-0.5 h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-primary" />
            </span>
            <span className="text-xl font-bold tracking-tighter text-primary-foreground">
              TocinoTube
            </span>
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary-foreground sm:text-4xl">
            Normas de la comunidad
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80">
            {rules.length} reglas simples para que TocinoTube siga siendo un lugar seguro,
            justo y divertido para todos los creadores.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <ol className="space-y-4">
          {rules.map((rule, index) => {
            const Icon = rule.icon;
            return (
              <li
                key={rule.title}
                className="flex gap-4 rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40"
              >
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Regla {index + 1}
                  </p>
                  <h2 className="mt-0.5 font-semibold leading-snug">{rule.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{rule.description}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Incumplir estas normas puede resultar en la eliminación de contenido, suspensión
          temporal o cierre definitivo de tu cuenta.
        </p>
      </main>
    </div>
  );
}
