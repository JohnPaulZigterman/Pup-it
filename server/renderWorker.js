import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const renderRoot = path.resolve(__dirname, "../renders");
const rendererVersion = "pup-it-headless-chromium-v1";

function safeSlug(value) {
  return (value || "pup-it-render")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72) || "pup-it-render";
}

function renderHtml() {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin: 0; width: 1280px; height: 720px; overflow: hidden; background: #ece7dc; }
      canvas { display: block; width: 1280px; height: 720px; }
    </style>
  </head>
  <body>
    <canvas id="stage" width="1280" height="720"></canvas>
    <script>
      const canvas = document.getElementById("stage");
      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;

      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }

      function drawGrain() {
        ctx.save();
        ctx.globalAlpha = 0.16;
        for (let i = 0; i < 180; i += 1) {
          const x = (i * 73) % W;
          const y = (i * 149) % H;
          ctx.fillStyle = i % 2 ? "#ffffff" : "#262936";
          ctx.fillRect(x, y, 1.5, 1.5);
        }
        ctx.restore();
      }

      function sceneColors(scene, backgroundTheme) {
        const themes = {
          "painted-depth": ["#f5f1e8", "#d9d1c3"],
          "late-night-copy": ["#ece7d9", "#8f91a2"],
          "broadcast-flat": ["#f4f7fb", "#d4e0ec"],
          "pattern-held": ["#fff2a8", "#8db7ff"],
          "vintage-wallpaper": ["#f8e6a0", "#c7a8ff"],
          "wood-panel": ["#c6925f", "#6e4631"],
          "stucco-wall": ["#e9dfcc", "#b7a994"],
          "abstract-gallery": ["#f26f5c", "#436b63"]
        };
        return themes[backgroundTheme] || ({ studio: ["#f5f1e8", "#d9d1c3"], street: ["#dfe8ef", "#b7c8c6"], space: ["#242335", "#0f1020"] }[scene] || ["#f5f1e8", "#d9d1c3"]);
      }

      function drawBackground(frame) {
        const [top, bottom] = sceneColors(frame.scene, frame.backgroundTheme);
        const gradient = ctx.createLinearGradient(0, 0, 0, H);
        gradient.addColorStop(0, top);
        gradient.addColorStop(1, bottom);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "rgba(38,41,54,0.1)";
        ctx.fillRect(0, H * 0.45, W, 3);
        ctx.fillStyle = "rgba(38,41,54,0.08)";
        ctx.beginPath();
        ctx.ellipse(W * 0.5, H * 0.78, W * 0.44, H * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        drawGrain();
      }

      function drawObjects(objects) {
        objects.forEach((object, index) => {
          if (object.hidden) return;
          const x = (object.x || 50) / 100 * W;
          const y = (object.y || 70) / 100 * H;
          const s = object.scale || 1;
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(object.flipped ? -s : s, s);
          ctx.fillStyle = "rgba(38,41,54,0.16)";
          ctx.beginPath();
          ctx.ellipse(0, 18, 58, 16, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = object.tint || "#f5f1e8";
          ctx.strokeStyle = "#262936";
          ctx.lineWidth = 3;
          const w = 80;
          const h = 58;
          if (object.shape === "circle" || object.shape === "oval") {
            ctx.beginPath();
            ctx.ellipse(0, -h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else if (object.shape === "triangle") {
            ctx.beginPath();
            ctx.moveTo(0, -h - 8);
            ctx.lineTo(w / 2, 0);
            ctx.lineTo(-w / 2, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.fillRect(-w / 2, -h, w, h);
            ctx.strokeRect(-w / 2, -h, w, h);
          }
          ctx.fillStyle = "rgba(255,255,255,0.32)";
          ctx.fillRect(-w / 2 + 8, -h + 8, w * 0.28, 6);
          ctx.restore();
        });
      }

      function performerStateAt(take, ms) {
        const byId = new Map();
        (take.performers || []).forEach((performer, index) => {
          byId.set(performer.id, {
            id: performer.id,
            name: performer.name,
            character: performer.character,
            state: {
              x: 34 + index * 18,
              y: 68,
              mouthOpen: 0,
              speaking: false,
              facing: 1,
              ...(performer.state || {}),
              characterDesign: performer.characterDesign || performer.state?.characterDesign || {},
              characterParts: performer.characterParts || performer.state?.characterParts || {}
            }
          });
        });
        const events = [...(take.tracks?.motion || [])].sort((a, b) => (a.at || 0) - (b.at || 0));
        for (const event of events) {
          if ((event.at || 0) > ms) break;
          if (event.type === "performer:update" && byId.has(event.performerId)) {
            const performer = byId.get(event.performerId);
            performer.state = { ...performer.state, ...(event.state || {}) };
          }
          if ((event.type === "performer:joined" || event.type === "performer:configured") && event.performer) {
            byId.set(event.performer.id, event.performer);
          }
          if (event.type === "performer:left") byId.delete(event.performerId);
        }
        return [...byId.values()];
      }

      function drawPart(ctx, part, fallbackX, fallbackY, fallbackW, fallbackH, fallbackColor) {
        if (!part || part.hidden) return;
        const scale = part.scale || 1;
        const rotate = (part.rotate || 0) * Math.PI / 180;
        ctx.save();
        ctx.translate(fallbackX, fallbackY);
        ctx.rotate(rotate);
        ctx.scale(scale, scale);
        ctx.fillStyle = part.tint || fallbackColor;
        ctx.strokeStyle = "#262936";
        ctx.lineWidth = 3;
        const shape = part.shape || "oval";
        if (shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(fallbackW, fallbackH) / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (shape === "triangle") {
          ctx.beginPath();
          ctx.moveTo(0, -fallbackH / 2);
          ctx.lineTo(fallbackW / 2, fallbackH / 2);
          ctx.lineTo(-fallbackW / 2, fallbackH / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.ellipse(0, 0, fallbackW / 2, fallbackH / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }

      function drawPuppet(performer, atMs) {
        const state = performer.state || {};
        const depth = clamp(((state.y || 68) - 42) / 46, 0, 1);
        const scale = (0.62 + depth * 0.68) * (state.scale || 1);
        const x = (state.x || 50) / 100 * W;
        const y = (state.y || 68) / 100 * H;
        const design = state.characterDesign || {};
        const parts = state.characterParts || {};
        const color = design.color || "#f5a66f";
        const accent = design.accent || "#262936";
        const mouthOpen = Math.max(state.mouthOpen || 0, state.speaking ? 0.2 : 0);
        const bounce = state.walking ? Math.sin(atMs / 110) * 3 : Math.sin(atMs / 420) * 1.2;

        ctx.save();
        ctx.translate(x, y + bounce);
        ctx.scale((state.facing || 1) < 0 ? -scale : scale, scale);

        ctx.fillStyle = "rgba(38,41,54,0.2)";
        ctx.beginPath();
        ctx.ellipse(0, 14, 54, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        drawPart(ctx, parts.leftLeg, -22, -28, 20, 58, color);
        drawPart(ctx, parts.rightLeg, 22, -28, 20, 58, color);
        drawPart(ctx, parts.leftArm, -54, -95, 18, 64, color);
        drawPart(ctx, parts.rightArm, 54, -95, 18, 64, color);
        drawPart(ctx, parts.torso, 0, -82, 78, 110, color);
        if (!parts.torso) {
          ctx.fillStyle = color;
          ctx.strokeStyle = "#262936";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.roundRect(-39, -137, 78, 110, 20);
          ctx.fill();
          ctx.stroke();
        }
        drawPart(ctx, parts.head, 0, -164, 70, 58, color);
        if (!parts.head) {
          ctx.fillStyle = color;
          ctx.strokeStyle = "#262936";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(0, -164, 36, 30, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(-14, -169, 4, 0, Math.PI * 2);
        ctx.arc(14, -169, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1c1b24";
        ctx.beginPath();
        ctx.ellipse(0, -153, 12, 4 + mouthOpen * 16, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      function drawTitle(frame, take) {
        ctx.fillStyle = "rgba(245,241,232,0.82)";
        ctx.fillRect(24, 24, 440, 58);
        ctx.strokeStyle = "#262936";
        ctx.lineWidth = 2;
        ctx.strokeRect(24, 24, 440, 58);
        ctx.fillStyle = "#262936";
        ctx.font = "800 22px Arial";
        ctx.fillText(frame.title || take?.name || "Pup-It backend render", 42, 56);
        ctx.font = "700 13px Arial";
        ctx.fillText(frame.subtitle || "Headless Chromium render", 42, 75);
      }

      function drawFrame(frame, ms) {
        const take = frame.take || {};
        drawBackground(frame);
        drawObjects(frame.sceneObjects || take.sceneObjects || []);
        performerStateAt(take, ms).forEach((performer) => drawPuppet(performer, ms));
        drawTitle(frame, take);
      }

      window.renderPupIt = async function renderPupIt(request) {
        const take = request.selectedTake || request.project?.takes?.find((item) => item.best) || request.project?.takes?.[0] || {};
        const duration = Math.max(1000, Math.min(take.durationMs || request.durationMs || 5000, 12000));
        const fps = 24;
        const frame = {
          take,
          scene: take.scene || request.project?.scene || "studio",
          sceneObjects: take.sceneObjects || request.project?.sceneObjects || [],
          backgroundTheme: take.backgroundTheme || request.project?.backgroundTheme || "painted-depth",
          title: request.title || take.name || request.project?.showName || "Pup-It render",
          subtitle: (request.project?.publishingPackage?.reviewTarget?.type || "preview") + " / " + Math.round(duration / 1000) + "s"
        };
        drawFrame(frame, 0);
        const thumbnail = canvas.toDataURL("image/png").split(",")[1];

        if (!window.MediaRecorder || !canvas.captureStream) {
          return { thumbnail, video: "", mimeType: "", durationMs: duration };
        }

        const stream = canvas.captureStream(fps);
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
        const recorder = new MediaRecorder(stream, { mimeType });
        const chunks = [];
        recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
        const stopped = new Promise((resolve) => {
          recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: mimeType });
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result).split(",")[1]);
            reader.readAsDataURL(blob);
          };
        });
        recorder.start();
        const frameMs = 1000 / fps;
        for (let ms = 0; ms <= duration; ms += frameMs) {
          drawFrame(frame, ms);
          await new Promise((resolve) => setTimeout(resolve, frameMs));
        }
        recorder.stop();
        const video = await stopped;
        return { thumbnail, video, mimeType, durationMs: duration };
      };
    </script>
  </body>
</html>`;
}

export async function renderWithHeadlessChromium(request, jobId) {
  const project = request.project || {};
  const take = request.selectedTake || project.takes?.find((item) => item.best) || project.takes?.[0] || null;
  const safeName = safeSlug(request.title || take?.name || project.showName || "pup-it-render");
  const jobDir = path.join(renderRoot, jobId);
  await mkdir(jobDir, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.setContent(renderHtml(), { waitUntil: "domcontentloaded" });
    const result = await page.evaluate((payload) => window.renderPupIt(payload), request);
    const videoFile = `${safeName}.webm`;
    const thumbnailFile = `${safeName}.png`;
    const manifestFile = "manifest.json";
    const videoPath = path.join(jobDir, videoFile);
    const thumbnailPath = path.join(jobDir, thumbnailFile);
    const manifestPath = path.join(jobDir, manifestFile);

    if (result.video) {
      await writeFile(videoPath, Buffer.from(result.video, "base64"));
    }
    await writeFile(thumbnailPath, Buffer.from(result.thumbnail, "base64"));

    const output = {
      artifactId: `artifact-${jobId}`,
      status: result.video ? "succeeded" : "succeeded_with_thumbnail_only",
      videoPath: result.video ? `/renders/${jobId}/${videoFile}` : null,
      thumbnailPath: `/renders/${jobId}/${thumbnailFile}`,
      manifestPath: `/renders/${jobId}/${manifestFile}`,
      mimeType: result.mimeType || "image/png",
      durationMs: result.durationMs,
      rendererVersion,
      note: result.video
        ? "Rendered with backend headless Chromium canvas capture."
        : "Rendered thumbnail with backend headless Chromium; MediaRecorder video was unavailable.",
      createdAt: new Date().toISOString()
    };

    await writeFile(manifestPath, JSON.stringify({ request, output }, null, 2));
    await page.close();
    return output;
  } finally {
    if (browser) await browser.close();
  }
}
