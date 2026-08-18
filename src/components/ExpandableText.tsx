import { useState } from "react";
import { FormattedText } from "@/components/FormattedText";
import { cn } from "@/lib/utils";

export function ExpandableText({ text, lines = 3, className, emptyText = "Sin descripción." }: { text?: string | null; lines?: number; className?: string; emptyText?: string }) {
  const [expanded, setExpanded] = useState(false);
  const value = (text ?? "").trim();
  if (!value) return <p className={cn("text-muted-foreground", className)}>{emptyText}</p>;
  const isLong = value.length > 220 || value.split("\n").length > lines;
  return (
    <div className={className}>
      <div className={cn("whitespace-pre-wrap break-words", !expanded && isLong && "line-clamp-3")} style={!expanded && isLong ? { WebkitLineClamp: lines } : undefined}>
        <FormattedText text={value} />
      </div>
      {isLong && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 text-sm font-semibold text-foreground hover:underline">
          {expanded ? "Mostrar menos" : "…más"}
        </button>
      )}
    </div>
  );
}
