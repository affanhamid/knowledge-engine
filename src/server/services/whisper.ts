import { execFile } from "child_process";
import { join } from "path";
import { promisify } from "util";
import { unlinkSync } from "fs";

const execFileAsync = promisify(execFile);

const WHISPER_BIN = "/opt/homebrew/bin/whisper-cli";
const MODEL_PATH = join(process.cwd(), "models", "ggml-base.en.bin");

async function convertToWav(inputPath: string): Promise<string> {
  const wavPath = inputPath.replace(/\.[^.]+$/, "") + ".wav";
  await execFileAsync("ffmpeg", [
    "-y",
    "-i", inputPath,
    "-ar", "16000",
    "-ac", "1",
    "-c:a", "pcm_s16le",
    wavPath,
  ]);
  return wavPath;
}

export async function transcribeAudio(filePath: string): Promise<string> {
  // Convert to 16kHz mono WAV (whisper-cpp requirement)
  const wavPath = await convertToWav(filePath);

  try {
    const { stdout } = await execFileAsync(WHISPER_BIN, [
      "-m", MODEL_PATH,
      "-f", wavPath,
      "--no-timestamps",
    ], {
      env: {
        ...process.env,
        GGML_METAL_PATH_RESOURCES: "/opt/homebrew/share/whisper-cpp",
      },
    });

    // whisper-cpp outputs lines like "   text here" — strip and join
    return stdout
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join(" ");
  } finally {
    try { unlinkSync(wavPath); } catch { /* ignore cleanup errors */ }
  }
}
