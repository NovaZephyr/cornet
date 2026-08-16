import { Check } from "lucide-react";
import { BANNER_ICONS } from "@/lib/icons";
import { cn } from "@/lib/utils";

export function IconPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg border border-border text-xs text-muted-foreground transition-colors hover:bg-surface-hover",
          value === null && "border-primary bg-primary/10 text-primary",
        )}
        title="Sin icono"
      >
        —
      </button>
      {BANNER_ICONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          title={label}
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-lg border border-border transition-colors hover:bg-surface-hover",
            value === id && "border-primary bg-primary/10",
          )}
        >
          <Icon className="h-4 w-4" />
          {value === id && (
            <Check className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-primary p-0.5 text-primary-foreground" />
          )}
        </button>
      ))}
    </div>
  );
}
