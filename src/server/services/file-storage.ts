import { createHash } from "crypto";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import { extname, join } from "path";

const UPLOADS_DIR = join(process.cwd(), "uploads");

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function computeHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function saveFile(
  buffer: Buffer,
  originalName: string,
  subDir: "audio" | "sources" | "images",
): { filePath: string; contentHash: string } {
  const hash = computeHash(buffer);
  const ext = extname(originalName);
  const fileName = `${hash}${ext}`;
  const dir = join(UPLOADS_DIR, subDir);
  ensureDir(dir);

  const filePath = join(dir, fileName);
  if (!existsSync(filePath)) {
    writeFileSync(filePath, buffer);
  }

  return { filePath: join("uploads", subDir, fileName), contentHash: hash };
}

export function getAbsolutePath(relativePath: string): string {
  return join(process.cwd(), relativePath);
}

export function saveDataFile(
  buffer: Buffer,
  originalName: string,
  graphId: string,
): { filePath: string } {
  const sanitized = originalName.replace(/[/\\:*?"<>|]/g, "_");
  const dir = join(UPLOADS_DIR, "data", graphId);
  ensureDir(dir);

  const filePath = join(dir, sanitized);
  writeFileSync(filePath, buffer);

  return { filePath: join("uploads", "data", graphId, sanitized) };
}

export function deleteDataFile(relativePath: string): void {
  const abs = join(process.cwd(), relativePath);
  if (existsSync(abs)) {
    unlinkSync(abs);
  }
}
