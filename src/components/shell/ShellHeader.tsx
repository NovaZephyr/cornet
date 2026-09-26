import type { ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import corenetworkMark from "@/assets/corenetwork-mark.png";
import { ShellSearch } from "./ShellSearch";

type HistoricalNavItem = { to: string; label: string };
type HistoricalNavMode = "inline" | "row";

type ShellHeaderProps = {
  mobileOpen: boolean;
  onMenuClick: () => void;
  logo: ReactNode;
  actions: ReactNode;
  historicalNavItems?: HistoricalNavItem[];
  historicalNavMode?: HistoricalNavMode;
  historicalSearch?: boolean;
};

export function ShellHeader({
  mobileOpen,
  onMenuClick,
  logo,
  actions,
  historicalNavItems = [],
  historicalNavMode = "inline",
  historicalSearch = false,
}: ShellHeaderProps) {
  const hasHistoricalRow = historicalNavItems.length > 0 && historicalNavMode === "row";

  return (
    <header className={hasHistoricalRow ? "cn-shell-header cn-shell-header--historical" : "cn-shell-header"}>
      <div className="cn-shell-header-main">
        <div className="cn-shell-header-left">
          <button
            type="button"
            className="cn-shell-icon-button"
            aria-label={mobileOpen ? "Cerrar navegación" : "Mostrar navegación"}
            onClick={onMenuClick}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {logo}

          {historicalNavItems.length > 0 && historicalNavMode === "inline" && (
            <nav className="cn-shell-historical-nav" aria-label="Navegación histórica">
              {historicalNavItems.map(({ to, label }) => (
                <Link key={`${to}-${label}`} to={to}>{label}</Link>
              ))}
            </nav>
          )}
        </div>

        <ShellSearch historical={historicalSearch} />
        {actions}
      </div>

      {hasHistoricalRow && (
        <nav className="cn-shell-historical-row" aria-label="Navegación histórica">
          {historicalNavItems.map(({ to, label }) => (
            <Link key={`${to}-${label}`} to={to}>{label}</Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function ShellLogo() {
  return (
    <Link to="/" className="cn-shell-logo" aria-label="Cornet — inicio">
      <img src={corenetworkMark} alt="Cornet" width={34} height={34} />
      <span>
        <strong>Cornet</strong>
        <small>video · comunidad · compartir</small>
      </span>
    </Link>
  );
}
