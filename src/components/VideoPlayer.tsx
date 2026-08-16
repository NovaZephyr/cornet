import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { formatTimestamp } from "@/lib/captions";

export type PlayerCaption = { src: string; srclang: string; label: string; default?: boolean };
export type PlayerChapter = { id: string; title: string; startSeconds: number; endSeconds?: number | null };

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
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const onVolumeChange = (value: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = value;
    v.muted = value === 0;
    setVolume(value);
    setMuted(value === 0);
  };

  const seekTo = (value: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, value);
    setCurrent(v.currentTime);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) void el.requestFullscreen();
    else void document.exitFullscreen();
  };

  const setPlaybackRate = (value: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = value;
    setRate(value);
    setShowSpeedMenu(false);
  };

  const wake = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 2500);
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => { setPlaying(false); setShowControls(true); };
    const onTime = () => setCurrent(v.currentTime);
    const onLoaded = () => { setDuration(v.duration); setLoading(false); };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onProgress = () => {
      if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("progress", onProgress);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("progress", onProgress);
    };
  }, [src]);

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case " ":
        case "k": e.preventDefault(); togglePlay(); break;
        case "ArrowRight": seekTo(Math.min(v.currentTime + 5, duration)); break;
        case "ArrowLeft": seekTo(Math.max(v.currentTime - 5, 0)); break;
        case "ArrowUp": e.preventDefault(); onVolumeChange(Math.min(volume + 0.1, 1)); break;
        case "ArrowDown": e.preventDefault(); onVolumeChange(Math.max(volume - 0.1, 0)); break;
        case "m": toggleMute(); break;
        case "f": toggleFullscreen(); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [duration, volume]);

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
        autoPlay={autoPlay}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className="h-full w-full cursor-pointer"
      >
        {captions.map((caption) => (
          <track
            key={`${caption.srclang}-${caption.label}`}
            kind="subtitles"
            src={caption.src}
            srcLang={caption.srclang}
            label={caption.label}
            default={caption.default}
          />
        ))}
      </video>

      {loading && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-white/80" /></div>}

      {!playing && !loading && (
        <button onClick={togglePlay} aria-label="Reproducir" className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-lg"><Play className="ml-1 h-7 w-7 fill-current" /></span>
        </button>
      )}

      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-2 pt-8 transition-opacity duration-200 ${showControls || !playing ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div className="group/bar relative mb-2 h-1.5 w-full cursor-pointer rounded-full bg-white/25">
          <div className="absolute inset-y-0 left-0 rounded-full bg-white/40" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
          <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${duration ? (current / duration) * 100 : 0}%` }} />
          <input type="range" min={0} max={duration || 0} step={0.1} value={current} onChange={(e) => seekTo(Number(e.target.value))} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Progreso del video" />
          <div className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full bg-primary opacity-0 group-hover/bar:opacity-100" style={{ left: `${duration ? (current / duration) * 100 : 0}%` }} />
        </div>

        <div className="flex items-center gap-3 text-white">
          <button onClick={togglePlay} aria-label={playing ? "Pausar" : "Reproducir"}>{playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</button>
          <div className="group/vol flex items-center gap-1.5">
            <button onClick={toggleMute} aria-label={muted ? "Activar sonido" : "Silenciar"}>{muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</button>
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(e) => onVolumeChange(Number(e.target.value))} className="h-1 w-0 cursor-pointer opacity-0 transition-all group-hover/vol:w-16 group-hover/vol:opacity-100" aria-label="Volumen" />
          </div>
          <span className="text-xs tabular-nums text-white/90">{formatTime(current)} / {formatTime(duration)}</span>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative">
              <button onClick={() => setShowSpeedMenu((s) => !s)} className="rounded px-1.5 py-0.5 text-xs font-medium hover:bg-white/10">{rate}x</button>
              {showSpeedMenu && <div className="absolute bottom-8 right-0 w-20 rounded-lg bg-black/90 py-1 text-xs shadow-lg">{SPEEDS.map((s) => <button key={s} onClick={() => setPlaybackRate(s)} className={`block w-full px-3 py-1 text-left hover:bg-white/10 ${s === rate ? "text-primary" : ""}`}>{s}x</button>)}</div>}
            </div>
            <button onClick={toggleFullscreen} aria-label="Pantalla completa">{fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}</button>
          </div>
        </div>
      </div>

      {chapters.length > 0 && (
        <div className="absolute left-3 top-3 right-3 flex gap-1 overflow-x-auto rounded-lg bg-black/55 p-1 backdrop-blur-sm">
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              type="button"
              onClick={() => seekTo(chapter.startSeconds)}
              className="shrink-0 rounded bg-black/55 px-2 py-1 text-[11px] text-white hover:bg-black/75"
              title={`${chapter.title} · ${formatTimestamp(chapter.startSeconds)}`}
            >
              {chapter.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
