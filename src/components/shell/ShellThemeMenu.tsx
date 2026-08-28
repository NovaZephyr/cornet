import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { THEMES, useTheme, type ThemeId } from "@/hooks/useTheme";

const THEME_GROUPS = [...new Set(THEMES.map((theme) => theme.group))];

export function ShellThemeMenu() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="cn-shell-icon-button" aria-label="Cambiar tema">
          <Palette className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {THEME_GROUPS.map((group, index) => (
          <div key={group}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group}</DropdownMenuLabel>
            {THEMES.filter((item) => item.group === group).map((item) => (
              <DropdownMenuItem key={item.id} onClick={() => setTheme(item.id as ThemeId)} className="gap-3 py-2.5">
                <span className="flex-1">
                  <span className="block text-sm">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{item.hint}</span>
                </span>
                {theme === item.id && <span aria-hidden="true">✓</span>}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
