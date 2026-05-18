import {
  backgroundThemeCatalog,
  characterCatalog,
  getCatalogItem,
  objectStyleCatalog,
  sceneCatalog
} from "../../shared/catalogs.js";
import { cameraShotCatalog } from "../../shared/production.js";
import { createPerformerState } from "../../shared/schema.js";
import {
  indexPerformers,
  performerList,
  removePerformer,
  updatePerformerState,
  upsertPerformer
} from "../engine/performanceState.js";

export function makePreviewPerformers(take) {
  return indexPerformers(
    take.performers.map((performer, index) => ({
      id: performer.id,
      name: performer.name,
      character: performer.character,
      state: createPerformerState({
        x: 34 + index * 18,
        y: 68,
        pose: performer.pose,
        idleMotion: performer.idleMotion,
        motionFeel: performer.motionFeel || "smooth",
        behaviorPreset: performer.behaviorPreset || "none",
        mouthControl: performer.mouthControl,
        rigConfig: performer.rigConfig,
        stylePreset: performer.stylePreset,
        characterDesign: performer.characterDesign,
        characterParts: performer.characterParts,
        blinkSeed: index * 337
      })
    }))
  );
}

export function applyTakeEventToPreview(performers, event) {
  if (event.type === "performer:update") return updatePerformerState(performers, event.performerId, event.state);
  if (event.type === "performer:joined" || event.type === "performer:configured") {
    return upsertPerformer(performers, event.performer);
  }
  if (event.type === "performer:left") return removePerformer(performers, event.performerId);
  if (event.type === "macro:trigger") {
    return updatePerformerState(performers, event.performerId, { macro: event.macro });
  }
  return performers;
}

export function drawPreviewVideoFrame(ctx, { take, performers, atMs, width, height }) {
  const sceneItem = getCatalogItem(sceneCatalog, take.scene || "studio");
  const backgroundTheme = getCatalogItem(backgroundThemeCatalog, take.backgroundTheme || "scene-native");
  const objectStyle = getCatalogItem(objectStyleCatalog, take.objectStyle || "match-character");
  const shot = getCatalogItem(cameraShotCatalog, take.cameraShot || "wide");
  const background = {
    studio: ["#f5f1e8", "#d9d1c3"],
    street: ["#dfe8ef", "#b7c8c6"],
    space: ["#242335", "#0f1020"]
  }[sceneItem.id] || ["#f5f1e8", "#d9d1c3"];
  const themeTints = {
    "painted-depth": ["#f5f1e8", "#d9d1c3"],
    "late-night-copy": ["#ece7d9", "#8f91a2"],
    "broadcast-flat": ["#f4f7fb", "#d4e0ec"],
    "pattern-held": ["#fff2a8", "#8db7ff"],
    "vintage-wallpaper": ["#f8e6a0", "#c7a8ff"],
    "wood-panel": ["#c6925f", "#6e4631"],
    "stucco-wall": ["#e9dfcc", "#b7a994"],
    "abstract-gallery": ["#f26f5c", "#436b63"]
  }[backgroundTheme.id];
  if (themeTints) {
    background[0] = themeTints[0];
    background[1] = themeTints[1];
  }
  const horizon = ((sceneItem.horizon || 50) / 100) * height;
  const foreground = ((sceneItem.foreground || 86) / 100) * height;
  const shotScale = shot.id === "close" ? 1.38 : shot.id === "reaction" ? 1.28 : shot.id === "two-shot" ? 1.12 : 1;

  ctx.save();
  ctx.translate(width / 2, height * 0.62);
  ctx.scale(shotScale, shotScale);
  ctx.translate(-width / 2, -height * 0.62);

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, background[0]);
  gradient.addColorStop(1, background[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let x = -80; x < width + 80; x += 90) {
    ctx.fillRect(x + ((atMs / 80) % 90), 0, 26, height);
  }

  ctx.strokeStyle = "rgba(43,45,66,0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(width, horizon);
  ctx.stroke();

  ctx.fillStyle = "rgba(43,45,66,0.08)";
  ctx.beginPath();
  ctx.moveTo(width * 0.08, foreground);
  ctx.lineTo(width * 0.92, foreground);
  ctx.lineTo(width * 0.7, horizon + 30);
  ctx.lineTo(width * 0.3, horizon + 30);
  ctx.closePath();
  ctx.fill();

  for (const mark of take.floorMarks || []) {
    ctx.fillStyle = "rgba(227,189,69,0.72)";
    ctx.strokeStyle = "rgba(43,45,66,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse((mark.x / 100) * width, (mark.y / 100) * height, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  const sceneObjectItems = (take.sceneObjects || []).filter((object) => !object.hidden);
  const stageItems = [
    ...sceneObjectItems.map((object) => ({ type: "object", y: object.y || 60, object })),
    ...performerList(performers).map((performer) => ({ type: "performer", y: performer.state.y, performer }))
  ];

  stageItems
    .sort((a, b) => a.y - b.y)
    .forEach((performer) => {
      if (performer.type === "object") {
        const object = performer.object;
        const x = (object.x / 100) * width;
        const y = (object.y / 100) * height;
        const scale = (object.scale || 0.7) * 80;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((object.flipped ? -1 : 1) * ((object.layer || 0) - 2) * 0.03);
        ctx.fillStyle = object.tint || "#f5f1e8";
        ctx.strokeStyle = objectStyle.id === "thin-ink" ? "rgba(43,45,66,0.68)" : "#2b2d42";
        ctx.lineWidth = objectStyle.id === "thin-ink" ? 2 : 4;
        if (object.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, -scale * 0.4, scale * 0.42, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (object.shape === "triangle") {
          ctx.beginPath();
          ctx.moveTo(0, -scale);
          ctx.lineTo(scale * 0.55, 0);
          ctx.lineTo(-scale * 0.55, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.roundRect(-scale * 0.5, -scale, scale, scale * 0.72, 8);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
        return;
      }
      const item = performer.performer;
      const character = getCatalogItem(characterCatalog, item.character);
      const state = item.state;
      const x = (state.x / 100) * width;
      const y = (state.y / 100) * height;
      const depth = Math.max(0, Math.min(1, (state.y - (sceneItem.horizon || 50)) / ((sceneItem.foreground || 86) - (sceneItem.horizon || 50))));
      const scale = (0.54 + depth * 0.48) * (state.scale || 1);
      const bounce = state.walking ? Math.sin(atMs / 95) * 5 * scale : 0;
      const bodyColor = state.characterDesign?.color || character.color || "#8fd8b5";
      const accent = state.characterDesign?.accent || character.accent || "#2b2d42";

      ctx.save();
      ctx.translate(x, y + bounce);
      ctx.scale(scale * (state.facing < 0 ? -1 : 1), scale);
      ctx.fillStyle = "rgba(30,29,39,0.18)";
      ctx.beginPath();
      ctx.ellipse(0, 14, 48, 12, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = "#2b2d42";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(-34, -86, 68, 92, 20);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(0, -112, 38, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(-13, -118, 4, 0, Math.PI * 2);
      ctx.arc(13, -118, 4, 0, Math.PI * 2);
      ctx.fill();

      const mouthOpen = Math.max(state.mouthOpen || 0, state.speaking ? 0.2 : 0);
      ctx.fillStyle = "#1c1b24";
      ctx.beginPath();
      ctx.ellipse(0, -101, 10, 3 + mouthOpen * 14, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

  ctx.restore();

  ctx.fillStyle = "rgba(245,241,232,0.78)";
  ctx.fillRect(24, 24, 360, 46);
  ctx.fillStyle = "#2b2d42";
  ctx.font = "700 22px Arial";
  ctx.fillText(take.name || "Pup-It preview render", 42, 54);
  ctx.font = "700 13px Arial";
  ctx.fillText(`${backgroundTheme.name} / ${shot.name}`, 42, 72);
}

export async function exportTakePreviewVideo(take, { onFrame } = {}) {
  if (!take || !window.MediaRecorder) throw new Error("Browser video export is not available here.");
  const width = 1280;
  const height = 720;
  const fps = 24;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const recorder = new MediaRecorder(canvas.captureStream(fps), { mimeType });
  const chunks = [];
  recorder.ondataavailable = (event) => {
    if (event.data?.size) chunks.push(event.data);
  };
  const stopped = new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });
  let performers = makePreviewPerformers(take);
  const events = [...(take.tracks?.motion || [])].sort((a, b) => a.at - b.at);
  let eventIndex = 0;
  const trimStartMs = take.trimStartMs || 0;
  const trimEndMs = take.trimEndMs ?? take.durationMs ?? 5000;
  const durationMs = Math.max(1000, Math.min(trimEndMs - trimStartMs, 45000));
  const frameMs = 1000 / fps;

  recorder.start();
  for (let atMs = 0; atMs <= durationMs; atMs += frameMs) {
    const renderAtMs = trimStartMs + atMs;
    while (eventIndex < events.length && (events[eventIndex].at || 0) <= renderAtMs) {
      performers = applyTakeEventToPreview(performers, events[eventIndex]);
      eventIndex += 1;
    }
    drawPreviewVideoFrame(ctx, { take, performers, atMs: renderAtMs, width, height });
    onFrame?.(Math.min(1, atMs / durationMs));
    await new Promise((resolve) => window.setTimeout(resolve, frameMs));
  }
  recorder.stop();
  return stopped;
}

export function createTakeThumbnailDataUrl(take) {
  if (!take) return "";
  const width = 1280;
  const height = 720;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  drawPreviewVideoFrame(ctx, {
    take,
    performers: makePreviewPerformers(take),
    atMs: take.trimStartMs || 0,
    width,
    height
  });
  return canvas.toDataURL("image/png");
}

export function quickTrimTake(take, edge, trimMs = 500) {
  const currentStart = take.trimStartMs || 0;
  const currentEnd = take.trimEndMs ?? take.durationMs;
  return edge === "start"
    ? { ...take, trimStartMs: Math.min(currentStart + trimMs, Math.max(0, currentEnd - 1000)) }
    : { ...take, trimEndMs: Math.max(currentStart + 1000, currentEnd - trimMs) };
}

export function polishTakeForReview(take) {
  return {
    ...take,
    name: take.name?.includes("polished") ? take.name : `${take.name || "Take"} polished`,
    cameraShot: take.cameraShot === "wide" ? "two-shot" : take.cameraShot,
    lightingPreset: take.lightingPreset || "flat-tv",
    polish: {
      ...(take.polish || {}),
      motionSmoothing: true,
      mouthCleanup: true,
      reviewFraming: true,
      polishedAt: new Date().toISOString()
    },
    tracks: {
      ...take.tracks,
      motion: (take.tracks?.motion || []).map((event, index, events) => {
        if (event.type !== "performer:update" || !event.state) return event;
        const previous = [...events]
          .slice(0, index)
          .reverse()
          .find((candidate) => candidate.type === "performer:update" && candidate.performerId === event.performerId && candidate.state);
        if (!previous?.state) {
          return {
            ...event,
            state: {
              ...event.state,
              visualLean: Number(event.state.visualLean || 0) * 0.82,
              visualBounce: Number(event.state.visualBounce || 0) * 0.86
            }
          };
        }
        const smooth = (key, weight = 0.18) =>
          typeof event.state[key] === "number" && typeof previous.state[key] === "number"
            ? previous.state[key] * weight + event.state[key] * (1 - weight)
            : event.state[key];
        return {
          ...event,
          state: {
            ...event.state,
            x: smooth("x", 0.12),
            y: smooth("y", 0.1),
            mouthOpen: smooth("mouthOpen", 0.24),
            visualLean: Number(event.state.visualLean || 0) * 0.82,
            visualBounce: Number(event.state.visualBounce || 0) * 0.86,
            settleAmount: Math.min(1, Number(event.state.settleAmount || 0) + 0.08)
          }
        };
      })
    }
  };
}
