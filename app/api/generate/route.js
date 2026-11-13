import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { authorized, comfyRequest } from "@/lib/comfy";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    if (!authorized(request)) {
      return NextResponse.json({ error: "Incorrect studio password." }, { status: 401 });
    }

    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const negative = typeof body.negative === "string" ? body.negative.slice(0, 2000) : "";
    const size = body.size;
    const steps = Math.max(10, Math.min(30, Number(body.steps) || 20));
    const allowed = ["512x512", "512x768", "768x512"];

    if (!prompt || prompt.length > 4000) {
      return NextResponse.json({ error: "Prompt must be between 1 and 4000 characters." }, { status: 400 });
    }
    if (!allowed.includes(size)) {
      return NextResponse.json({ error: "Choose a supported image size." }, { status: 400 });
    }

    const [width, height] = size.split("x").map(Number);
    const seed = Math.floor(Math.random() * 2147483647);
    const checkpoint = process.env.CHECKPOINT || "v1-5-pruned-emaonly.safetensors";

    const workflow = {
      "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: checkpoint } },
      "2": { class_type: "CLIPTextEncode", inputs: { text: prompt, clip: ["1", 1] } },
      "3": { class_type: "CLIPTextEncode", inputs: { text: negative || "blurry, low quality, watermark", clip: ["1", 1] } },
      "4": { class_type: "EmptyLatentImage", inputs: { width, height, batch_size: 1 } },
      "5": { class_type: "KSampler", inputs: {
        seed, steps, cfg: 7, sampler_name: "euler", scheduler: "normal",
        denoise: 1, model: ["1", 0], positive: ["2", 0],
        negative: ["3", 0], latent_image: ["4", 0]
      }},
      "6": { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["1", 2] } },
      "7": { class_type: "SaveImage", inputs: { filename_prefix: "PixelAI", images: ["6", 0] } }
    };

    const response = await comfyRequest("/prompt", {
      method: "POST",
      body: JSON.stringify({ prompt: workflow, client_id: randomUUID() }),
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json({ error: `ComfyUI error: ${detail.slice(0, 500)}` }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json({ prompt_id: data.prompt_id, seed });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Could not contact ComfyUI." }, { status: 500 });
  }
}
