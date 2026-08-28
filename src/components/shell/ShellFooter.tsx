import { Link } from "@tanstack/react-router";

export function ShellFooter() {
  return (
    <footer className="cn-shell-footer">
      <div>
        <Link to="/about">Información</Link>
        <Link to="/community">Comunidad</Link>
        <Link to="/partner">Partners</Link>
        <Link to="/playlists">Playlists</Link>
        <Link to="/terms">Términos</Link>
        <Link to="/privacy">Privacidad</Link>
        <Link to="/settings">Configuración</Link>
        <a href="https://discord.gg/gYFW8Tbrqw" target="_blank" rel="noopener noreferrer">Discord</a>
      </div>
      <p>© {new Date().getFullYear()} Cornet.</p>
    </footer>
  );
}
