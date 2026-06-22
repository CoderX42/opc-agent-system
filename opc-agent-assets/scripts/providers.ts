import OpenAI from "openai";
import type { ImageProvider, ProviderName, ProviderRequest } from "./types.js";

function remoteGenerationEnabled(): boolean {
  return process.env.ENABLE_REMOTE_GENERATION === "true";
}

async function bufferFromResponseData(data: unknown): Promise<Buffer> {
  const firstImageWith = (key: "b64_json" | "base64" | "url"): string | undefined => {
    const images = (data as { images?: Array<{ url?: string; b64_json?: string; base64?: string } | string> }).images || [];
    for (const image of images) {
      if (typeof image === "string") {
        if (key === "url") {
          return image;
        }
        continue;
      }
      const value = image[key];
      if (value) {
        return value;
      }
    }
    return undefined;
  };

  const candidate = data as {
    b64_json?: string;
    base64?: string;
    image?: string;
    url?: string;
    output?: string | string[];
    images?: Array<{ url?: string; b64_json?: string; base64?: string } | string>;
    data?: Array<{ url?: string; b64_json?: string; base64?: string }>;
    artifacts?: Array<{ base64?: string }>;
  };

  const base64 =
    candidate.b64_json ||
    candidate.base64 ||
    candidate.image ||
    candidate.data?.[0]?.b64_json ||
    candidate.data?.[0]?.base64 ||
    firstImageWith("b64_json") ||
    firstImageWith("base64") ||
    candidate.artifacts?.[0]?.base64 ||
    (Array.isArray(candidate.output) ? candidate.output[0] : candidate.output);

  if (base64 && base64.startsWith("data:image")) {
    return Buffer.from(base64.split(",")[1] ?? "", "base64");
  }

  if (base64 && /^[a-zA-Z0-9+/=]+$/.test(base64.slice(0, 120))) {
    return Buffer.from(base64, "base64");
  }

  const url =
    candidate.url ||
    candidate.data?.[0]?.url ||
    firstImageWith("url");

  if (typeof url === "string" && url.length > 0) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Could not download generated image: ${response.status} ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  throw new Error("Provider response did not contain image data.");
}

async function postJson(url: string, apiKey: string, body: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Provider request failed: ${response.status} ${response.statusText} ${text}`);
  }

  return response.json();
}

export class OpenAIImageProvider implements ImageProvider {
  readonly name: ProviderName = "openai";

  isAvailable(): boolean {
    return remoteGenerationEnabled() && Boolean(process.env.OPENAI_API_KEY);
  }

  async generate(request: ProviderRequest): Promise<Buffer> {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
      prompt: `${request.prompt}\n\nNegative prompt:\n${request.negativePrompt}`,
      size: process.env.OPENAI_IMAGE_SIZE || "1024x1024",
      quality: process.env.OPENAI_IMAGE_QUALITY || "medium",
      n: 1
    } as never);
    return bufferFromResponseData(response);
  }
}

export class FluxProvider implements ImageProvider {
  readonly name: ProviderName = "flux";

  isAvailable(): boolean {
    return remoteGenerationEnabled() && Boolean(process.env.FLUX_API_KEY && process.env.FLUX_API_URL);
  }

  async generate(request: ProviderRequest): Promise<Buffer> {
    const apiKey = process.env.FLUX_API_KEY || "";
    const result = await postJson(process.env.FLUX_API_URL || "", apiKey, {
      prompt: request.prompt,
      negative_prompt: request.negativePrompt,
      width: request.width,
      height: request.height,
      output_format: "png"
    });

    const resultId = (result as { id?: string; request_id?: string }).id || (result as { request_id?: string }).request_id;
    const resultUrl = process.env.FLUX_RESULT_URL;
    if (resultId && resultUrl) {
      const url = resultUrl.replace("{id}", resultId);
      for (let attempt = 0; attempt < 20; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${apiKey}`
          }
        });
        if (!response.ok) {
          continue;
        }
        const job = await response.json();
        const status = String((job as { status?: string }).status || "").toLowerCase();
        if (status === "ready" || status === "succeeded" || status === "completed") {
          return bufferFromResponseData(job);
        }
      }
      throw new Error(`Flux job ${resultId} did not complete before timeout.`);
    }

    return bufferFromResponseData(result);
  }
}

export class SdxlProvider implements ImageProvider {
  readonly name: ProviderName = "sdxl";

  isAvailable(): boolean {
    return remoteGenerationEnabled() && Boolean(process.env.SDXL_API_KEY && process.env.SDXL_API_URL);
  }

  async generate(request: ProviderRequest): Promise<Buffer> {
    const result = await postJson(process.env.SDXL_API_URL || "", process.env.SDXL_API_KEY || "", {
      text_prompts: [
        { text: request.prompt, weight: 1 },
        { text: request.negativePrompt, weight: -1 }
      ],
      cfg_scale: 7,
      height: Math.max(512, Math.min(1024, request.height)),
      width: Math.max(512, Math.min(1024, request.width)),
      samples: 1,
      steps: 32
    });
    return bufferFromResponseData(result);
  }
}

export function buildRemoteProviders(): ImageProvider[] {
  return [new OpenAIImageProvider(), new FluxProvider(), new SdxlProvider()];
}
