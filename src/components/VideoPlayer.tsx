import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Expand, Loader2, MessageSquareText, Minimize, Pause, Play, RotateCcw, Settings, ShieldAlert, Volume2, VolumeX } from "lucide-react";
import { formatTimestamp } from "@/lib/captions";
import { supabase } from "@/integrations/supabase/client";

export type PlayerCaption = { src: string; srclang: string; label: string; default?: boolean };
export type PlayerChapter = { id: string; title: string; startSeconds: number; endSeconds?: number | null };
interface VideoPlayerProps { src?: string; poster?: string; autoPlay?: boolean; className?: string; captions?: PlayerCaption[]; chapters?: PlayerChapter[] }
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const formatTime = (seconds: number) => Number.isFinite(seconds) ? formatTimestamp(seconds) : "0:00";

export function VideoPlayer({ src, poster, autoPlay, className, captions = [], chapters = [] }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const captionEnabledRef = useRef(false);
  const captionLanguageRef = useRef("");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
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
    for (const track of Array.from(video.textTracks)) track.mode = "disabled";
    captionEnabledRef.current = enabled;
    captionLanguageRef.current = enabled ? language : "";
    setCaptionEnabled(enabled);
    setCaptionLanguage(enabled ? language : "");
    if (!enabled) return;
    const target = Array.from(video.textTracks).find((track) => track.language === language) ?? Array.from(video.textTracks)[0];
    if (target) target.mode = "showing";
  };

  useEffect(() => {
    let active = true;
    const code = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("v") : null;
    if (!code) { setAgeLoading(false); return; }
    void supabase.from("videos").select("age_restricted").eq("code", code).maybeSingle().then(({ data }) => {
      if (!active) return;
      const restricted = data?.age_restricted === true;
      setAgeRestricted(restricted);
      setAgeGate(restricted);
      setAgeLoading(false);
    }, () => { if (active) setAgeLoading(false); });
    return () => { active = false; };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => { setPlaying(false); setShowControls(true); };
    const onTime = () => setCurrent(video.currentTime);
    const onLoaded = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setLoading(false);
      setError(false);
      if (captions.length && captionLanguageRef.current) applyCaptionMode(captionLanguageRef.current, true);
      else if (captions[0]?.default) applyCaptionMode(captions[0].srclang, true);
    };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onProgress = () => { if (video.buffered.length) setBuffered(video.buffered.end(video.buffered.length - 1)); };
    const onError = () => { setLoading(false); setError(true); };
    const onEnded = () => { setPlaying(false); setCurrent(video.duration || 0); setShowControls(true); };
    for (const [name, handler] of Object.entries({ play: onPlay, pause: onPause, timeupdate: onTime, loadedmetadata: onLoaded, waiting: onWaiting, playing: onPlaying, progress: onProgress, error: onError, ended: onEnded })) video.addEventListener(name, handler);
    return () => { for (const [name, handler] of Object.entries({ play: onPlay, pause: onPause, timeupdate: onTime, loadedmetadata: onLoaded, waiting: onWaiting, playing: onPlaying, progress: onProgress, error: onError, ended: onEnded })) video.removeEventListener(name, handler); };
  }, [src, captions]);

  useEffect(() => {
    const onFsChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || ageGate) return;
    if (video.paused) void video.play().catch(() => setError(true)); else video.pause();
  };
  const toggleMute = () => { const video = videoRef.current; if (!video) return; video.muted = !video.muted; setMuted(video.muted); };
  const onVolumeChange = (value: number) => { const video = videoRef.current; if (!video) return; video.volume = value; video.muted = value === 0; setVolume(value); setMuted(value === 0); };
  const seekTo = (value: number) => { const video = videoRef.current; if (!video || ageGate) return; video.currentTime = Math.max(0, Math.min(value, duration || value)); setCurrent(video.currentTime); };
  const toggleFullscreen = () => { const element = containerRef.current; if (!element) return; if (!document.fullscreenElement) void element.requestFullscreen().catch(() => undefined); else void document.exitFullscreen().catch(() => undefined); };
  const setPlaybackRate = (value: number) => { const video = videoRef.current; if (!video) return; video.playbackRate = value; setRate(value); setShowSettings(false); setSettingsView("main"); };
  const wake = () => { setShowControls(true); if (hideTimer.current) clearTimeout(hideTimer.current); hideTimer.current = setTimeout(() => { if (videoRef.current && !videoRef.current.paused) setShowControls(false); }, 2400); };
  const continueVideo = () => { setAgeGate(false); requestAnimationFrame(() => { if (autoPlay) void videoRef.current?.play().catch(() => undefined); }); };
  const retry = () => { const video = videoRef.current; if (!video) return; setError(false); setLoading(true); video.load(); if (autoPlay && !ageGate) void video.play().catch(() => undefined); };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || ageGate) return;
    if (event.key === " " || event.key.toLowerCase() === "k") { event.preventDefault(); togglePlay(); }
    else if (event.key.toLowerCase() === "m") toggleMute();
    else if (event.key.toLowerCase() === "f") toggleFullscreen();
    else if (event.key.toLowerCase() === "c" && captions.length) { event.preventDefault(); applyCaptionMode(captionEnabledRef.current ? "" : captions[0].srclang, !captionEnabledRef.current); }
    else if (event.key === "ArrowRight") seekTo(Math.min(video.currentTime + 5, duration));
    else if (event.key === "ArrowLeft") seekTo(Math.max(video.currentTime - 5, 0));
    else if (event.key === "ArrowUp") { event.preventDefault(); onVolumeChange(Math.min(volume + 0.1, 1)); }
    else if (event.key === "ArrowDown") { event.preventDefault(); onVolumeChange(Math.max(volume - 0.1, 0)); }
  };
  const progress = duration ? Math.min(100, (current / duration) * 100) : 0;
  const buffer = duration ? Math.min(100, (buffered / duration) * 100) : 0;
  const activeCaptionLabel = captions.find((caption) => caption.srclang === captionLanguage)?.label ?? "Desactivados";

  return <div ref={containerRef} tabIndex={0} onKeyDown={handleKeyDown} onFocus={wake} onMouseMove={wake} onMouseLeave={() => playing && setShowControls(false)} role="application" aria-label="Reproductor de video" className={`group/player relative aspect-video w-full select-none overflow-hidden rounded-2xl bg-black shadow-2xl shadow-black/20 ring-1 ring-white/10 outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${className ?? ""}`}>
    <video ref={videoRef} src={src} poster={poster} autoPlay={autoPlay && !ageGate} playsInline preload="metadata" onClick={togglePlay} onDoubleClick={toggleFullscreen} onPointerDown={() => containerRef.current?.focus()} className="h-full w-full cursor-pointer bg-black object-contain" aria-label="Video" />
    {loading && !ageGate && !error && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="rounded-full bg-black/40 p-3 backdrop-blur"><Loader2 className="h-8 w-8 animate-spin text-white" /></span></div>}
    {error && !ageGate && <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 p-6 text-center text-white backdrop-blur-sm"><div><RotateCcw className="mx-auto h-6 w-6" /><h2 className="mt-4 text-lg font-semibold">No se pudo cargar el video</h2><p className="mt-1 text-sm text-white/65">Comprueba la conexión y vuelve a intentarlo.</p><button type="button" onClick={retry} className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90">Reintentar</button></div></div>}
    {!playing && !loading && !ageGate && !error && <button type="button" onClick={togglePlay} aria-label="Reproducir" className="absolute inset-0 flex items-center justify-center bg-black/10"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-black shadow-2xl transition-transform hover:scale-105"><Play className="ml-1 h-7 w-7 fill-current" /></span></button>}
    {!ageLoading && ageRestricted && ageGate && <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 p-6 text-center text-white"><div className="max-w-md"><ShieldAlert className="mx-auto h-12 w-12 text-white/80" /><h2 className="mt-4 text-2xl font-bold">Contenido restringido para mayores de 18</h2><p className="mt-2 text-sm text-white/70">Este video está marcado como restringido por el creador. Confirma que eres mayor de 18 años para continuar.</p><button type="button" onClick={continueVideo} className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-white/90">Soy mayor de 18 — Ver video</button><p className="mt-3 text-[11px] text-white/45">Esta advertencia no sustituye una verificación legal de edad.</p></div></div>}
    <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent px-3 pb-3 pt-14 transition-opacity duration-200 sm:px-4 ${showControls || !playing ? "opacity-100" : "pointer-events-none opacity-0"} ${ageGate ? "pointer-events-none opacity-0" : ""}`}>
      <div className="relative mb-3 h-1.5 cursor-pointer rounded-full bg-white/25"><div className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: `${buffer}%` }} /><div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-400 to-primary" style={{ width: `${progress}%` }} /><input type="range" min={0} max={duration || 0} step={0.1} value={current} onChange={(event) => seekTo(Number(event.target.value))} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Progreso del video" /></div>
      <div className="flex items-center gap-1 text-white sm:gap-2">
        <button type="button" onClick={togglePlay} aria-label={playing ? "Pausar" : "Reproducir"} className="rounded-lg p-2 hover:bg-white/10">{playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}</button>
        <div className="group/vol flex items-center gap-1"><button type="button" onClick={toggleMute} aria-label={muted ? "Activar sonido" : "Silenciar"} className="rounded-lg p-2 hover:bg-white/10">{muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</button><input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(event) => onVolumeChange(Number(event.target.value))} className="h-1 w-0 opacity-0 transition-all group-hover/vol:w-16 group-hover/vol:opacity-100" aria-label="Volumen" /></div>
        <span className="ml-1 text-xs font-medium tabular-nums text-white/90 sm:text-sm">{formatTime(current)} <span className="text-white/40">/</span> {formatTime(duration)}</span>
        <div className="ml-auto flex items-center gap-0.5">
          {captions.length > 0 && <button type="button" onClick={() => applyCaptionMode(captionEnabledRef.current ? "" : captions[0].srclang, !captionEnabledRef.current)} aria-label="Subtítulos" className={`rounded-lg p-2 hover:bg-white/10 ${captionEnabled ? "bg-white/15" : ""}`}><MessageSquareText className="h-5 w-5" /></button>}
          <div className="relative"><button type="button" onClick={() => { setShowSettings((open) => !open); setSettingsView("main"); }} aria-label="Configuración" className="rounded-lg p-2 hover:bg-white/10"><Settings className="h-5 w-5" /></button>{showSettings && <div className="absolute bottom-12 right-0 w-64 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 p-1.5 text-sm text-white shadow-2xl backdrop-blur-xl">{settingsView === "main" && <><button type="button" onClick={() => setSettingsView("speed")} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-white/10"><span>Velocidad</span><span className="flex items-center gap-1 text-xs text-white/60">{rate}x <ChevronDown className="h-3 w-3" /></span></button>{captions.length > 0 && <button type="button" onClick={() => setSettingsView("captions")} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-white/10"><span>Subtítulos / CC</span><span className="flex items-center gap-1 text-xs text-white/60">{activeCaptionLabel} <ChevronDown className="h-3 w-3" /></span></button>}</>}{settingsView === "speed" && <><button type="button" onClick={() => setSettingsView("main")} className="w-full rounded-xl px-3 py-2 text-left text-xs text-white/55 hover:bg-white/10">← Configuración</button>{SPEEDS.map((speed) => <button key={speed} type="button" onClick={() => setPlaybackRate(speed)} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-white/10"><span>{speed === 1 ? "Normal" : `${speed}x`}</span>{speed === rate && <Check className="h-4 w-4 text-cyan-300" />}</button>)}</>}{settingsView === "captions" && <><button type="button" onClick={() => setSettingsView("main")} className="w-full rounded-xl px-3 py-2 text-left text-xs text-white/55 hover:bg-white/10">← Configuración</button><button type="button" onClick={() => applyCaptionMode("", false)} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-white/10"><span>Desactivados</span>{!captionEnabled && <Check className="h-4 w-4 text-cyan-300" />}</button>{captions.map((caption) => <button key={`${caption.srclang}-${caption.label}`} type="button" onClick={() => applyCaptionMode(caption.srclang, true)} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-white/10"><span>{caption.label}</span>{captionEnabled && captionLanguage === caption.srclang && <Check className="h-4 w-4 text-cyan-300" />}</button>)}</>}</div>}</div>
          <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"} className="rounded-lg p-2 hover:bg-white/10">{fullscreen ? <Minimize className="h-5 w-5" /> : <Expand className="h-5 w-5" />}</button>
        </div>
      </div>
    </div>
    {chapters.length > 0 && !ageGate && <div className="absolute left-3 right-3 top-3 flex gap-1.5 overflow-x-auto rounded-xl border border-white/10 bg-black/35 p-1.5 text-white backdrop-blur-md scrollbar-none">{chapters.map((chapter) => <button key={chapter.id} type="button" onClick={() => seekTo(chapter.startSeconds)} className="shrink-0 rounded-lg bg-white/8 px-3 py-1.5 text-[11px] font-medium hover:bg-white/15" title={`${chapter.title} · ${formatTimestamp(chapter.startSeconds)}`}>{chapter.title}</button>)}</div>}
  </div>;
}
