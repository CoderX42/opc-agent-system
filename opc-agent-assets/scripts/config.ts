import type { AsepriteExportConfig, AssetPlan, ProviderName } from "./types.js";

const characterSheet = {
  frameWidth: 128,
  frameHeight: 128,
  cols: 8,
  rows: 1,
  margin: 0,
  spacing: 0,
  scale: 1
};

export const assetPlans: AssetPlan[] = [
  {
    id: "agent-finance",
    category: "characters",
    kind: "character",
    promptTemplate: "character",
    providerHint: "openai",
    sheet: characterSheet,
    tags: ["idle"],
    variables: {
      character: "Finance Agent",
      frames: 8,
      animation: "Idle",
      appearance: "- business suit\n- glasses\n- calculator\n- ledger book\n- gold coins",
      colorTheme: "- teal\n- emerald\n- gold"
    },
    palette: ["#16292a", "#1d5b53", "#14a37f", "#5fe0bd", "#f2bd45", "#ffd76a", "#f0c39c", "#f8fbef"]
  },
  {
    id: "agent-customer-service",
    category: "characters",
    kind: "character",
    promptTemplate: "character",
    providerHint: "flux",
    sheet: characterSheet,
    tags: ["idle"],
    variables: {
      character: "Customer Service Agent",
      frames: 8,
      animation: "Idle",
      appearance: "- headset\n- chat bubbles\n- tablet\n- friendly smile",
      colorTheme: "- blue\n- cyan"
    },
    palette: ["#122540", "#1b5b8f", "#258ce0", "#60d9f7", "#b7f4ff", "#f0bf91", "#46536b", "#f7fcff"]
  },
  {
    id: "agent-legal",
    category: "characters",
    kind: "character",
    promptTemplate: "character",
    providerHint: "sdxl",
    sheet: characterSheet,
    tags: ["idle"],
    variables: {
      character: "Legal Agent",
      frames: 8,
      animation: "Idle",
      appearance: "- suit\n- contract\n- law book\n- scale of justice",
      colorTheme: "- purple\n- navy"
    },
    palette: ["#151a36", "#232e5f", "#4d3b8f", "#8b69d9", "#c7b5ff", "#f2c097", "#48506a", "#f8f3ff"]
  },
  {
    id: "agent-administrative",
    category: "characters",
    kind: "character",
    promptTemplate: "character",
    providerHint: "openai",
    sheet: characterSheet,
    tags: ["idle"],
    variables: {
      character: "Administrative Agent",
      frames: 8,
      animation: "Idle",
      appearance: "- notebook\n- calendar\n- task board\n- coffee cup",
      colorTheme: "- orange\n- yellow"
    },
    palette: ["#2f2416", "#8a4e21", "#e97824", "#ffc247", "#ffe38a", "#f0bf91", "#5f5b63", "#fff8df"]
  },
  {
    id: "office-room-tiles",
    category: "rooms",
    kind: "room",
    promptTemplate: "room",
    providerHint: "openai",
    sheet: {
      frameWidth: 32,
      frameHeight: 32,
      cols: 8,
      rows: 4,
      margin: 0,
      spacing: 0,
      scale: 1
    },
    tags: ["floor", "wall", "partition", "dashboard"],
    variables: {
      theme: "warm modular AI office with dashboard walls and tidy team spaces"
    },
    palette: ["#17202a", "#2d3a45", "#506172", "#7aa2a3", "#b7d6c4", "#e8d7a5", "#f4efe1", "#d09061"]
  },
  {
    id: "office-furniture-pack",
    category: "furniture",
    kind: "furniture",
    promptTemplate: "furniture",
    providerHint: "flux",
    sheet: {
      frameWidth: 32,
      frameHeight: 32,
      cols: 8,
      rows: 3,
      margin: 0,
      spacing: 0,
      scale: 1
    },
    tags: ["desk", "chair", "monitor", "prop"],
    variables: {
      theme: "small cozy digital employee office furniture"
    },
    palette: ["#1c2630", "#33424f", "#637487", "#d1895a", "#eac28b", "#6cc7b6", "#95d66f", "#f8f0d7"]
  },
  {
    id: "opc-ui-icons",
    category: "ui",
    kind: "ui",
    promptTemplate: "ui",
    providerHint: "sdxl",
    sheet: {
      frameWidth: 16,
      frameHeight: 16,
      cols: 8,
      rows: 2,
      margin: 0,
      spacing: 0,
      scale: 1
    },
    tags: ["module", "action"],
    variables: {
      theme: "compact software dashboard pixel UI"
    },
    palette: ["#172033", "#2f4562", "#5ca9ff", "#77d8b0", "#ffd36f", "#ff7878", "#f8fbff", "#78849a"]
  },
  {
    id: "agent-status-effects",
    category: "effects",
    kind: "effects",
    promptTemplate: "effects",
    providerHint: "openai",
    sheet: {
      frameWidth: 32,
      frameHeight: 32,
      cols: 6,
      rows: 2,
      margin: 0,
      spacing: 0,
      scale: 1
    },
    tags: ["thinking", "typing", "sync", "success"],
    variables: {
      theme: "tiny productivity magic and software automation effects"
    },
    palette: ["#152238", "#2f4d6a", "#58c9f5", "#84f3c3", "#fff07a", "#ff9b75", "#ffffff", "#7d8aa1"]
  }
];

export const asepriteConfig: AsepriteExportConfig = {
  enabled: true,
  binary: process.env.ASEPRITE_BIN || "aseprite",
  textureFormat: "png",
  dataFormat: "json-array",
  sheetType: "rows",
  extrude: 0,
  borderPadding: 0,
  shapePadding: 0,
  commands: []
};

export function readProviderMode(): ProviderName {
  const value = (process.env.ASSET_PROVIDER || "auto").toLowerCase();
  if (value === "local" || value === "openai" || value === "flux" || value === "sdxl" || value === "auto") {
    return value;
  }
  return "auto";
}
