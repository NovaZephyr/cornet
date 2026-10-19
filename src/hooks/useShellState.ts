import { useEffect, useState } from "react";

export function useShellState(pathname: string, theme = "dark") {
  const [sidebarOpen, setSidebarOpen] = useState(theme !== "cosmephant-2");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(theme !== "cosmephant-2");
  }, [theme]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleMenuClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 900) {
      setMobileOpen((value) => !value);
    } else {
      setSidebarOpen((value) => !value);
    }
  };

  return { sidebarOpen, mobileOpen, handleMenuClick };
}
