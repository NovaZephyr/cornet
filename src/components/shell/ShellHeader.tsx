import type { ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import corenetworkMark from "@/assets/corenetwork-mark.png";
import { ShellSearch } from "./ShellSearch";

type ShellHeaderProps = {
  mobileOpen: boolean;
  onMenuClick: () => void;
  logo: ReactNode;
  actions: ReactNode;
};

export function ShellHeader({ mobileOpen, onMenuClick, logo, actions }: ShellHeaderProps) {
  return (
    <header className="cn-shell-header">
      <div className="cn-shell-header-left">
        <button type="button" className="cn-shell-icon-button" aria-label={mobileOpen ? "Cerrar navegación" : "Mostrar navegación"} onClick={onMenuClick}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        {logo}
      </div>
      <ShellSearch />
      {actions}
    </header>
  );
}

export function ShellLogo() {
  return (
    <Link to="/" className="cn-shell-logo" aria-label="Cornet — inicio">
      <img src={corenetworkMark} alt="Cornet" width={34} height={34} />
      <span><strong>Cornet</strong><small>video · comunidad · compartir</small></span>
    </Link>
  );
}
