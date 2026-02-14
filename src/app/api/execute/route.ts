import { NextResponse } from "next/server";
import { execFile } from "child_process";
import {
  mkdtempSync,
  writeFileSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  rmSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { graphFiles } from "~/server/db/schema";
import { getAbsolutePath } from "~/server/services/file-storage";

const LANG_MAP: Record<string, { cmd: string; ext: string }> = {
  python: { cmd: "python3", ext: ".py" },
  py: { cmd: "python3", ext: ".py" },
  r: { cmd: "Rscript", ext: ".R" },
  R: { cmd: "Rscript", ext: ".R" },
};

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".svg", ".gif"]);

function mimeForExt(ext: string): string {
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".gif": "image/gif",
  };
  return map[ext] ?? "application/octet-stream";
}

export async function POST(request: Request) {
  let tempDir: string | null = null;

  try {
    const body = (await request.json()) as {
      code: string;
      language: string;
      graphId: string;
    };
    const { code, language: rawLang, graphId } = body;
    // Normalize R Markdown syntax like {r} → r
    const language = rawLang.replace(/^\{|\}$/g, "").trim();

    const lang = LANG_MAP[language];
    if (!lang) {
      return NextResponse.json(
        { error: `Unsupported language: ${language}` },
        { status: 400 },
      );
    }

    // Get data files for this graph
    const files = await db
      .select()
      .from(graphFiles)
      .where(eq(graphFiles.graphId, graphId));

    // Create temp directory
    tempDir = mkdtempSync(join(tmpdir(), "ke-exec-"));

    // Symlink data files into temp dir
    for (const f of files) {
      const absPath = getAbsolutePath(f.filePath);
      try {
        symlinkSync(absPath, join(tempDir, f.fileName));
      } catch {
        // skip if symlink fails (e.g. file doesn't exist)
      }
    }

    // Write script
    const scriptPath = join(tempDir, `script${lang.ext}`);
    writeFileSync(scriptPath, code);

    // Snapshot existing files before execution
    const filesBefore = new Set(readdirSync(tempDir));

    // Execute
    const result = await new Promise<{
      stdout: string;
      stderr: string;
      failed: boolean;
    }>((resolve) => {
      execFile(
        lang.cmd,
        [scriptPath],
        {
          cwd: tempDir!,
          timeout: 30_000,
          maxBuffer: 1_000_000,
          env: { ...process.env, MPLBACKEND: "Agg" },
        },
        (error, stdout, stderr) => {
          resolve({
            stdout: stdout ?? "",
            stderr: stderr ?? "",
            failed: !!error,
          });
        },
      );
    });

    // Detect new image files
    const filesAfter = readdirSync(tempDir);
    const images: string[] = [];
    for (const fname of filesAfter) {
      if (filesBefore.has(fname)) continue;
      const ext = fname.substring(fname.lastIndexOf(".")).toLowerCase();
      if (IMAGE_EXTS.has(ext)) {
        const imgBuf = readFileSync(join(tempDir, fname));
        const b64 = imgBuf.toString("base64");
        images.push(`data:${mimeForExt(ext)};base64,${b64}`);
      }
    }

    return NextResponse.json({
      output: result.stdout || "",
      error: result.failed
        ? result.stderr || "Process exited with an error"
        : undefined,
      images: images.length > 0 ? images : undefined,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Execution failed";
    return NextResponse.json({ output: "", error: message }, { status: 200 });
  } finally {
    if (tempDir) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  }
}
