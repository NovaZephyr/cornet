import { useEffect, useState } from "react";

export function useShellState(pathname: string) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

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
