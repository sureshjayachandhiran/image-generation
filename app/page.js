"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles, Download, LoaderCircle, Image as ImageIcon,
  ShieldCheck, WandSparkles, RotateCcw
} from "lucide-react";

export default function Home() {
  const [password, setPassword] = useState("");
  const [prompt, setPrompt] = useState("");
  const [negative, setNegative] = useState("blurry, low quality, watermark, distorted, text artifacts");
  const [size, setSize] = useState("512x512");
  const [steps, setSteps] = useState(20);
  const [status, setStatus] = useState("Ready when you are");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [seed, setSeed] = useState(null);
  const pollRef = useRef(false);

  useEffect(() => () => { pollRef.current = false; }, []);

  async function generate() {
    if (!password.trim()) return setError("Enter your studio password.");
    if (!prompt.trim()) return setError("Describe the image you want to create.");
    setLoading(true); setError(""); setImage(""); setSeed(null);
    pollRef.current = true;
    setStatus("Sending prompt to your private AI engine…");

    try {
      const headers = {
        "Content-Type": "application/json",
        "x-studio-password": password
      };
      const start = await fetch("/api/generate", {
        method: "POST", headers,
        body: JSON.stringify({ prompt, negative, size, steps })
      });
      const startData = await start.json();
      if (!start.ok) throw new Error(startData.error || "Could not start generation.");

      const id = startData.prompt_id;
      setSeed(startData.seed);
      setStatus("Generating on your laptop…");

      // Each poll is a separate short request, avoiding a long-running Vercel function.
      for (let i = 0; i < 180 && pollRef.current; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const res = await fetch(`/api/status?id=${encodeURIComponent(id)}`, {
          headers: { "x-studio-password": password },
          cache: "no-store"
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Status check failed.");
        if (data.status === "completed") {
          setImage(`data:image/png;base64,${data.image}`);
          setStatus("Image generated successfully.");
          return;
        }
        if (data.status === "failed") throw new Error(data.error || "ComfyUI generation failed.");
        setStatus(data.status === "queued" ? "Waiting in ComfyUI queue…" : "Generating on your laptop…");
      }
      if (pollRef.current) throw new Error("Timed out waiting for the image. Check ComfyUI and try again.");
    } catch (e) {
      setError(e.message || "Something went wrong.");
      setStatus("Generation stopped.");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image;
    a.download = `pixel-ai-${seed ?? "image"}.png`;
    a.click();
  }

  function stop() {
    pollRef.current = false;
    setLoading(false);
    setStatus("Stopped waiting. The ComfyUI job may continue on your laptop.");
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brandIcon"><Sparkles size={21}/></span>
          <span><b>PIXEL AI</b><small>PERSONAL IMAGE STUDIO</small></span>
        </a>
        <span className="private"><ShieldCheck size={15}/> PRIVATE WORKSPACE</span>
      </header>

      <section className="intro">
        <div className="eyebrow"><WandSparkles size={14}/> YOUR OWN CREATIVE ENGINE</div>
        <h1>Imagine it.<br/><span>Create it.</span></h1>
        <p>Generate visuals using your own AI model and GPU. No paid image API.</p>
      </section>

      <section className="workspace">
        <div className="panel controls">
          <div className="sectionTitle">CREATE AN IMAGE <span>01 / PROMPT</span></div>
          <label>STUDIO PASSWORD</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your private password" autoComplete="current-password"/>
          <label>IMAGE PROMPT</label>
          <textarea className="prompt" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="A premium editorial poster about India's AI revolution, cinematic lighting, sophisticated composition, deep blue and gold palette…"/>
          <label>NEGATIVE PROMPT</label>
          <textarea className="negative" value={negative} onChange={e=>setNegative(e.target.value)}/>
          <div className="settings">
            <div>
              <label>ASPECT RATIO</label>
              <select value={size} onChange={e=>setSize(e.target.value)}>
                <option value="512x512">Square · 1:1</option>
                <option value="512x768">Portrait · 2:3</option>
                <option value="768x512">Landscape · 3:2</option>
              </select>
            </div>
            <div>
              <label>STEPS · {steps}</label>
              <input type="range" min="10" max="30" step="1" value={steps} onChange={e=>setSteps(Number(e.target.value))}/>
            </div>
          </div>
          <button className="generate" onClick={generate} disabled={loading}>
            {loading ? <><LoaderCircle className="spin"/> GENERATING…</> : <><Sparkles size={17}/> GENERATE IMAGE</>}
          </button>
          {loading && <button className="stop" onClick={stop}>Stop waiting</button>}
          {error && <div className="error">{error}</div>}
          <div className="hint">Generation runs on your own computer. Keep ComfyUI and its tunnel running.</div>
        </div>

        <div className="panel output">
          <div className="outputHead"><div className="sectionTitle">YOUR CREATION <span>02 / OUTPUT</span></div>
            {image && <button className="download" onClick={download}><Download size={15}/> DOWNLOAD PNG</button>}
          </div>
          <div className="canvas">
            {image ? <img src={image} alt="Your generated artwork"/> :
              <div className="empty">
                {loading ? <LoaderCircle className="spin large"/> : <ImageIcon size={48}/>}
                <h3>{loading ? "Creating your image" : "Your canvas awaits"}</h3>
                <p>{loading ? status : "Your generated image will appear here."}</p>
              </div>}
          </div>
          <div className="statusLine"><span className={loading ? "pulse" : "statusDot"}/>{status}{seed !== null && <span className="seed">SEED {seed}</span>}</div>
          {image && <button className="again" onClick={generate}><RotateCcw size={15}/> GENERATE ANOTHER</button>}
        </div>
      </section>
      <footer>PIXEL AI STUDIO <span>·</span> PRIVATE · SELF-HOSTED GENERATION</footer>
    </main>
  );
}
