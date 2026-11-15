export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface Transcript {
  text?: string;
  segments?: TranscriptSegment[];
}

function timestamp(seconds: number): string {
  const ms = Math.round(seconds * 1_000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  const rest = ms % 1_000;
  const pad = (value: number, width = 2) => String(value).padStart(width, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(rest, 3)}`;
}

/**
 * Converts a provider transcript into WebVTT. Segments are preferred; a
 * transcript with only plain text becomes one cue spanning `durationS`.
 */
export function transcriptToVtt(transcript: Transcript, durationS = 5): string {
  const segments =
    transcript.segments && transcript.segments.length > 0
      ? transcript.segments
      : [{ start: 0, end: durationS, text: transcript.text ?? "" }];

  const lines = ["WEBVTT", ""];

  segments.forEach((segment, index) => {
    lines.push(String(index + 1));
    lines.push(`${timestamp(segment.start)} --> ${timestamp(segment.end)}`);
    lines.push(segment.text.trim());
    lines.push("");
  });

  return lines.join("\n");
}
