import { mkdir, writeFile as fsWriteFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function ensureUploadDir(subdir: string) {
  const dir = path.join(UPLOAD_DIR, subdir);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function writeFile(
  buffer: Buffer,
  originalName: string,
  subdir: "audio" | "video" | "resume"
): Promise<string> {
  const dir = await ensureUploadDir(subdir);
  const ext = path.extname(originalName) || "";
  const filename = `${uuidv4()}${ext}`;
  const fullPath = path.join(dir, filename);
  await fsWriteFile(fullPath, buffer);
  return path.join("uploads", subdir, filename).replace(/\\/g, "/");
}

export async function writeFormFile(
  file: File,
  subdir: "audio" | "video" | "resume"
): Promise<{ filePath: string; size: number }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = await writeFile(buffer, file.name, subdir);
  return { filePath, size: buffer.length };
}
