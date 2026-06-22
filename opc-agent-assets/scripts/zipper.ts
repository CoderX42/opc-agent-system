import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import JSZip from "jszip";
import { ensureDir } from "./fs-utils.js";

const ignored = new Set(["node_modules", "dist", ".env"]);

export async function zipAssetPack(rootDir: string, zipPath: string): Promise<void> {
  const zip = new JSZip();
  await addDir(zip, rootDir, rootDir);
  await ensureDir(dirname(zipPath));
  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: {
      level: 9
    }
  });
  await writeFile(zipPath, buffer);
}

async function addDir(zip: JSZip, rootDir: string, currentDir: string): Promise<void> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignored.has(entry.name)) {
      continue;
    }

    const fullPath = join(currentDir, entry.name);
    const zipName = relative(rootDir, fullPath);
    if (!zipName || zipName.endsWith(".zip")) {
      continue;
    }

    if (entry.isDirectory()) {
      await addDir(zip, rootDir, fullPath);
    } else {
      zip.file(zipName, await readFile(fullPath));
    }
  }
}
