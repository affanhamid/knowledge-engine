import { NextResponse } from "next/server";

import { saveFile, saveDataFile } from "~/server/services/file-storage";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const type = (formData.get("type") as string) ?? "sources";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (type === "data") {
    const graphId = formData.get("graphId") as string | null;
    if (!graphId) {
      return NextResponse.json({ error: "graphId required for data files" }, { status: 400 });
    }
    const { filePath } = saveDataFile(buffer, file.name, graphId);
    return NextResponse.json({
      filePath,
      fileName: file.name,
      mimeType: file.type,
      fileSizeBytes: buffer.length,
    });
  }

  const subDir = type === "audio" ? "audio" : type === "images" ? "images" : "sources";

  const { filePath, contentHash } = saveFile(buffer, file.name, subDir);

  return NextResponse.json({
    filePath,
    contentHash,
    fileName: file.name,
    mimeType: file.type,
    fileSizeBytes: buffer.length,
  });
}
