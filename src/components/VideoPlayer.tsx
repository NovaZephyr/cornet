import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Expand, Loader2, MessageSquareText, Minimize, Pause, Play, RotateCcw, Settings, ShieldAlert, Volume2, VolumeX } from "lucide-react";
import { formatTimestamp } from "@/lib/captions";
import "./video-player.css";

export type PlayerCaption = { src: string; srclang: string; label: string; default?: boolean };
export type PlayerChapter = { id: string; title: string; startSeconds: number; endSeconds?: number | null };
interface VideoPlayerProps { src?: string; poster?: string; autoPlay?: boolean; className?: string; captions?: PlayerCaption[]; chapters?: PlayerChapter[]; ageRestricted?: boolean }
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const formatTime = (seconds: number) => Number.isFinite(seconds) ? formatTimestamp(seconds) : "0:00";

export function VideoPlayer({ src, poster, autoPlay, className, captions = [], chapters = [], ageRestricted: ageRestrictedProp = false }: VideoPlayerProps) {
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
  const [ageRestricted, setAgeRestricted] = useState(ageRestrictedProp === true);
  const [ageGate, setAgeGate] = useState(ageRestrictedProp === true);
  const [ageLoading, setAgeLoading] = useState(false);

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
    const restricted = ageRestrictedProp === true;
    setAgeRestricted(restricted);
    setAgeGate(restricted);
    setAgeLoading(false);
  }, [ageRestrictedProp, src]);

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
  const controlsClass = [
    "cn-video-player__controls",
    showControls || !playing ? "" : "cn-video-player__controls--hidden",
    ageGate ? "cn-video-player__controls--blocked" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onFocus={wake}
      onMouseMove={wake}
      onMouseLeave={() => playing && setShowControls(false)}
      role="application"
      aria-label="Reproductor de video"
      data-corenet-player
      className={`cn-video-player ${className ?? ""}`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay && !ageGate}
        playsInline
        preload="metadata"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onPointerDown={() => containerRef.current?.focus()}
        className="cn-video-player__video"
        aria-label="Video"
      />

      {loading && !ageGate && !error && (
        <div className="cn-video-player__loading">
          <span className="cn-video-player__loading-icon"><Loader2 /></span>
        </div>
      )}

      {error && !ageGate && (
        <div className="cn-video-player__error">
          <div className="cn-video-player__message">
            <RotateCcw className="cn-video-player__message-icon" />
            <h2>No se pudo cargar el video</h2>
            <p>Comprueba la conexión y vuelve a intentarlo.</p>
            <button type="button" onClick={retry} className="cn-video-player__button cn-video-player__button--retry">Reintentar</button>
          </div>
        </div>
      )}

      {!playing && !loading && !ageGate && !error && (
        <button type="button" onClick={togglePlay} aria-label="Reproducir" className="cn-video-player__play-overlay">
          <span className="cn-video-player__play-icon"><Play className="cn-video-player__play-symbol" /></span>
        </button>
      )}

      {!ageLoading && ageRestricted && ageGate && (
        <div className="cn-video-player__age-gate">
          <div className="cn-video-player__age-content">
            <ShieldAlert className="cn-video-player__age-icon" />
            <h2>Contenido restringido para mayores de 18</h2>
            <p>Este video está marcado como restringido por el creador. Confirma que eres mayor de 18 años para continuar.</p>
            <button type="button" onClick={continueVideo} className="cn-video-player__button cn-video-player__button--age">Soy mayor de 18 — Ver video</button>
            <p className="cn-video-player__age-note">Esta advertencia no sustituye una verificación legal de edad.</p>
          </div>
        </div>
      )}

      <div className={controlsClass}>
        <div className="cn-video-player__progress">
          <div className="cn-video-player__buffer" style={{ width: `${buffer}%` }} />
          <div className="cn-video-player__played" style={{ width: `${progress}%` }} />
          <input type="range" min={0} max={duration || 0} step={0.1} value={current} onChange={(event) => seekTo(Number(event.target.value))} className="cn-video-player__range" aria-label="Progreso del video" />
        </div>

        <div className="cn-video-player__toolbar">
          <button type="button" onClick={togglePlay} aria-label={playing ? "Pausar" : "Reproducir"} className="cn-video-player__control">
            {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
          </button>

          <div className="cn-video-player__volume">
            <button type="button" onClick={toggleMute} aria-label={muted ? "Activar sonido" : "Silenciar"} className="cn-video-player__control">
              {muted || volume === 0 ? <VolumeX /> : <Volume2 />}
            </button>
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(event) => onVolumeChange(Number(event.target.value))} className="cn-video-player__volume-range" aria-label="Volumen" />
          </div>

          <span className="cn-video-player__time">
            {formatTime(current)} <span className="cn-video-player__time-separator">/</span> {formatTime(duration)}
          </span>

          <span className="cn-video-player__spacer" />

          {captions.length > 0 && (
            <button type="button" onClick={() => applyCaptionMode(captionEnabledRef.current ? "" : captions[0].srclang, !captionEnabledRef.current)} aria-label="Subtítulos" aria-pressed={captionEnabled} className="cn-video-player__control">
              <MessageSquareText />
            </button>
          )}

          <div className="cn-video-player__settings">
            <button type="button" onClick={() => { setShowSettings((open) => !open); setSettingsView("main"); }} aria-label="Configuración" aria-expanded={showSettings} className="cn-video-player__settings-button">
              <Settings />
            </button>

            {showSettings && (
              <div className="cn-video-player__menu">
                {settingsView === "main" && <>
                  <button type="button" onClick={() => setSettingsView("speed")} className="cn-video-player__menu-button">
                    <span>Velocidad</span><span className="cn-video-player__menu-muted">{rate}x <ChevronDown /></span>
                  </button>
                  {captions.length > 0 && <button type="button" onClick={() => setSettingsView("captions")} className="cn-video-player__menu-button">
                    <span>Subtítulos / CC</span><span className="cn-video-player__menu-muted">{activeCaptionLabel} <ChevronDown /></span>
                  </button>}
                </>}

                {settingsView === "speed" && <>
                  <button type="button" onClick={() => setSettingsView("main")} className="cn-video-player__menu-button"><span>← Configuración</span></button>
                  {SPEEDS.map((speed) => <button key={speed} type="button" onClick={() => setPlaybackRate(speed)} className="cn-video-player__menu-button">
                    <span>{speed === 1 ? "Normal" : `${speed}x`}</span>{speed === rate && <Check />}
                  </button>)}
                </>}

                {settingsView === "captions" && <>
                  <button type="button" onClick={() => setSettingsView("main")} className="cn-video-player__menu-button"><span>← Configuración</span></button>
                  <button type="button" onClick={() => applyCaptionMode("", false)} className="cn-video-player__menu-button">
                    <span>Desactivados</span>{!captionEnabled && <Check />}
                  </button>
                  {captions.map((caption) => <button key={`${caption.srclang}-${caption.label}`} type="button" onClick={() => applyCaptionMode(caption.srclang, true)} className="cn-video-player__menu-button">
                    <span>{caption.label}</span>{captionEnabled && captionLanguage === caption.srclang && <Check />}
                  </button>)}
                </>}
              </div>
            )}
          </div>

          <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"} className="cn-video-player__control">
            {fullscreen ? <Minimize /> : <Expand />}
          </button>
        </div>
      </div>

      {chapters.length > 0 && !ageGate && (
        <div className="cn-video-player__chapters">
          {chapters.map((chapter) => <button key={chapter.id} type="button" onClick={() => seekTo(chapter.startSeconds)} className="cn-video-player__chapter" title={`${chapter.title} · ${formatTimestamp(chapter.startSeconds)}`}>
            {chapter.title}
          </button>)}
        </div>
      )}
    </div>
  );
}
