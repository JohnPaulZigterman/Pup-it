import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegStaticPath from "ffmpeg-static";
import { chromium } from "playwright";
import { createRenderModel } from "../shared/renderModel.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const renderRoot = path.resolve(__dirname, "../renders");
const rendererVersion = "pup-it-headless-chromium-v2";
const ffmpegCommand = process.env.FFMPEG_PATH || ffmpegStaticPath || "ffmpeg";

function sanitizeFilePart(value, fallback = "track") {
  return String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || fallback;
}

function runProcess(command, args, { timeoutMs = 60000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      child.kill("SIGTERM");
      reject(new Error(`${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr || stdout || `${command} exited with code ${code}`));
      }
    });
  });
}

async function hasFfmpeg() {
  try {
    await runProcess(ffmpegCommand, ["-version"], { timeoutMs: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function writeAudioTrackArtifacts(renderModel, jobDir, jobId) {
  const audioTracks = renderModel.take?.tracks?.audio || [];
  const usableTracks = audioTracks
    .map((track, index) => {
      const chunks = [...(track.chunks || [])]
        .filter((chunk) => chunk?.data)
        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
      return { track, index, chunks };
    })
    .filter(({ chunks }) => chunks.length > 0);

  if (!usableTracks.length) return [];

  const audioDir = path.join(jobDir, "audio");
  await mkdir(audioDir, { recursive: true });

  const artifacts = [];
  for (const { track, index, chunks } of usableTracks) {
    const performer = sanitizeFilePart(track.performerName || track.performerId, `performer-${index + 1}`);
    const character = sanitizeFilePart(track.character, "character");
    const extension = track.mimeType?.includes("webm") ? "webm" : "bin";
    const fileName = `${String(index + 1).padStart(2, "0")}-${performer}-${character}.${extension}`;
    const filePath = path.join(audioDir, fileName);
    const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk.data, "base64")));
    await writeFile(filePath, buffer);
    artifacts.push({
      performerId: track.performerId,
      performerName: track.performerName,
      character: track.character,
      mimeType: track.mimeType || "audio/webm",
      chunkCount: chunks.length,
      delayMs: Math.max(0, Math.round(chunks[0]?.at || 0)),
      bytes: buffer.length,
      localPath: filePath,
      path: `/renders/${jobId}/audio/${fileName}`
    });
  }
  return artifacts.filter((artifact) => artifact.bytes > 0);
}

async function buildAudioMux({ renderModel, jobDir, jobId, safeName, videoPath, hasVideo }) {
  const separateTracks = await writeAudioTrackArtifacts(renderModel, jobDir, jobId);
  const base = {
    status: separateTracks.length ? "pending" : "skipped_no_audio",
    ffmpegAvailable: false,
    trackCount: separateTracks.length,
    separateTracks: separateTracks.map(({ localPath, ...track }) => track),
    mixedAudio: false,
    finalVideoPath: hasVideo ? `/renders/${jobId}/${safeName}.webm` : null
  };

  if (!hasVideo) {
    return { ...base, status: separateTracks.length ? "skipped_no_video" : "skipped_no_audio" };
  }
  if (!separateTracks.length) return base;

  const ffmpegAvailable = await hasFfmpeg();
  if (!ffmpegAvailable) {
    return {
      ...base,
      status: "skipped_ffmpeg_missing",
      note: "Per-character audio tracks were preserved, but FFmpeg was not available to mux a final audio video."
    };
  }

  const muxedFile = `${safeName}-with-audio.webm`;
  const muxedPath = path.join(jobDir, muxedFile);
  const args = ["-y", "-i", videoPath];
  separateTracks.forEach((track) => args.push("-i", track.localPath));

  const delayFilters = separateTracks.map((track, index) => {
    const inputIndex = index + 1;
    const delay = Math.max(0, Math.round(track.delayMs || 0));
    return `[${inputIndex}:a]adelay=${delay}|${delay}[a${index}]`;
  });
  const mixInputs = separateTracks.map((_, index) => `[a${index}]`).join("");
  const filterComplex =
    separateTracks.length === 1
      ? `${delayFilters[0]}`
      : `${delayFilters.join(";")};${mixInputs}amix=inputs=${separateTracks.length}:duration=longest:dropout_transition=0[aout]`;
  const audioOutput = separateTracks.length === 1 ? "[a0]" : "[aout]";

  args.push(
    "-filter_complex",
    filterComplex,
    "-map",
    "0:v:0",
    "-map",
    audioOutput,
    "-c:v",
    "copy",
    "-c:a",
    "libopus",
    "-shortest",
    muxedPath
  );

  try {
    await runProcess(ffmpegCommand, args, { timeoutMs: 120000 });
    return {
      ...base,
      status: "muxed",
      ffmpegAvailable: true,
      mixedAudio: true,
      finalVideoPath: `/renders/${jobId}/${muxedFile}`,
      note: "Muxed performer audio into a broadcast preview while preserving separate per-character track files."
    };
  } catch (error) {
    return {
      ...base,
      status: "failed",
      ffmpegAvailable: true,
      error: error.message,
      note: "Per-character audio tracks were preserved, but FFmpeg could not mux the final video."
    };
  }
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

      function drawBackground(model) {
        const [top, bottom] = sceneColors(model.scene, model.backgroundTheme);
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

      function applyLighting(model) {
        ctx.save();
        if (model.lightingPreset === "dramatic") {
          const gradient = ctx.createRadialGradient(W * 0.5, H * 0.45, 80, W * 0.5, H * 0.48, W * 0.72);
          gradient.addColorStop(0, "rgba(255,255,255,0.1)");
          gradient.addColorStop(0.56, "rgba(38,41,54,0.04)");
          gradient.addColorStop(1, "rgba(18,19,28,0.38)");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, W, H);
        } else if (model.lightingPreset === "night") {
          ctx.fillStyle = "rgba(35,46,78,0.34)";
          ctx.fillRect(0, 0, W, H);
        } else if (model.lightingPreset === "flat-tv") {
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.fillRect(0, 0, W, H);
        } else if (model.lightingPreset === "cozy") {
          ctx.fillStyle = "rgba(255,207,138,0.16)";
          ctx.fillRect(0, 0, W, H);
        }
        ctx.restore();
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

      function drawTitle(model) {
        ctx.fillStyle = "rgba(245,241,232,0.82)";
        ctx.fillRect(24, 24, 440, 58);
        ctx.strokeStyle = "#262936";
        ctx.lineWidth = 2;
        ctx.strokeRect(24, 24, 440, 58);
        ctx.fillStyle = "#262936";
        ctx.font = "800 22px Arial";
        ctx.fillText(model.title || "Pup-It backend render", 42, 56);
        ctx.font = "700 13px Arial";
        ctx.fillText(model.subtitle || (model.cameraShot + " / " + model.lightingPreset), 42, 75);
      }

      function cameraSettings(model, performers) {
        const shotScale = {
          wide: 1,
          "two-shot": 1.08,
          close: 1.24,
          reaction: 1.34
        }[model.cameraShot] || 1;
        const focus = performers.length
          ? performers.reduce((acc, performer) => ({
              x: acc.x + (performer.state?.x || 50),
              y: acc.y + (performer.state?.y || 64)
            }), { x: 0, y: 0 })
          : { x: 50, y: 64 };
        const count = performers.length || 1;
        const focusX = focus.x / count / 100 * W;
        const focusY = focus.y / count / 100 * H;
        const follow = model.directorCamera?.follow;
        return {
          scale: shotScale * (model.directorCamera?.punchScale || 1),
          panX: follow || shotScale > 1 ? W * 0.5 - focusX : 0,
          panY: follow || shotScale > 1 ? H * 0.58 - focusY : 0
        };
      }

      function drawFrame(model, ms) {
        const take = model.take || {};
        const performers = performerStateAt(take, ms);
        drawBackground(model);
        const camera = cameraSettings(model, performers);
        ctx.save();
        ctx.translate(W * 0.5, H * 0.52);
        ctx.scale(camera.scale, camera.scale);
        ctx.translate(-W * 0.5 + camera.panX / camera.scale, -H * 0.52 + camera.panY / camera.scale);
        drawObjects(model.sceneObjects || take.sceneObjects || []);
        performers.forEach((performer) => drawPuppet(performer, ms));
        ctx.restore();
        applyLighting(model);
        drawTitle(model);
      }

      window.renderPupIt = async function renderPupIt(request) {
        const model = request.renderModel || request;
        const take = model.take || {};
        const duration = Math.max(1000, Math.min(model.durationMs || take.durationMs || 5000, 12000));
        const trimOffset = Math.max(0, model.trimStartMs || take.trimStartMs || 0);
        const fps = 24;
        model.subtitle = (model.reviewTarget?.type || "preview") + " / " + Math.round(duration / 1000) + "s";
        drawFrame(model, trimOffset);
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
          drawFrame(model, ms + trimOffset);
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
  const renderModel = request.renderModel || createRenderModel(request);
  const safeName = renderModel.slug;
  const jobDir = path.join(renderRoot, jobId);
  await mkdir(jobDir, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.setContent(renderHtml(), { waitUntil: "domcontentloaded" });
    const result = await page.evaluate((payload) => window.renderPupIt(payload), { ...request, renderModel });
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
    const audioMux = await buildAudioMux({
      renderModel,
      jobDir,
      jobId,
      safeName,
      videoPath,
      hasVideo: Boolean(result.video)
    });
    const finalVideoPath = audioMux.finalVideoPath || (result.video ? `/renders/${jobId}/${videoFile}` : null);

    const output = {
      artifactId: `artifact-${jobId}`,
      status: result.video ? "succeeded" : "succeeded_with_thumbnail_only",
      videoPath: finalVideoPath,
      previewVideoPath: result.video ? `/renders/${jobId}/${videoFile}` : null,
      thumbnailPath: `/renders/${jobId}/${thumbnailFile}`,
      manifestPath: `/renders/${jobId}/${manifestFile}`,
      mimeType: result.mimeType || "image/png",
      durationMs: result.durationMs,
      rendererVersion,
      audioMux,
      note: result.video
        ? "Rendered with backend headless Chromium canvas capture."
        : "Rendered thumbnail with backend headless Chromium; MediaRecorder video was unavailable.",
      createdAt: new Date().toISOString()
    };

    await writeFile(manifestPath, JSON.stringify({ request, renderModel, output }, null, 2));
    await page.close();
    return output;
  } finally {
    if (browser) await browser.close();
  }
}
