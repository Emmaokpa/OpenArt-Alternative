import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export interface MediaProbe {
  durationMs?: number;
  width?: number;
  height?: number;
}

interface FfprobeOutput {
  format?: { duration?: string };
  streams?: Array<{ codec_type?: string; width?: number; height?: number; duration?: string }>;
}

let ffprobeAvailable: boolean | undefined;

/** True when the `ffprobe` binary is on PATH. Cached for the process lifetime. */
export async function hasFfprobe(): Promise<boolean> {
  if (ffprobeAvailable !== undefined) return ffprobeAvailable;
  try {
    await run("ffprobe", ["-version"], { timeout: 5_000 });
    ffprobeAvailable = true;
  } catch {
    ffprobeAvailable = false;
  }
  return ffprobeAvailable;
}

/**
 * Reads duration and dimensions. Returns null when ffprobe is not installed
 * locally; production images include it in `apps/api/Dockerfile`.
 */
export async function probeMedia(filePath: string): Promise<MediaProbe | null> {
  if (!(await hasFfprobe())) return null;

  try {
    const { stdout } = await run(
      "ffprobe",
      ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", filePath],
      { timeout: 20_000, maxBuffer: 4 * 1024 * 1024 },
    );
    const parsed = JSON.parse(stdout) as FfprobeOutput;
    const durationS = Number(parsed.format?.duration);
    const videoStream = parsed.streams?.find((stream) => stream.codec_type === "video");

    return {
      durationMs: Number.isFinite(durationS) ? Math.round(durationS * 1_000) : undefined,
      width: videoStream?.width,
      height: videoStream?.height,
    };
  } catch {
    return null;
  }
}

/** Writes one frame as a JPEG thumbnail. Returns false when ffmpeg is absent. */
export async function writeThumbnail(
  inputPath: string,
  outputPath: string,
  atSeconds = 1,
): Promise<boolean> {
  try {
    await run(
      "ffmpeg",
      [
        "-y",
        "-ss",
        String(atSeconds),
        "-i",
        inputPath,
        "-frames:v",
        "1",
        "-vf",
        "scale=640:-2",
        outputPath,
      ],
      { timeout: 30_000, maxBuffer: 4 * 1024 * 1024 },
    );
    return true;
  } catch {
    return false;
  }
}
