import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AssetPlan } from "./types.js";
import { ensureDir } from "./fs-utils.js";

export class PromptManager {
  constructor(private readonly promptDir: string) {}

  async render(plan: AssetPlan): Promise<{ prompt: string; negativePrompt: string }> {
    const [baseStyle, template, negativePrompt] = await Promise.all([
      this.readTemplate("base-style"),
      this.readTemplate(plan.promptTemplate),
      this.readTemplate("negative")
    ]);

    const variables = {
      ...plan.variables,
      cols: plan.sheet.cols,
      rows: plan.sheet.rows,
      frameWidth: plan.sheet.frameWidth,
      frameHeight: plan.sheet.frameHeight,
      palette: plan.palette.join(", ")
    };

    return {
      prompt: `${this.interpolate(baseStyle, variables)}\n\n${this.interpolate(template, variables)}\n\nPalette: ${plan.palette.join(", ")}.`,
      negativePrompt
    };
  }

  async writeResolvedPrompt(path: string, plan: AssetPlan, prompt: string, negativePrompt: string): Promise<void> {
    await ensureDir(dirname(path));
    const body = [
      `# ${plan.id}`,
      "",
      "## Positive Prompt",
      "",
      prompt,
      "",
      "## Negative Prompt",
      "",
      negativePrompt
    ].join("\n");
    await writeFile(path, `${body}\n`, "utf8");
  }

  private async readTemplate(name: string): Promise<string> {
    return readFile(join(this.promptDir, `${name}.md`), "utf8");
  }

  private interpolate(template: string, variables: Record<string, string | number>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(variables[key] ?? ""));
  }
}
