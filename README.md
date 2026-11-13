# Pixel AI — Personal Image Studio (Vercel + your own GPU)

A personal-use Next.js website deployed to Vercel. It sends image-generation jobs to ComfyUI running on your own Windows PC. No paid image API is used.

## Important architecture facts

- Vercel hosts the website and small API routes; it does **not** host the GPU model.
- Your PC must be on, ComfyUI must be running, and the secure tunnel must be running to generate.
- The free Vercel Hobby plan has usage and function-duration limits. This project polls the ComfyUI job through separate short requests rather than holding one long serverless request open.
- Your RTX 2050 4 GB will need modest settings. Start with 512x512 and 15–20 steps.
- This is not unlimited cloud compute. It removes per-image API charges; throughput is limited by your laptop, power, storage and service limits.

## A. Install ComfyUI on Windows

1. Install/update the NVIDIA driver.
2. Install ComfyUI using its official Windows NVIDIA installation instructions: https://docs.comfy.org/installation
3. Start ComfyUI and confirm it opens locally at `http://127.0.0.1:8188`.
4. Download a Stable Diffusion 1.5 checkpoint from a reputable source with a license suitable for your intended use. Model page: https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5
5. Put the `.safetensors` file in `ComfyUI/models/checkpoints/`.
6. Set the `CHECKPOINT` environment variable in Vercel to the exact filename, including `.safetensors`.
7. Restart ComfyUI after adding the model.

Do not assume a downloaded file has the default filename. Use its real filename in Vercel.

## B. Securely connect your PC to Vercel

Do not expose ComfyUI port 8188 directly to the public internet. ComfyUI's API is not intended to be publicly exposed without an authentication layer.

Use a Cloudflare Tunnel and Cloudflare Access service token:

1. Have a domain managed by Cloudflare (a domain is generally paid; Cloudflare Tunnel itself has a free option).
2. Install `cloudflared` on your Windows PC: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
3. In Cloudflare Zero Trust, create a Tunnel and install/run its Windows connector using the instructions Cloudflare provides.
4. Add a Published Application route:
   - Hostname: e.g. `comfy.yourdomain.com`
   - Service type: HTTP
   - Service URL: `http://127.0.0.1:8188`
5. In Cloudflare Access, create an application protecting that hostname. Configure a Service Auth policy for a Service Token.
6. Create a Service Token and copy its Client ID and Client Secret.
7. Keep the tunnel process running on your PC.

Cloudflare documentation:
- Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
- Access service tokens: https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/

The Cloudflare Access application must accept service-token authentication. Do not create a public bypass policy.

## C. Upload to GitHub

1. Create a private GitHub repository named `personal-ai-studio`.
2. Upload all project files and folders from this ZIP.
3. Do not upload `.env.local`, passwords, Cloudflare secrets, generated images, or model weights.

## D. Deploy to Vercel

1. Sign in at https://vercel.com/ and import your private GitHub repository.
2. Framework preset: Next.js.
3. Add these Environment Variables under Project → Settings → Environment Variables:

| Name | Value |
|---|---|
| `COMFY_URL` | `https://comfy.yourdomain.com` (your protected tunnel hostname) |
| `CHECKPOINT` | exact checkpoint filename |
| `STUDIO_PASSWORD` | a long, unique random password |
| `CF_ACCESS_CLIENT_ID` | Cloudflare Service Token Client ID |
| `CF_ACCESS_CLIENT_SECRET` | Cloudflare Service Token Client Secret |

4. Redeploy after adding variables.
5. Open the Vercel website, enter your `STUDIO_PASSWORD`, write a prompt, and generate.

## E. Local development

Install Node.js 20 or later. In the project folder:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Create `.env.local` using `.env.example` and fill in the values. For local development, `COMFY_URL=http://127.0.0.1:8188` works and Cloudflare Access variables can be left blank.

## Troubleshooting

- **401 Incorrect password:** Confirm `STUDIO_PASSWORD` in Vercel matches the password typed in the website, then redeploy.
- **Tunnel 403 / Access denied:** Confirm the Access application protects the correct hostname and allows Service Auth; verify both token values.
- **ComfyUI connection error:** Check ComfyUI and `cloudflared` are running; verify `COMFY_URL`.
- **Checkpoint not found:** Match the `CHECKPOINT` variable exactly to the file in `models/checkpoints`.
- **CUDA out of memory:** Close GPU-heavy apps, use 512x512, reduce steps, and follow ComfyUI's low-VRAM guidance.
- **Image takes too long:** Keep the browser tab open. The UI polls for up to six minutes; the underlying ComfyUI job may continue after that.
- **Vercel deployment fails:** Check the deployment build log and use Node.js 20 or later.

## Privacy and security

This is intended for personal use, not public multi-user access. Keep the GitHub repository private, use a strong password, keep Cloudflare Access enabled, and never publish your Cloudflare service token. The studio password is checked by the API routes. Do not expose the ComfyUI server directly to the internet.
