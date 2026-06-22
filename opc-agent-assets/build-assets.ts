import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assetPlans, readProviderMode } from "./scripts/config.js";
import { ensureDir, writeJson } from "./scripts/fs-utils.js";
import { PromptManager } from "./scripts/prompts.js";
import { buildRemoteProviders } from "./scripts/providers.js";
import { LocalPixelProvider } from "./scripts/pixel-renderer.js";
import { normalizePngDimensions } from "./scripts/image-normalize.js";
import { sliceSheet } from "./scripts/slicer.js";
import { writeAsepriteExportPlan } from "./scripts/aseprite.js";
import { zipAssetPack } from "./scripts/zipper.js";
import type { GeneratedAsset, ImageProvider, ProviderName } from "./scripts/types.js";

const rootDir = dirname(fileURLToPath(import.meta.url));
const promptDir = join(rootDir, "prompts");
const generatedDir = join(rootDir, "generated");

async function main(): Promise<void> {
  const promptManager = new PromptManager(promptDir);
  const localProvider = new LocalPixelProvider();
  const remoteProviders = buildRemoteProviders();
  const mode = readProviderMode();
  const generatedAssets: GeneratedAsset[] = [];

  await createDirectoryStructure();
  console.log(`OPC Agent asset generator started. Provider mode: ${mode}`);

  for (const plan of assetPlans) {
    const { prompt, negativePrompt } = await promptManager.render(plan);
    const resolvedPromptPath = join(generatedDir, "prompts", `${plan.id}.md`);
    await promptManager.writeResolvedPrompt(resolvedPromptPath, plan, prompt, negativePrompt);

    const width = plan.sheet.frameWidth * plan.sheet.cols;
    const height = plan.sheet.frameHeight * plan.sheet.rows;
    const provider = chooseProvider(mode, plan.providerHint, remoteProviders, localProvider);

    console.log(`Generating ${plan.id} with ${provider.name}...`);
    const generated = await safeGenerate(provider, localProvider, {
      plan,
      prompt,
      negativePrompt,
      width,
      height
    });
    const sheetBuffer = normalizePngDimensions(generated.buffer, width, height);

    const sheetPath = join(rootDir, plan.category, `${plan.id}.png`);
    await ensureDir(dirname(sheetPath));
    await writeFile(sheetPath, sheetBuffer);

    const rawPath = join(generatedDir, "raw", `${plan.id}.${generated.provider}.png`);
    await ensureDir(dirname(rawPath));
    await writeFile(rawPath, sheetBuffer);

    const framesDir = join(rootDir, plan.category, `${plan.id}-frames`);
    const metadataPath = join(generatedDir, "metadata", `${plan.id}.json`);
    const metadata = await sliceSheet(plan, sheetBuffer, framesDir, metadataPath);

    generatedAssets.push({
      id: plan.id,
      category: plan.category,
      kind: plan.kind,
      provider: generated.provider,
      sheetPath,
      framesDir,
      metadataPath,
      promptPath: resolvedPromptPath,
      frameCount: metadata.frames.length
    });
  }

  const asepritePlanPath = await writeAsepriteExportPlan(rootDir, assetPlans);
  const manifestPath = join(generatedDir, "manifest.json");
  await writeJson(manifestPath, {
    name: "OPC Agent Pixel Asset Pack",
    generatedAt: new Date().toISOString(),
    styleReferences: ["Stardew Valley", "Terraria", "ClawLibrary", "Habbo Hotel", "RPG Maker"],
    assetCount: generatedAssets.length,
    assets: generatedAssets,
    asepritePlanPath
  });

  const zipPath = join(generatedDir, "opc-agent-pixel-assets.zip");
  await zipAssetPack(rootDir, zipPath);

  console.log(`Done. Manifest: ${manifestPath}`);
  console.log(`ZIP: ${zipPath}`);
}

async function createDirectoryStructure(): Promise<void> {
  await Promise.all([
    ensureDir(join(rootDir, "characters")),
    ensureDir(join(rootDir, "rooms")),
    ensureDir(join(rootDir, "furniture")),
    ensureDir(join(rootDir, "ui")),
    ensureDir(join(rootDir, "effects")),
    ensureDir(join(rootDir, "prompts")),
    ensureDir(join(rootDir, "generated")),
    ensureDir(join(rootDir, "generated", "raw")),
    ensureDir(join(rootDir, "generated", "metadata")),
    ensureDir(join(rootDir, "generated", "prompts")),
    ensureDir(join(rootDir, "generated", "aseprite")),
    ensureDir(join(rootDir, "scripts"))
  ]);
}

function chooseProvider(
  mode: ProviderName,
  providerHint: ProviderName,
  remoteProviders: ImageProvider[],
  localProvider: ImageProvider
): ImageProvider {
  if (mode === "local") {
    return localProvider;
  }

  const byName = new Map(remoteProviders.map((provider) => [provider.name, provider]));
  if (mode !== "auto") {
    return byName.get(mode)?.isAvailable() ? byName.get(mode)! : localProvider;
  }

  const hinted = byName.get(providerHint);
  if (hinted?.isAvailable()) {
    return hinted;
  }

  return remoteProviders.find((provider) => provider.isAvailable()) || localProvider;
}

async function safeGenerate(
  provider: ImageProvider,
  fallbackProvider: ImageProvider,
  request: Parameters<ImageProvider["generate"]>[0]
): Promise<{ buffer: Buffer; provider: ProviderName }> {
  try {
    return {
      buffer: await provider.generate(request),
      provider: provider.name
    };
  } catch (error) {
    if (provider.name === fallbackProvider.name) {
      throw error;
    }
    console.warn(`Provider ${provider.name} failed, falling back to local renderer.`);
    console.warn(error instanceof Error ? error.message : error);
    return {
      buffer: await fallbackProvider.generate(request),
      provider: fallbackProvider.name
    };
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
