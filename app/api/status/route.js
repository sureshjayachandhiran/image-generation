import { NextResponse } from "next/server";
import { authorized, comfyRequest } from "@/lib/comfy";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    if (!authorized(request)) {
      return NextResponse.json({ error: "Incorrect studio password." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id || !/^[a-f0-9-]{20,60}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid generation ID." }, { status: 400 });
    }

    const response = await comfyRequest(`/history/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Could not read ComfyUI job status." }, { status: 502 });
    }

    const history = await response.json();
    const job = history[id];
    if (!job) return NextResponse.json({ status: "queued" });

    if (job.status?.status_str === "error") {
      return NextResponse.json({ status: "failed", error: "ComfyUI reported a generation error." });
    }

    const imageInfo = Object.values(job.outputs || {})
      .flatMap(output => output.images || [])[0];

    if (!imageInfo) {
      return NextResponse.json({ status: "running" });
    }

    const params = new URLSearchParams({
      filename: imageInfo.filename,
      subfolder: imageInfo.subfolder || "",
      type: imageInfo.type || "output"
    });

    const imageResponse = await comfyRequest(`/view?${params.toString()}`, {
      signal: AbortSignal.timeout(20000)
    });
    if (!imageResponse.ok) {
      return NextResponse.json({ error: "Image was generated but could not be downloaded." }, { status: 502 });
    }

    const contentType = imageResponse.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "ComfyUI returned an unexpected image format." }, { status: 502 });
    }

    const bytes = Buffer.from(await imageResponse.arrayBuffer());
    if (bytes.length > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Generated image exceeds the 8 MB response limit. Use a smaller image size." }, { status: 413 });
    }

    return NextResponse.json({
      status: "completed",
      image: bytes.toString("base64"),
      mime: contentType
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Status request failed." }, { status: 500 });
  }
}
