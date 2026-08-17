export type ParsedCue = {
  start: number;
  end: number;
  text: string;
};

export type ChapterDraft = {
  title: string;
  startSeconds: number;
  endSeconds?: number | null;
};

export function parseTimestamp(value: string): number {
  const normalized = value.trim().replace(',', '.');
  const parts = normalized.split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return NaN;
  if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  return Number(normalized);
}

export function formatTimestamp(seconds: number): string {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

export function normalizeCaptionText(raw: string, fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext !== 'srt') return raw.replace(/^WEBVTT\s*/i, 'WEBVTT\n\n').trim() + '\n';

  const blocks = raw.replace(/^\uFEFF/, '').split(/\n\s*\n/);
  const cues: ParsedCue[] = [];
  const output: string[] = ['WEBVTT', ''];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((line) => line.trimEnd());
    const timeIndex = lines.findIndex((line) => /\d\d?:\d\d?:?\d\d[,.]\d{3}\s+-->/.test(line));
    if (timeIndex < 0) continue;
    const timeLine = (lines[timeIndex] ?? '').replace(/,/g, '.');
    const match = timeLine.match(/(\d{1,2}:\d{2}:\d{2}\.\d{3}|\d{1,2}:\d{2}\.\d{3})\s+-->\s+(\d{1,2}:\d{2}:\d{2}\.\d{3}|\d{1,2}:\d{2}\.\d{3})/);
    if (!match) continue;
    const start = parseTimestamp(match[1] ?? '');
    const end = parseTimestamp(match[2] ?? '');
    const text = lines.slice(timeIndex + 1).join('\n').trim();
    if (!text) continue;
    cues.push({ start, end, text });
  }

  for (const cue of cues) {
    output.push(`${toWebVttTime(cue.start)} --> ${toWebVttTime(cue.end)}`);
    output.push(cue.text);
    output.push('');
  }
  return output.join('\n');
}

function toWebVttTime(seconds: number): string {
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
  const whole = Math.floor(seconds);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function validateChapterDrafts(chapters: ChapterDraft[]): string | null {
  const sorted = [...chapters].sort((a, b) => a.startSeconds - b.startSeconds);
  for (let i = 0; i < sorted.length; i += 1) {
    const chapter = sorted[i];
    if (!chapter) continue;
    if (!chapter.title.trim()) return 'Todos los capítulos necesitan un título.';
    if (!Number.isFinite(chapter.startSeconds) || chapter.startSeconds < 0) return 'Hay un inicio de capítulo inválido.';
    if (chapter.endSeconds != null && (!Number.isFinite(chapter.endSeconds) || chapter.endSeconds <= chapter.startSeconds)) {
      return `El final de "${chapter.title}" debe ser posterior al inicio.`;
    }
    const prev = sorted[i - 1];
    if (prev && chapter.startSeconds <= prev.startSeconds) return 'Los capítulos no pueden compartir el mismo inicio.';
  }
  return null;
}
