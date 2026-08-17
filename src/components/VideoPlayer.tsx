import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Expand,
  Loader2,
  MessageSquareText,
  Minimize,
  Pause,
  Play,
  Settings,
  ShieldAlert,
  Volume2,
  VolumeX,
} from "lucide-react";
import { formatTimestamp } from "@/lib/captions";
import { supabase } from "@/integrations/supabase/client";

export type PlayerCaption = {
  src: string;
  srclang: string;
  label: string;
  default?: boolean;
};

export type PlayerChapter = {
  id: string;
  title: string;
  startSeconds: number;
  endSeconds?: number | null;
};

interface VideoPlayerProps {
  src?: string;
  poster?: string;
  autoPlay?: boolean;
  className?: string;
  captions?: PlayerCaption[];
  chapters?: PlayerChapter[];
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  return formatTimestamp(seconds);
}

export function VideoPlayer({ src, poster, autoPlay, className, captions = [], chapters = [] }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [rate, setRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsView, setSettingsView] = useState<"main" | "captions" | "speed">("main");
  const [captionEnabled, setCaptionEnabled] = useState(false);
  const [captionLanguage, setCaptionLanguage] = useState("");
  const [ageRestricted, setAgeRestricted] = useState(false);
  const [ageGate, setAgeGate] = useState(false);
  const [ageLoading, setAgeLoading] = useState(true);

  const applyCaptionMode = (language: string, enabled: boolean) => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = Array.from(video.textTracks);
    for (const track of tracks) track.mode = "disabled";
    if (!enabled) {
      setCaptionEnabled(false);
      setCaptionLanguage("");
      return;
    }
    const target = tracks.find((track) => track.language === language) ?? tracks.find((track) => track.language === captions[0]?.srclang);
    if (target) {
      target.mode = "showing";
      setCaptionEnabled(true);
      setCaptionLanguage(target.language || language);
    }
  };

  useEffect(() => {
    let active = true;
    const code = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("v") : null;
    if (!code) {
      setAgeLoading(false);
      return;
    }
    void supabase
      .from("videos")
      .select("age_restricted")
      .eq("code", code)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const restricted = data?.age_restricted === true;
        setAgeRestricted(restricted);
        setAgeGate(restricted);
        setAgeLoading(false);
      }, () => {
        if (active) setAgeLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      setShowControls(true);
    };
    const onTime = () => setCurrent(video.currentTime);
    const onLoaded = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setLoading(false);
      if (captions.length && captionLanguage) applyCaptionMode(captionLanguage, captionEnabled);
      else if (captions.some((caption) => caption.default)) applyCaptionMode(captions.find((caption) => caption.default)?.srclang ?? captions[0].srclang, true);
    };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onProgress = () => {
      if (video.buffered.length > 0) setBuffered(video.buffered.end(video.buffered.length - 1));
    };
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("progress", onProgress);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("progress", onProgress);
    };
  }, [src, captions, captionEnabled, captionLanguage]);

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      const video = videoRef.current;
      if (!video || ageGate) return;
      switch (event.key.toLowerCase()) {
        case " ":
        case "k":
          event.preventDefault();
          togglePlay();
          break;
        case "c":
          event.preventDefault();
          if (captions.length) applyCaptionMode(captionEnabled ? "" : captions[0].srclang, !captionEnabled);
          break;
        case "arrowright":
          seekTo(Math.min(video.currentTime + 5, duration));
          break;
        case "arrowleft":
          seekTo(Math.max(video.currentTime - 5, 0));
          break;
        case "arrowup":
          event.preventDefault();
          onVolumeChange(Math.min(volume + 0.1, 1));
          break;
        case "arrowdown":
          event.preventDefault();
          onVolumeChange(Math.max(volume - 0.1, 0));
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          toggleFullscreen();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [duration, volume, ageGate, captionEnabled, captions]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || ageGate) return;
    if (video.paused) void video.play();
    else video.pause();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const onVolumeChange = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    video.muted = value === 0;
    setVolume(value);
    setMuted(value === 0);
  };

  const seekTo = (value: number) => {
    const video = videoRef.current;
    if (!video || ageGate) return;
    video.currentTime = Math.max(0, value);
    setCurrent(video.currentTime);
  };

  const toggleFullscreen = () => {
    const element = containerRef.current;
    if (!element) return;
    if (!document.fullscreenElement) void element.requestFullscreen();
    else void document.exitFullscreen();
  };

  const setPlaybackRate = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = value;
    setRate(value);
    setShowSettings(false);
    setSettingsView("main");
  };

  const wake = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 2200);
  };

  const continueVideo = () => {
    setAgeGate(false);
    requestAnimationFrame(() => {
      if (autoPlay) void videoRef.current?.play();
    });
  };

  const activeCaptionLabel = captions.find((caption) => caption.srclang === captionLanguage)?.label ?? "Desactivados";

  return (
    <div
      ref={containerRef}
      className={`group relative aspect-video w-full select-none overflow-hidden rounded-xl bg-black ${className ?? ""}`}
      onMouseMove={wake}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay && !ageGate}
        playsInline
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className="h-full w-full cursor-pointer bg-black"
      >
        {captions.map((caption) => (
          <track
            key={`${caption.srclang}-${caption.label}`}
            kind="subtitles"
            src={caption.src}
            srcLang={caption.srclang}
            label={caption.label}
          />
        ))}
      </video>

      {loading && !ageGate && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10">
          <Loader2 className="h-9 w-9 animate-spin text-white/80" />
        </div>
      )}

      {!playing && !loading && !ageGate && (
        <button
          onClick={togglePlay}
          aria-label="Reproducir"
          className="absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-black shadow-xl">
            <Play className="ml-0.5 h-6 w-6 fill-current" />
          </span>
        </button>
      )}

      {!ageLoading && ageRestricted && ageGate && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 p-6 text-center text-white">
          <div className="max-w-md">
            <ShieldAlert className="mx-auto h-12 w-12 text-white/85" />
            <h2 className="mt-4 text-2xl font-bold">Contenido restringido para mayores de 18</h2>
            <p className="mt-2 text-sm text-white/75">Este video está marcado como restringido por el creador. Confirma que eres mayor de 18 años para continuar.</p>
            <button type="button" onClick={continueVideo} className="mt-5 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-white/90">
              Soy mayor de 18 — Ver video
            </button>
            <p className="mt-3 text-[11px] text-white/50">Esta advertencia no sustituye una verificación legal de edad.</p>
          </div>
        </div>
      )}

      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent px-3 pb-2 pt-10 transition-opacity duration-200 ${showControls || !playing ? "opacity-100" : "pointer-events-none opacity-0"} ${ageGate ? "pointer-events-none opacity-0" : ""}`}>
        <div className="relative mb-2 h-1 cursor-pointer rounded-full bg-white/30 sm:h-1.5">
          <div className="absolute inset-y-0 left-0 rounded-full bg-white/45" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
          <div className="absolute inset-y-0 left-0 rounded-full bg-red-600" style={{ width: `${duration ? (current / duration) * 100 : 0}%` }} />
          <input type="range" min={0} max={duration || 0} step={0.1} value={current} onChange={(event) => seekTo(Number(event.target.value))} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Progreso del video" />
        </div>

        <div className="flex items-center gap-2 text-white sm:gap-3">
          <button onClick={togglePlay} aria-label={playing ? "Pausar" : "Reproducir"} className="rounded p-1 hover:bg-white/10">
            {playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}
          </button>

          <div className="group/vol flex items-center gap-1">
            <button onClick={toggleMute} aria-label={muted ? "Activar sonido" : "Silenciar"} className="rounded p-1 hover:bg-white/10">
              {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(event) => onVolumeChange(Number(event.target.value))} className="h-1 w-0 cursor-pointer opacity-0 transition-all group-hover/vol:w-16 group-hover/vol:opacity-100" aria-label="Volumen" />
          </div>

          <span className="text-xs tabular-nums text-white/90">{formatTime(current)} / {formatTime(duration)}</span>

          <div className="ml-auto flex items-center gap-1">
            {captions.length > 0 && (
              <button
                type="button"
                onClick={() => applyCaptionMode(captionEnabled ? "" : captions[0].srclang, !captionEnabled)}
                aria-label={captionEnabled ? "Desactivar subtítulos" : "Activar subtítulos"}
                aria-pressed={captionEnabled}
                className={`rounded p-1.5 hover:bg-white/10 ${captionEnabled ? "bg-white/15" : ""}`}
              >
                <MessageSquareText className="h-5 w-5" />
              </button>
            )}

            <div className="relative">
              <button type="button" onClick={() => { setShowSettings((open) => !open); setSettingsView("main"); }} aria-label="Configuración" className="rounded p-1.5 hover:bg-white/10">
                <Settings className="h-5 w-5" />
              </button>
              {showSettings && (
                <div className="absolute bottom-10 right-0 w-64 overflow-hidden rounded-lg border border-white/10 bg-zinc-950/95 p-1 text-sm text-white shadow-2xl backdrop-blur">
                  {settingsView === "main" && (
                    <>
                      <button type="button" onClick={() => setSettingsView("speed")} className="flex w-full items-center justify-between rounded px-3 py-2 text-left hover:bg-white/10"><span>Velocidad</span><span className="flex items-center gap-1 text-xs text-white/65">{rate}x <ChevronDown className="h-3 w-3" /></span></button>
                      {captions.length > 0 && <button type="button" onClick={() => setSettingsView("captions")} className="flex w-full items-center justify-between rounded px-3 py-2 text-left hover:bg-white/10"><span>Subtítulos/CC</span><span className="flex items-center gap-1 text-xs text-white/65">{activeCaptionLabel} <ChevronDown className="h-3 w-3" /></span></button>}
                    </>
                  )}
                  {settingsView === "speed" && (
                    <>
                      <button type="button" onClick={() => setSettingsView("main")} className="mb-1 w-full rounded px-3 py-2 text-left text-xs text-white/65 hover:bg-white/10">← Configuración</button>
                      {SPEEDS.map((speed) => <button key={speed} type="button" onClick={() => setPlaybackRate(speed)} className={`flex w-full items-center justify-between rounded px-3 py-2 text-left hover:bg-white/10 ${speed === rate ? "text-red-400" : ""}`}><span>{speed === 1 ? "Normal" : `${speed}x`}</span>{speed === rate && <span>✓</span>}</button>)}
                    </>
                  )}
                  {settingsView === "captions" && (
                    <>
                      <button type="button" onClick={() => setSettingsView("main")} className="mb-1 w-full rounded px-3 py-2 text-left text-xs text-white/65 hover:bg-white/10">← Configuración</button>
                      <button type="button" onClick={() => applyCaptionMode("", false)} className={`flex w-full items-center justify-between rounded px-3 py-2 text-left hover:bg-white/10 ${!captionEnabled ? "text-red-400" : ""}`}><span>Desactivados</span>{!captionEnabled && <span>✓</span>}</button>
                      {captions.map((caption) => <button key={`${caption.srclang}-${caption.label}`} type="button" onClick={() => applyCaptionMode(caption.srclang, true)} className={`flex w-full items-center justify-between rounded px-3 py-2 text-left hover:bg-white/10 ${captionEnabled && captionLanguage === caption.srclang ? "text-red-400" : ""}`}><span>{caption.label}</span>{captionEnabled && captionLanguage === caption.srclang && <span>✓</span>}</button>)}
                    </>
                  )}
                </div>
              )}
            </div>

            <button onClick={toggleFullscreen} aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"} className="rounded p-1.5 hover:bg-white/10">
              {fullscreen ? <Minimize className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {chapters.length > 0 && !ageGate && (
        <div className="absolute left-3 right-3 top-3 flex gap-1 overflow-x-auto rounded bg-black/55 p-1 text-white backdrop-blur-sm">
          {chapters.map((chapter) => (
            <button key={chapter.id} type="button" onClick={() => seekTo(chapter.startSeconds)} className="shrink-0 rounded bg-black/45 px-2 py-1 text-[11px] hover:bg-black/70" title={`${chapter.title} · ${formatTimestamp(chapter.startSeconds)}`}>
              {chapter.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
