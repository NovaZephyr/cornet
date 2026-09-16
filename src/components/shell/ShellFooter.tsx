import { Link } from "@tanstack/react-router";
import { useTheme } from "@/hooks/useTheme";

function YouTube2009Footer() {
  return (
    <footer className="cn-shell-footer cn-yt2009-footer">
      <form className="cn-yt2009-footer-search" onSubmit={(event) => event.preventDefault()}>
        <input aria-label="Buscar" type="text" />
        <button type="submit">Buscar</button>
      </form>

      <div className="cn-yt2009-footer-links">
        <div>
          <strong>Cornet</strong>
          <Link to="/about">Información</Link>
          <Link to="/community">Comunidad</Link>
          <Link to="/partner">Partners</Link>
          <Link to="/terms">Términos</Link>
        </div>
        <div>
          <strong>Programas</strong>
          <Link to="/playlists">Playlists</Link>
          <Link to="/community">Creadores</Link>
          <Link to="/partner">Partners</Link>
          <Link to="/about">Acerca de Cornet</Link>
        </div>
        <div>
          <strong>Ayuda</strong>
          <Link to="/about">Centro de ayuda</Link>
          <Link to="/community">Foros de comunidad</Link>
          <Link to="/about">Centro de seguridad</Link>
          <Link to="/about">Guía para creadores</Link>
        </div>
        <div>
          <strong>Políticas</strong>
          <Link to="/privacy">Política de privacidad</Link>
          <Link to="/terms">Términos de servicio</Link>
          <Link to="/terms">Avisos de copyright</Link>
          <Link to="/terms">Normas de comunidad</Link>
        </div>
        <div>
          <strong>Descubre</strong>
          <Link to="/about">Cornet en tu teléfono</Link>
          <Link to="/about">Cornet en tu sitio</Link>
          <Link to="/about">Cornet en TV</Link>
          <Link to="/about">Feeds RSS</Link>
        </div>
      </div>

      <div className="cn-yt2009-footer-meta">
        <span>Ubicación actual: Mundial</span>
        <Link to="/settings">Mostrar ubicaciones</Link>
        <span>Idioma actual: Español</span>
        <Link to="/settings">Cambiar idioma</Link>
        <Link to="/about">Añadir Cornet a tu página principal</Link>
      </div>

      <p className="cn-yt2009-footer-copy">© 2009 Cornet, LLC</p>
    </footer>
  );
}

export function ShellFooter() {
  const { theme } = useTheme();

  if (theme === "yt-2009") return <YouTube2009Footer />;

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
