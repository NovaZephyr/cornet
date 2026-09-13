import { useEffect, useState } from "react";
import {
  isPermissionGranted as isTauriPermissionGranted,
  requestPermission as requestTauriPermission,
  sendNotification as sendTauriNotification,
} from "@tauri-apps/plugin-notification";

const STORAGE_KEY = "cornet-notification-prompt-v1";

function isTauriRuntime() {
  return typeof window !== "undefined" && Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

export function NotificationPermissionPrompt() {
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY) === "done") return;

    const timer = window.setTimeout(() => setVisible(true), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "done");
    setVisible(false);
  };

  const enableNotifications = async () => {
    setRequesting(true);

    try {
      if (isTauriRuntime()) {
        let granted = await isTauriPermissionGranted();
        if (!granted) {
          granted = (await requestTauriPermission()) === "granted";
        }

        if (granted) {
          sendTauriNotification({
            title: "Notificaciones activadas",
            body: "Cornet te avisará cuando haya nuevas notificaciones.",
          });
        }
      } else if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          new Notification("Notificaciones activadas", {
            body: "Cornet te avisará cuando haya nuevas notificaciones.",
          });
        }
      }
    } catch (error) {
      console.error("No se pudo solicitar el permiso de notificaciones", error);
    } finally {
      localStorage.setItem(STORAGE_KEY, "done");
      setRequesting(false);
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-[100] w-[min(92vw,440px)] -translate-x-1/2 rounded-2xl border border-border bg-background/95 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl" aria-hidden="true">
          🔔
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-foreground">¿Quieres recibir notificaciones?</h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Permite las notificaciones para que Cornet pueda avisarte de nuevos mensajes, actividad y otros eventos importantes.
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={dismiss}
              disabled={requesting}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-50"
            >
              Ahora no
            </button>
            <button
              type="button"
              onClick={enableNotifications}
              disabled={requesting}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
            >
              {requesting ? "Solicitando…" : "Activar notificaciones"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
