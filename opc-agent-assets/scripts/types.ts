export type AssetCategory = "characters" | "rooms" | "furniture" | "ui" | "effects";

export type ProviderName = "auto" | "local" | "openai" | "flux" | "sdxl";

export type SheetKind = "character" | "room" | "furniture" | "ui" | "effects";

export interface SpriteSheetConfig {
  frameWidth: number;
  frameHeight: number;
  cols: number;
  rows: number;
  margin: number;
  spacing: number;
  scale: number;
}

export interface AsepriteExportConfig {
  enabled: boolean;
  binary: string;
  textureFormat: "png";
  dataFormat: "json-array" | "json-hash";
  sheetType: "packed" | "rows" | "columns";
  extrude: number;
  borderPadding: number;
  shapePadding: number;
  commands: string[];
}

export interface AssetPlan {
  id: string;
  category: AssetCategory;
  kind: SheetKind;
  promptTemplate: string;
  providerHint: ProviderName;
  sheet: SpriteSheetConfig;
  tags: string[];
  variables: Record<string, string | number>;
  palette: string[];
}

export interface GeneratedAsset {
  id: string;
  category: AssetCategory;
  kind: SheetKind;
  provider: ProviderName;
  sheetPath: string;
  framesDir: string;
  metadataPath: string;
  promptPath: string;
  frameCount: number;
}

export interface ProviderRequest {
  plan: AssetPlan;
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
}

export interface ImageProvider {
  name: ProviderName;
  isAvailable(): boolean;
  generate(request: ProviderRequest): Promise<Buffer>;
}

export interface FrameMetadata {
  filename: string;
  frame: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  tags: string[];
}

export interface AssetMetadata {
  id: string;
  category: AssetCategory;
  kind: SheetKind;
  sheet: SpriteSheetConfig;
  source: string;
  frames: FrameMetadata[];
}
