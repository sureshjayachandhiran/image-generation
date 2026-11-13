export function comfyConfig() {
  const base = process.env.COMFY_URL;
  if (!base) throw new Error("COMFY_URL is not configured in Vercel.");
  return {
    base: base.replace(/\/$/, ""),
    headers: {
      "Content-Type": "application/json",
      ...(process.env.CF_ACCESS_CLIENT_ID ? {
        "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID
      } : {}),
      ...(process.env.CF_ACCESS_CLIENT_SECRET ? {
        "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET
      } : {})
    }
  };
}

export function authorized(request) {
  const secret = process.env.STUDIO_PASSWORD;
  const supplied = request.headers.get("x-studio-password");
  return Boolean(secret && supplied && supplied === secret);
}

export async function comfyRequest(path, options = {}) {
  const { base, headers } = comfyConfig();
  return fetch(`${base}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
    cache: "no-store"
  });
}
