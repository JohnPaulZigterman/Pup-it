import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Circle,
  Copy,
  ExternalLink,
  FolderOpen,
  HelpCircle,
  Library,
  ListChecks,
  Mic,
  MicOff,
  MousePointer2,
  Palette,
  Play,
  Plus,
  Radio,
  Redo2,
  RefreshCw,
  Search,
  Shuffle,
  Save,
  Sparkles,
  Square,
  Theater,
  Trash2,
  Undo2,
  Video,
  Wand2,
  X
} from "lucide-react";
import {
  assetFormatCatalog,
  assetImportTypeCatalog,
  assetSceneSearchPresets,
  assetTargetCatalog,
  curatedAssetLibrary,
  getAssetSearchText,
  isOneClickSafeAsset
} from "../shared/assetLibrary.js";
import {
  cameraShotCatalog,
  createDoinkTvSubmissionPackage,
  createProjectExport,
  createShowToolbox,
  createTimelineClip,
  directorActionCatalog,
  lightingPresetCatalog
} from "../shared/production.js";
import {
  animationStyleCatalog,
  backgroundThemeCatalog,
  behaviorPresetCatalog,
  bodyShapeCatalog,
  characterPartCatalog,
  characterCatalog,
  characterColorSwatches,
  expressionCatalog,
  getCatalogItem,
  idleMotionCatalog,
  limbStyleCatalog,
  macroCatalog,
  motionFeelCatalog,
  mouthStyleCatalog,
  mutationRecipeCatalog,
  objectStyleCatalog,
  originalNameParts,
  partShapeCatalog,
  perspectiveCatalog,
  poseCatalog,
  sceneCatalog,
  walkCycleCatalog
} from "../shared/catalogs.js";
import { clampPointToFloor } from "../shared/depth.js";
import { createPerformerState, defaultCharacterId, defaultRoomId } from "../shared/schema.js";
import { createRenderModel } from "../shared/renderModel.js";
import {
  hasInput,
  indexPerformers,
  inputFromPressedKeys,
  movePerformerFromInput,
  performerList,
  removePerformer,
  shouldContinueMotion,
  updatePerformerState,
  upsertPerformer
} from "./engine/performanceState.js";
import { Puppet } from "./renderer/Puppet.jsx";
import {
  attachFinishMetadata,
  describeFinishTarget as describeFinishTargetFromState,
  resolveFinishTake as resolveFinishTakeFromState
} from "./workflows/finishFlow.js";
import { SceneLibraryEditor } from "./workspaces/FinishWorkspace.jsx";
import {
  buildPublicReleaseWorkflow,
  computeBeginnerProgress,
  getTutorialTrack,
  getWorkspaceIdentity,
  makeShortMilestones,
  tutorialTracks,
  workflowSteps
} from "./workflow/shortFlow.js";
import "./styles.css";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV ? "http://localhost:4111" : window.location.origin);
const DOINKTV_SUBMISSION_URL = import.meta.env.VITE_DOINKTV_SUBMISSION_URL || "";
const SHOW_STORAGE_KEY = "pup-it-shows-v1";
const AUTOSAVE_DRAFT_KEY = "pup-it-autosave-draft-v1";
const partSwapTargets = {
  leftArm: "rightArm",
  rightArm: "leftArm",
  leftLeg: "rightLeg",
  rightLeg: "leftLeg",
  leftAccessory: "rightAccessory",
  rightAccessory: "leftAccessory"
};
const corePartSlots = ["head", "torso", "leftArm", "rightArm", "leftLeg", "rightLeg"];
const extraPartSlots = ["topAccessory", "leftAccessory", "rightAccessory", "backAppendage"];
const texturePresetOptions = [
  { id: "paper-grain", name: "Paper Grain" },
  { id: "photocopy", name: "Photocopy" },
  { id: "static-pattern", name: "Static" },
  { id: "wallpaper", name: "Wallpaper" },
  { id: "woodgrain", name: "Woodgrain" },
  { id: "stucco", name: "Stucco" }
];

const performancePresetCatalog = [
  {
    id: "deadpan",
    name: "Deadpan Sitcom",
    description: "Small motion, held idle, clean reactions.",
    state: { motionFeel: "direct", idleMotion: "held", behaviorPreset: "none", pose: "deadpan", expression: "neutral" },
    cameraShot: "two-shot",
    lightingPreset: "flat-tv"
  },
  {
    id: "chaotic",
    name: "Chaotic Puppet",
    description: "Loose controls, wobble, big reaction energy.",
    state: { motionFeel: "loose", idleMotion: "alive", behaviorPreset: "wobble", pose: "shrug", expression: "weird" },
    cameraShot: "reaction",
    lightingPreset: "dramatic"
  },
  {
    id: "floaty",
    name: "Floaty Weird",
    description: "Slow drift and dreamy timing.",
    state: { motionFeel: "floaty", idleMotion: "subtle", behaviorPreset: "float", pose: "listen", expression: "neutral" },
    cameraShot: "wide",
    lightingPreset: "cozy"
  },
  {
    id: "stiff",
    name: "Stiff Cutout",
    description: "Snappy blocking and paper-stage posture.",
    state: { motionFeel: "direct", idleMotion: "held", behaviorPreset: "sticker", pose: "neutral", expression: "neutral" },
    cameraShot: "wide",
    lightingPreset: "scene"
  },
  {
    id: "documentary",
    name: "Awkward Doc",
    description: "Subtle movement, patient timing, uncomfortable close-ups.",
    state: { motionFeel: "slow", idleMotion: "subtle", behaviorPreset: "none", pose: "listen", expression: "neutral" },
    cameraShot: "close",
    lightingPreset: "flat-tv"
  }
];

const styleMutationControls = [
  {
    id: "roughen",
    name: "Roughen",
    description: "Loosen the rig into a rough handmade look.",
    stylePreset: "adult-surreal",
    backgroundTheme: "late-night-copy",
    objectStyle: "textured-cutout",
    behaviorPreset: "jitter",
    motionFeel: "loose"
  },
  {
    id: "photocopy",
    name: "Photocopy",
    description: "Push copy-shop grit and late-night texture.",
    stylePreset: "adult-surreal",
    backgroundTheme: "late-night-copy",
    objectStyle: "paper-cut"
  },
  {
    id: "thin-lines",
    name: "Thin Lines",
    description: "Clean up heavy borders without making it sterile.",
    stylePreset: "minimal-comic",
    backgroundTheme: "broadcast-flat",
    objectStyle: "thin-ink"
  },
  {
    id: "collage",
    name: "Collage",
    description: "Move toward assembled cutouts and texture pieces.",
    stylePreset: "puppet-collage",
    backgroundTheme: "pattern-held",
    objectStyle: "textured-cutout"
  },
  {
    id: "pattern",
    name: "Pattern",
    description: "Let wallpaper and held texture carry the shot.",
    stylePreset: "wallpaper-cutout",
    backgroundTheme: "vintage-wallpaper",
    objectStyle: "paper-cut"
  },
  {
    id: "shadow-weird",
    name: "Shadow Weird",
    description: "Punch up shape, shadow, and reaction staging.",
    stylePreset: "abstract-block",
    backgroundTheme: "abstract-gallery",
    objectStyle: "soft-material",
    lightingPreset: "dramatic"
  }
];

const showStarterTemplates = [
  {
    id: "two-hander",
    name: "Two-Rig Dialogue",
    description: "Readable blocking and soft TV lighting for a fast dialogue scene.",
    scene: "studio",
    cameraShot: "two-shot",
    lightingPreset: "flat-tv",
    backgroundTheme: "painted-depth",
    objectStyle: "thin-ink",
    assetSearch: "kitchen"
  },
  {
    id: "street-bit",
    name: "Street Interview",
    description: "Exterior setup with prop-friendly search defaults.",
    scene: "street",
    cameraShot: "wide",
    lightingPreset: "scene",
    backgroundTheme: "stucco-wall",
    objectStyle: "soft-material",
    assetSearch: "street"
  },
  {
    id: "late-bump",
    name: "Late-Night Bump",
    description: "A short weird interstitial with copy grit and punch-in framing.",
    scene: "space",
    cameraShot: "reaction",
    lightingPreset: "dramatic",
    backgroundTheme: "late-night-copy",
    objectStyle: "paper-cut",
    assetSearch: "space"
  },
  {
    id: "desk-show",
    name: "Podcast Desk",
    description: "Reusable talking-head format for recurring bits.",
    scene: "studio",
    cameraShot: "two-shot",
    lightingPreset: "cozy",
    backgroundTheme: "wood-panel",
    objectStyle: "soft-material",
    assetSearch: "furniture"
  },
  {
    id: "news-desk",
    name: "News Desk",
    description: "A direct-to-camera setup for fake headlines, desk bits, and recurring segments.",
    scene: "studio",
    cameraShot: "reaction",
    lightingPreset: "flat-tv",
    backgroundTheme: "broadcast-flat",
    objectStyle: "thin-ink",
    assetSearch: "desk sign microphone"
  }
];

const shortFormatTemplates = [
  {
    id: "argument",
    name: "Weird Argument",
    description: "Two rigs, fast blocking, one prop, and a punch-in ready for a 30-second fight.",
    showSuffix: "Argument",
    starterTemplate: "two-hander",
    styleMutation: "roughen",
    prop: { name: "Important Object", shape: "star", tint: "#fff2a8", texturePreset: "photocopy" },
    assetSearch: "room furniture prop",
    performanceGoal: "Record two characters disagreeing about one stupid object.",
    surpriseNudge: "Make the prop too important for no reason.",
    nextMode: "build"
  },
  {
    id: "fake-ad",
    name: "Fake Commercial",
    description: "A product on stage, bright TV lighting, and a simple sell-the-bit performance setup.",
    showSuffix: "Commercial",
    starterTemplate: "desk-show",
    styleMutation: "thin-lines",
    prop: { name: "Bad Product", shape: "block", tint: "#8db7ff", texturePreset: "static-pattern" },
    assetSearch: "sign product furniture",
    performanceGoal: "Sell a bad product with total confidence.",
    surpriseNudge: "Give the product a feature nobody asked for.",
    nextMode: "assets"
  },
  {
    id: "public-access",
    name: "Public Access Bumper",
    description: "Copy grit, strange texture, and a quick reaction setup for a weird short interstitial.",
    showSuffix: "Bumper",
    starterTemplate: "late-bump",
    styleMutation: "photocopy",
    prop: { name: "Floating Thing", shape: "bean", tint: "#e96f4c", texturePreset: "photocopy" },
    assetSearch: "space texture abstract",
    performanceGoal: "Make a 10-second public-access interruption.",
    surpriseNudge: "Let one visual detail be unexplained and too intense.",
    nextMode: "perform"
  },
  {
    id: "podcast-bit",
    name: "Podcast Bit",
    description: "A desk-show format for animated clips, recurring voices, and low-friction replay.",
    showSuffix: "Podcast",
    starterTemplate: "desk-show",
    styleMutation: "collage",
    prop: { name: "Desk Mic", shape: "circle", tint: "#2b2d42", texturePreset: "paper-grain" },
    assetSearch: "desk microphone room",
    performanceGoal: "Turn one throwaway conversation into a recurring bit.",
    surpriseNudge: "Add a prop that does not belong on the desk.",
    nextMode: "perform"
  },
  {
    id: "news-desk",
    name: "News Desk",
    description: "A fake headline, desk prop, and camera-ready rig for a recurring segment.",
    showSuffix: "News",
    starterTemplate: "news-desk",
    styleMutation: "thin-lines",
    prop: { name: "Headline Card", shape: "block", tint: "#fff2a8", texturePreset: "paper-grain" },
    assetSearch: "desk sign city background",
    performanceGoal: "Report a fake headline as if civilization depends on it.",
    surpriseNudge: "Make the headline too specific.",
    nextMode: "perform"
  },
  {
    id: "street-bit",
    name: "Street Bit",
    description: "A walk-up setup for interviews, arguments, or weird field reporting.",
    showSuffix: "Street",
    starterTemplate: "street-bit",
    styleMutation: "collage",
    prop: { name: "Street Sign", shape: "triangle", tint: "#8fd8b5", texturePreset: "stucco" },
    assetSearch: "street sign exterior prop",
    performanceGoal: "Walk up to somebody and ask the wrong question.",
    surpriseNudge: "Make the setting imply a bigger unseen world.",
    nextMode: "perform"
  }
];

const shotTemplateCatalog = [
  {
    id: "two-shot-argument",
    name: "Two-Shot Argument",
    description: "Two performers staged on opposing marks with readable reaction space.",
    scene: "studio",
    cameraShot: "two-shot",
    lightingPreset: "flat-tv",
    backgroundTheme: "painted-depth",
    objectStyle: "thin-ink",
    marks: [
      { id: "a", label: "A", name: "Left Speaker", x: 38, y: 64 },
      { id: "b", label: "B", name: "Right Speaker", x: 62, y: 64 },
      { id: "react", label: "R", name: "Reaction", x: 50, y: 59 },
      { id: "fg", label: "FG", name: "Foreground Button", x: 50, y: 75 }
    ]
  },
  {
    id: "reaction-punch",
    name: "Reaction Punch-In",
    description: "A tight button setup where one performer lands a face-forward reaction.",
    scene: "studio",
    cameraShot: "reaction",
    lightingPreset: "dramatic",
    backgroundTheme: "late-night-copy",
    objectStyle: "paper-cut",
    marks: [
      { id: "hero", label: "H", name: "Hero Reaction", x: 52, y: 66 },
      { id: "off", label: "O", name: "Offscreen Setup", x: 30, y: 64 },
      { id: "back", label: "B", name: "Back Wall", x: 50, y: 60 }
    ]
  },
  {
    id: "street-interview",
    name: "Street Interview",
    description: "Interviewer/interviewee marks with deeper alley blocking.",
    scene: "street",
    cameraShot: "two-shot",
    lightingPreset: "scene",
    backgroundTheme: "stucco-wall",
    objectStyle: "soft-material",
    marks: [
      { id: "host", label: "HOST", name: "Host", x: 35, y: 68 },
      { id: "guest", label: "GUEST", name: "Guest", x: 61, y: 61 },
      { id: "walkby", label: "W", name: "Walk-by", x: 78, y: 54 },
      { id: "near", label: "N", name: "Near Lens", x: 48, y: 77 }
    ]
  },
  {
    id: "podcast-desk",
    name: "Podcast Desk",
    description: "Simple recurring desk show marks for fast talk segments.",
    scene: "studio",
    cameraShot: "two-shot",
    lightingPreset: "cozy",
    backgroundTheme: "wood-panel",
    objectStyle: "soft-material",
    marks: [
      { id: "host", label: "HOST", name: "Host Mic", x: 42, y: 66 },
      { id: "guest", label: "GUEST", name: "Guest Mic", x: 58, y: 66 },
      { id: "wide", label: "WIDE", name: "Wide Reset", x: 50, y: 62 }
    ]
  }
];

function createDefaultFloorMarks(sceneItem = sceneCatalog[0]) {
  const horizonMark = sceneItem.horizon + (sceneItem.performerHorizonBuffer || 8) + 6;
  return [
    { id: "left", label: "L", name: "Left", x: 32, y: 64 },
    { id: "center", label: "C", name: "Center", x: 50, y: 62 },
    { id: "right", label: "R", name: "Right", x: 68, y: 64 },
    { id: "back", label: "B", name: "Back", x: sceneItem.vanishingX || 50, y: horizonMark }
  ];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function pickCatalogId(items) {
  const item = pickRandom(items);
  return item.id || item;
}

function makeOriginalDesign() {
  const name = `${pickRandom(originalNameParts.first)} ${pickRandom(originalNameParts.second)}`;
  const color = pickRandom(characterColorSwatches);
  let accent = pickRandom(characterColorSwatches);
  if (accent === color) accent = "#efcf55";

  return {
    name,
    color,
    accent
  };
}

function makeOriginalRig() {
  return {
    body: pickRandom(bodyShapeCatalog).id,
    limbs: pickRandom(limbStyleCatalog).id,
    arms: Math.random() > 0.12,
    legs: Math.random() > 0.24,
    armLength: Math.floor(24 + Math.random() * 36),
    legLength: Math.floor(18 + Math.random() * 34),
    walkCycle: pickRandom(walkCycleCatalog).id,
    mouthStyle: pickRandom(mouthStyleCatalog).id
  };
}

function makeMutationDesign(recipe, fallbackName) {
  const color = pickRandom(recipe.colors || characterColorSwatches);
  let accent = pickRandom(recipe.colors || characterColorSwatches);
  if (accent === color) accent = "#fff2a8";

  return {
    name: fallbackName,
    color,
    accent
  };
}

function makeMutationRig(recipe, baseRig = {}) {
  const arms = recipe.limbs?.some((limb) => limb !== "stick") ? Math.random() > 0.18 : Math.random() > 0.44;
  const legs = recipe.walkCycles?.includes("floaty") ? Math.random() > 0.48 : Math.random() > 0.24;

  return {
    ...baseRig,
    body: pickCatalogId(recipe.bodies || bodyShapeCatalog),
    limbs: pickCatalogId(recipe.limbs || limbStyleCatalog),
    arms,
    legs,
    armLength: Math.floor(20 + Math.random() * 44),
    legLength: Math.floor(16 + Math.random() * 42),
    walkCycle: pickCatalogId(recipe.walkCycles || walkCycleCatalog),
    mouthStyle: pickCatalogId(recipe.mouthStyles || mouthStyleCatalog)
  };
}

function formatDuration(durationMs = 0) {
  const seconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function inferAssetTexture(asset) {
  if (asset.tags?.includes("wood") || asset.name?.toLowerCase().includes("wood")) return "woodgrain";
  if (asset.tags?.includes("wallpaper") || asset.name?.toLowerCase().includes("wallpaper")) return "wallpaper";
  if (asset.recommended?.objectStyle === "textured-cutout") return "paper-grain";
  return "paper-grain";
}

function createSceneObjectFromAsset(asset, index = 0) {
  const isSetting = asset.targets?.includes("setting") || asset.format === "background";
  return {
    id: `scene-object-${asset.id}-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    assetId: asset.id,
    name: asset.name,
    sourceUrl: asset.sourceUrl,
    license: asset.license,
    attribution: asset.attribution,
    kind: isSetting ? "setting" : "object",
    x: isSetting ? 50 : 28 + (index % 4) * 14,
    y: isSetting ? 48 : 66,
    scale: isSetting ? 1.2 : 0.72,
    layer: isSetting ? 0 : 2,
    tint: asset.recommended?.objectStyle === "textured-cutout" ? "#fff2a8" : "#f5f1e8",
    shape: asset.previewStyle || "object",
    texturePreset: inferAssetTexture(asset)
  };
}

function createSceneObjectFromImage({ name, imageUrl, license, attribution, texturePreset }, index = 0) {
  return {
    id: `scene-object-image-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    assetId: "custom-image",
    name: name || "Imported Image",
    sourceUrl: imageUrl,
    imageUrl,
    license: license || "User Supplied",
    attribution: attribution || "User supplied image. Confirm rights before publishing.",
    kind: "object",
    x: 34 + (index % 4) * 12,
    y: 66,
    scale: 0.75,
    layer: 2,
    tint: "#f5f1e8",
    shape: "image",
    texturePreset: texturePreset || "paper-grain",
    flipped: false,
    locked: false
  };
}

function createSceneObjectFromShape({ name, shape, tint, texturePreset }, index = 0) {
  return {
    id: `scene-object-shape-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    assetId: "assembled-shape",
    name: name || "Assembled Prop",
    sourceUrl: "",
    license: "Show Built",
    attribution: "Created inside Pup-It.",
    kind: "object",
    x: 28 + (index % 4) * 14,
    y: 66,
    scale: 0.72,
    layer: 2,
    tint: tint || "#f5f1e8",
    shape: shape || "object",
    texturePreset: texturePreset || "paper-grain",
    flipped: false,
    locked: false
  };
}

function makePreviewPerformers(take) {
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

function clonePerformers(performers) {
  return performers.map((performer) => ({
    ...performer,
    state: { ...performer.state }
  }));
}

function applyTakeEventToPreview(performers, event) {
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

function drawPreviewVideoFrame(ctx, { take, performers, atMs, width, height }) {
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
        ctx.rotate(((object.flipped ? -1 : 1) * ((object.layer || 0) - 2) * 0.03));
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

async function exportTakePreviewVideo(take, { onFrame } = {}) {
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

function createTakeThumbnailDataUrl(take) {
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

function downloadDataUrl(dataUrl, filename) {
  if (!dataUrl) return;
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

function makeShowId(showName) {
  const slug = (showName || "untitled-show")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42);
  return slug || `show-${Date.now()}`;
}

function loadStoredShows() {
  try {
    const stored = window.localStorage.getItem(SHOW_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function writeStoredShows(shows) {
  window.localStorage.setItem(SHOW_STORAGE_KEY, JSON.stringify(shows));
}

function showSessionFromPersistedShow(show) {
  const showBible = show.showBible || {};
  const houseStyle = show.houseStyle || {};
  return {
    schemaVersion: "pup-it.show.v1",
    id: show.slug || show.id,
    databaseId: show.id,
    showName: show.showName || show.name || "Untitled Show",
    savedAt: show.updatedAt || show.updated_at || new Date().toISOString(),
    roomId: showBible.roomId || defaultRoomId,
    scene: houseStyle.scene || sceneCatalog[0].id,
    perspective: houseStyle.perspective,
    cameraShot: houseStyle.cameraShot || "wide",
    lightingPreset: houseStyle.lightingPreset || "scene",
    backgroundTheme: houseStyle.backgroundTheme || "painted-depth",
    objectStyle: houseStyle.objectStyle || "soft-material",
    cast: show.cast || [],
    episodeStatus: showBible.episodeStatus || "draft",
    sceneObjects: showBible.sceneObjects || [],
    sceneSets: showBible.sceneSets || [],
    floorMarks: showBible.floorMarks || createDefaultFloorMarks(getCatalogItem(sceneCatalog, houseStyle.scene || sceneCatalog[0].id)),
    assetReferences: show.assetReferences || [],
    storyboardPanels: showBible.storyboardPanels || [],
    productionTimeline: showBible.productionTimeline || [],
    takes: showBible.takes || [],
    doinkSubmission: showBible.doinkSubmission || {},
    showToolbox: showBible.showToolbox || {}
  };
}

async function fetchPersistedShows() {
  const response = await fetch(`${SERVER_URL}/api/shows`);
  if (!response.ok) throw new Error("Show database unavailable");
  const data = await response.json();
  if (data.persistence === "local") throw new Error("Show database unavailable");
  return (data.shows || []).map(showSessionFromPersistedShow);
}

async function persistShowSession(session) {
  const response = await fetch(`${SERVER_URL}/api/shows`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...session,
      slug: session.id,
      houseStyle: {
        scene: session.scene,
        perspective: session.perspective,
        cameraShot: session.cameraShot,
        lightingPreset: session.lightingPreset,
        backgroundTheme: session.backgroundTheme,
        objectStyle: session.objectStyle
      },
      showBible: {
        roomId: session.roomId,
        storyboardPanels: session.storyboardPanels,
        productionTimeline: session.productionTimeline,
        episodeStatus: session.episodeStatus,
        sceneObjects: session.sceneObjects,
        sceneSets: session.sceneSets,
        floorMarks: session.floorMarks,
        takes: session.takes,
        doinkSubmission: session.doinkSubmission,
        showToolbox: session.showToolbox
      }
    })
  });
  if (!response.ok) throw new Error("Show database unavailable");
  const data = await response.json();
  if (data.persistence === "local") throw new Error("Show database unavailable");
  return showSessionFromPersistedShow(data.show);
}

async function persistEpisodeSnapshot(showId, session) {
  const response = await fetch(`${SERVER_URL}/api/shows/${encodeURIComponent(showId)}/episodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seasonNumber: 1,
      episodeNumber: 1,
      title: `${session.showName} Episode 1`,
      status: session.episodeStatus || "draft",
      metadata: {
        currentScene: session.scene,
        perspective: session.perspective,
        cameraShot: session.cameraShot,
        lightingPreset: session.lightingPreset,
        backgroundTheme: session.backgroundTheme,
        objectStyle: session.objectStyle
      },
      scenes: [
        {
          id: "current-stage",
          scene: session.scene,
          sceneObjects: session.sceneObjects || [],
          floorMarks: session.floorMarks || []
        }
      ],
      takes: session.takes || [],
      finalCuts: session.productionTimeline || [],
      publishingPackages: []
    })
  });
  if (!response.ok) throw new Error("Episode database unavailable");
  return response.json();
}

function summarizeTakeForShow(take) {
  return {
    id: take.id,
    name: take.name,
    scene: take.scene,
    durationMs: take.durationMs,
    performerCount: take.performerCount,
    audioTrackCount: take.audioTrackCount,
    motionEventCount: take.motionEventCount,
    best: Boolean(take.best)
  };
}

function createStoryboardPanel({
  scene,
  performers,
  index,
  backgroundTheme,
  objectStyle,
  texturePreset,
  sceneObjects,
  floorMarks
}) {
  return {
    id: `panel-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    title: `Panel ${index}`,
    shot: "wide",
    lightingPreset: "scene",
    duration: "0:05",
    caption: "",
    scene,
    backgroundTheme: backgroundTheme || "scene-native",
    objectStyle: objectStyle || "match-character",
    texturePreset: texturePreset || "paper-grain",
    sceneObjects: sceneObjects || [],
    floorMarks: floorMarks || [],
    performers: clonePerformers(performers)
  };
}

function App() {
  const socketRef = useRef(null);
  const audioRef = useRef({
    analyser: null,
    context: null,
    frame: null,
    lastMouthSentAt: 0,
    recorder: null,
    sequence: 0,
    source: null,
    stream: null
  });
  const mouthVideoRef = useRef(null);
  const mouthValueRef = useRef(0);
  const mouthCameraRef = useRef({ stream: null, frame: null, baseline: null, lastSentAt: 0 });
  const mouthControlRef = useRef("audio");
  const mouthSensitivityRef = useRef(1);
  const mouthSmoothingRef = useRef(0.58);
  const commandInputRef = useRef(null);
  const playbackTimersRef = useRef([]);
  const cameraTimersRef = useRef([]);
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState(defaultRoomId);
  const [showName, setShowName] = useState("Untitled Show");
  const [savedShows, setSavedShows] = useState([]);
  const [selectedShowId, setSelectedShowId] = useState("");
  const [entryLoadedShowId, setEntryLoadedShowId] = useState("");
  const [autosaveDraft, setAutosaveDraft] = useState(null);
  const [name, setName] = useState(`Performer ${Math.ceil(Math.random() * 99)}`);
  const [character, setCharacter] = useState(defaultCharacterId);
  const [scene, setScene] = useState(sceneCatalog[0].id);
  const selectedSceneRef = useRef(sceneCatalog[0].id);
  const [performers, setPerformers] = useState({});
  const [selfId, setSelfId] = useState(null);
  const [recording, setRecording] = useState(false);
  const [micLive, setMicLive] = useState(false);
  const [mouthCameraActive, setMouthCameraActive] = useState(false);
  const [mouthSensitivity, setMouthSensitivity] = useState(1);
  const [mouthSmoothing, setMouthSmoothing] = useState(0.58);
  const [mode, setMode] = useState("home");
  const [experienceMode, setExperienceMode] = useState("beginner");
  const [commandQuery, setCommandQuery] = useState("");
  const [commandFocused, setCommandFocused] = useState(false);
  const [cameraShot, setCameraShot] = useState("wide");
  const [cameraFollow, setCameraFollow] = useState(false);
  const [cameraPunchScale, setCameraPunchScale] = useState(1);
  const [cameraShakeOffset, setCameraShakeOffset] = useState({ x: 0, y: 0 });
  const [lightingPreset, setLightingPreset] = useState("scene");
  const [backgroundTheme, setBackgroundTheme] = useState("painted-depth");
  const [objectStyle, setObjectStyle] = useState("soft-material");
  const [takeLibrary, setTakeLibrary] = useState([]);
  const [selectedTake, setSelectedTake] = useState(null);
  const [previewPerformers, setPreviewPerformers] = useState(null);
  const [playbackActive, setPlaybackActive] = useState(false);
  const [videoExporting, setVideoExporting] = useState(false);
  const [backendRendering, setBackendRendering] = useState(false);
  const [renderJob, setRenderJob] = useState(null);
  const [performanceMoments, setPerformanceMoments] = useState([]);
  const [finishTarget, setFinishTarget] = useState("selected-take");
  const [storyboardPanels, setStoryboardPanels] = useState([]);
  const [selectedStoryboardId, setSelectedStoryboardId] = useState(null);
  const [productionTimeline, setProductionTimeline] = useState([]);
  const [episodeStatus, setEpisodeStatus] = useState("draft");
  const [sceneObjects, setSceneObjects] = useState([]);
  const [selectedSceneObjectId, setSelectedSceneObjectId] = useState(null);
  const [sceneSets, setSceneSets] = useState([]);
  const [floorMarks, setFloorMarks] = useState(() => createDefaultFloorMarks(sceneCatalog[0]));
  const [assetReferences, setAssetReferences] = useState([]);
  const [assetFilter, setAssetFilter] = useState("all");
  const [assetTarget, setAssetTarget] = useState("all");
  const [assetSearch, setAssetSearch] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialTrackId, setTutorialTrackId] = useState("beginner");
  const [tutorialStep, setTutorialStep] = useState(0);
  const [startedShortFormat, setStartedShortFormat] = useState("");
  const [selectedPartId, setSelectedPartId] = useState("head");
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);
  const [lastAutosaveAt, setLastAutosaveAt] = useState("");
  const [lastManualSave, setLastManualSave] = useState(null);
  const [exportHistory, setExportHistory] = useState([]);
  const [doinkSubmitting, setDoinkSubmitting] = useState(false);
  const [doinkSubmission, setDoinkSubmission] = useState({
    title: "",
    creatorName: "",
    creatorContact: "",
    description: "",
    preferredBlock: "short",
    contentNotes: "",
    rightsNotes: "Created in Pup-It. Confirm imported material rights before broadcast.",
    schedulingNotes: ""
  });
  const [status, setStatus] = useState("Create or join a room to start puppeteering.");

  const self = performers[selfId];
  const selectedScene = getCatalogItem(sceneCatalog, scene);
  const selectedPerspective = getCatalogItem(perspectiveCatalog, selectedScene.perspective || "front-stage");
  const selectedCameraShot = getCatalogItem(cameraShotCatalog, cameraShot);
  const selectedLighting = getCatalogItem(lightingPresetCatalog, lightingPreset);
  const selectedBackgroundTheme = getCatalogItem(backgroundThemeCatalog, backgroundTheme);
  const selectedObjectStyle = getCatalogItem(objectStyleCatalog, objectStyle);
  const activeTutorialTrack = getTutorialTrack(tutorialTrackId);
  const selfCharacter = self
    ? getCatalogItem(characterCatalog, self.character)
    : getCatalogItem(characterCatalog, character);
  const hasCustomRigParts = Boolean(
    self?.state.characterParts &&
      corePartSlots.some((slot) => {
        const part = self.state.characterParts?.[slot];
        return part?.source || part?.shape || part?.mode === "drawn";
      })
  );
  const beginnerProgress = computeBeginnerProgress({
    showName,
    hasCustomRigParts,
    sceneObjectCount: sceneObjects.length,
    sceneSetCount: sceneSets.length,
    mode,
    takeCount: takeLibrary.length,
    selectedTake,
    timelineCount: productionTimeline.length,
    exportCount: exportHistory.length,
    startedShortFormat,
    episodeStatus
  });
  const activeStylePreset = self?.state.stylePreset || selfCharacter.stylePreset;
  const activeAnimationStyle = getCatalogItem(animationStyleCatalog, activeStylePreset);
  const activeTexturePreset = activeAnimationStyle.texturePreset || "paper-grain";
  const stageTexturePreset = selectedBackgroundTheme.texturePreset || activeTexturePreset;
  const activePerformers = useMemo(() => performerList(performers), [performers]);
  const stagePerformers = useMemo(
    () => (mode === "edit" && previewPerformers ? performerList(previewPerformers) : activePerformers),
    [activePerformers, mode, previewPerformers]
  );
  const showStageMarkers = mode === "assets" || mode === "edit";
  const showPuppetLabels = mode === "edit";

  useEffect(() => {
    const socket = io(SERVER_URL, { autoConnect: false });
    socketRef.current = socket;

    socket.on("connect", () => setSelfId(socket.id));
    socket.on("room:snapshot", (snapshot) => {
      selectedSceneRef.current = snapshot.scene;
      setScene(snapshot.scene);
      setRecording(snapshot.recording);
      setPerformers(indexPerformers(snapshot.performers));
      setJoined(true);
      setMode("perform");
      setStatus(`Live in room "${snapshot.id}". Open another tab to test multiplayer.`);
    });
    socket.on("performer:joined", (performer) => {
      setPerformers((current) => upsertPerformer(current, performer));
    });
    socket.on("performer:left", (id) => {
      setPerformers((current) => removePerformer(current, id));
    });
    socket.on("performer:update", ({ id, state }) => {
      setPerformers((current) => updatePerformerState(current, id, state));
    });
    socket.on("performer:configured", (performer) => {
      setPerformers((current) => upsertPerformer(current, performer));
    });
    socket.on("scene:set", setScene);
    socket.on("take:status", ({ recording: isRecording, savedTake }) => {
      setRecording(isRecording);
      if (savedTake) {
        setTakeLibrary((current) => [
          savedTake,
          ...current.filter((take) => take.id !== savedTake.id)
        ]);
        clearPlayback();
        setSelectedTake(savedTake);
        setPreviewPerformers(makePreviewPerformers(savedTake));
        setScene(savedTake.scene);
        setCameraShot(savedTake.cameraShot || "wide");
        setLightingPreset(savedTake.lightingPreset || "scene");
        setCameraFollow(Boolean(savedTake.directorCamera?.follow));
        setCameraPunchScale(savedTake.directorCamera?.punchScale || 1);
        setCameraShakeOffset({ x: 0, y: 0 });
        setMode("edit");
        addPerformanceMoment({
          type: "take",
          label: "Take saved",
          detail: `${savedTake.name || "Fresh take"} is ready to replay.`
        });
        window.setTimeout(() => playTake(savedTake), 120);
      }
      setStatus(isRecording ? "Recording movement and audio chunks." : "Take saved. Replay it while the performance energy is fresh.");
    });
    socket.on("macro:trigger", ({ performerId, macro }) => {
      flashMacro(performerId, macro);
    });
    socket.on("audio:chunk", playRemoteAudio);

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!joined || !selfId || !["perform", "build"].includes(mode)) return undefined;

    const pressed = new Set();
    let frame = null;
    let lastFrameAt = performance.now();
    let lastNetworkEmitAt = 0;
    const emitPerformerState = (state, now, { force = false } = {}) => {
      if (!socketRef.current?.connected) return;
      if (!force && now - lastNetworkEmitAt < 33) return;
      lastNetworkEmitAt = now;
      socketRef.current.emit("performer:update", state);
    };

    const update = (now = performance.now()) => {
      const deltaMs = Math.min(48, Math.max(8, now - lastFrameAt || 16.67));
      lastFrameAt = now;

      setPerformers((current) => {
        const performer = current[selfId];
        if (!performer) return current;

        const input = inputFromPressedKeys(pressed, deltaMs);
        const moving = hasInput(input);
        if (!moving && !shouldContinueMotion(performer.state)) {
          if (!performer.state.walking && !performer.state.groundSpeed) return current;
          const nextPerformer = {
            ...performer,
            state: {
              ...performer.state,
              walking: false,
              motionVx: 0,
              motionVy: 0,
              groundSpeed: 0,
              travelLean: 0,
              anticipationLean: 0,
              anticipationSquash: 1,
              settleAmount: 0,
              walkBounce: 0,
              visualLean: 0,
              visualBounce: 0,
              visualSquash: 1,
              motionIntent: "idle"
            }
          };
          emitPerformerState(nextPerformer.state, now, { force: true });
          return upsertPerformer(current, nextPerformer);
        }

        const nextPerformer = movePerformerFromInput(performer, input, selectedScene);
        const nextState = nextPerformer.state;
        emitPerformerState(nextState, now);
        return upsertPerformer(current, nextPerformer);
      });

      frame = requestAnimationFrame(update);
    };

    const keydown = (event) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
      if (event.key === "1") setPose("neutral");
      if (event.key === "2") setPose("listen");
      if (event.key === "3") setPose("point");
      if (event.key === "4") setPose("shrug");
      if (event.key === "5") applyDirectorAction("reaction");
      if (event.key === "6") applyDirectorAction("hold-for-laugh");
      if (event.key === "7") applyDirectorAction("prop-reveal");
      if (event.key === "8") applyDirectorAction("lights-shift");
      if (event.key.toLowerCase() === "z") triggerMacro("wave");
      if (event.key.toLowerCase() === "x") triggerMacro("hop");
      if (event.key.toLowerCase() === "c") triggerMacro("panic");
      if (event.key.toLowerCase() === "h") setIdleMotion(self?.state.idleMotion === "held" ? "subtle" : "held");
      pressed.add(event.key);
    };
    const keyup = (event) => pressed.delete(event.key);

    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    frame = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      cancelAnimationFrame(frame);
    };
  }, [joined, mode, selfId, selectedScene]);

  useEffect(() => {
    return () => {
      stopMouthCamera();
      audioRef.current.recorder?.stop();
      audioRef.current.stream?.getTracks().forEach((track) => track.stop());
      stopAudioMouthMeter({ closeContext: true });
    };
  }, []);

  useEffect(() => {
    mouthControlRef.current = self?.state.mouthControl || "audio";
  }, [self?.state.mouthControl]);

  useEffect(() => {
    mouthSensitivityRef.current = mouthSensitivity;
  }, [mouthSensitivity]);

  useEffect(() => {
    mouthSmoothingRef.current = mouthSmoothing;
  }, [mouthSmoothing]);

  useEffect(() => {
    if (joined && mode === "edit") loadTakeLibrary();
  }, [joined, mode, roomId]);

  useEffect(() => {
    return () => clearPlayback();
  }, []);

  useEffect(() => {
    return () => {
      cameraTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      cameraTimersRef.current = [];
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadShows = async () => {
      let shows = [];
      try {
        shows = await fetchPersistedShows();
      } catch (_error) {
        shows = loadStoredShows();
      }
      if (!active) return;
      setSavedShows(shows);
      if (shows[0]) {
        setSelectedShowId(shows[0].id);
        setShowName(shows[0].showName);
      }
    };
    loadShows();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(AUTOSAVE_DRAFT_KEY);
      if (!stored) return;
      const draft = JSON.parse(stored);
      if (draft?.schemaVersion === "pup-it.show.v1") setAutosaveDraft(draft);
    } catch (_error) {
      setAutosaveDraft(null);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("pup-it-tutorial-open");
      const savedTrack = window.localStorage.getItem("pup-it-tutorial-track");
      if (saved === "true") setTutorialOpen(true);
      if (tutorialTracks.some((track) => track.id === savedTrack)) setTutorialTrackId(savedTrack);
    } catch (_error) {
      setTutorialOpen(false);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("pup-it-tutorial-open", String(tutorialOpen));
      window.localStorage.setItem("pup-it-tutorial-track", tutorialTrackId);
    } catch (_error) {
      // Tutorial persistence is optional; the UI should keep working without storage.
    }
  }, [tutorialOpen, tutorialTrackId]);

  const joinRoom = (event) => {
    event.preventDefault();
    socketRef.current.connect();
    socketRef.current.emit("room:join", { roomId, name, character, scene: selectedSceneRef.current });
  };

  const updateSelf = (statePatch) => {
    if (!selfId) return;
    setPerformers((current) => {
      const performer = current[selfId];
      if (!performer) return current;
      const nextState = { ...performer.state, ...statePatch };
      socketRef.current.emit("performer:update", nextState);
      return upsertPerformer(current, { ...performer, state: nextState });
    });
  };

  const addPerformanceMoment = ({ type = "cue", label, detail = "" }) => {
    setPerformanceMoments((current) => [
      {
        id: `moment-${Date.now()}-${Math.round(Math.random() * 10000)}`,
        type,
        label,
        detail,
        at: new Date().toLocaleTimeString([], { minute: "2-digit", second: "2-digit" })
      },
      ...current
    ].slice(0, 6));
  };

  const setExpression = (expression) => updateSelf({ expression });
  const setPose = (poseId) => {
    const pose = getCatalogItem(poseCatalog, poseId);
    updateSelf({ pose: pose.id, expression: pose.expression });
  };
  const moveSelfToMark = (markId) => {
    const mark = floorMarks.find((item) => item.id === markId);
    if (!mark) return;
    const floorPoint = clampPointToFloor({ x: mark.x, y: mark.y }, selectedScene);
    updateSelf({
      x: floorPoint.x,
      y: floorPoint.y,
      walking: false,
      motionVx: 0,
      motionVy: 0,
      groundSpeed: 0,
      travelLean: 0
    });
    setStatus(`Snapped performer to ${mark.name}.`);
  };
  const setCurrentPositionAsMark = (markId) => {
    if (!self) return;
    setFloorMarks((current) =>
      current.map((mark) =>
        mark.id === markId
          ? { ...mark, x: Math.round(self.state.x), y: Math.round(self.state.y) }
          : mark
      )
    );
    setStatus("Updated floor mark from the current performer position.");
  };
  const setIdleMotion = (idleMotion) => updateSelf({ idleMotion });
  const setMotionFeel = (motionFeel) => updateSelf({ motionFeel });
  const setMouthOpen = (mouthOpen, { immediate = false } = {}) => {
    const target = clamp(mouthOpen, 0, 1);
    const previous = mouthValueRef.current;
    const smoothing = clamp(mouthSmoothingRef.current, 0.15, 0.9);
    const open = immediate ? target : previous * smoothing + target * (1 - smoothing);
    if (!immediate && Math.abs(open - previous) < 0.015) return;
    mouthValueRef.current = open;
    updateSelf({ mouthOpen: open, speaking: open > 0.08 });
  };
  const setMouthControl = async (mouthControl) => {
    if (mouthControl === "camera") {
      updateSelf({ mouthControl });
      try {
        await startMouthCamera();
      } catch (_error) {
        updateSelf({ mouthControl: "audio", mouthOpen: 0, speaking: false });
        setStatus("Camera mouth control was blocked. Audio mouth matching is still active.");
      }
      return;
    }

    stopMouthCamera();
    mouthValueRef.current = 0;
    updateSelf({ mouthControl, mouthOpen: 0, speaking: false });
    if (mouthControl === "audio" && !micLive) {
      setStatus("Audio mouth matching is selected. Turn on Mic to drive the mouth automatically.");
    }
  };

  const makeHistorySnapshot = (label) => ({
    label,
    capturedAt: Date.now(),
    showName,
    character,
    scene,
    selectedSceneId: scene,
    cameraShot,
    lightingPreset,
    backgroundTheme,
    objectStyle,
    performers: clonePerformers(activePerformers),
    sceneObjects: sceneObjects.map((object) => ({ ...object })),
    selectedSceneObjectId,
    floorMarks: floorMarks.map((mark) => ({ ...mark })),
    storyboardPanels: storyboardPanels.map((panel) => ({ ...panel })),
    selectedStoryboardId,
    productionTimeline: productionTimeline.map((clip) => ({ ...clip })),
    takeLibrary,
    selectedTakeId: selectedTake?.id || null,
    startedShortFormat
  });

  const restoreHistorySnapshot = (snapshot) => {
    if (!snapshot) return;
    clearPlayback();
    setShowName(snapshot.showName);
    setCharacter(snapshot.character);
    selectedSceneRef.current = snapshot.selectedSceneId || snapshot.scene;
    setScene(snapshot.selectedSceneId || snapshot.scene);
    socketRef.current?.emit("scene:set", snapshot.selectedSceneId || snapshot.scene);
    setCameraShot(snapshot.cameraShot || "wide");
    setLightingPreset(snapshot.lightingPreset || "scene");
    setBackgroundTheme(snapshot.backgroundTheme || "painted-depth");
    setObjectStyle(snapshot.objectStyle || "soft-material");
    setPerformers(indexPerformers(snapshot.performers || []));
    setSceneObjects(snapshot.sceneObjects || []);
    setSelectedSceneObjectId(snapshot.selectedSceneObjectId || null);
    setFloorMarks(snapshot.floorMarks || createDefaultFloorMarks(getCatalogItem(sceneCatalog, snapshot.scene || sceneCatalog[0].id)));
    setStoryboardPanels(snapshot.storyboardPanels || []);
    setSelectedStoryboardId(snapshot.selectedStoryboardId || null);
    setProductionTimeline(snapshot.productionTimeline || []);
    setTakeLibrary(snapshot.takeLibrary || []);
    setSelectedTake((snapshot.takeLibrary || []).find((take) => take.id === snapshot.selectedTakeId) || null);
    setStartedShortFormat(snapshot.startedShortFormat || "");
    setStatus(`Restored ${snapshot.label}.`);
  };

  const recordHistory = (label) => {
    setHistoryPast((current) => [...current.slice(-19), makeHistorySnapshot(label)]);
    setHistoryFuture([]);
  };

  const undoLastAction = () => {
    setHistoryPast((past) => {
      if (!past.length) return past;
      const snapshot = past[past.length - 1];
      setHistoryFuture((future) => [makeHistorySnapshot("redo point"), ...future.slice(0, 19)]);
      restoreHistorySnapshot(snapshot);
      return past.slice(0, -1);
    });
  };

  const redoLastAction = () => {
    setHistoryFuture((future) => {
      if (!future.length) return future;
      const snapshot = future[0];
      setHistoryPast((past) => [...past.slice(-19), makeHistorySnapshot("undo point")]);
      restoreHistorySnapshot(snapshot);
      return future.slice(1);
    });
  };

  const updateCharacterRig = (patch) => {
    if (!self) return;
    recordHistory("rig tuning");
    const baseCharacter = getCatalogItem(characterCatalog, self.character);
    updateSelf({
      rigConfig: {
        ...baseCharacter.rigConfig,
        ...self.state.rigConfig,
        ...patch
      }
    });
  };

  const updateCharacterStyle = (stylePreset) => {
    recordHistory("style change");
    updateSelf({ stylePreset });
  };
  const changeCharacterRig = (nextCharacter) => {
    recordHistory("rig model change");
    setCharacter(nextCharacter);
    if (!self) return;
    const baseCharacter = getCatalogItem(characterCatalog, nextCharacter);
    const nextState = createPerformerState({
      ...self.state,
      rigConfig: baseCharacter.rigConfig,
      stylePreset: baseCharacter.stylePreset,
      characterDesign: {
        name: `${baseCharacter.name} Puppet`,
        color: baseCharacter.color,
        accent: baseCharacter.accent
      },
      characterParts: {},
      mouthOpen: 0,
      speaking: false,
      walking: false,
      motionVx: 0,
      motionVy: 0,
      groundSpeed: 0,
      macro: null
    });
    const nextPerformer = { ...self, character: nextCharacter, state: nextState };
    setPerformers((current) => upsertPerformer(current, nextPerformer));
    socketRef.current.emit("performer:configure", {
      name: nextPerformer.name,
      character: nextPerformer.character,
      state: nextPerformer.state
    });
    setStatus(`${baseCharacter.name} selected. Customize the rig, then place it in the scene.`);
  };
  const updateCharacterDesign = (patch) => {
    if (!self) return;
    recordHistory("character design");
    const baseCharacter = getCatalogItem(characterCatalog, self.character);
    updateSelf({
      characterDesign: {
        name: self.state.characterDesign?.name || `${baseCharacter.name} Original`,
        color: self.state.characterDesign?.color || baseCharacter.color,
        accent: self.state.characterDesign?.accent || baseCharacter.accent,
        ...patch
      }
    });
  };
  const updateCharacterPart = (partId, patch) => {
    if (!self) return;
    recordHistory(`${getCatalogItem(characterPartCatalog, partId).name} edit`);
    const currentParts = self.state.characterParts || {};
    const currentPart = currentParts[partId] || {};
    updateSelf({
      characterParts: {
        ...currentParts,
        [partId]: {
          ...currentPart,
          ...patch
        }
      }
    });
  };
  const moveCharacterPartOnCanvas = (partId, patch) => {
    if (!self) return;
    const currentParts = self.state.characterParts || {};
    const currentPart = currentParts[partId] || {};
    const partMeta = getCatalogItem(characterPartCatalog, partId);
    const hasPart = currentPart.source || currentPart.shape || currentPart.mode === "drawn";
    updateSelf({
      characterParts: {
        ...currentParts,
        [partId]: {
          label: partMeta.label,
          mode: hasPart ? currentPart.mode || "shape" : "shape",
          shape: hasPart ? currentPart.shape || "circle" : partId === "torso" ? "bean" : "circle",
          ...currentPart,
          ...patch
        }
      }
    });
  };
  const duplicateCharacterPart = (partId) => {
    if (!self) return;
    const currentParts = self.state.characterParts || {};
    const sourcePart = currentParts[partId];
    if (!sourcePart) return;
    recordHistory(`${getCatalogItem(characterPartCatalog, partId).name} clone`);
    const targetPartId =
      extraPartSlots.find((slot) => !currentParts[slot]) ||
      extraPartSlots.find((slot) => currentParts[slot]?.hidden) ||
      "backAppendage";
    updateSelf({
      characterParts: {
        ...currentParts,
        [targetPartId]: {
          ...sourcePart,
          label: getCatalogItem(characterPartCatalog, targetPartId).label,
          hidden: false,
          scale: Math.max(0.7, Math.min(1.35, (sourcePart.scale || 1) * 0.92)),
          rotate: (sourcePart.rotate || 0) + 12
        }
      }
    });
    setStatus(`Cloned ${getCatalogItem(characterPartCatalog, partId).name} into an editable extra slot.`);
  };
  const swapCharacterParts = (partId) => {
    if (!self) return;
    const targetPartId = partSwapTargets[partId];
    if (!targetPartId) return;
    recordHistory("part swap");
    const currentParts = self.state.characterParts || {};
    updateSelf({
      characterParts: {
        ...currentParts,
        [partId]: currentParts[targetPartId] || {},
        [targetPartId]: currentParts[partId] || {}
      }
    });
    setStatus(`Swapped ${getCatalogItem(characterPartCatalog, partId).name} with ${getCatalogItem(characterPartCatalog, targetPartId).name}.`);
  };
  const clearCharacterPart = (partId) => {
    if (!self) return;
    recordHistory(`${getCatalogItem(characterPartCatalog, partId).name} clear`);
    const currentParts = self.state.characterParts || {};
    const nextParts = { ...currentParts };
    delete nextParts[partId];
    updateSelf({ characterParts: nextParts });
  };
  const randomizeCharacterDesign = () => {
    recordHistory("weird starter");
    updateSelf({
      characterDesign: makeOriginalDesign(),
      rigConfig: makeOriginalRig(),
      stylePreset: pickRandom(animationStyleCatalog).id,
      behaviorPreset: pickRandom(behaviorPresetCatalog).id,
      motionFeel: pickRandom(motionFeelCatalog).id,
      characterParts: Object.fromEntries(
        characterPartCatalog.filter((part) => corePartSlots.includes(part.id)).map((part) => [
          part.id,
          {
            mode: "shape",
            shape: pickRandom(partShapeCatalog).id,
            label: part.label
          }
        ])
      )
    });
  };
  const applyCharacterMutation = (recipeId) => {
    if (!self) return;
    recordHistory("character mutation");
    const recipe = getCatalogItem(mutationRecipeCatalog, recipeId);
    const baseCharacter = getCatalogItem(characterCatalog, self.character);
    const currentRig = {
      ...baseCharacter.rigConfig,
      ...self.state.rigConfig
    };
    const fallbackName =
      self.state.characterDesign?.name ||
      `${pickRandom(originalNameParts.first)} ${pickRandom(originalNameParts.second)}`;

    updateSelf({
      characterDesign: makeMutationDesign(recipe, fallbackName),
      rigConfig: makeMutationRig(recipe, currentRig),
      stylePreset: pickCatalogId(recipe.stylePresets),
      behaviorPreset: recipe.behaviorPreset || "none",
      motionFeel: recipe.motionFeel || self.state.motionFeel || "smooth",
      characterParts: {
        ...(self.state.characterParts || {}),
        head: self.state.characterParts?.head || { mode: "shape", shape: pickCatalogId(partShapeCatalog), label: "HD" },
        torso: self.state.characterParts?.torso || { mode: "shape", shape: pickCatalogId(partShapeCatalog), label: "BODY" }
      }
    });
    setStatus(`${recipe.name} mutation applied. Keep what works, change what bothers you.`);
  };
  const applyStyleMutation = (mutationId) => {
    const mutation = styleMutationControls.find((item) => item.id === mutationId);
    if (!mutation) return;
    recordHistory("style mutation");
    if (mutation.stylePreset) updateCharacterStyle(mutation.stylePreset);
    if (mutation.backgroundTheme) setBackgroundTheme(mutation.backgroundTheme);
    if (mutation.objectStyle) setObjectStyle(mutation.objectStyle);
    if (mutation.lightingPreset) setLightingPreset(mutation.lightingPreset);
    if (mutation.behaviorPreset) updateSelf({ behaviorPreset: mutation.behaviorPreset });
    if (mutation.motionFeel) updateSelf({ motionFeel: mutation.motionFeel });
    setStatus(`${mutation.name} style mutation applied. Remix it until it feels like your show.`);
  };

  const startQuickShort = (formatId) => {
    recordHistory("quick short starter");
    const format = getCatalogItem(shortFormatTemplates, formatId);
    const template = getCatalogItem(showStarterTemplates, format.starterTemplate);
    changeScene(template.scene);
    setCameraShot(template.cameraShot);
    setLightingPreset(template.lightingPreset);
    setBackgroundTheme(template.backgroundTheme);
    setObjectStyle(template.objectStyle);
    setAssetTarget("object");
    setAssetSearch(format.assetSearch);
    setStartedShortFormat(format.id);
    setExportHistory([]);
    setRenderJob(null);
    if (showName.trim() === "Untitled Show") {
      setShowName(`${format.name} Show`);
    }
    if (self) {
      randomizeCharacterDesign();
    }
    if (format.styleMutation) {
      window.setTimeout(() => applyStyleMutation(format.styleMutation), 0);
    }
    const sceneObject = createSceneObjectFromShape(format.prop, sceneObjects.length);
    setSceneObjects((current) => [...current, sceneObject]);
    setSelectedSceneObjectId(sceneObject.id);
    setMode(format.nextMode);
    setStatus(`${format.name} started. Customize the rig, tweak the prop, then record the bit.`);
  };

  const startAnotherBit = (formatId = "") => {
    recordHistory("next bit starter");
    const candidates = shortFormatTemplates.filter((format) => format.id !== startedShortFormat);
    const format = formatId
      ? getCatalogItem(shortFormatTemplates, formatId)
      : pickRandom(candidates.length ? candidates : shortFormatTemplates);
    const template = getCatalogItem(showStarterTemplates, format.starterTemplate);
    clearPlayback();
    setPreviewPerformers(null);
    setSelectedTake(null);
    setRenderJob(null);
    changeScene(template.scene);
    setCameraShot(template.cameraShot);
    setLightingPreset(template.lightingPreset);
    setBackgroundTheme(template.backgroundTheme);
    setObjectStyle(template.objectStyle);
    setAssetTarget("object");
    setAssetSearch(format.assetSearch);
    setStartedShortFormat(format.id);
    if (format.styleMutation) {
      window.setTimeout(() => applyStyleMutation(format.styleMutation), 0);
    }
    const sceneObject = createSceneObjectFromShape(
      {
        ...format.prop,
        name: `${format.prop.name} ${sceneObjects.length + 1}`
      },
      sceneObjects.length
    );
    setSceneObjects((current) => [...current, sceneObject]);
    setSelectedSceneObjectId(sceneObject.id);
    setMode(format.nextMode === "assets" ? "assets" : "perform");
    setStatus(`${format.name} staged as the next bit. Same show kit, new excuse to perform.`);
  };

  const addSceneObjectFromAsset = (asset) => {
    recordHistory("place asset");
    const sceneObject = createSceneObjectFromAsset(asset, sceneObjects.length);
    setSceneObjects((current) => [...current, sceneObject]);
    setSelectedSceneObjectId(sceneObject.id);
    setStatus(`Placed "${asset.name}" in the scene.`);
  };

  const addSceneObjectFromImage = (payload) => {
    if (!payload.imageUrl?.trim()) return;
    recordHistory("place image prop");
    const sceneObject = createSceneObjectFromImage(
      { ...payload, imageUrl: payload.imageUrl.trim() },
      sceneObjects.length
    );
    setSceneObjects((current) => [...current, sceneObject]);
    setSelectedSceneObjectId(sceneObject.id);
    setStatus(`Placed "${sceneObject.name}" from image URL.`);
  };

  const addSceneObjectFromShape = (payload) => {
    recordHistory("build prop");
    const sceneObject = createSceneObjectFromShape(payload, sceneObjects.length);
    setSceneObjects((current) => [...current, sceneObject]);
    setSelectedSceneObjectId(sceneObject.id);
    setStatus(`Built "${sceneObject.name}" as an editable scene prop.`);
  };

  const updateSceneObject = (objectId, patch) => {
    recordHistory("prop edit");
    setSceneObjects((current) =>
      current.map((object) => (object.id === objectId ? { ...object, ...patch } : object))
    );
  };

  const duplicateSceneObject = (objectId) => {
    const sourceObject = sceneObjects.find((object) => object.id === objectId);
    if (!sourceObject) return;
    recordHistory("prop duplicate");
    const copy = {
      ...sourceObject,
      id: `scene-object-copy-${Date.now()}-${Math.round(Math.random() * 10000)}`,
      name: `${sourceObject.name} copy`,
      x: clamp(sourceObject.x + 6, 5, 95),
      y: clamp(sourceObject.y + 2, 25, 88),
      locked: false
    };
    setSceneObjects((current) => [...current, copy]);
    setSelectedSceneObjectId(copy.id);
  };

  const moveSceneObjectLayer = (objectId, delta) => {
    const object = sceneObjects.find((item) => item.id === objectId);
    if (!object) return;
    recordHistory("prop layer");
    updateSceneObject(objectId, { layer: clamp((object.layer || 0) + delta, 0, 6) });
  };

  const deleteSceneObject = (objectId) => {
    recordHistory("prop delete");
    setSceneObjects((current) => current.filter((object) => object.id !== objectId));
    setSelectedSceneObjectId((current) => (current === objectId ? null : current));
  };

  const saveCurrentSceneSet = () => {
    recordHistory("save set");
    const sceneSet = {
      id: `scene-set-${Date.now()}-${Math.round(Math.random() * 10000)}`,
      name: `${selectedScene.name} Set ${sceneSets.length + 1}`,
      scene,
      backgroundTheme,
      objectStyle,
      sceneObjects: sceneObjects.map((object) => ({ ...object })),
      floorMarks: floorMarks.map((mark) => ({ ...mark }))
    };
    setSceneSets((current) => [sceneSet, ...current]);
    setStatus(`Saved "${sceneSet.name}" as a reusable set.`);
  };

  const applySceneSet = (sceneSetId) => {
    const sceneSet = sceneSets.find((item) => item.id === sceneSetId);
    if (!sceneSet) return;
    recordHistory("load set");
    changeScene(sceneSet.scene);
    setBackgroundTheme(sceneSet.backgroundTheme || backgroundTheme);
    setObjectStyle(sceneSet.objectStyle || objectStyle);
    setSceneObjects(sceneSet.sceneObjects.map((object) => ({ ...object })));
    if (sceneSet.floorMarks?.length) setFloorMarks(sceneSet.floorMarks.map((mark) => ({ ...mark })));
    setSelectedSceneObjectId(sceneSet.sceneObjects[0]?.id || null);
    setStatus(`Loaded set "${sceneSet.name}".`);
  };

  const rememberAssetReference = (asset, importType) => {
    const reference = {
      id: `${asset.id}-${importType}`,
      assetId: asset.id,
      name: asset.name,
      provider: asset.provider,
      sourceUrl: asset.sourceUrl,
      license: asset.license,
      attribution: asset.attribution,
      format: asset.format,
      targets: asset.targets || [],
      importType,
      addedAt: new Date().toISOString()
    };
    setAssetReferences((current) => [
      reference,
      ...current.filter((item) => item.id !== reference.id)
    ]);
  };

  const importAsset = (assetId, importType) => {
    const asset = curatedAssetLibrary.find((item) => item.id === assetId);
    if (!asset) return;
    recordHistory("asset import");
    const safe = isOneClickSafeAsset(asset);
    rememberAssetReference(asset, importType);

    if (importType === "convert-to-puppet" && safe && self) {
      const nextCharacter = asset.recommended?.character || self.character;
      const baseCharacter = getCatalogItem(characterCatalog, nextCharacter);
      const nextState = createPerformerState({
        ...self.state,
        rigConfig: {
          ...baseCharacter.rigConfig,
          ...self.state.rigConfig,
          ...asset.recommended?.rigConfig
        },
        stylePreset: asset.recommended?.stylePreset || self.state.stylePreset,
        characterDesign: {
          name: asset.recommended?.characterDesign?.name || `${asset.name} Base`,
          color: asset.recommended?.characterDesign?.color || self.state.characterDesign?.color || baseCharacter.color,
          accent:
            asset.recommended?.characterDesign?.accent || self.state.characterDesign?.accent || baseCharacter.accent
        },
        mouthOpen: 0,
        speaking: false,
        macro: null,
        walking: false
      });
      const nextPerformer = { ...self, character: nextCharacter, state: nextState };
      setCharacter(nextCharacter);
      setPerformers((current) => upsertPerformer(current, nextPerformer));
      socketRef.current.emit("performer:configure", {
        name: nextPerformer.name,
        character: nextPerformer.character,
        state: nextPerformer.state
      });
      setStatus(`Converted "${asset.name}" into a customizable puppet starter.`);
      return;
    }

    if (importType === "use-as-sprite" && safe) {
      if (asset.recommended?.backgroundTheme) setBackgroundTheme(asset.recommended.backgroundTheme);
      if (asset.recommended?.objectStyle) setObjectStyle(asset.recommended.objectStyle);
      if (asset.targets?.some((targetItem) => ["object", "setting", "sprite"].includes(targetItem))) {
        addSceneObjectFromAsset(asset);
      }
      setStatus(`Added "${asset.name}" as a sprite/reference asset for this show.`);
      return;
    }

    setStatus(
      safe
        ? `Added "${asset.name}" to this show's asset references.`
        : `"${asset.name}" was saved as reference-only until its license is reviewed.`
    );
  };

  const configureSelfFromShow = (performer) => {
    if (!selfId || !performer) return;
    const nextPerformer = {
      id: selfId,
      name: performer.name || name,
      character: performer.character || character,
      state: createPerformerState({
        ...performer.state,
        x: self?.state.x ?? performer.state?.x ?? 48,
        y: self?.state.y ?? performer.state?.y ?? 60,
        mouthOpen: 0,
        speaking: false,
        macro: null,
        walking: false
      })
    };
    setName(nextPerformer.name);
    setCharacter(nextPerformer.character);
    setPerformers((current) => upsertPerformer(current, nextPerformer));
    socketRef.current.emit("performer:configure", {
      name: nextPerformer.name,
      character: nextPerformer.character,
      state: nextPerformer.state
    });
  };

  const changeScene = (nextScene) => {
    recordHistory("setting change");
    selectedSceneRef.current = nextScene;
    setScene(nextScene);
    socketRef.current.emit("scene:set", nextScene);
  };

  const triggerMacro = (macro) => {
    const macroItem = getCatalogItem(macroCatalog, macro);
    updateSelf({ macro });
    socketRef.current.emit("macro:trigger", macro);
    playSoundSting(macro === "panic" ? "zap" : macro === "hop" ? "pop" : "tap");
    flashMacro(selfId, macro);
    addPerformanceMoment({
      type: "macro",
      label: macroItem.name,
      detail: "Gesture cue fired live."
    });
    window.setTimeout(() => updateSelf({ macro: null }), 850);
  };

  const playSoundSting = async (kind = "tap") => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = audioRef.current.context || new AudioContext();
    audioRef.current.context = context;
    if (context.state === "suspended") await context.resume().catch(() => {});
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const settings = {
      tap: { type: "square", frequency: 440, end: 0.08, gain: 0.04 },
      pop: { type: "triangle", frequency: 660, end: 0.12, gain: 0.055 },
      thump: { type: "sine", frequency: 120, end: 0.16, gain: 0.075 },
      zap: { type: "sawtooth", frequency: 880, end: 0.14, gain: 0.045 },
      drop: { type: "sine", frequency: 180, end: 0.22, gain: 0.06 },
      button: { type: "triangle", frequency: 520, end: 0.1, gain: 0.05 }
    }[kind] || { type: "square", frequency: 440, end: 0.08, gain: 0.04 };
    oscillator.type = settings.type;
    oscillator.frequency.setValueAtTime(settings.frequency, now);
    if (kind === "drop") oscillator.frequency.exponentialRampToValueAtTime(70, now + settings.end);
    if (kind === "zap") oscillator.frequency.exponentialRampToValueAtTime(220, now + settings.end);
    gain.gain.setValueAtTime(settings.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + settings.end);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + settings.end);
  };

  const applyPerformancePreset = (presetId) => {
    const preset = getCatalogItem(performancePresetCatalog, presetId);
    updateSelf({
      ...preset.state,
      macro: null,
      walking: false,
      motionVx: 0,
      motionVy: 0,
      anticipationLean: 0,
      anticipationSquash: 1
    });
    if (preset.cameraShot) setCameraShot(preset.cameraShot);
    if (preset.lightingPreset) setLightingPreset(preset.lightingPreset);
    playSoundSting(preset.id === "chaotic" ? "pop" : "tap");
    addPerformanceMoment({
      type: "preset",
      label: preset.name,
      detail: preset.description
    });
    setStatus(`${preset.name} performance feel loaded.`);
  };

  const queueCameraTimer = (callback, delay) => {
    const timer = window.setTimeout(() => {
      callback();
      cameraTimersRef.current = cameraTimersRef.current.filter((item) => item !== timer);
    }, delay);
    cameraTimersRef.current.push(timer);
  };

  const triggerCameraPunch = () => {
    setCameraPunchScale(1.08);
    queueCameraTimer(() => setCameraPunchScale(1), 260);
  };

  const triggerCameraShake = () => {
    setCameraShakeOffset({ x: 0.8, y: -0.55 });
    queueCameraTimer(() => setCameraShakeOffset({ x: -0.55, y: 0.35 }), 70);
    queueCameraTimer(() => setCameraShakeOffset({ x: 0.32, y: 0.2 }), 140);
    queueCameraTimer(() => setCameraShakeOffset({ x: 0, y: 0 }), 230);
  };

  const resetDirectorCamera = () => {
    setCameraFollow(false);
    setCameraPunchScale(1);
    setCameraShakeOffset({ x: 0, y: 0 });
    setCameraShot("wide");
    setStatus("Director camera reset to a wide stage view.");
  };

  const applyDirectorAction = (actionId) => {
    const action = getCatalogItem(directorActionCatalog, actionId);
    if (action.cameraShot) {
      setCameraShot(action.cameraShot);
      if (action.cameraShot !== "wide") triggerCameraPunch();
    }
    if (action.lightingPreset) setLightingPreset(action.lightingPreset);
    if (action.selfState) updateSelf(action.selfState);
    if (action.propCue === "reveal") {
      if (!sceneObjects.length) {
        const sceneObject = createSceneObjectFromShape(
          { name: "Cue Prop", shape: "star", tint: "#fff2a8", texturePreset: "photocopy" },
          sceneObjects.length
        );
        setSceneObjects((current) => [...current, sceneObject]);
        setSelectedSceneObjectId(sceneObject.id);
      } else {
        const target = sceneObjects.find((object) => object.hidden) || sceneObjects[0];
        updateSceneObject(target.id, { hidden: !target.hidden, locked: false });
        setSelectedSceneObjectId(target.id);
      }
    }
    if (action.soundSting) {
      playSoundSting(action.soundSting);
      if (["thump", "zap", "drop"].includes(action.soundSting)) triggerCameraShake();
    }
    addPerformanceMoment({
      type: "director",
      label: action.name,
      detail: action.soundSting ? `${action.soundSting} sting` : "Director cue applied."
    });
    setStatus(`${action.name} setup applied.`);
  };

  const flashMacro = (performerId, macro) => {
    setPerformers((current) => {
      const performer = current[performerId];
      if (!performer) return current;
      return updatePerformerState(current, performerId, { macro });
    });
    window.setTimeout(() => {
      setPerformers((current) => {
        const performer = current[performerId];
        if (!performer) return current;
        return updatePerformerState(current, performerId, { macro: null });
      });
    }, 850);
  };

  const stopAudioMouthMeter = async ({ closeContext = false } = {}) => {
    if (audioRef.current.frame) cancelAnimationFrame(audioRef.current.frame);
    audioRef.current.source?.disconnect();
    if (closeContext && audioRef.current.context?.state !== "closed") {
      await audioRef.current.context.close().catch(() => {});
    }
    audioRef.current = {
      ...audioRef.current,
      analyser: null,
      context: closeContext ? null : audioRef.current.context,
      frame: null,
      lastMouthSentAt: 0,
      source: null
    };
  };

  const startAudioMouthMeter = async (stream) => {
    await stopAudioMouthMeter();
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = audioRef.current.context || new AudioContext();
    if (context.state === "suspended") await context.resume().catch(() => {});
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.72;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);

    audioRef.current = {
      ...audioRef.current,
      analyser,
      context,
      source
    };

    const sample = () => {
      if (!audioRef.current.analyser || !audioRef.current.stream) return;
      audioRef.current.analyser.getByteTimeDomainData(data);
      let total = 0;
      let peak = 0;
      for (const value of data) {
        const centered = Math.abs(value - 128) / 128;
        total += centered;
        peak = Math.max(peak, centered);
      }
      const average = total / data.length;
      const mouthOpen = clamp((average * 5.6 + peak * 1.4 - 0.055) * 3.2 * mouthSensitivityRef.current, 0, 1);
      const now = performance.now();
      if (mouthControlRef.current === "audio" && now - audioRef.current.lastMouthSentAt > 55) {
        audioRef.current.lastMouthSentAt = now;
        setMouthOpen(mouthOpen);
      }
      audioRef.current.frame = requestAnimationFrame(sample);
    };

    audioRef.current.frame = requestAnimationFrame(sample);
  };

  const toggleMic = async () => {
    if (micLive) {
      audioRef.current.recorder?.stop();
      audioRef.current.stream?.getTracks().forEach((track) => track.stop());
      await stopAudioMouthMeter();
      audioRef.current = { ...audioRef.current, recorder: null, stream: null };
      setMicLive(false);
      updateSelf({ mouthOpen: 0, speaking: false });
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    audioRef.current.stream = stream;
    audioRef.current.recorder = recorder;
    audioRef.current.sequence = 0;
    await startAudioMouthMeter(stream);

    recorder.ondataavailable = async (event) => {
      if (!event.data.size) return;
      const buffer = await event.data.arrayBuffer();
      socketRef.current.emit("audio:chunk", {
        buffer,
        mimeType: event.data.type,
        sequence: audioRef.current.sequence++
      });
    };
    recorder.start(250);
    setMicLive(true);
    if (mouthControlRef.current === "audio") {
      setStatus("Mic is driving automatic mouth movement.");
    } else {
      updateSelf({ speaking: true });
    }
  };

  const playRemoteAudio = async ({ data, mimeType }) => {
    if (!data) return;
    const audio = new Audio(`data:${mimeType};base64,${data}`);
    audio.volume = 0.8;
    await audio.play().catch(() => {});
  };

  const startMouthCamera = async () => {
    if (mouthCameraRef.current.stream) {
      setMouthCameraActive(true);
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240 },
      audio: false
    });
    mouthCameraRef.current.stream = stream;
    mouthCameraRef.current.baseline = null;
    setMouthCameraActive(true);

    if (mouthVideoRef.current) {
      mouthVideoRef.current.srcObject = stream;
      await mouthVideoRef.current.play().catch(() => {});
    }

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 48;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    const sample = () => {
      const video = mouthVideoRef.current;
      if (!video || !mouthCameraRef.current.stream) return;
      if (video.readyState >= 2) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = context.getImageData(20, 27, 24, 14).data;
        let total = 0;
        for (let index = 0; index < image.length; index += 4) {
          total += (image[index] + image[index + 1] + image[index + 2]) / 3;
        }
        const average = total / (image.length / 4);
        const baseline = mouthCameraRef.current.baseline ?? average;
        mouthCameraRef.current.baseline = baseline * 0.92 + average * 0.08;
        const mouthOpen = clamp(Math.abs(average - baseline) / 34, 0, 1);
        const now = performance.now();
        if (now - mouthCameraRef.current.lastSentAt > 80) {
          mouthCameraRef.current.lastSentAt = now;
          setMouthOpen(mouthOpen);
        }
      }
      mouthCameraRef.current.frame = requestAnimationFrame(sample);
    };

    mouthCameraRef.current.frame = requestAnimationFrame(sample);
  };

  const stopMouthCamera = () => {
    if (mouthCameraRef.current.frame) {
      cancelAnimationFrame(mouthCameraRef.current.frame);
    }
    mouthCameraRef.current.stream?.getTracks().forEach((track) => track.stop());
    mouthCameraRef.current = { stream: null, frame: null, baseline: null, lastSentAt: 0 };
    if (mouthVideoRef.current) {
      mouthVideoRef.current.srcObject = null;
    }
    setMouthCameraActive(false);
  };

  const handleStagePointerMove = (event) => {
    if (mode !== "perform" && mode !== "build") return;
    if (!self || self.state.mouthControl !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const y = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
    setMouthOpen(Math.pow(1 - y, 1.35));
  };

  const handleStagePointerLeave = () => {
    if (mode !== "perform" && mode !== "build") return;
    if (!self || self.state.mouthControl !== "mouse") return;
    setMouthOpen(0, { immediate: true });
  };

  const toggleTake = () => {
    if (recording) {
      addPerformanceMoment({ type: "take", label: "Stop take", detail: "Saving the performance for replay." });
      socketRef.current.emit("take:stop");
      return;
    }
    addPerformanceMoment({ type: "take", label: "Record take", detail: "Live performance capture started." });
    socketRef.current.emit("take:start", {
      cameraShot,
      lightingPreset,
      backgroundTheme,
      objectStyle,
      sceneObjects: sceneObjects.map((object) => ({ ...object })),
      floorMarks: floorMarks.map((mark) => ({ ...mark })),
      directorCamera: {
        follow: cameraFollow,
        pan: directorCameraPan,
        punchScale: cameraPunchScale
      }
    });
  };

  const openReviewMode = () => {
    loadTakeLibrary();
    setMode("edit");
  };

  const downloadJson = (payload, filename) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadTakeLibrary = async () => {
    const response = await fetch(`${SERVER_URL}/api/rooms/${encodeURIComponent(roomId)}/takes`);
    if (!response.ok) {
      setTakeLibrary([]);
      return;
    }
    const library = await response.json();
    setTakeLibrary(library.takes || []);
  };

  const loadTakeById = async (takeId, { select = false, review = false, roomOverride = roomId } = {}) => {
    const response = await fetch(
      `${SERVER_URL}/api/rooms/${encodeURIComponent(roomOverride)}/takes/${encodeURIComponent(takeId)}`
    );
    if (!response.ok) return null;
    const take = await response.json();
    if (select) {
      clearPlayback();
      setSelectedTake(take);
      setPreviewPerformers(makePreviewPerformers(take));
      setScene(take.scene);
      setCameraShot(take.cameraShot || "wide");
      setLightingPreset(take.lightingPreset || "scene");
      setCameraFollow(Boolean(take.directorCamera?.follow));
      setCameraPunchScale(take.directorCamera?.punchScale || 1);
      setCameraShakeOffset({ x: 0, y: 0 });
      if (review) setMode("edit");
    }
    return take;
  };

  const selectTake = async (takeId) => {
    await loadTakeById(takeId, { select: true, review: true });
  };

  const clearPlayback = () => {
    playbackTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    playbackTimersRef.current = [];
    setPlaybackActive(false);
  };

  const playTake = (take) => {
    if (!take) return;
    clearPlayback();
    setScene(take.scene);
    setPreviewPerformers(makePreviewPerformers(take));
    setPlaybackActive(true);

    const events = [...take.tracks.motion].sort((a, b) => a.at - b.at);
    const lastAt = events.length ? events[events.length - 1].at : take.durationMs || 0;

    playbackTimersRef.current = events.map((event) =>
      window.setTimeout(() => {
        if (event.type === "performer:update") {
          setPreviewPerformers((current) =>
            updatePerformerState(current || {}, event.performerId, event.state)
          );
        }
        if (event.type === "performer:joined") {
          setPreviewPerformers((current) => upsertPerformer(current || {}, event.performer));
        }
        if (event.type === "performer:configured") {
          setPreviewPerformers((current) => upsertPerformer(current || {}, event.performer));
        }
        if (event.type === "performer:left") {
          setPreviewPerformers((current) => removePerformer(current || {}, event.performerId));
        }
        if (event.type === "scene:set") setScene(event.scene);
        if (event.type === "macro:trigger") {
          setPreviewPerformers((current) =>
            updatePerformerState(current || {}, event.performerId, { macro: event.macro })
          );
        }
      }, event.at)
    );

    playbackTimersRef.current.push(
      window.setTimeout(() => {
        setPlaybackActive(false);
      }, lastAt + 250)
    );
  };

  const playSelectedTake = () => playTake(selectedTake);

  const activeShowToolbox = useMemo(
    () =>
      createShowToolbox({
        showName,
        cast: activePerformers,
        sceneObjects,
        sceneSets,
        assetReferences,
        storyboardPanels,
        timeline: productionTimeline,
        takes: takeLibrary,
        style: {
          ...activeAnimationStyle,
          backgroundTheme,
          objectStyle
        },
        episodeStatus,
        doinkSubmission
      }),
    [
      showName,
      activePerformers,
      sceneObjects,
      sceneSets,
      assetReferences,
      storyboardPanels,
      productionTimeline,
      takeLibrary,
      activeAnimationStyle,
      backgroundTheme,
      objectStyle,
      episodeStatus,
      doinkSubmission
    ]
  );
  const showSaveManifest = useMemo(
    () => [
      { id: "cast", label: "Cast", count: activePerformers.length },
      { id: "sets", label: "Sets", count: sceneSets.length },
      { id: "props", label: "Props", count: sceneObjects.length },
      { id: "boards", label: "Boards", count: storyboardPanels.length },
      { id: "takes", label: "Takes", count: takeLibrary.length },
      { id: "cuts", label: "Cuts", count: productionTimeline.length },
      { id: "credits", label: "Credits", count: assetReferences.length },
      { id: "exports", label: "Exports", count: exportHistory.length }
    ],
    [activePerformers.length, sceneSets.length, sceneObjects.length, storyboardPanels.length, takeLibrary.length, productionTimeline.length, assetReferences.length, exportHistory.length]
  );
  const showSaveSummary = useMemo(
    () => ({
      totalItems: showSaveManifest.reduce((total, item) => total + item.count, 0),
      lastAutosaveAt,
      lastManualSave,
      selectedShowName: savedShows.find((show) => show.id === selectedShowId)?.showName || "",
      destination: lastManualSave?.destination || (selectedShowId ? "Saved show" : "New show")
    }),
    [showSaveManifest, lastAutosaveAt, lastManualSave, savedShows, selectedShowId]
  );
  const cameraTarget = useMemo(
    () => (cameraFollow ? stagePerformers.find((performer) => performer.id === selfId) || stagePerformers[0] || null : null),
    [cameraFollow, selfId, stagePerformers]
  );
  const directorCameraPan = cameraTarget
    ? {
        x: clamp((50 - cameraTarget.state.x) * 0.34, -12, 12),
        y: clamp((62 - cameraTarget.state.y) * 0.28, -9, 9)
      }
    : { x: 0, y: 0 };
  const selectedStoryboardPanel = useMemo(
    () => storyboardPanels.find((panel) => panel.id === selectedStoryboardId) || null,
    [selectedStoryboardId, storyboardPanels]
  );
  const selectedSceneObject = useMemo(
    () => sceneObjects.find((object) => object.id === selectedSceneObjectId) || null,
    [sceneObjects, selectedSceneObjectId]
  );
  const workspace = getWorkspaceIdentity(mode);

  const addStoryboardPanel = () => {
    const panel = createStoryboardPanel({
      scene,
      performers: activePerformers,
      index: storyboardPanels.length + 1,
      backgroundTheme,
      objectStyle,
      texturePreset: stageTexturePreset,
      sceneObjects,
      floorMarks
    });
    panel.shot = cameraShot;
    panel.lightingPreset = lightingPreset;
    panel.cameraFraming = { follow: cameraFollow, pan: directorCameraPan, punchScale: cameraPunchScale };
    setStoryboardPanels((current) => [...current, panel]);
    setSelectedStoryboardId(panel.id);
    setMode("storyboard");
  };

  const updateStoryboardPanel = () => {
    if (!selectedStoryboardId) return;
    setStoryboardPanels((current) =>
      current.map((panel) =>
        panel.id === selectedStoryboardId
          ? {
              ...panel,
              scene,
              shot: cameraShot,
              lightingPreset,
              cameraFraming: { follow: cameraFollow, pan: directorCameraPan, punchScale: cameraPunchScale },
              backgroundTheme,
              objectStyle,
              texturePreset: stageTexturePreset,
              sceneObjects,
              floorMarks,
              performers: clonePerformers(activePerformers)
            }
          : panel
      )
    );
  };

  const duplicateStoryboardPanel = () => {
    if (!selectedStoryboardPanel) return;
    const panel = {
      ...selectedStoryboardPanel,
      id: `panel-${Date.now()}-${Math.round(Math.random() * 10000)}`,
      title: `${selectedStoryboardPanel.title} copy`,
      sceneObjects: (selectedStoryboardPanel.sceneObjects || []).map((object) => ({ ...object })),
      floorMarks: (selectedStoryboardPanel.floorMarks || []).map((mark) => ({ ...mark })),
      performers: clonePerformers(selectedStoryboardPanel.performers)
    };
    setStoryboardPanels((current) => [...current, panel]);
    setSelectedStoryboardId(panel.id);
  };

  const deleteStoryboardPanel = () => {
    if (!selectedStoryboardId) return;
    const next = storyboardPanels.filter((panel) => panel.id !== selectedStoryboardId);
    setStoryboardPanels(next);
    setSelectedStoryboardId(next.length ? next[next.length - 1].id : null);
  };

  const updateStoryboardPanelMeta = (patch) => {
    if (!selectedStoryboardId) return;
    setStoryboardPanels((current) =>
      current.map((panel) => (panel.id === selectedStoryboardId ? { ...panel, ...patch } : panel))
    );
  };

  const addStoryboardPanelToTimeline = (panelId) => {
    const panel = storyboardPanels.find((item) => item.id === panelId);
    if (!panel) return;
    setProductionTimeline((current) => [
      ...current,
      createTimelineClip({
        source: { ...panel, sourceType: "storyboard" },
        index: current.length + 1
      })
    ]);
    setMode("edit");
  };

  const addTakeToTimeline = (take) => {
    setProductionTimeline((current) => [
      ...current,
      createTimelineClip({
        source: {
          ...take,
          sourceType: "take",
          title: take.name,
          duration: take.durationMs,
          lightingPreset,
          backgroundTheme,
          objectStyle
        },
        index: current.length + 1
      })
    ]);
    setStatus(`Added "${take.name || "take"}" to the cut. Export the short when it feels good enough.`);
  };

  const keepSelectedTake = () => {
    if (!selectedTake) return;
    const keeperName = selectedTake.name?.trim() || `Keeper ${takeLibrary.length || 1}`;
    const keeperTake = { ...selectedTake, name: keeperName, best: true };
    setSelectedTake(keeperTake);
    setTakeLibrary((current) =>
      current.map((take) => (take.id === keeperTake.id ? keeperTake : { ...take, best: false }))
    );
    setProductionTimeline((current) => {
      if (current.some((clip) => clip.sourceType === "take" && clip.sourceId === keeperTake.id)) return current;
      return [
        ...current,
        createTimelineClip({
          source: {
            ...keeperTake,
            sourceType: "take",
            title: keeperTake.name,
            duration: keeperTake.durationMs,
            lightingPreset,
            backgroundTheme,
            objectStyle
          },
          index: current.length + 1
        })
      ];
    });
    setFinishTarget("rough-cut");
    setEpisodeStatus((current) => (current === "draft" ? "rough_cut" : current));
    setStatus(`Kept "${keeperName}" as the best take and added it to the rough cut.`);
  };

  const removeTimelineClip = (clipId) => {
    setProductionTimeline((current) => current.filter((clip) => clip.id !== clipId));
  };

  const updateTimelineClip = (clipId, patch) => {
    setProductionTimeline((current) =>
      current.map((clip) => (clip.id === clipId ? { ...clip, ...patch } : clip))
    );
  };

  const moveTimelineClip = (clipId, direction) => {
    setProductionTimeline((current) => {
      const index = current.findIndex((clip) => clip.id === clipId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [clip] = next.splice(index, 1);
      next.splice(nextIndex, 0, clip);
      return next.map((item, itemIndex) => ({ ...item, index: itemIndex + 1 }));
    });
  };

  const trimTimelineClip = (clipId, deltaMs) => {
    setProductionTimeline((current) =>
      current.map((clip) =>
        clip.id === clipId
          ? { ...clip, duration: Math.max(1000, (clip.duration || 5000) + deltaMs) }
          : clip
      )
    );
  };

  const quickTrimSelectedTake = (edge) => {
    if (!selectedTake) return;
    const trimMs = 500;
    const currentStart = selectedTake.trimStartMs || 0;
    const currentEnd = selectedTake.trimEndMs ?? selectedTake.durationMs;
    const nextTake =
      edge === "start"
        ? { ...selectedTake, trimStartMs: Math.min(currentStart + trimMs, Math.max(0, currentEnd - 1000)) }
        : { ...selectedTake, trimEndMs: Math.max(currentStart + 1000, currentEnd - trimMs) };
    setSelectedTake(nextTake);
    setTakeLibrary((current) => current.map((take) => (take.id === nextTake.id ? nextTake : take)));
    setStatus(`Trimmed ${edge} by half a second for review.`);
  };

  const updateSelectedTakeMeta = (patch) => {
    if (!selectedTake) return;
    const nextTake = { ...selectedTake, ...patch };
    setSelectedTake(nextTake);
    setTakeLibrary((current) =>
      current.map((take) => (take.id === nextTake.id ? { ...take, ...patch } : take))
    );
  };

  const markSelectedTakeBest = () => {
    if (!selectedTake) return;
    setSelectedTake({ ...selectedTake, best: true });
    setTakeLibrary((current) =>
      current.map((take) => ({ ...take, best: take.id === selectedTake.id }))
    );
    setStatus(`Marked "${selectedTake.name || "take"}" as the best take for this short.`);
  };

  const saveSelectedTakeAsScene = () => {
    if (!selectedTake) return;
    const panel = createStoryboardPanel({
      scene: selectedTake.scene || scene,
      performers: performerList(makePreviewPerformers(selectedTake)),
      index: storyboardPanels.length + 1,
      backgroundTheme,
      objectStyle,
      texturePreset: stageTexturePreset,
      sceneObjects,
      floorMarks
    });
    panel.title = `${selectedTake.name || "Take"} scene`;
    panel.caption = "Saved from a recorded performance.";
    panel.duration = formatDuration(selectedTake.durationMs);
    panel.shot = cameraShot;
    panel.lightingPreset = lightingPreset;
    setStoryboardPanels((current) => [...current, panel]);
    setSelectedStoryboardId(panel.id);
    setStatus(`Saved "${panel.title}" as a scene board.`);
  };

  const performStoryboardPanel = (panelId) => {
    const panel = storyboardPanels.find((item) => item.id === panelId);
    if (!panel) return;
    setScene(panel.scene);
    setCameraShot(panel.shot || "wide");
    setLightingPreset(panel.lightingPreset || "scene");
    setBackgroundTheme(panel.backgroundTheme || "scene-native");
    setObjectStyle(panel.objectStyle || "match-character");
    setMode("perform");
    setStatus(`Ready to perform "${panel.title}".`);
  };

  const createCurrentProjectExport = () =>
    createProjectExport({
      roomId,
      showName,
      scene,
      perspective: selectedScene.perspective,
      sceneDepth: {
        horizon: selectedScene.horizon,
        foreground: selectedScene.foreground,
        focusX: selectedScene.vanishingX || 50,
        focusY: selectedScene.focusY || selectedScene.horizon,
        horizonSource: selectedScene.horizonSource,
        movementModel: selectedScene.movementModel
      },
      cameraShot,
      directorCamera: {
        follow: cameraFollow,
        pan: directorCameraPan,
        punchScale: cameraPunchScale
      },
      lightingPreset,
      backgroundTheme,
      objectStyle,
      episodeStatus,
      sceneObjects,
      sceneSets,
      floorMarks,
      assetReferences,
      storyboardPanels,
      timeline: productionTimeline,
      takes: takeLibrary,
      showToolbox: activeShowToolbox
    });

  const resolveFinishTake = (target = finishTarget) => {
    return resolveFinishTakeFromState({ target, selectedTake, takeLibrary, productionTimeline });
  };

  const describeFinishTarget = (target = finishTarget) => {
    return describeFinishTargetFromState({ target, selectedTake, takeLibrary, productionTimeline });
  };

  const exportProject = () => {
    const project = createCurrentProjectExport();
    const targetTake = resolveFinishTake();
    attachFinishMetadata({
      project,
      renderJob,
      finishTarget,
      finishTargetLabel: describeFinishTarget(),
      targetTake,
      productionTimeline
    });
    const selectedThumbnail = targetTake ? createTakeThumbnailDataUrl(targetTake) : "";
    if (selectedThumbnail) {
      project.publishingPackage.thumbnail = {
        ...project.publishingPackage.thumbnail,
        source: "selected-take-preview",
        takeId: targetTake.id,
        dataUrl: selectedThumbnail,
        fileName: `pup-it-${targetTake.id || "take"}-thumbnail.png`
      };
    }
    downloadJson(project, `pup-it-${roomId}-project.json`);
    setExportHistory((current) => [
      { id: `short-${Date.now()}`, type: "short-package", exportedAt: new Date().toISOString() },
      ...current
    ]);
    setStatus("Exported short package. Use 720p WEBM for review video and Submit to DoinkTV for handoff.");
  };

  const exportSelectedTakeThumbnail = () => {
    const targetTake = resolveFinishTake();
    if (!targetTake) return;
    const safeName = (targetTake.name || targetTake.id || "take")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    downloadDataUrl(createTakeThumbnailDataUrl(targetTake), `pup-it-${safeName || "take"}-thumbnail.png`);
    setExportHistory((current) => [
      { id: `thumbnail-${Date.now()}`, type: "thumbnail-png", exportedAt: new Date().toISOString() },
      ...current
    ]);
    setStatus("Thumbnail PNG exported for the selected take.");
  };

  const requestBackendRender = async () => {
    if (backendRendering) return;
    const project = createCurrentProjectExport();
    const submissionTake = resolveFinishTake();
    if (!submissionTake && !productionTimeline.length) {
      setStatus("Record a take or add clips to the rough cut before rendering.");
      return;
    }
    const renderModel = createRenderModel({
      project,
      selectedTake: submissionTake,
      timeline: productionTimeline,
      timelineTakes: takeLibrary,
      finishTarget,
      title: doinkSubmission.title || submissionTake?.name || `${showName} Short`,
      requestedBy: doinkSubmission.creatorName || name
    });
    renderModel.finishTarget = {
      type: finishTarget,
      label: describeFinishTarget(),
      timelineClipCount: productionTimeline.length
    };
    setRenderJob({
      id: `pending-${Date.now()}`,
      status: "running",
      renderer: "browser-server",
      request: { renderModel },
      output: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setBackendRendering(true);
    setStatus(`Sending ${describeFinishTarget()} to the backend render queue.`);
    try {
      const response = await fetch(`${SERVER_URL}/api/render-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          renderer: "browser-server",
          title: doinkSubmission.title || submissionTake?.name || `${showName} Short`,
          project,
          selectedTake: submissionTake,
          timeline: productionTimeline,
          finishTarget,
          renderModel,
          requestedBy: doinkSubmission.creatorName || name
        })
      });
      if (!response.ok) throw new Error("Backend render endpoint rejected the job.");
      const data = await response.json();
      setRenderJob(data.renderJob);
      setExportHistory((current) => [
        { id: data.renderJob.id, type: "backend-render", exportedAt: new Date().toISOString() },
        ...current
      ]);
      setStatus(`Backend render ${data.renderJob.status}. ${data.renderJob.output?.videoPath || "Artifact path pending."}`);
    } catch (error) {
      setRenderJob((current) => ({
        ...(current || {}),
        id: current?.id || `failed-${Date.now()}`,
        status: "failed",
        renderer: "browser-server",
        output: current?.output || {},
        error: error.message || "Backend render request failed.",
        updatedAt: new Date().toISOString()
      }));
      setStatus(error.message || "Backend render request failed.");
    } finally {
      setBackendRendering(false);
    }
  };

  const updateDoinkSubmission = (patch) => {
    setDoinkSubmission((current) => ({ ...current, ...patch }));
  };

  const submitToDoinkTv = async () => {
    if (doinkSubmitting) return;
    const project = createCurrentProjectExport();
    const submissionTake = resolveFinishTake();
    const projectPackageFileName = `pup-it-${roomId}-project.json`;
    const previewVideoFileName = renderJob?.output?.videoPath || (submissionTake
      ? `pup-it-${submissionTake.id || "take"}-preview.webm`
      : null);
    if (renderJob?.output?.videoPath) {
      attachFinishMetadata({
        project,
        renderJob,
        finishTarget,
        finishTargetLabel: describeFinishTarget(),
        targetTake: submissionTake,
        productionTimeline
      });
    } else {
      attachFinishMetadata({
        project,
        finishTarget,
        finishTargetLabel: describeFinishTarget(),
        targetTake: submissionTake,
        productionTimeline
      });
    }
    const submissionPackage = createDoinkTvSubmissionPackage({
      project,
      submission: {
        ...doinkSubmission,
        title: doinkSubmission.title.trim() || `${showName || "Untitled Show"} Short`
      },
      selectedTake: submissionTake,
      previewVideoFileName,
      projectPackageFileName
    });

    setDoinkSubmitting(true);
    try {
      const submissionUrl = DOINKTV_SUBMISSION_URL || `${SERVER_URL}/api/doinktv/submissions`;
      if (submissionUrl) {
        const response = await fetch(submissionUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project,
            submission: submissionPackage,
            selectedTake: submissionTake,
            renderJob,
            previewVideoFileName: renderJob?.output?.videoPath || previewVideoFileName,
            projectPackageFileName
          })
        });
        if (!response.ok) throw new Error("DoinkTV submission endpoint rejected the package.");
        const data = await response.json().catch(() => ({}));
        setStatus(data.review?.message || "Submitted to DoinkTV for admin review.");
      }
      setEpisodeStatus("submitted");
      setExportHistory((current) => [
        { id: `doinktv-${Date.now()}`, type: "doinktv-submission", exportedAt: new Date().toISOString() },
        ...current
      ]);
    } catch (error) {
      setStatus(error.message || "DoinkTV submission failed. Export the package and try again.");
    } finally {
      setDoinkSubmitting(false);
    }
  };

  const exportSelectedTakeVideo = async () => {
    const targetTake = resolveFinishTake();
    if (!targetTake || videoExporting) return;
    setVideoExporting(true);
    setStatus(`Rendering a 720p WEBM deliverable from ${describeFinishTarget()}. Keep this tab open for a moment.`);
    try {
      const blob = await exportTakePreviewVideo(targetTake, {
        onFrame: (progress) => {
          if (progress === 0 || progress >= 0.98) return;
          setStatus(`Rendering 720p WEBM ${Math.round(progress * 100)}%.`);
        }
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeName = (targetTake.name || targetTake.id || "take")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      link.download = `pup-it-${safeName || "take"}-preview.webm`;
      link.click();
      URL.revokeObjectURL(url);
      setExportHistory((current) => [
        { id: `video-${Date.now()}`, type: "preview-webm", exportedAt: new Date().toISOString() },
        ...current
      ]);
      setStatus("720p WEBM exported. Submit to DoinkTV with the package when the short is ready for review.");
    } catch (error) {
      setStatus(error.message || "Preview video export failed in this browser.");
    } finally {
      setVideoExporting(false);
    }
  };

  const applyShowTemplate = (templateId) => {
    const template = getCatalogItem(showStarterTemplates, templateId);
    changeScene(template.scene);
    setCameraShot(template.cameraShot);
    setLightingPreset(template.lightingPreset);
    setBackgroundTheme(template.backgroundTheme);
    setObjectStyle(template.objectStyle);
    setAssetTarget("setting");
    setAssetSearch(template.assetSearch);
    setMode("perform");
    setStatus(`${template.name} template loaded. Rehearse, record, then review the take.`);
  };

  const applyShotTemplate = (templateId) => {
    const template = getCatalogItem(shotTemplateCatalog, templateId);
    changeScene(template.scene);
    setCameraShot(template.cameraShot);
    setLightingPreset(template.lightingPreset);
    setBackgroundTheme(template.backgroundTheme);
    setObjectStyle(template.objectStyle);
    setFloorMarks(template.marks.map((mark) => ({ ...mark })));
    if (template.marks[0] && self) {
      const templateScene = getCatalogItem(sceneCatalog, template.scene);
      const floorPoint = clampPointToFloor(
        { x: template.marks[0].x, y: template.marks[0].y },
        templateScene
      );
      updateSelf({
        x: floorPoint.x,
        y: floorPoint.y,
        walking: false,
        motionVx: 0,
        motionVy: 0,
        groundSpeed: 0,
        travelLean: 0
      });
    }
    setMode("perform");
    setStatus(`${template.name} shot template loaded with ${template.marks.length} floor marks.`);
  };

  const openAssetSearch = (query, target = "all") => {
    setAssetSearch(query);
    setAssetTarget(target);
    setMode("assets");
    setStatus(`Searching assets for "${query}".`);
  };

  const applyPolishPass = (kind) => {
    if (kind === "lighting") {
      setLightingPreset("flat-tv");
      setBackgroundTheme("painted-depth");
      setObjectStyle("thin-ink");
      setStatus("Applied a cleaner TV lighting pass.");
      return;
    }
    if (kind === "texture") {
      setBackgroundTheme("pattern-held");
      setObjectStyle("paper-cut");
      setStatus("Applied a textured mixed-media pass.");
      return;
    }
    setCameraShot("reaction");
    triggerCameraPunch();
    setLightingPreset("dramatic");
    setStatus("Applied a punchier camera and reaction setup.");
  };

  const primaryNextAction = (() => {
    if (!beginnerProgress.hasStartedShort) {
      return { label: "Start Show", detail: "Pick a rough launch pad.", action: () => startQuickShort("argument") };
    }
    if (!beginnerProgress.hasRig) {
      return { label: "Build Rig", detail: "Make the performer yours.", action: () => setMode("build") };
    }
    if (!beginnerProgress.hasSet) {
      return { label: "Build Space", detail: "Drop something into the space.", action: () => setMode("assets") };
    }
    if (!beginnerProgress.hasTake) {
      return { label: recording ? "Stop Take" : beginnerProgress.hasRehearsed ? "Record Take" : "Go Perform", detail: "Capture the bit.", action: beginnerProgress.hasRehearsed ? toggleTake : () => setMode("perform") };
    }
    if (!beginnerProgress.hasCut) {
      return { label: "Review Take", detail: "Replay and save the scene.", action: () => setMode("edit") };
    }
    if (!beginnerProgress.exported) {
      return { label: "Finish Short", detail: "Render or package the finished handoff.", action: () => setMode("edit") };
    }
    return { label: "Submit DoinkTV", detail: "Send the short for review.", action: () => setMode("edit") };
  })();

  const commandItems = [
    { id: "next", label: `Next: ${primaryNextAction.label}`, keywords: "next step continue beginner flow do next", action: primaryNextAction.action },
    { id: "home", label: "Open show dashboard", keywords: "setup home project show", action: () => setMode("home") },
    { id: "cast", label: "Edit current character", keywords: "cast character rig build customize", action: () => setMode("build") },
    { id: "playground", label: "Open character playground", keywords: "playground weird mutate original character toybox", action: () => setMode("build") },
    { id: "mutate", label: "Make current character weirder", keywords: "mutate random weird rough original", action: () => { setMode("build"); applyCharacterMutation("odd-body"); } },
    { id: "sets", label: "Search settings and props", keywords: "assets objects settings props backgrounds", action: () => openAssetSearch("", "setting") },
    { id: "shots", label: "Open shot templates", keywords: "shot template blocking marks two shot reaction", action: () => setMode("perform") },
    { id: "mouth", label: "Find mouth and rig parts", keywords: "mouth face rig part lips", action: () => openAssetSearch("mouth", "rig-part") },
    { id: "kitchen", label: "Find kitchen scene pieces", keywords: "kitchen diner room background furniture", action: () => openAssetSearch("kitchen", "setting") },
    { id: "record", label: recording ? "Stop recording take" : "Record a take", keywords: "record stop take performance", action: toggleTake },
    { id: "review", label: "Review recorded scenes", keywords: "edit takes timeline review finish", action: openReviewMode },
    { id: "board", label: "Open storyboard mode", keywords: "storyboard panel comic strip planning", action: () => setMode("storyboard") },
    { id: "save", label: "Save show", keywords: "save autosave show session project", action: () => saveShowSession() },
    { id: "undo", label: "Undo last creative edit", keywords: "undo revert back history", action: undoLastAction, disabled: !historyPast.length },
    { id: "redo", label: "Redo creative edit", keywords: "redo forward history", action: redoLastAction, disabled: !historyFuture.length },
    { id: "export", label: "Export short package", keywords: "finish export publish package video project", action: exportProject },
    { id: "submit-doinktv", label: "Submit to DoinkTV", keywords: "finish submit doinktv publish review package", action: submitToDoinkTv },
    { id: "light-polish", label: "Make it look cleaner", keywords: "lighting polish better professional clean", action: () => applyPolishPass("lighting") },
    { id: "texture-polish", label: "Add mixed-media texture", keywords: "texture paper pattern style weird", action: () => applyPolishPass("texture") },
    { id: "punch-polish", label: "Punch in for a reaction", keywords: "camera close reaction punch button", action: () => applyPolishPass("camera") }
  ];

  const runCommand = (command) => {
    if (command.disabled) return;
    command.action();
    setCommandQuery("");
    setCommandFocused(false);
    commandInputRef.current?.blur();
  };

  useEffect(() => {
    const handleCommandKeys = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandFocused(true);
        commandInputRef.current?.focus();
        commandInputRef.current?.select();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undoLastAction();
        return;
      }
      if (((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") || ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "z")) {
        event.preventDefault();
        redoLastAction();
        return;
      }
      if (event.key === "Escape" && commandFocused) {
        setCommandQuery("");
        setCommandFocused(false);
        commandInputRef.current?.blur();
        return;
      }
      if (event.key === "Enter" && commandFocused) {
        const query = commandQuery.trim().toLowerCase();
        const queryTokens = query.split(/\s+/).filter(Boolean);
        const match = (query
          ? commandItems.find((command) => {
              const haystack = `${command.label} ${command.keywords}`.toLowerCase();
              return queryTokens.every((token) => haystack.includes(token));
            })
          : commandItems[0]);
        if (match) {
          event.preventDefault();
          runCommand(match);
        }
      }
    };

    window.addEventListener("keydown", handleCommandKeys);
    return () => window.removeEventListener("keydown", handleCommandKeys);
  });

  const createShowSession = () => {
    const cleanShowName = showName.trim() || "Untitled Show";
    const selectedShow = savedShows.find((show) => show.id === selectedShowId);
    const id =
      selectedShow && selectedShow.showName === cleanShowName
        ? selectedShow.id
        : makeShowId(cleanShowName);
    return {
      schemaVersion: "pup-it.show.v1",
      id,
      showName: cleanShowName,
      savedAt: new Date().toISOString(),
      roomId,
      scene,
      perspective: selectedScene.perspective,
      cameraShot,
      lightingPreset,
      backgroundTheme,
      objectStyle,
      cast: clonePerformers(activePerformers),
      episodeStatus,
      sceneObjects,
      sceneSets,
      floorMarks,
      assetReferences,
      storyboardPanels,
      productionTimeline,
      takes: takeLibrary.map(summarizeTakeForShow),
      doinkSubmission,
      showToolbox: activeShowToolbox
    };
  };

  useEffect(() => {
    if (!joined) return undefined;
    const timer = window.setTimeout(() => {
      try {
        const session = createShowSession();
        window.localStorage.setItem(AUTOSAVE_DRAFT_KEY, JSON.stringify(session));
        setAutosaveDraft(session);
        setLastAutosaveAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
      } catch (_error) {
        setLastAutosaveAt("paused");
      }
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [
    joined,
    showName,
    roomId,
    scene,
    cameraShot,
    lightingPreset,
    backgroundTheme,
    objectStyle,
    activePerformers,
    sceneObjects,
    sceneSets,
    floorMarks,
    assetReferences,
    storyboardPanels,
    productionTimeline,
    takeLibrary,
    doinkSubmission,
    activeShowToolbox
  ]);

  const saveShowSession = async () => {
    const session = createShowSession();
    try {
      const persistedSession = await persistShowSession(session);
      await persistEpisodeSnapshot(persistedSession.databaseId || persistedSession.id, {
        ...session,
        id: persistedSession.id
      });
      const nextShows = [
        persistedSession,
        ...savedShows.filter((show) => show.id !== persistedSession.id)
      ].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      setSavedShows(nextShows);
      setSelectedShowId(persistedSession.id);
      setShowName(persistedSession.showName);
      setLastManualSave({
        at: new Date().toISOString(),
        destination: "Postgres",
        showName: persistedSession.showName,
        id: persistedSession.id
      });
      setStatus(`Saved show "${persistedSession.showName}" and episode status to Postgres.`);
    } catch (_databaseError) {
      const nextShows = [
        session,
        ...savedShows.filter((show) => show.id !== session.id)
      ].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      writeStoredShows(nextShows);
      setSavedShows(nextShows);
      setSelectedShowId(session.id);
      setShowName(session.showName);
      setLastManualSave({
        at: new Date().toISOString(),
        destination: "Local browser",
        showName: session.showName,
        id: session.id
      });
      setStatus(`Saved show "${session.showName}" locally. Set DATABASE_URL to enable Postgres persistence.`);
    }
  };

  const loadShowSession = (showId = selectedShowId) => {
    const session = savedShows.find((show) => show.id === showId);
    if (!session) return;
    clearPlayback();
    setSelectedShowId(session.id);
    setShowName(session.showName);
    setRoomId(session.roomId || roomId);
    setCameraShot(session.cameraShot || "wide");
    setCameraFollow(Boolean(session.directorCamera?.follow));
    setCameraPunchScale(session.directorCamera?.punchScale || 1);
    setCameraShakeOffset({ x: 0, y: 0 });
    setLightingPreset(session.lightingPreset || "scene");
    setBackgroundTheme(session.backgroundTheme || "painted-depth");
    setObjectStyle(session.objectStyle || "soft-material");
    setEpisodeStatus(session.episodeStatus || "draft");
    setSceneObjects(session.sceneObjects || []);
    setSelectedSceneObjectId(session.sceneObjects?.[0]?.id || null);
    setSceneSets(session.sceneSets || []);
    setFloorMarks(session.floorMarks || createDefaultFloorMarks(getCatalogItem(sceneCatalog, session.scene || sceneCatalog[0].id)));
    setStoryboardPanels(session.storyboardPanels || []);
    setSelectedStoryboardId(session.storyboardPanels?.[0]?.id || null);
    setProductionTimeline(session.productionTimeline || session.timeline || []);
    setAssetReferences(session.assetReferences || []);
    setDoinkSubmission((current) => ({ ...current, ...(session.doinkSubmission || {}) }));
    setPreviewPerformers(null);
    changeScene(session.scene || sceneCatalog[0].id);
    const castMember =
      session.cast?.find((performer) => performer.name === name) ||
      session.cast?.[0];
    if (castMember) configureSelfFromShow(castMember);
    setLastManualSave({
      at: session.savedAt || new Date().toISOString(),
      destination: session.databaseId ? "Postgres" : "Saved show",
      showName: session.showName,
      id: session.id
    });
    setStatus(`Loaded show "${session.showName}".`);
  };

  const loadEntryShow = (showId = selectedShowId) => {
    const session = savedShows.find((show) => show.id === showId);
    if (!session) return;
    loadEntrySession(session, "saved show");
  };

  const loadAutosaveDraft = () => {
    if (!autosaveDraft) return;
    loadEntrySession(autosaveDraft, "autosaved draft");
  };

  const dismissAutosaveDraft = () => {
    try {
      window.localStorage.removeItem(AUTOSAVE_DRAFT_KEY);
    } catch (_error) {
      // Ignore storage cleanup failures.
    }
    setAutosaveDraft(null);
    setStatus("Autosaved draft dismissed.");
  };

  const loadEntrySession = (session, sourceLabel = "show") => {
    clearPlayback();
    setEntryLoadedShowId(session.id);
    setSelectedShowId(session.id);
    setShowName(session.showName);
    setRoomId(session.roomId || roomId);
    selectedSceneRef.current = session.scene || sceneCatalog[0].id;
    setScene(session.scene || sceneCatalog[0].id);
    setCameraShot(session.cameraShot || "wide");
    setLightingPreset(session.lightingPreset || "scene");
    setBackgroundTheme(session.backgroundTheme || "painted-depth");
    setObjectStyle(session.objectStyle || "soft-material");
    setSceneObjects(session.sceneObjects || []);
    setSceneSets(session.sceneSets || []);
    setFloorMarks(session.floorMarks || createDefaultFloorMarks(getCatalogItem(sceneCatalog, session.scene || sceneCatalog[0].id)));
    setStoryboardPanels(session.storyboardPanels || []);
    setProductionTimeline(session.productionTimeline || session.timeline || []);
    setAssetReferences(session.assetReferences || []);
    const castMember = session.cast?.find((performer) => performer.name === name) || session.cast?.[0];
    if (castMember) {
      setCharacter(castMember.character || character);
      setName(castMember.name || name);
    }
    setLastManualSave({
      at: session.savedAt || new Date().toISOString(),
      destination: sourceLabel,
      showName: session.showName,
      id: session.id
    });
    setStatus(`Loaded ${sourceLabel} "${session.showName}". Join when you want to enter the stage.`);
  };

  const exportShowSession = () => {
    const session = createShowSession();
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pup-it-${session.id}-show.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openTutorialTrack = (trackId, index = 0) => {
    const track = getTutorialTrack(trackId);
    const nextIndex = (index + track.steps.length) % track.steps.length;
    setTutorialTrackId(track.id);
    setTutorialStep(nextIndex);
    setMode(track.steps[nextIndex].mode);
    setTutorialOpen(true);
  };

  const showTutorialStep = (index) => {
    openTutorialTrack(tutorialTrackId, index);
  };

  const applyUltraBeginnerTutorialSetup = () => {
    recordHistory("ultra beginner tutorial setup");
    selectedSceneRef.current = "studio";
    setScene("studio");
    setStartedShortFormat("first-cartoon");
    setCameraShot("wide");
    setLightingPreset("flat-tv");
    setBackgroundTheme("painted-depth");
    setObjectStyle("soft-material");
    changeCharacterRig("fuzzball");
    setSelectedPartId("torso");
    openTutorialTrack("ultra", 1);
    setStatus("Ultra Beginner setup loaded: one simple rig in Kitchen Moon. Change one shape, then perform.");
  };

  if (!joined) {
    return (
      <main className="entryShell">
        <section className="entryPanel">
          <div className="brandLockup">
            <Theater size={34} />
            <div>
              <h1>Pup-It</h1>
              <p>Just make your show already</p>
            </div>
          </div>
          <form onSubmit={joinRoom} className="joinForm">
            {autosaveDraft && (
              <div className="entryContinuePanel autosaveEntryPanel">
                <strong>Autosaved draft found</strong>
                <small>
                  {autosaveDraft.showName || "Untitled Show"} from{" "}
                  {autosaveDraft.savedAt ? new Date(autosaveDraft.savedAt).toLocaleString() : "your last session"}.
                </small>
                <div className="entryShowActions">
                  <button type="button" onClick={loadAutosaveDraft}>
                    <RefreshCw size={16} />
                    Restore Draft
                  </button>
                  <button type="button" onClick={dismissAutosaveDraft}>
                    <X size={16} />
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            {savedShows.length > 0 && (
              <div className="entryContinuePanel">
                <strong>Continue a saved show</strong>
                <label>
                  Saved Show
                  <select value={selectedShowId} onChange={(event) => setSelectedShowId(event.target.value)}>
                    {savedShows.map((show) => (
                      <option key={show.id} value={show.id}>
                        {show.showName}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="entryShowActions">
                  <button type="button" onClick={() => loadEntryShow()}>
                    <FolderOpen size={16} />
                    Load Show
                  </button>
                  <button type="submit">
                    <Radio size={16} />
                    Continue Show
                  </button>
                </div>
                {entryLoadedShowId && (
                  <small>
                    Loaded {savedShows.find((show) => show.id === entryLoadedShowId)?.showName || "saved show"} into the start controls.
                  </small>
                )}
              </div>
            )}
            <label>
              Room
              <input value={roomId} onChange={(event) => setRoomId(event.target.value)} />
            </label>
            <label>
              Performer
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <div className="entryDivider">
              <span>{savedShows.length ? "Or start a new stage" : "Start a new stage"}</span>
            </div>
            <label>
              Starting Setting
              <select
                value={scene}
                onChange={(event) => {
                  selectedSceneRef.current = event.target.value;
                  setScene(event.target.value);
                }}
              >
                {sceneCatalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Starting Rig
              <select value={character} onChange={(event) => setCharacter(event.target.value)}>
                {characterCatalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">
              <Radio size={18} />
              Join Stage
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className={`appShell mode-${mode} experience-${experienceMode}`}>
      <header className="topBar">
        <div className="brandCompact">
          <Theater size={22} />
          <strong>Pup-It</strong>
          <span>{status}</span>
        </div>
        <div className="workspaceBadge" aria-label="Current workspace">
          <span>{workspace.label}</span>
          <strong>{workspace.role}</strong>
          <small>{workspace.description}</small>
        </div>
        <CommandSearch
          inputRef={commandInputRef}
          query={commandQuery}
          commands={commandItems}
          focused={commandFocused}
          onQueryChange={setCommandQuery}
          onFocusChange={setCommandFocused}
          onRunCommand={runCommand}
        />
        <button className="topNextButton" onClick={primaryNextAction.action} title={primaryNextAction.detail}>
          <ChevronRight size={16} />
          <span>Next</span>
          <strong>{primaryNextAction.label}</strong>
        </button>
        <div className="transport">
          <button onClick={undoLastAction} disabled={!historyPast.length} title="Undo last creative edit">
            <Undo2 size={17} />
            Undo
          </button>
          <button onClick={redoLastAction} disabled={!historyFuture.length} title="Redo creative edit">
            <Redo2 size={17} />
            Redo
          </button>
          <button className={recording ? "danger active" : ""} onClick={toggleTake}>
            {recording ? <Square size={17} /> : <Circle size={17} />}
            {recording ? "Stop" : "Record"}
          </button>
          <button onClick={openReviewMode}>
            <ListChecks size={17} />
            Review
          </button>
          <button className={micLive ? "active" : ""} onClick={toggleMic}>
            {micLive ? <Mic size={17} /> : <MicOff size={17} />}
            Mic
          </button>
          <button className={tutorialOpen ? "active" : ""} onClick={() => setTutorialOpen((open) => !open)}>
            <HelpCircle size={17} />
            Tutorial
          </button>
          <button
            className={experienceMode === "pro" ? "active" : ""}
            onClick={() => setExperienceMode((current) => (current === "pro" ? "beginner" : "pro"))}
          >
            <Sparkles size={17} />
            {experienceMode === "pro" ? "Pro" : "Beginner"}
          </button>
        </div>
      </header>

      <nav className="workflowRail" aria-label="Production workflow">
        {workflowSteps.map((step, index) => (
          <button
            key={step.id}
            className={mode === step.mode ? "selected" : ""}
            title={step.description}
            onClick={() => setMode(step.mode)}
          >
            <span>{index + 1}</span>
            <strong>{step.label}</strong>
          </button>
        ))}
      </nav>

      <section
        className={
          mode === "home"
            ? "dashboardStage"
            : mode === "storyboard"
            ? "storyboardStage"
            : `stage ${showStageMarkers ? "stage-editing" : "stage-live"} perspective-${selectedScene.perspective || "front-stage"} ${selectedScene.className} ${selectedCameraShot.className} ${selectedLighting.className} ${selectedBackgroundTheme.className} ${selectedObjectStyle.className} texture-${stageTexturePreset}`
        }
        style={
          mode === "home" || mode === "storyboard"
            ? undefined
            : {
                "--scene-horizon": `${selectedScene.horizon}%`,
                "--scene-foreground": `${selectedScene.foreground}%`,
                "--scene-focus-x": `${selectedScene.vanishingX || 50}%`,
                "--scene-focus-y": `${selectedScene.focusY || selectedScene.horizon}%`,
                "--camera-pan-x": `${directorCameraPan.x}%`,
                "--camera-pan-y": `${directorCameraPan.y}%`,
                "--camera-punch-scale": cameraPunchScale,
                "--camera-shake-x": `${cameraShakeOffset.x}%`,
                "--camera-shake-y": `${cameraShakeOffset.y}%`
              }
        }
        onPointerMove={handleStagePointerMove}
        onPointerLeave={handleStagePointerLeave}
      >
        {mode === "home" ? (
          <ShowDashboard
            showName={showName}
            savedShows={savedShows}
            templates={showStarterTemplates}
            shortFormats={shortFormatTemplates}
            progress={beginnerProgress}
            selectedTake={selectedTake}
            takeCount={takeLibrary.length}
            panelCount={storyboardPanels.length}
            timelineCount={productionTimeline.length}
            onStartQuickShort={startQuickShort}
            onStartSurpriseShort={() => startQuickShort(pickRandom(shortFormatTemplates).id)}
            onApplyTemplate={applyShowTemplate}
            onModeChange={setMode}
            onAssetSearch={openAssetSearch}
            onExport={exportProject}
            onLoadShow={loadShowSession}
          />
        ) : mode === "storyboard" ? (
          <StoryboardCanvas
            panels={storyboardPanels}
            selectedPanelId={selectedStoryboardId}
            onSelectPanel={setSelectedStoryboardId}
          />
        ) : (
          <>
            <div className="stageTexture" />
            <div className="stageCamera">
              <div className="stageLighting" />
              {showStageMarkers ? (
                <>
                  <div className="horizonGuide" data-label={selectedScene.focusLabel || "Focus"} />
                  <div className="focusPoint" aria-hidden="true" />
                </>
              ) : null}
              <div className="setFloor" />
              {showStageMarkers && floorMarks.map((mark) => (
                <FloorMark key={mark.id} mark={mark} onActivate={moveSelfToMark} />
              ))}
              {mode === "build" ? (
                <div className="buildCanvasHint">
                  <strong>Click the puppet</strong>
                  <span>Select a part, then nudge, stretch, color, or import it.</span>
                </div>
              ) : null}
              {mode === "build" && self ? (
                <BuildCanvasPartToolbar
                  selectedPart={getCatalogItem(characterPartCatalog, selectedPartId)}
                  value={self.state.characterParts?.[selectedPartId] || {}}
                  fallbackColor={self.state.characterDesign?.color || getCatalogItem(characterCatalog, self.character).color}
                  onChange={(patch) =>
                    updateCharacterPart(selectedPartId, {
                      label: getCatalogItem(characterPartCatalog, selectedPartId).label,
                      ...patch
                    })
                  }
                  onDuplicate={() => duplicateCharacterPart(selectedPartId)}
                  onSwap={partSwapTargets[selectedPartId] ? () => swapCharacterParts(selectedPartId) : null}
                  onClear={() => clearCharacterPart(selectedPartId)}
                />
              ) : null}
              {sceneObjects.map((object) => (
                <SceneObject
                  key={object.id}
                  object={object}
                  selected={object.id === selectedSceneObjectId}
                  onSelect={setSelectedSceneObjectId}
                  showLabel={showStageMarkers}
                />
              ))}
              {mode === "assets" && selectedSceneObject ? (
                <CanvasObjectToolbar
                  object={selectedSceneObject}
                  onChange={(patch) => updateSceneObject(selectedSceneObject.id, patch)}
                  onDuplicate={() => duplicateSceneObject(selectedSceneObject.id)}
                  onDelete={() => deleteSceneObject(selectedSceneObject.id)}
                  onLayer={(delta) => moveSceneObjectLayer(selectedSceneObject.id, delta)}
                />
              ) : mode === "assets" ? (
                <div className="spaceCanvasHint">
                  <strong>Click a prop</strong>
                  <span>Edit it right on the stage.</span>
                </div>
              ) : null}
              {stagePerformers.map((performer) => (
                <Puppet
                  key={performer.id}
                  performer={performer}
                  isSelf={performer.id === selfId}
                  depthModel={selectedScene}
                  showLabels={showPuppetLabels}
                  editableParts={mode === "build" && performer.id === selfId}
                  selectedPartId={mode === "build" ? selectedPartId : ""}
                  onPartSelect={setSelectedPartId}
                  onPartTransform={moveCharacterPartOnCanvas}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <aside className="controlDock">
        <ShowSessionControls
          showName={showName}
          savedShows={savedShows}
            selectedShowId={selectedShowId}
            saveManifest={showSaveManifest}
            saveSummary={showSaveSummary}
            onShowNameChange={setShowName}
            onSelectedShowChange={setSelectedShowId}
            onSaveShow={saveShowSession}
            onLoadShow={loadShowSession}
            onExportShow={exportShowSession}
        />

        <NewProjectGuide
          mode={mode}
          scene={scene}
          character={character}
          hasCustomRigParts={hasCustomRigParts}
          sceneObjectCount={sceneObjects.length}
          onSceneChange={changeScene}
          onCharacterChange={changeCharacterRig}
          onCustomizeRig={() => setMode("build")}
          onPlaceInScene={() => openAssetSearch("", "object")}
          onPerform={() => setMode("perform")}
          onSaveShow={saveShowSession}
        />

        <BeginnerRoadmap
          mode={mode}
          progress={beginnerProgress}
          selectedTake={selectedTake}
          onModeChange={setMode}
          onStartQuickShort={() => startQuickShort("argument")}
          onRecordToggle={toggleTake}
          recording={recording}
          onReplay={playSelectedTake}
          onSaveScene={saveSelectedTakeAsScene}
          onAddToCut={keepSelectedTake}
        />

        <ContextActionStrip
          mode={mode}
          selectedPart={getCatalogItem(characterPartCatalog, selectedPartId)}
          selectedPartValue={self?.state.characterParts?.[selectedPartId]}
          selectedSceneObject={selectedSceneObject}
          selectedTake={selectedTake}
          playbackActive={playbackActive}
          canUndo={historyPast.length > 0}
          canRedo={historyFuture.length > 0}
          autosaveLabel={lastAutosaveAt ? `Autosaved ${lastAutosaveAt}` : "Autosave ready"}
          onUndo={undoLastAction}
          onRedo={redoLastAction}
          onPartShape={() =>
            updateCharacterPart(selectedPartId, {
              label: getCatalogItem(characterPartCatalog, selectedPartId).label,
              mode: "shape",
              shape: selectedPartId === "torso" ? "bean" : "circle",
              source: ""
            })
          }
          onPartDuplicate={() => duplicateCharacterPart(selectedPartId)}
          onPartToggleHidden={() => updateCharacterPart(selectedPartId, { hidden: !self?.state.characterParts?.[selectedPartId]?.hidden })}
          onPartClear={() => clearCharacterPart(selectedPartId)}
          onObjectDuplicate={() => selectedSceneObject && duplicateSceneObject(selectedSceneObject.id)}
          onObjectForward={() => selectedSceneObject && moveSceneObjectLayer(selectedSceneObject.id, 1)}
          onObjectDelete={() => selectedSceneObject && deleteSceneObject(selectedSceneObject.id)}
          onReplay={playSelectedTake}
          onMarkBestTake={markSelectedTakeBest}
          onAddCut={() => selectedTake && addTakeToTimeline(selectedTake)}
          onExport={exportProject}
        />

        <ShowBiblePanel
          showName={showName}
          castCount={activePerformers.length}
          sceneSetCount={sceneSets.length}
          propCount={sceneObjects.length}
          referenceCount={assetReferences.length}
          macroCount={macroCatalog.length}
          boardCount={storyboardPanels.length}
          timelineCount={productionTimeline.length}
          toolbox={activeShowToolbox}
          saveSummary={showSaveSummary}
          activeStyle={activeAnimationStyle}
          episodeStatus={episodeStatus}
          onSaveShow={saveShowSession}
          onModeChange={setMode}
        />

        {mode === "perform" && (
          <PerformControls
            scene={scene}
            selectedScene={selectedScene}
            selectedPerspective={selectedPerspective}
            self={self}
            onSceneChange={changeScene}
            onExpressionChange={setExpression}
            onPoseChange={setPose}
            onIdleMotionChange={setIdleMotion}
            onMotionFeelChange={setMotionFeel}
            onMouthControlChange={setMouthControl}
            mouthSensitivity={mouthSensitivity}
            onMouthSensitivityChange={setMouthSensitivity}
            mouthSmoothing={mouthSmoothing}
            onMouthSmoothingChange={setMouthSmoothing}
            micLive={micLive}
            mouthCameraActive={mouthCameraActive}
            onMacroTrigger={triggerMacro}
            performancePresets={performancePresetCatalog}
            onPerformancePreset={applyPerformancePreset}
            cameraShot={cameraShot}
            cameraFollow={cameraFollow}
            cameraTargetName={cameraTarget?.name || self?.name || "Selected rig"}
            lightingPreset={lightingPreset}
            backgroundTheme={backgroundTheme}
            objectStyle={objectStyle}
            floorMarks={floorMarks}
            performanceMoments={performanceMoments}
            shotTemplates={shotTemplateCatalog}
            onCameraShotChange={setCameraShot}
            onCameraFollowChange={setCameraFollow}
            onCameraPunch={triggerCameraPunch}
            onCameraShake={triggerCameraShake}
            onCameraReset={resetDirectorCamera}
            onLightingPresetChange={setLightingPreset}
            onBackgroundThemeChange={setBackgroundTheme}
            onObjectStyleChange={setObjectStyle}
            onDirectorAction={applyDirectorAction}
            onStoryboardCapture={addStoryboardPanel}
            onMoveToMark={moveSelfToMark}
            onSetMarkFromSelf={setCurrentPositionAsMark}
            onApplyShotTemplate={applyShotTemplate}
            recording={recording}
            onRecordToggle={toggleTake}
            onModeChange={setMode}
          />
        )}
        {mode === "build" && (
          <CharacterEditor
            performer={self}
            character={character}
            selectedPartId={selectedPartId}
            onSelectedPartChange={setSelectedPartId}
            onCharacterChange={changeCharacterRig}
            onRigChange={updateCharacterRig}
            onStyleChange={updateCharacterStyle}
            onDesignChange={updateCharacterDesign}
            onRandomize={randomizeCharacterDesign}
            onMutate={applyCharacterMutation}
            onStyleMutate={applyStyleMutation}
            onBehaviorChange={(behaviorPreset) => updateSelf({ behaviorPreset })}
            onPartChange={updateCharacterPart}
            onPartDuplicate={duplicateCharacterPart}
            onPartSwap={swapCharacterParts}
            onPartClear={clearCharacterPart}
          />
        )}
        {mode === "assets" && (
          <AssetLibraryPanel
            assets={curatedAssetLibrary}
            references={assetReferences}
            filter={assetFilter}
            target={assetTarget}
            search={assetSearch}
            sceneObjects={sceneObjects}
            selectedSceneObjectId={selectedSceneObjectId}
            sceneSets={sceneSets}
            onFilterChange={setAssetFilter}
            onTargetChange={setAssetTarget}
            onSearchChange={setAssetSearch}
            onImportAsset={importAsset}
            onPlaceAsset={(asset) => addSceneObjectFromAsset(asset)}
            onPlaceImage={addSceneObjectFromImage}
            onPlaceShape={addSceneObjectFromShape}
            onSelectSceneObject={setSelectedSceneObjectId}
            onUpdateSceneObject={updateSceneObject}
            onDuplicateSceneObject={duplicateSceneObject}
            onMoveSceneObjectLayer={moveSceneObjectLayer}
            onDeleteSceneObject={deleteSceneObject}
            onSaveCurrentSet={saveCurrentSceneSet}
            onApplySceneSet={applySceneSet}
          />
        )}
        {mode === "edit" && (
          <SceneLibraryEditor
            takes={takeLibrary}
            selectedTake={selectedTake}
            playbackActive={playbackActive}
            projectExport={createCurrentProjectExport()}
            onRefresh={loadTakeLibrary}
            onSelectTake={selectTake}
            onPlay={playSelectedTake}
            onTakeMetaChange={updateSelectedTakeMeta}
            onMarkBestTake={markSelectedTakeBest}
            onQuickTrim={quickTrimSelectedTake}
            onSaveTakeAsScene={saveSelectedTakeAsScene}
            onKeepTake={keepSelectedTake}
            onMakeAnotherBit={startAnotherBit}
            onExportProject={exportProject}
            onExportVideo={exportSelectedTakeVideo}
            onExportThumbnail={exportSelectedTakeThumbnail}
            onBackendRender={requestBackendRender}
            backendRendering={backendRendering}
            renderJob={renderJob}
            finishTarget={finishTarget}
            finishTargetLabel={describeFinishTarget()}
            onFinishTargetChange={setFinishTarget}
            videoExporting={videoExporting}
            doinkSubmission={doinkSubmission}
            doinkSubmitting={doinkSubmitting}
            doinkEndpointConfigured={Boolean(DOINKTV_SUBMISSION_URL)}
            onDoinkSubmissionChange={updateDoinkSubmission}
            onSubmitToDoinkTv={submitToDoinkTv}
            onAddTakeToTimeline={addTakeToTimeline}
            timeline={productionTimeline}
            episodeStatus={episodeStatus}
            onEpisodeStatusChange={setEpisodeStatus}
            onRemoveTimelineClip={removeTimelineClip}
            onMoveTimelineClip={moveTimelineClip}
            onTrimTimelineClip={trimTimelineClip}
            onUpdateTimelineClip={updateTimelineClip}
            onModeChange={setMode}
            serverUrl={SERVER_URL}
          />
        )}
        {mode === "storyboard" && (
          <StoryboardEditor
            panels={storyboardPanels}
            selectedPanel={selectedStoryboardPanel}
            onAddPanel={addStoryboardPanel}
            onUpdatePanel={updateStoryboardPanel}
            onDuplicatePanel={duplicateStoryboardPanel}
            onDeletePanel={deleteStoryboardPanel}
            onSelectPanel={setSelectedStoryboardId}
            onPanelMetaChange={updateStoryboardPanelMeta}
            onAddPanelToTimeline={addStoryboardPanelToTimeline}
            onPerformPanel={performStoryboardPanel}
          />
        )}

        <ContextualInspector
          mode={mode}
          self={self}
          scene={selectedScene}
          perspective={selectedPerspective}
          cameraShot={selectedCameraShot}
          lighting={selectedLighting}
          backgroundTheme={selectedBackgroundTheme}
          objectStyle={selectedObjectStyle}
          selectedTake={selectedTake}
          selectedStoryboardPanel={selectedStoryboardPanel}
          assetSearch={assetSearch}
          assetTarget={assetTarget}
          recording={recording}
          micLive={micLive}
          takeCount={takeLibrary.length}
          timelineCount={productionTimeline.length}
          onModeChange={setMode}
          onRecordToggle={toggleTake}
          onAssetSearch={openAssetSearch}
          onPolish={applyPolishPass}
        />
      </aside>
      <video
        ref={mouthVideoRef}
        className={`mouthCameraPreview ${mouthCameraActive ? "visible" : ""}`}
        muted
        playsInline
      />
      {tutorialOpen && (
        <TutorialOverlay
          track={activeTutorialTrack}
          tracks={tutorialTracks}
          step={tutorialStep}
          mode={mode}
          onClose={() => setTutorialOpen(false)}
          onStepChange={showTutorialStep}
          onTrackChange={openTutorialTrack}
          onApplySetup={applyUltraBeginnerTutorialSetup}
        />
      )}
    </main>
  );
}

function TutorialOverlay({ track, tracks, step, mode, onClose, onStepChange, onTrackChange, onApplySetup }) {
  const steps = track.steps;
  const current = steps[step] || steps[0];

  return (
    <section className="tutorialOverlay" aria-label="Tutorial">
      <div className="tutorialCard">
        <div className="tutorialHeader">
          <HelpCircle size={18} />
          <div>
            <strong>{current.title}</strong>
            <small>
              {track.name} / {step + 1} of {steps.length} / {mode}
            </small>
          </div>
          <button aria-label="Close tutorial" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="tutorialTrackIntro">
          <strong>{track.level}</strong>
          <span>{track.description}</span>
        </div>
        <div className="tutorialTrackGrid" aria-label="Tutorial skill level">
          {tracks.map((item) => (
            <button
              key={item.id}
              className={item.id === track.id ? "selected" : ""}
              onClick={() => onTrackChange(item.id, 0)}
            >
              <span>{item.name}</span>
              <small>{item.level}</small>
            </button>
          ))}
        </div>
        <p>{current.body}</p>
        {track.setupLabel && (
          <button className="tutorialSetupButton" onClick={onApplySetup}>
            <Wand2 size={16} />
            {track.setupLabel}
          </button>
        )}
        <div className="tutorialModes">
          {steps.map((item, index) => (
            <button
              key={`${item.mode}-${item.title}`}
              className={index === step ? "selected" : ""}
              onClick={() => onStepChange(index)}
            >
              {index + 1}. {item.mode}
            </button>
          ))}
        </div>
        <div className="tutorialActions">
          <button onClick={() => onStepChange(step - 1)}>
            <ChevronLeft size={16} />
            Back
          </button>
          <button onClick={() => onStepChange(step + 1)}>
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

function CommandSearch({ inputRef, query, commands, focused, onQueryChange, onFocusChange, onRunCommand }) {
  const normalized = query.trim().toLowerCase();
  const queryTokens = normalized.split(/\s+/).filter(Boolean);
  const visibleCommands = normalized
    ? commands
        .filter((command) => {
          const haystack = `${command.label} ${command.keywords}`.toLowerCase();
          return queryTokens.every((token) => haystack.includes(token));
        })
        .slice(0, 5)
    : commands.slice(0, 4);

  return (
    <div className={`commandSearch ${focused ? "focused" : ""}`}>
      <Search size={16} />
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onFocus={() => onFocusChange(true)}
        onBlur={() => window.setTimeout(() => onFocusChange(false), 120)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && visibleCommands[0]) {
            event.preventDefault();
            event.stopPropagation();
            onRunCommand(visibleCommands[0]);
          }
          if (event.key === "Escape") {
            event.stopPropagation();
            onQueryChange("");
            onFocusChange(false);
            event.currentTarget.blur();
          }
        }}
        placeholder="Ctrl+K actions, assets, exports..."
        aria-label="Command search"
      />
      <div className="commandResults">
        {visibleCommands.length ? (
          visibleCommands.map((command) => (
            <button
              key={command.id}
              disabled={command.disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onRunCommand(command)}
            >
              {command.label}
            </button>
          ))
        ) : (
          <button disabled>No matching action</button>
        )}
      </div>
    </div>
  );
}

function ShowDashboard({
  showName,
  savedShows,
  templates,
  shortFormats,
  progress,
  selectedTake,
  takeCount,
  panelCount,
  timelineCount,
  onStartQuickShort,
  onStartSurpriseShort,
  onApplyTemplate,
  onModeChange,
  onAssetSearch,
  onExport,
  onLoadShow
}) {
  const canFinish = progress.readyToExport;
  const publicWorkflow = buildPublicReleaseWorkflow({
    progress,
    takeCount,
    timelineCount,
    savedShowCount: savedShows.length,
    exportCount: progress.exported ? 1 : 0,
    episodeStatus: progress.hasSubmitted ? "submitted" : "draft"
  });
  const dashboardPath = makeShortMilestones.map((milestone) => ({
    ...milestone,
    done:
      milestone.id === "start"
        ? progress.hasStartedShort
        : milestone.id === "rig"
          ? progress.hasRig
          : milestone.id === "space"
            ? progress.hasSet
            : milestone.id === "perform"
              ? progress.hasTake
              : milestone.id === "review"
                ? progress.hasCut
                : progress.exported || progress.hasSubmitted
  }));
  const trialSteps = [
    {
      label: "Pick a bit",
      done: progress.hasStartedShort,
      actionLabel: "Start",
      action: () => onStartQuickShort("argument")
    },
    {
      label: "Make the performer yours",
      done: progress.hasRig,
      actionLabel: "Rig",
      action: () => onModeChange("build")
    },
    {
      label: "Put one thing in the set",
      done: progress.hasSet,
      actionLabel: "Set",
      action: () => onAssetSearch("furniture", "object")
    },
    {
      label: "Record a quick take",
      done: progress.hasTake,
      actionLabel: "Perform",
      action: () => onModeChange("perform")
    },
    {
      label: "Replay and keep the best",
      done: progress.hasCut,
      actionLabel: selectedTake ? "Review" : "Finish",
      action: () => onModeChange("edit")
    },
    {
      label: "Export enough to share",
      done: progress.exported,
      actionLabel: canFinish ? "Export" : "Finish",
      action: canFinish ? onExport : () => onModeChange("edit")
    }
  ];
  const trialDoneCount = trialSteps.filter((step) => step.done).length;
  const nextTrialStep = trialSteps.find((step) => !step.done) || trialSteps[trialSteps.length - 1];
  return (
    <div className="showDashboard">
      <section className="dashboardHero">
        <div>
          <span className="eyebrow">Production Home</span>
          <h1>{showName}</h1>
          <p>Make a weird thing, perform it live, replay it, and export a short without leaving the app.</p>
        </div>
        <div className="recordFlow">
          {dashboardPath.map((milestone) => (
            <span className={milestone.done ? "done" : ""} key={milestone.id}>
              {milestone.shortLabel}
            </span>
          ))}
        </div>
      </section>

      <section className="dashboardPriority" aria-label="Primary show actions">
        <button onClick={nextTrialStep.action} className="priorityNextAction">
          <ChevronRight size={17} />
          <span>Next</span>
          <strong>{nextTrialStep.label}</strong>
        </button>
        {savedShows[0] && (
          <button onClick={() => onLoadShow(savedShows[0].id)}>
            <FolderOpen size={17} />
            <span>Continue</span>
            <strong>{savedShows[0].showName}</strong>
          </button>
        )}
        <button onClick={() => onStartQuickShort("argument")}>
          <Sparkles size={17} />
          <span>Start</span>
          <strong>Make a New Short</strong>
        </button>
        <button onClick={onStartSurpriseShort}>
          <Shuffle size={17} />
          <span>Surprise</span>
          <strong>Give Me A Bit</strong>
        </button>
      </section>

      <section className="fiveMinuteTrialPanel" aria-label="Five minute cartoon trial">
        <div>
          <span className="eyebrow">5-Minute Cartoon Trial</span>
          <h2>Can this become a finished little short before you overthink it?</h2>
          <p>One weird setup, one customized rig, one object in the room, one take, one export. Good enough counts.</p>
        </div>
        <div className="trialMeter">
          <strong>{trialDoneCount}/6</strong>
          <span>steps done</span>
          <button onClick={nextTrialStep.action}>{nextTrialStep.actionLabel}</button>
        </div>
        <div className="trialChecklist">
          {trialSteps.map((step, index) => (
            <button
              key={step.label}
              className={`${step.done ? "done" : ""} ${step === nextTrialStep ? "current" : ""}`}
              onClick={step.action}
            >
              <span>{index + 1}</span>
              <strong>{step.label}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="publicBetaPanel" aria-label="Public release workflow">
        <div>
          <span className="eyebrow">Public-Ready Spine</span>
          <h2>Make it, perform it, send it.</h2>
          <p>Every big feature should keep a one-button beginner path, a deeper pro path, and a durable home in the Show Kit.</p>
        </div>
        <div className="publicBetaGrid">
          {publicWorkflow.map((pillar) => (
            <article className={pillar.done ? "done" : ""} key={pillar.id}>
              <span>{pillar.shortTitle}</span>
              <strong>{pillar.title}</strong>
              <small>{pillar.status}</small>
              <b>{pillar.nextStep}</b>
            </article>
          ))}
        </div>
      </section>

      <section className="makeShortPanel" aria-label="Make a short">
        <div>
          <span className="eyebrow">Make Something Fast</span>
          <h2>Pick a tiny format, then make it yours.</h2>
          <p>These are not stock shows. They are rough launch pads with a rig, set direction, prop, and performance goal.</p>
        </div>
        <div className="shortFormatGrid">
          {shortFormats.map((format) => (
            <button key={format.id} onClick={() => onStartQuickShort(format.id)}>
              <strong>{format.name}</strong>
              <span>{format.description}</span>
              <small>{format.performanceGoal}</small>
              <em>{format.surpriseNudge}</em>
            </button>
          ))}
        </div>
      </section>

      <section className="dashboardStats" aria-label="Show progress">
        <div>
          <strong>{savedShows.length}</strong>
          <span>shows</span>
        </div>
        <div>
          <strong>{takeCount}</strong>
          <span>takes</span>
        </div>
        <div>
          <strong>{panelCount}</strong>
          <span>boards</span>
        </div>
        <div>
          <strong>{timelineCount}</strong>
          <span>cuts</span>
        </div>
      </section>

      <section className="dashboardGrid">
        <div className="dashboardPanel">
          <h2>Rough Launch Pads</h2>
          <small className="controlHint">These set up useful production shapes, then get out of the way so the show does not look canned.</small>
          <div className="templateGrid">
            {templates.map((template) => (
              <button key={template.id} onClick={() => onApplyTemplate(template.id)}>
                <strong>{template.name}</strong>
                <span>{template.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="dashboardPanel">
          <h2>Keep Going</h2>
          <div className="dashboardActions">
            <button onClick={() => onModeChange("build")}>
              <Sparkles size={16} />
              Build Rig
            </button>
            <button onClick={() => onAssetSearch("furniture", "object")}>
              <Library size={16} />
              Build Set
            </button>
            <button onClick={() => onModeChange("perform")}>
              <Circle size={16} />
              Rehearse
            </button>
            <button onClick={() => onModeChange("edit")}>
              <ListChecks size={16} />
              Finish Short
            </button>
          </div>
          {savedShows[0] && (
            <button className="wideAction" onClick={() => onLoadShow(savedShows[0].id)}>
              <FolderOpen size={16} />
              Continue {savedShows[0].showName}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function ContextualInspector({
  mode,
  self,
  scene,
  perspective,
  cameraShot,
  lighting,
  backgroundTheme,
  objectStyle,
  selectedTake,
  selectedStoryboardPanel,
  assetSearch,
  assetTarget,
  recording,
  micLive,
  takeCount,
  timelineCount,
  onModeChange,
  onRecordToggle,
  onAssetSearch,
  onPolish
}) {
  const characterName =
    self?.state.characterDesign?.name ||
    (self ? getCatalogItem(characterCatalog, self.character).name : "No performer yet");
  const modeLabel = workflowSteps.find((step) => step.mode === mode)?.label || "Setup";

  return (
    <div className="dockGroup contextInspector">
      <h2>Inspector</h2>
      <div className="inspectorSummary">
        <strong>{modeLabel}</strong>
        <small>{recording ? "Recording take" : micLive ? "Mic armed" : "Ready"}</small>
      </div>
      <div className="inspectorFacts">
        <span>Rig</span>
        <strong>{characterName}</strong>
        <span>Scene</span>
        <strong>{scene.name}</strong>
        <span>Perspective</span>
        <strong>{perspective.name}</strong>
        <span>Shot</span>
        <strong>{cameraShot.name}</strong>
        <span>Look</span>
        <strong>{backgroundTheme.name} / {objectStyle.name}</strong>
      </div>
      {mode === "assets" && (
        <small className="controlHint">Searching {assetTarget || "all"} for {assetSearch || "anything useful"}.</small>
      )}
      {mode === "edit" && (
        <small className="controlHint">
          {selectedTake ? `Selected ${selectedTake.name || selectedTake.id}.` : `${takeCount} takes available.`} {timelineCount} clips in timeline.
        </small>
      )}
      {mode === "storyboard" && (
        <small className="controlHint">
          {selectedStoryboardPanel ? `Boarding ${selectedStoryboardPanel.title}.` : "Capture or select a board panel."}
        </small>
      )}
      <div className="inspectorActions">
        <button onClick={onRecordToggle}>{recording ? "Stop Take" : "Record Take"}</button>
        <button onClick={() => onPolish("lighting")}>Improve Lighting</button>
        <button onClick={() => onAssetSearch("furniture", "object")}>Find Props</button>
        <button onClick={() => onModeChange("edit")}>Review</button>
      </div>
    </div>
  );
}

function BeginnerRoadmap({
  mode,
  progress,
  selectedTake,
  recording,
  onModeChange,
  onStartQuickShort,
  onRecordToggle,
  onReplay,
  onSaveScene,
  onAddToCut
}) {
  const steps = [
    {
      id: "short",
      label: "Start show",
      body: "Pick a rough launch pad so the blank page disappears.",
      complete: "Short started. Now make it unmistakably yours.",
      done: progress.hasStartedShort,
      action: onStartQuickShort,
      actionLabel: "Make a Short"
    },
    {
      id: "rig",
      label: "Make the rig yours",
      body: "Doodle, shape, color, or mutate the rig enough that it belongs to the show.",
      complete: "The rig has its own little personality now.",
      done: progress.hasRig,
      action: () => onModeChange("build"),
      actionLabel: "Build Rig"
    },
    {
      id: "set",
      label: "Build space",
      body: "Drop in a prop or material so the scene has somewhere to happen.",
      complete: "The stage has something to play against.",
      done: progress.hasSet,
      action: () => onModeChange("assets"),
      actionLabel: "Build Set"
    },
    {
      id: "perform",
      label: "Rehearse and record",
      body: "Walk around, try the mouth, then grab a take before the bit gets stale.",
      complete: "A take exists. That is the first real cartoon moment.",
      done: progress.hasTake,
      action: progress.hasRehearsed ? onRecordToggle : () => onModeChange("perform"),
      actionLabel: recording ? "Stop Take" : progress.hasRehearsed ? "Record Take" : "Rehearse"
    },
    {
      id: "replay",
      label: "Replay and save scene",
      body: "Watch it back, trim the mess, and save the good version as a scene.",
      complete: "The short is in the cut shelf.",
      done: progress.hasCut,
      action: selectedTake ? onReplay : () => onModeChange("edit"),
      actionLabel: selectedTake ? "Replay" : "Review"
    },
    {
      id: "export",
      label: "Export / submit",
      body: "Bundle the cut, captions, credits, and license notes so the short can leave the room.",
      complete: "The short has a package. One more click sends it toward the channel.",
      done: progress.exported,
      action: () => onModeChange("edit"),
      actionLabel: progress.readyToExport ? "Finish" : "Review"
    }
  ];
  const nextStep = steps.find((step) => !step.done) || steps[steps.length - 1];

  return (
    <div className="dockGroup beginnerRoadmap">
      <h2>Make A Short</h2>
      <div className="beginnerRail">
        {makeShortMilestones.map((milestone) => (
          <span key={milestone.id}>{milestone.shortLabel}</span>
        ))}
      </div>
      <div className="nextBestStep">
        <span>Next Best Step</span>
        <strong>{nextStep.label}</strong>
        <p>{nextStep.body}</p>
        <button onClick={nextStep.action}>{nextStep.actionLabel}</button>
      </div>
      <div className="roadmapList">
        {steps.map((step, index) => (
          <div className={`roadmapStep ${step.done ? "done" : ""} ${step.id === nextStep.id ? "current" : ""}`} key={step.id}>
            <span>{index + 1}</span>
            <div>
              <strong>{step.label}</strong>
              <small>{step.done ? step.complete : step.body}</small>
            </div>
            <button onClick={step.action}>{step.actionLabel}</button>
          </div>
        ))}
      </div>
      {selectedTake && mode !== "edit" && (
        <div className="roadmapReward">
          <strong>That is a cartoon now.</strong>
          <small>Keep it as the best take, replay the timing, or save it into the show.</small>
          <div className="libraryActions">
            <button onClick={onAddToCut}>
              <Sparkles size={16} />
              Keep Take
            </button>
            <button onClick={onReplay}>
              <Play size={16} />
              Replay
            </button>
            <button onClick={onSaveScene}>
              <Clapperboard size={16} />
              Save Scene
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SceneObject({ object, selected, onSelect, showLabel = true }) {
  const Component = onSelect ? "button" : "div";
  return (
    <Component
      className={`sceneObject sceneObject-${object.shape} objectTexture-${object.texturePreset || "paper-grain"} ${selected ? "selected" : ""} ${object.locked ? "locked" : ""} ${object.hidden ? "hidden" : ""}`}
      style={{
        left: `${object.x}%`,
        top: `${object.y}%`,
        zIndex: 40 + object.layer,
        transform: `translate(-50%, -100%) scale(${object.flipped ? -object.scale : object.scale}, ${object.scale})`,
        "--object-tint": object.tint
      }}
      title={object.name}
      onClick={onSelect && !object.locked ? () => onSelect(object.id) : undefined}
    >
      {object.imageUrl && <img src={object.imageUrl} alt="" />}
      {showLabel ? <span>{object.name}</span> : null}
    </Component>
  );
}

function CanvasObjectToolbar({ object, onChange, onDuplicate, onDelete, onLayer }) {
  const nudge = (x = 0, y = 0) =>
    onChange({
      x: clamp((object.x || 50) + x, 5, 95),
      y: clamp((object.y || 65) + y, 25, 88)
    });

  return (
    <div className="canvasObjectToolbar" aria-label="Canvas object editor">
      <div className="canvasObjectHeader">
        <span
          className={`canvasObjectPreview sceneObject-${object.shape || "object"} objectTexture-${object.texturePreset || "paper-grain"}`}
          style={{ "--object-tint": object.tint || "#f5f1e8" }}
        >
          {object.imageUrl ? <img src={object.imageUrl} alt="" /> : null}
        </span>
        <div>
          <strong>{object.name}</strong>
          <small>{object.locked ? "locked" : object.hidden ? "hidden" : "editing on canvas"}</small>
        </div>
      </div>
      <div className="canvasObjectState">
        <span>{Math.round((object.scale || 1) * 100)}%</span>
        <span>Layer {object.layer || 0}</span>
        <span>{object.flipped ? "Flipped" : "Normal"}</span>
        <span>{object.hidden ? "Hidden" : "Visible"}</span>
      </div>
      <div className="canvasObjectNudge" aria-label="Canvas object nudge controls">
        <button type="button" disabled={object.locked} onClick={() => nudge(0, -3)}>Up</button>
        <button type="button" disabled={object.locked} onClick={() => nudge(-3, 0)}>Left</button>
        <button type="button" disabled={object.locked} onClick={() => onChange({ x: 50, y: 68 })}>Center</button>
        <button type="button" disabled={object.locked} onClick={() => nudge(3, 0)}>Right</button>
        <button type="button" disabled={object.locked} onClick={() => nudge(0, 3)}>Down</button>
      </div>
      <div className="canvasObjectHandles">
        <button type="button" disabled={object.locked} onClick={() => onChange({ scale: Math.max(0.35, (object.scale || 1) - 0.08) })}>
          - Size
        </button>
        <button type="button" disabled={object.locked} onClick={() => onChange({ scale: Math.min(1.8, (object.scale || 1) + 0.08) })}>
          + Size
        </button>
        <button type="button" disabled={object.locked} onClick={() => onLayer(-1)}>
          Back
        </button>
        <button type="button" disabled={object.locked} onClick={() => onLayer(1)}>
          Front
        </button>
      </div>
      <div className="canvasObjectSwatches" aria-label="Canvas object colors">
        {characterColorSwatches.slice(0, 8).map((color) => (
          <button
            type="button"
            key={color}
            className={object.tint === color ? "selected" : ""}
            aria-label={`Use ${color}`}
            style={{ background: color }}
            disabled={object.locked}
            onClick={() => onChange({ tint: color })}
          />
        ))}
      </div>
      <div className="canvasObjectFooter">
        <button type="button" onClick={() => onChange({ flipped: !object.flipped })} disabled={object.locked}>
          Flip
        </button>
        <button type="button" onClick={() => onChange({ locked: !object.locked })}>
          {object.locked ? "Unlock" : "Lock"}
        </button>
        <button type="button" onClick={() => onChange({ hidden: !object.hidden, locked: false })}>
          {object.hidden ? "Show" : "Hide"}
        </button>
        <button type="button" onClick={onDuplicate}>
          Clone
        </button>
        <button type="button" className="danger" onClick={onDelete}>
          Remove
        </button>
      </div>
    </div>
  );
}

function FloorMark({ mark, onActivate }) {
  const Component = onActivate ? "button" : "div";
  return (
    <Component
      className="floorMark"
      style={{ left: `${mark.x}%`, top: `${mark.y}%`, zIndex: Math.round(mark.y * 10) - 1 }}
      title={mark.name}
      onClick={onActivate ? () => onActivate(mark.id) : undefined}
    >
      <span>{mark.label}</span>
      <small>{mark.name}</small>
    </Component>
  );
}

function ShowSessionControls({
  showName,
  savedShows,
  selectedShowId,
  saveManifest,
  saveSummary,
  onShowNameChange,
  onSelectedShowChange,
  onSaveShow,
  onLoadShow,
  onExportShow
}) {
  const savedLabel = saveSummary?.lastManualSave
    ? `${saveSummary.lastManualSave.destination} ${new Date(saveSummary.lastManualSave.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
    : "Not manually saved yet";
  return (
    <div className="dockGroup showSessionPanel">
      <h2>Show</h2>
      <div className="saveConfidenceCard">
        <strong>{saveSummary?.selectedShowName || showName}</strong>
        <span>{savedLabel}</span>
        <small>{saveSummary?.lastAutosaveAt ? `Autosaved ${saveSummary.lastAutosaveAt}` : "Autosave starts after joining the stage."}</small>
      </div>
      <label>
        Current Show
        <input
          value={showName}
          maxLength={48}
          onChange={(event) => onShowNameChange(event.target.value)}
        />
      </label>
      <label>
        Saved Shows
        <select
          value={selectedShowId}
          onChange={(event) => onSelectedShowChange(event.target.value)}
        >
          <option value="">No saved show selected</option>
          {savedShows.map((show) => (
            <option key={show.id} value={show.id}>
              {show.showName}
            </option>
          ))}
        </select>
      </label>
      <div className="libraryActions">
        <button onClick={onSaveShow}>
          <Save size={16} />
          Save
        </button>
        <button onClick={() => onLoadShow()} disabled={!selectedShowId}>
          <FolderOpen size={16} />
          Load
        </button>
        <button onClick={onExportShow}>
          <Copy size={16} />
          Export
        </button>
      </div>
      <div className="saveManifestGrid" aria-label="Show save manifest">
        {saveManifest.map((item) => (
          <span className={item.count ? "done" : ""} key={item.id}>
            <strong>{item.count}</strong>
            {item.label}
          </span>
        ))}
      </div>
      <small className="controlHint">
        Saves the show look, cast customization, sets, boards, cuts, takes, credits, and DoinkTV notes.
      </small>
    </div>
  );
}

function NewProjectGuide({
  mode,
  scene,
  character,
  hasCustomRigParts,
  sceneObjectCount,
  onSceneChange,
  onCharacterChange,
  onCustomizeRig,
  onPlaceInScene,
  onPerform,
  onSaveShow
}) {
  const steps = [
    { id: "setting", label: "Select setting", done: Boolean(scene), action: null },
    { id: "rig", label: "Select rig", done: Boolean(character), action: null },
    { id: "customize", label: "Customize rig", done: hasCustomRigParts, action: onCustomizeRig },
    { id: "place", label: "Place in scene", done: sceneObjectCount > 0, action: onPlaceInScene },
    { id: "perform", label: "Perform", done: mode === "perform", action: onPerform }
  ];

  return (
    <div className="dockGroup newProjectGuide">
      <h2>New Project Path</h2>
      <small className="controlHint">Start like a game character creator: pick the room, pick the rig, make it yours, then walk it onto the set.</small>
      <div className="projectStepRail">
        {steps.map((step, index) => (
          <button
            type="button"
            key={step.id}
            className={`${step.done ? "done" : ""} ${mode === "build" && step.id === "customize" ? "current" : ""}`}
            onClick={step.action || undefined}
            disabled={!step.action}
          >
            <span>{index + 1}</span>
            {step.label}
          </button>
        ))}
      </div>
      <label>
        Setting
        <select value={scene} onChange={(event) => onSceneChange(event.target.value)}>
          {sceneCatalog.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Rig Model
        <select value={character} onChange={(event) => onCharacterChange(event.target.value)}>
          {characterCatalog.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <div className="projectGuideActions">
        <button type="button" onClick={onCustomizeRig}>Character Creator</button>
        <button type="button" onClick={onPlaceInScene}>Place Props</button>
        <button type="button" onClick={onPerform}>Perform</button>
        <button type="button" onClick={onSaveShow}>Save Show</button>
      </div>
    </div>
  );
}

function ContextActionStrip({
  mode,
  selectedPart,
  selectedPartValue,
  selectedSceneObject,
  selectedTake,
  playbackActive,
  canUndo,
  canRedo,
  autosaveLabel,
  onUndo,
  onRedo,
  onPartShape,
  onPartDuplicate,
  onPartToggleHidden,
  onPartClear,
  onObjectDuplicate,
  onObjectForward,
  onObjectDelete,
  onReplay,
  onMarkBestTake,
  onAddCut,
  onExport
}) {
  const isBuild = mode === "build";
  const isAssets = mode === "assets";
  const isEdit = mode === "edit";
  const heading = isBuild
    ? selectedPart?.name || "Rig Part"
    : isAssets
    ? selectedSceneObject?.name || "Scene Piece"
    : isEdit
    ? selectedTake?.name || "Take Review"
    : "Quick Actions";
  const detail = isBuild
    ? selectedPartValue?.source || selectedPartValue?.shape || selectedPartValue?.mode
      ? "Selected part is editable."
      : "Blank part selected. Add a shape or image when ready."
    : isAssets
    ? selectedSceneObject
      ? "Arrange, duplicate, or remove the selected prop."
      : "Select a prop to edit it."
    : isEdit
    ? selectedTake
      ? "Replay, mark best, add to cut, or export."
      : "Select a take to finish the short."
    : "Undo, redo, and autosave stay available while you work.";

  return (
    <div className="dockGroup contextActionStrip">
      <div className="contextActionHeader">
        <div>
          <span className="eyebrow">Right Now</span>
          <strong>{heading}</strong>
          <small>{detail}</small>
        </div>
        <small>{autosaveLabel}</small>
      </div>
      <div className="contextActionButtons">
        <button onClick={onUndo} disabled={!canUndo}>
          <Undo2 size={15} />
          Undo
        </button>
        <button onClick={onRedo} disabled={!canRedo}>
          <Redo2 size={15} />
          Redo
        </button>
        {isBuild && (
          <>
            <button onClick={onPartShape}>
              <Square size={15} />
              Shape
            </button>
            <button onClick={onPartDuplicate} disabled={!selectedPartValue}>
              <Copy size={15} />
              Clone
            </button>
            <button onClick={onPartToggleHidden} disabled={!selectedPartValue}>
              <X size={15} />
              {selectedPartValue?.hidden ? "Show" : "Hide"}
            </button>
            <button onClick={onPartClear} disabled={!selectedPartValue}>
              <Trash2 size={15} />
              Clear
            </button>
          </>
        )}
        {isAssets && (
          <>
            <button onClick={onObjectDuplicate} disabled={!selectedSceneObject}>
              <Copy size={15} />
              Clone
            </button>
            <button onClick={onObjectForward} disabled={!selectedSceneObject}>
              <ChevronRight size={15} />
              Forward
            </button>
            <button onClick={onObjectDelete} disabled={!selectedSceneObject}>
              <Trash2 size={15} />
              Delete
            </button>
          </>
        )}
        {isEdit && (
          <>
            <button onClick={onReplay} disabled={!selectedTake}>
              <Play size={15} />
              {playbackActive ? "Playing" : "Replay"}
            </button>
            <button onClick={onMarkBestTake} disabled={!selectedTake}>
              <Sparkles size={15} />
              Best
            </button>
            <button onClick={onAddCut} disabled={!selectedTake}>
              <Plus size={15} />
              Add Cut
            </button>
            <button onClick={onExport}>
              <Video size={15} />
              Export
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ShowBiblePanel({
  showName,
  castCount,
  sceneSetCount,
  propCount,
  referenceCount,
  macroCount,
  boardCount,
  timelineCount,
  toolbox,
  saveSummary,
  activeStyle,
  episodeStatus,
  onSaveShow,
  onModeChange
}) {
  const readiness = toolbox?.readiness || { completeCount: 0, totalCount: 6, percent: 0, steps: [], nextStep: null };
  const nextStep = readiness.nextStep;
  const branches = toolbox?.branches || [];
  const quickReuse = toolbox?.quickReuse || {};
  return (
    <div className="dockGroup showBiblePanel">
      <h2>Show Kit</h2>
      <div className="bibleHeader">
        <strong>Your Show's Stuff</strong>
        <small>{showName}: reusable cast, sets, props, style, boards, and cuts.</small>
        <small>{activeStyle.family} / {activeStyle.theme}</small>
      </div>
      <div className="showKitReadiness">
        <div className="showKitMeterHeader">
          <strong>{readiness.percent}% kit ready</strong>
          <span>{readiness.completeCount}/{readiness.totalCount}</span>
        </div>
        <div className="showKitMeter">
          <span style={{ width: `${readiness.percent}%` }} />
        </div>
        <small>{nextStep ? `Next: ${nextStep.label}` : "Ready to finish and make another one faster."}</small>
      </div>
      <div className="showKitPersistence">
        <strong>Persistence</strong>
        <span>{saveSummary?.lastManualSave ? `Saved to ${saveSummary.lastManualSave.destination}` : "Manual save pending"}</span>
        <span>{saveSummary?.lastAutosaveAt ? `Autosaved ${saveSummary.lastAutosaveAt}` : "Autosave ready after join"}</span>
      </div>
      <div className="bibleGrid">
        <span>
          <strong>{castCount}</strong>
          Cast
        </span>
        <span>
          <strong>{sceneSetCount}</strong>
          Sets
        </span>
        <span>
          <strong>{propCount}</strong>
          Props
        </span>
        <span>
          <strong>{referenceCount}</strong>
          Credits
        </span>
        <span>
          <strong>{macroCount}</strong>
          Macros
        </span>
        <span>
          <strong>{boardCount}</strong>
          Boards
        </span>
        <span>
          <strong>{timelineCount}</strong>
          Cuts
        </span>
      </div>
      <small className="controlHint">Status: {episodeStatus.replaceAll("_", " ")}</small>
      <div className="showObjectMap">
        <span>Show</span>
        <span>Rig</span>
        <span>Set</span>
        <span>Scene</span>
        <span>Take</span>
        <span>Cut</span>
        <span>Export</span>
      </div>
      <div className="toolboxSummary">
        <span>{toolbox?.styleGuide?.family || activeStyle.family}</span>
        <span>{toolbox?.submission?.targetChannel || "DoinkTV"}</span>
        <span>{toolbox?.takes?.filter((take) => take.best).length || 0} best takes</span>
      </div>
      <div className="showKitRule">
        <strong>Feature Rule</strong>
        <span>Beginner: {toolbox?.productRule?.beginner || "One obvious next button."}</span>
        <span>Pro: {toolbox?.productRule?.experienced || "Deeper controls stay nearby."}</span>
        <span>Home: {toolbox?.productRule?.home || "Reusable results live here."}</span>
      </div>
      {branches.length ? (
        <div className="showKitBranches">
          <div className="showKitBranchHeader">
            <strong>Tech Tree</strong>
            <span>{quickReuse.nextRecommendedAction || "Make the next reusable piece."}</span>
          </div>
          {branches.map((branch) => (
            <div className={`showKitBranch ${branch.ready ? "ready" : ""}`} key={branch.id}>
              <div>
                <strong>{branch.label}</strong>
                <small>{branch.count} saved in {branch.showKitHome}</small>
              </div>
              <span>{branch.beginnerVersion}</span>
              <span>{branch.proUnlock}</span>
              <button type="button" onClick={() => onModeChange(branch.mode)}>
                {branch.ready ? "Open" : "Start"}
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="reusableShelf">
        <strong>Reusable Kit</strong>
        <span>{quickReuse.primaryCast || toolbox?.cast?.slice(0, 2).map((item) => item.name).join(", ") || "Build cast"}</span>
        <span>{quickReuse.primaryProp || toolbox?.props?.slice(0, 2).map((item) => item.name).join(", ") || "Add props"}</span>
        <span>{quickReuse.primarySet || toolbox?.sets?.slice(0, 2).map((item) => item.name).join(", ") || "Save a set"}</span>
        <span>{quickReuse.bestTake || "Mark a best take"}</span>
      </div>
      <div className="showKitSteps">
        {readiness.steps.map((step) => (
          <span key={step.id} className={step.done ? "done" : ""} title={`Beginner: ${step.beginnerAction}. Pro: ${step.proUnlock}.`}>
            {step.label}
          </span>
        ))}
      </div>
      <div className="libraryActions">
        <button onClick={() => onModeChange(nextStep?.id === "world" ? "assets" : "build")}>
          {nextStep?.beginnerAction || "Make Another"}
        </button>
        <button onClick={() => onModeChange("build")}>Rigs</button>
        <button onClick={() => onModeChange("assets")}>World</button>
        <button onClick={onSaveShow}>
          <Save size={16} />
          Save Toolbox
        </button>
      </div>
    </div>
  );
}

function PerformControls({
  scene,
  selectedScene,
  selectedPerspective,
  self,
  cameraShot,
  cameraFollow,
  cameraTargetName,
  lightingPreset,
  backgroundTheme,
  objectStyle,
  floorMarks,
  performanceMoments = [],
  shotTemplates,
  onSceneChange,
  onCameraShotChange,
  onCameraFollowChange,
  onCameraPunch,
  onCameraShake,
  onCameraReset,
  onLightingPresetChange,
  onBackgroundThemeChange,
  onObjectStyleChange,
  onExpressionChange,
  onPoseChange,
  onIdleMotionChange,
  onMotionFeelChange,
  onMouthControlChange,
  mouthSensitivity,
  onMouthSensitivityChange,
  mouthSmoothing,
  onMouthSmoothingChange,
  micLive,
  mouthCameraActive,
  onMacroTrigger,
  performancePresets,
  onPerformancePreset,
  onDirectorAction,
  onStoryboardCapture,
  onMoveToMark,
  onSetMarkFromSelf,
  onApplyShotTemplate,
  recording,
  onRecordToggle,
  onModeChange
}) {
  const activeMotionFeel = getCatalogItem(motionFeelCatalog, self?.state.motionFeel || "smooth");
  const motionEnergy = Math.min(100, Math.round((self?.state.groundSpeed || 0) * 100));
  const depthPercent = Math.round(((self?.state.depthProgress ?? 0.65) || 0) * 100);
  const intentLabel = self?.state.motionIntent === "settling" ? "settling" : self?.state.walking ? "moving" : "ready";
  const mouthPercent = Math.min(100, Math.round((self?.state.mouthOpen || 0) * 100));
  const performanceReady = Boolean(self && (micLive || (self.state.mouthControl || "audio") !== "audio"));
  const latestMoment = performanceMoments[0];
  const instrumentScore = Math.min(
    100,
    Math.round(
      (performanceReady ? 24 : 8) +
        Math.min(22, motionEnergy * 0.22) +
        Math.min(18, mouthPercent * 0.18) +
        (cameraShot !== "wide" ? 12 : 4) +
        (latestMoment ? 14 : 0) +
        (recording ? 10 : 0)
    )
  );
  const livePads = [
    {
      id: "reaction",
      label: "Big Reaction",
      keyHint: "5",
      description: "Face, punch-in, and weird expression.",
      action: () => {
        onExpressionChange("weird");
        onPoseChange("surprise");
        onDirectorAction("reaction");
      }
    },
    {
      id: "dead-air",
      label: "Dead Air",
      keyHint: "6",
      description: "Awkward hold with close framing.",
      action: () => {
        onExpressionChange("neutral");
        onPoseChange("deadpan");
        onDirectorAction("hold-for-laugh");
      }
    },
    {
      id: "panic",
      label: "Panic Button",
      keyHint: "C",
      description: "Macro panic, shake, and noisy impact.",
      action: () => {
        onExpressionChange("mad");
        onMacroTrigger("panic");
        onDirectorAction("lights-shift");
      }
    },
    {
      id: "reveal",
      label: "Reveal Thing",
      keyHint: "7",
      description: "Cue a prop and punch the camera.",
      action: () => {
        onPoseChange("point");
        onDirectorAction("prop-reveal");
      }
    }
  ];

  return (
    <>
      <div className="dockGroup">
        <h2>Scene</h2>
        <div className="segmented">
          {sceneCatalog.map((item) => (
            <button
              key={item.id}
              className={scene === item.id ? "selected" : ""}
              onClick={() => onSceneChange(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <div className="dockGroup perspectivePanel">
        <h2>Perspective</h2>
        <strong>{selectedPerspective.name}</strong>
        <small>{selectedPerspective.description}</small>
        <small>{selectedScene.perspectiveNote}</small>
      </div>

      <div className="dockGroup styleRemixPanel">
        <h2>Style Remix</h2>
        <div className="styleRemixSummary">
          <span>{getCatalogItem(backgroundThemeCatalog, backgroundTheme).name}</span>
          <span>{getCatalogItem(objectStyleCatalog, objectStyle).name}</span>
        </div>
        <div className="quickRemixGrid">
          <button
            type="button"
            onClick={() => {
              onBackgroundThemeChange("painted-depth");
              onObjectStyleChange("soft-material");
            }}
          >
            <Sparkles size={15} />
            Painted
          </button>
          <button
            type="button"
            onClick={() => {
              onBackgroundThemeChange("pattern-held");
              onObjectStyleChange("paper-cut");
            }}
          >
            <Sparkles size={15} />
            Cutout
          </button>
          <button
            type="button"
            onClick={() => {
              onBackgroundThemeChange("abstract-gallery");
              onObjectStyleChange("textured-cutout");
            }}
          >
            <Sparkles size={15} />
            Strange
          </button>
        </div>
      </div>

      <div className="dockGroup">
        <h2>Shot Templates</h2>
        <div className="shotTemplateList">
          {shotTemplates.map((template) => (
            <button key={template.id} onClick={() => onApplyShotTemplate(template.id)}>
              <strong>{template.name}</strong>
              <span>{template.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="dockGroup directorCameraPanel">
        <h2>Director Camera</h2>
        <small className="controlHint">Lightweight framing for performance: follow a rig, punch in, or add a quick impact shake.</small>
        <label className="toggleRow">
          <input
            type="checkbox"
            checked={cameraFollow}
            onChange={(event) => onCameraFollowChange(event.target.checked)}
            disabled={!self}
          />
          Follow {cameraTargetName}
        </label>
        <div className="macroGrid">
          <button type="button" onClick={onCameraPunch}>
            <Camera size={16} />
            Punch In
          </button>
          <button type="button" onClick={onCameraShake}>
            <Wand2 size={16} />
            Shake
          </button>
          <button type="button" onClick={onCameraReset}>
            <RefreshCw size={16} />
            Reset
          </button>
        </div>
      </div>

      <div className="dockGroup performanceLoopPanel">
        <h2>Performance Loop</h2>
        <small className="controlHint">Keep the reward close: rehearse, record a short take, then jump straight to replay.</small>
        <div className="performanceInstrumentPanel" aria-label="Performance instrument">
          <div>
            <span className="eyebrow">Instrument Feel</span>
            <strong>{activeMotionFeel.name}</strong>
            <small>{latestMoment ? `${latestMoment.label}: ${latestMoment.detail}` : "Fire a cue, move, or record to start building performance energy."}</small>
          </div>
          <b>{instrumentScore}%</b>
        </div>
        <div className="performanceReadiness" aria-label="Performance readiness">
          <span className={self ? "done" : ""}>Rig</span>
          <span className={performanceReady ? "done" : ""}>Mouth</span>
          <span className={cameraFollow ? "done" : ""}>Camera</span>
          <span className={recording ? "active" : ""}>Take</span>
        </div>
        <div className="performanceLoopActions">
          <button className={recording ? "danger active" : ""} onClick={onRecordToggle}>
            <Circle size={16} />
            {recording ? "Stop Take" : "Record Take"}
          </button>
          <button onClick={() => onModeChange("edit")}>
            <Play size={16} />
            Replay Takes
          </button>
        </div>
      </div>

      <div className="dockGroup livePadPanel">
        <h2>Live Pad</h2>
        <small className="controlHint">Big playable buttons for moments performers want constantly. They stack face, pose, camera, cue, and sound.</small>
        <div className="livePadGrid">
          {livePads.map((pad) => (
            <button type="button" key={pad.id} onClick={pad.action}>
              <span>{pad.keyHint}</span>
              <strong>{pad.label}</strong>
              <small>{pad.description}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="dockGroup performanceMemoryPanel">
        <h2>Cue Memory</h2>
        {performanceMoments.length ? (
          <div className="performanceMomentList" aria-label="Recent performance cues">
            {performanceMoments.slice(0, 4).map((moment) => (
              <span className={`moment-${moment.type}`} key={moment.id}>
                <strong>{moment.label}</strong>
                <small>{moment.at} / {moment.detail}</small>
              </span>
            ))}
          </div>
        ) : (
          <div className="emptyState compactEmpty">
            <strong>No cues yet.</strong>
            <span>Try a Live Pad or Cue Deck button and Pup-It will remember the last beats.</span>
          </div>
        )}
      </div>

      <div className="dockGroup puppetFeelPanel">
        <h2>Puppet Feel</h2>
        <div className="feelReadout">
          <strong>{activeMotionFeel.name}</strong>
          <span>{intentLabel}</span>
        </div>
        <div className="feelHintStrip" aria-label="Performance feel tips">
          <span>Shift scoots</span>
          <span>Alt creeps</span>
          <span>Space resets mouth</span>
        </div>
        <div className="feelMeter">
          <span>Motion</span>
          <div><i style={{ width: `${motionEnergy}%` }} /></div>
          <small>{motionEnergy}%</small>
        </div>
        <div className="feelMeter">
          <span>Floor</span>
          <div><i style={{ width: `${depthPercent}%` }} /></div>
          <small>{depthPercent}%</small>
        </div>
        <div className="feelMeter">
          <span>Mouth</span>
          <div><i style={{ width: `${mouthPercent}%` }} /></div>
          <small>{mouthPercent}%</small>
        </div>
        <small className="controlHint">Hold Shift to scoot, Alt for tiny adjustments. Movement still stays locked to the scene floor.</small>
      </div>

      <div className="dockGroup performanceFeelPanel">
        <h2>Feel Boosters</h2>
        <small className="controlHint">One-click performance polish: make the puppet feel better before you think about animation curves.</small>
        <div className="quickRemixGrid">
          <button
            type="button"
            onClick={() => {
              onMotionFeelChange("smooth");
              onIdleMotionChange("alive");
              onPoseChange("listen");
            }}
          >
            <Sparkles size={15} />
            TV Ready
          </button>
          <button
            type="button"
            onClick={() => {
              onMotionFeelChange("direct");
              onPoseChange("point");
              onCameraPunch();
            }}
          >
            <Sparkles size={15} />
            Punchy Bit
          </button>
          <button
            type="button"
            onClick={() => {
              onMotionFeelChange("loose");
              onIdleMotionChange("subtle");
              onDirectorAction("hold-for-laugh");
            }}
          >
            <Sparkles size={15} />
            Awkward Hold
          </button>
          <button
            type="button"
            onClick={() => {
              onMotionFeelChange("floaty");
              onPoseChange("surprise");
              onCameraShake();
            }}
          >
            <Sparkles size={15} />
            Weird Drift
          </button>
        </div>
      </div>

      <div className="dockGroup advancedControl">
        <h2>Shot</h2>
        <div className="shotGrid">
          {cameraShotCatalog.map((shot) => (
            <button
              key={shot.id}
              className={cameraShot === shot.id ? "selected" : ""}
              title={shot.description}
              onClick={() => onCameraShotChange(shot.id)}
            >
              {shot.name}
            </button>
          ))}
        </div>
      </div>

      <div className="dockGroup advancedControl">
        <h2>Lighting</h2>
        <div className="shotGrid">
          {lightingPresetCatalog.map((light) => (
            <button
              key={light.id}
              className={lightingPreset === light.id ? "selected" : ""}
              title={light.description}
              onClick={() => onLightingPresetChange(light.id)}
            >
              {light.name}
            </button>
          ))}
        </div>
      </div>

      <div className="dockGroup advancedControl">
        <h2>Background Theme</h2>
        <div className="shotGrid">
          {backgroundThemeCatalog.map((theme) => (
            <button
              key={theme.id}
              className={backgroundTheme === theme.id ? "selected" : ""}
              title={theme.description}
              onClick={() => onBackgroundThemeChange(theme.id)}
            >
              {theme.name}
            </button>
          ))}
        </div>
      </div>

      <div className="dockGroup advancedControl">
        <h2>Object Style</h2>
        <div className="shotGrid">
          {objectStyleCatalog.map((style) => (
            <button
              key={style.id}
              className={objectStyle === style.id ? "selected" : ""}
              title={style.description}
              onClick={() => onObjectStyleChange(style.id)}
            >
              {style.name}
            </button>
          ))}
        </div>
      </div>

      <div className="dockGroup cueDeckPanel">
        <h2>Cue Deck</h2>
        <small className="controlHint">Fast live buttons for camera punches, lighting shifts, scene beats, and performer reactions.</small>
        <div className="macroGrid">
          {directorActionCatalog.map((action) => (
            <button key={action.id} onClick={() => onDirectorAction(action.id)}>
              <Wand2 size={16} />
              {action.name}
            </button>
          ))}
          <button onClick={onStoryboardCapture}>
            <Clapperboard size={16} />
            Mark Beat
          </button>
        </div>
      </div>

      <div className="dockGroup advancedControl">
        <h2>Marks</h2>
        <div className="markList">
          {floorMarks.map((mark) => (
            <div className="markRow" key={mark.id}>
              <button onClick={() => onMoveToMark(mark.id)}>
                <span>{mark.label}</span>
                {mark.name}
              </button>
              <button onClick={() => onSetMarkFromSelf(mark.id)} disabled={!self}>
                Set
              </button>
            </div>
          ))}
        </div>
        <small className="controlHint">Hotkeys: 1-4 poses, Z/X/C macros, H hold idle.</small>
      </div>

      <details className="dockGroup controlCheatSheet">
        <summary>Controls Cheat Sheet</summary>
        <div>
          <span>WASD / Arrows</span>
          <strong>Move body</strong>
          <span>Mic audio</span>
          <strong>Mouth auto-match</strong>
          <span>1-4</span>
          <strong>Quick poses</strong>
          <span>5-8</span>
          <strong>Live cues</strong>
          <span>Z / X / C</span>
          <strong>Wave, hop, panic</strong>
          <span>H</span>
          <strong>Hold/release idle</strong>
          <span>Q / E</span>
          <strong>Scale trim</strong>
          <span>Shift / Alt</span>
          <strong>Scoot, tiny step</strong>
        </div>
      </details>

      <div className="dockGroup">
        <h2>Expression</h2>
        <div className="segmented">
          {expressionCatalog.map((expression) => (
            <button
              key={expression.id}
              className={self?.state.expression === expression.id ? "selected" : ""}
              onClick={() => onExpressionChange(expression.id)}
            >
              {expression.name}
            </button>
          ))}
        </div>
      </div>

      <div className="dockGroup">
        <h2>Poses</h2>
        <div className="poseGrid">
          {poseCatalog.map((pose) => (
            <button
              key={pose.id}
              className={self?.state.pose === pose.id ? "selected" : ""}
              onClick={() => onPoseChange(pose.id)}
            >
              {pose.name}
            </button>
          ))}
        </div>
      </div>

      <div className="dockGroup">
        <h2>Idle</h2>
        <div className="segmented">
          {idleMotionCatalog.map((idle) => (
            <button
              key={idle.id}
              className={self?.state.idleMotion === idle.id ? "selected" : ""}
              onClick={() => onIdleMotionChange(idle.id)}
            >
              {idle.name}
            </button>
          ))}
        </div>
      </div>

      <div className="dockGroup">
        <h2>Performance Presets</h2>
        <div className="shotTemplateList performancePresetList">
          {performancePresets.map((preset) => (
            <button key={preset.id} onClick={() => onPerformancePreset(preset.id)}>
              <strong>{preset.name}</strong>
              <span>{preset.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="dockGroup">
        <h2>Motion</h2>
        <div className="segmented">
          {motionFeelCatalog.map((feel) => (
            <button
              key={feel.id}
              className={(self?.state.motionFeel || "smooth") === feel.id ? "selected" : ""}
              title={feel.description}
              onClick={() => onMotionFeelChange(feel.id)}
            >
              {feel.name}
            </button>
          ))}
        </div>
        <small className="controlHint">
          Smooth TV is the beginner default. Snappy Cutout hits marks faster; Loose Puppet keeps more handmade drift.
        </small>
      </div>

      <div className="dockGroup">
        <h2>Mouth Control</h2>
        <div className="segmented">
          <button
            className={(self?.state.mouthControl || "audio") === "audio" ? "selected" : ""}
            onClick={() => onMouthControlChange("audio")}
          >
            <Mic size={15} />
            Audio
          </button>
          <button
            className={self?.state.mouthControl === "mouse" ? "selected" : ""}
            onClick={() => onMouthControlChange("mouse")}
          >
            <MousePointer2 size={15} />
            Mouse
          </button>
          <button
            className={self?.state.mouthControl === "camera" ? "selected" : ""}
            onClick={() => onMouthControlChange("camera")}
          >
            <Camera size={15} />
            Camera
          </button>
        </div>
        <div className="mouthMeter">
          <span style={{ width: `${(self?.state.mouthOpen || 0) * 100}%` }} />
        </div>
        <div className="advancedControl compactRange">
          <span className="rangeLabel">
            Audio Sensitivity
            <small>{mouthSensitivity.toFixed(1)}x</small>
          </span>
          <input
            type="range"
            min="0.4"
            max="2"
            step="0.1"
            value={mouthSensitivity}
            onChange={(event) => onMouthSensitivityChange(Number(event.target.value))}
          />
        </div>
        <div className="advancedControl compactRange">
          <span className="rangeLabel">
            Audio Smoothing
            <small>{Math.round(mouthSmoothing * 100)}%</small>
          </span>
          <input
            type="range"
            min="0.15"
            max="0.9"
            step="0.05"
            value={mouthSmoothing}
            onChange={(event) => onMouthSmoothingChange(Number(event.target.value))}
          />
        </div>
        <small className="controlHint">
          {(self?.state.mouthControl || "audio") === "audio"
            ? micLive
              ? "Voice is automatically driving mouth motion."
              : "Turn on Mic to drive mouth motion from your voice."
            : self?.state.mouthControl === "camera"
            ? mouthCameraActive
              ? "Camera is driving mouth motion."
              : "Camera access may need browser permission."
            : "Move the mouse higher on stage to open the mouth."}
        </small>
      </div>

      <div className="dockGroup">
        <h2>Macros</h2>
        <div className="macroGrid">
          {macroCatalog.map((macro) => (
            <button key={macro.id} onClick={() => onMacroTrigger(macro.id)}>
              <Wand2 size={16} />
              {macro.name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function AssetLibraryPanel({
  assets,
  references,
  filter,
  target,
  search,
  sceneObjects,
  selectedSceneObjectId,
  sceneSets,
  onFilterChange,
  onTargetChange,
  onSearchChange,
  onImportAsset,
  onPlaceAsset,
  onPlaceImage,
  onPlaceShape,
  onSelectSceneObject,
  onUpdateSceneObject,
  onDuplicateSceneObject,
  onMoveSceneObjectLayer,
  onDeleteSceneObject,
  onSaveCurrentSet,
  onApplySceneSet
}) {
  const [imageName, setImageName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageLicense, setImageLicense] = useState("User Supplied");
  const [propName, setPropName] = useState("Weird Prop");
  const [propShape, setPropShape] = useState("bean");
  const [propTint, setPropTint] = useState("#fff2a8");
  const [propTexture, setPropTexture] = useState("paper-grain");
  const searchQuery = search.trim().toLowerCase();
  const filteredAssets = assets.filter((asset) => {
    const matchesFormat = filter === "all" || asset.format === filter;
    const matchesTarget = target === "all" || asset.targets?.includes(target);
    const matchesSearch = !searchQuery || getAssetSearchText(asset).includes(searchQuery);
    return matchesFormat && matchesTarget && matchesSearch;
  });
  const importLocalImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(String(reader.result || ""));
      setImageName((current) => current || file.name.replace(/\.[^.]+$/, ""));
      setImageLicense("Team-owned / local import");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="assetLibrary">
      <div className="dockGroup">
        <h2>Raw Materials</h2>
        <div className="editorHeader">
          <Library size={18} />
          <div>
            <strong>Find pieces for your show</strong>
            <small>Search for raw settings, objects, rigs, textures, and reference material to transform.</small>
          </div>
        </div>
        <label className="assetSearchRow">
          Search
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="rigs, mouths, diner setting, parody reference..."
          />
        </label>
        <div className="assetPresetSearches" aria-label="Common scene searches">
          {assetSceneSearchPresets.map((preset) => (
            <button
              key={preset}
              className={search.toLowerCase() === preset ? "selected" : ""}
              onClick={() => onSearchChange(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
        <div className="assetTargetBar" aria-label="Asset target filters">
          <button className={target === "all" ? "selected" : ""} onClick={() => onTargetChange("all")}>
            All
          </button>
          {assetTargetCatalog.map((targetItem) => (
            <button
              key={targetItem.id}
              className={target === targetItem.id ? "selected" : ""}
              onClick={() => onTargetChange(targetItem.id)}
            >
              {targetItem.name}
            </button>
          ))}
        </div>
        <label>
          Format
          <select value={filter} onChange={(event) => onFilterChange(event.target.value)}>
            <option value="all">All formats</option>
            {assetFormatCatalog.map((format) => (
              <option key={format.id} value={format.id}>
                {format.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="dockGroup">
        <h2>Import Material</h2>
        <label>
          Name
          <input value={imageName} onChange={(event) => setImageName(event.target.value)} placeholder="Couch, skyline, weird sign..." />
        </label>
        <label className="fileImportDrop">
          <FolderOpen size={16} />
          Add local image
          <input
            type="file"
            accept="image/*"
            onChange={(event) => importLocalImage(event.target.files?.[0])}
          />
        </label>
        <label>
          Image URL or imported file
          <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://... or local import" />
        </label>
        <label>
          License / rights note
          <input value={imageLicense} onChange={(event) => setImageLicense(event.target.value)} />
        </label>
        <button
          className="wideAction"
          disabled={!imageUrl.trim()}
          onClick={() => {
            onPlaceImage({
              name: imageName.trim() || "Imported Image",
              imageUrl,
              license: imageLicense,
              attribution: imageLicense,
              texturePreset: propTexture
            });
            setImageName("");
            setImageUrl("");
          }}
        >
          <Plus size={16} />
          Place Material
        </button>
        <small className="controlHint">Use cleared, CC0, public-domain, or team-owned images for production.</small>
      </div>

      <div className="dockGroup propMakerPanel">
        <h2>Prop Maker</h2>
        <small className="controlHint">Build scene pieces from simple shapes first, then swap in imported art later.</small>
        <label>
          Prop Name
          <input value={propName} onChange={(event) => setPropName(event.target.value)} />
        </label>
        <label>
          Shape
          <select value={propShape} onChange={(event) => setPropShape(event.target.value)}>
            {partShapeCatalog.map((shape) => (
              <option key={shape.id} value={shape.id}>
                {shape.name}
              </option>
            ))}
          </select>
        </label>
        <label className="advancedControl">
          Texture
          <select value={propTexture} onChange={(event) => setPropTexture(event.target.value)}>
            {texturePresetOptions.map((texture) => (
              <option key={texture.id} value={texture.id}>
                {texture.name}
              </option>
            ))}
          </select>
        </label>
        <ColorPicker
          label="Prop Color"
          value={propTint}
          onChange={setPropTint}
        />
        <button
          className="wideAction"
          onClick={() => onPlaceShape({ name: propName, shape: propShape, tint: propTint, texturePreset: propTexture })}
        >
          <Plus size={16} />
          Build Prop
        </button>
        <button
          className="wideAction secondaryAction"
          onClick={() => onPlaceShape({ name: propName || "Doodle Prop", shape: "scribble", tint: propTint, texturePreset: "photocopy" })}
        >
          <Palette size={16} />
          Doodle Prop
        </button>
      </div>

      <div className="assetCardList">
        {filteredAssets.length ? filteredAssets.map((asset) => {
          const safe = isOneClickSafeAsset(asset);
          const importTypes = assetImportTypeCatalog.filter((type) => asset.importTypes.includes(type.id));
          return (
            <article key={asset.id} className={`assetCard ${safe ? "assetSafe" : "assetWarning"}`}>
              <div className={`assetPreview assetPreview-${asset.previewStyle}`} aria-hidden="true">
                <span />
                <i />
              </div>
              <div className="assetCardBody">
                <div className="assetCardTitle">
                  <strong>{asset.name}</strong>
                  <span className={`licenseBadge ${safe ? "safe" : "warning"}`}>{asset.license}</span>
                </div>
                <small>
                  {asset.provider} / {getCatalogItem(assetFormatCatalog, asset.format).name}
                </small>
                <p>{asset.description}</p>
                <div className="assetTargets">
                  {(asset.targets || []).map((targetId) => (
                    <span key={targetId}>{getCatalogItem(assetTargetCatalog, targetId).name}</span>
                  ))}
                </div>
                <div className="assetTags">
                  {asset.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                {!safe && <p className="licenseWarning">{asset.attribution}</p>}
                <div className="assetActions">
                  {importTypes.map((type) => (
                    <button
                      key={type.id}
                      disabled={!safe && type.id !== "use-as-reference"}
                      onClick={() => onImportAsset(asset.id, type.id)}
                    >
                      {type.name}
                    </button>
                  ))}
                  <button
                    disabled={!safe || !asset.targets?.some((targetItem) => ["object", "setting", "sprite"].includes(targetItem))}
                    onClick={() => onPlaceAsset(asset)}
                  >
                    Use as Material
                  </button>
                  {asset.sourceUrl ? (
                    <a href={asset.sourceUrl} target="_blank" rel="noreferrer">
                      <ExternalLink size={15} />
                      Source
                    </a>
                  ) : (
                    <button disabled>Source</button>
                  )}
                </div>
              </div>
            </article>
          );
        }) : (
          <div className="emptyState actionEmpty">
            <strong>No assets match that search yet.</strong>
            <span>Try a broader raw-material search, then bend the result into your show.</span>
            <button onClick={() => onSearchChange("")}>Show All Materials</button>
          </div>
        )}
      </div>

      <div className="dockGroup">
        <h2>Show References</h2>
        {references.length ? (
          <div className="takeList">
            {references.map((reference) => (
              <div className="assetReference" key={reference.id}>
                <span>{reference.name}</span>
                <small>
                  {reference.license} / {reference.importType}
                </small>
              </div>
            ))}
          </div>
        ) : (
          <div className="emptyState actionEmpty">
            <strong>No external assets attached yet.</strong>
            <span>One-click safe materials keep credits and rights notes with the show.</span>
            <button onClick={() => onSearchChange("cc0 prop")}>Find CC0 Props</button>
          </div>
        )}
      </div>

      <div className="dockGroup">
        <h2>Scene Objects</h2>
        {sceneObjects.length ? (
          <div className="sceneObjectList">
            {sceneObjects.map((object) => (
              <div
                className={`sceneObjectEditor ${object.id === selectedSceneObjectId ? "selected" : ""}`}
                key={object.id}
              >
                <button onClick={() => onSelectSceneObject(object.id)}>{object.name}</button>
                <label>
                  Name
                  <input
                    value={object.name}
                    onChange={(event) => onUpdateSceneObject(object.id, { name: event.target.value })}
                  />
                </label>
                <label>
                  Tint
                  <input
                    type="color"
                    value={object.tint || "#f5f1e8"}
                    onChange={(event) => onUpdateSceneObject(object.id, { tint: event.target.value })}
                  />
                </label>
                <label className="advancedControl">
                  Texture
                  <select
                    value={object.texturePreset || "paper-grain"}
                    onChange={(event) => onUpdateSceneObject(object.id, { texturePreset: event.target.value })}
                  >
                    {texturePresetOptions.map((texture) => (
                      <option key={texture.id} value={texture.id}>
                        {texture.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  X
                  <input
                    type="range"
                    min="5"
                    max="95"
                    value={object.x}
                    disabled={object.locked}
                    onChange={(event) => onUpdateSceneObject(object.id, { x: Number(event.target.value) })}
                  />
                </label>
                <label>
                  Y
                  <input
                    type="range"
                    min="25"
                    max="88"
                    value={object.y}
                    disabled={object.locked}
                    onChange={(event) => onUpdateSceneObject(object.id, { y: Number(event.target.value) })}
                  />
                </label>
                <label>
                  Scale
                  <input
                    type="range"
                    min="0.35"
                    max="1.8"
                    step="0.05"
                    value={object.scale}
                    disabled={object.locked}
                    onChange={(event) => onUpdateSceneObject(object.id, { scale: Number(event.target.value) })}
                  />
                </label>
                <label>
                  Layer
                  <input
                    type="range"
                    min="0"
                    max="6"
                    value={object.layer}
                    disabled={object.locked}
                    onChange={(event) => onUpdateSceneObject(object.id, { layer: Number(event.target.value) })}
                  />
                </label>
                <div className="sceneObjectActions">
                  <button onClick={() => onUpdateSceneObject(object.id, { flipped: !object.flipped })}>
                    Flip
                  </button>
                  <button onClick={() => onUpdateSceneObject(object.id, { locked: !object.locked })}>
                    {object.locked ? "Unlock" : "Lock"}
                  </button>
                  <button onClick={() => onUpdateSceneObject(object.id, { hidden: !object.hidden })}>
                    {object.hidden ? "Reveal" : "Hide"}
                  </button>
                  <button onClick={() => onDuplicateSceneObject(object.id)}>Duplicate</button>
                  <button onClick={() => onMoveSceneObjectLayer(object.id, 1)} disabled={object.locked}>
                    Forward
                  </button>
                  <button onClick={() => onMoveSceneObjectLayer(object.id, -1)} disabled={object.locked}>
                    Back
                  </button>
                  <button className="danger" onClick={() => onDeleteSceneObject(object.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="emptyState">Search for props or settings, then place them into the scene.</div>
        )}
        <div className="libraryActions">
          <button onClick={onSaveCurrentSet} disabled={!sceneObjects.length}>
            <Save size={16} />
            Save Set
          </button>
        </div>
        {sceneSets.length ? (
          <div className="takeList">
            {sceneSets.map((sceneSet) => (
              <button className="takeButton" key={sceneSet.id} onClick={() => onApplySceneSet(sceneSet.id)}>
                <span>{sceneSet.name}</span>
                <small>{sceneSet.sceneObjects.length} objects</small>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StoryboardCanvas({ panels, selectedPanelId, onSelectPanel }) {
  if (!panels.length) {
    return (
      <div className="storyboardEmpty">
        <Clapperboard size={42} />
        <strong>Storyboard</strong>
        <span>Use the Storyboard dock to add your first panel.</span>
      </div>
    );
  }

  return (
    <div className="storyboardStrip">
      {panels.map((panel, index) => (
        <button
          key={panel.id}
          className={`storyboardPanel ${selectedPanelId === panel.id ? "selected" : ""}`}
          onClick={() => onSelectPanel(panel.id)}
        >
          <div className="panelLabel">
            <span>{index + 1}</span>
            <strong>{panel.title}</strong>
            <small>{getCatalogItem(cameraShotCatalog, panel.shot).name}</small>
          </div>
          <PanelFrame panel={panel} />
          <p>{panel.caption || "..."}</p>
        </button>
      ))}
    </div>
  );
}

function PanelFrame({ panel }) {
  const panelScene = getCatalogItem(sceneCatalog, panel.scene);
  const panelShot = getCatalogItem(cameraShotCatalog, panel.shot);
  const panelLighting = getCatalogItem(lightingPresetCatalog, panel.lightingPreset || "scene");
  const panelBackgroundTheme = getCatalogItem(
    backgroundThemeCatalog,
    panel.backgroundTheme || "scene-native"
  );
  const panelObjectStyle = getCatalogItem(objectStyleCatalog, panel.objectStyle || "match-character");

  return (
    <div
      className={`panelFrame perspective-${panelScene.perspective || "front-stage"} ${panelScene.className} ${panelShot.className} ${panelLighting.className} ${panelBackgroundTheme.className} ${panelObjectStyle.className} texture-${panel.texturePreset || panelBackgroundTheme.texturePreset || "paper-grain"}`}
      style={{
        "--scene-horizon": `${panelScene.horizon}%`,
        "--scene-foreground": `${panelScene.foreground}%`,
        "--scene-focus-x": `${panelScene.vanishingX || 50}%`,
        "--scene-focus-y": `${panelScene.focusY || panelScene.horizon}%`
      }}
    >
      <div className="panelStageInner stageCamera">
        <div className="stageTexture" />
        <div className="stageLighting" />
        <div className="horizonGuide" data-label={panelScene.focusLabel || "Focus"} />
        <div className="focusPoint" aria-hidden="true" />
        <div className="setFloor" />
        {(panel.floorMarks || []).map((mark) => (
          <FloorMark key={mark.id} mark={mark} onActivate={() => {}} />
        ))}
        {(panel.sceneObjects || []).map((object) => (
          <SceneObject key={object.id} object={object} selected={false} />
        ))}
        {panel.performers.map((performer) => (
          <Puppet key={performer.id} performer={performer} isSelf={false} depthModel={panelScene} showLabels />
        ))}
      </div>
    </div>
  );
}

function StoryboardEditor({
  panels,
  selectedPanel,
  onAddPanel,
  onUpdatePanel,
  onDuplicatePanel,
  onDeletePanel,
  onSelectPanel,
  onPanelMetaChange,
  onAddPanelToTimeline,
  onPerformPanel
}) {
  return (
    <div className="storyboardEditor">
      <div className="dockGroup">
        <h2>Storyboard</h2>
        <div className="editorHeader">
          <Clapperboard size={18} />
          <div>
            <strong>{selectedPanel?.title || "Comic Strip Layout"}</strong>
            <small>{panels.length} panels</small>
          </div>
        </div>
        <div className="libraryActions">
          <button onClick={onAddPanel}>
            <Plus size={16} />
            Add Panel
          </button>
          <button onClick={onUpdatePanel} disabled={!selectedPanel}>
            <RefreshCw size={16} />
            Capture
          </button>
        </div>
      </div>

      {selectedPanel && (
        <>
          <div className="dockGroup">
            <h2>Panel</h2>
            <label>
              Title
              <input
                value={selectedPanel.title}
                onChange={(event) => onPanelMetaChange({ title: event.target.value })}
              />
            </label>
            <label>
              Shot
              <select
                value={selectedPanel.shot}
                onChange={(event) => onPanelMetaChange({ shot: event.target.value })}
              >
                {cameraShotCatalog.map((shot) => (
                  <option key={shot.id} value={shot.id}>
                    {shot.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Lighting
              <select
                value={selectedPanel.lightingPreset || "scene"}
                onChange={(event) => onPanelMetaChange({ lightingPreset: event.target.value })}
              >
                {lightingPresetCatalog.map((light) => (
                  <option key={light.id} value={light.id}>
                    {light.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Background Theme
              <select
                value={selectedPanel.backgroundTheme || "scene-native"}
                onChange={(event) => {
                  const nextTheme = getCatalogItem(backgroundThemeCatalog, event.target.value);
                  onPanelMetaChange({
                    backgroundTheme: event.target.value,
                    texturePreset: nextTheme.texturePreset || selectedPanel.texturePreset
                  });
                }}
              >
                {backgroundThemeCatalog.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Object Style
              <select
                value={selectedPanel.objectStyle || "match-character"}
                onChange={(event) => onPanelMetaChange({ objectStyle: event.target.value })}
              >
                {objectStyleCatalog.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Duration
              <input
                value={selectedPanel.duration}
                onChange={(event) => onPanelMetaChange({ duration: event.target.value })}
              />
            </label>
            <label>
              Caption
              <textarea
                rows={4}
                value={selectedPanel.caption}
                onChange={(event) => onPanelMetaChange({ caption: event.target.value })}
              />
            </label>
          </div>

          <div className="libraryActions">
            <button onClick={() => onPerformPanel(selectedPanel.id)}>
              <Radio size={16} />
              Perform
            </button>
            <button onClick={() => onAddPanelToTimeline(selectedPanel.id)}>
              <Plus size={16} />
              Timeline
            </button>
            <button onClick={onDuplicatePanel}>
              <Copy size={16} />
              Duplicate
            </button>
            <button className="danger" onClick={onDeletePanel}>
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </>
      )}

      <div className="dockGroup">
        <h2>Panel List</h2>
        {panels.length ? (
          <div className="takeList">
            {panels.map((panel, index) => (
              <button
                key={panel.id}
                className={`takeButton ${selectedPanel?.id === panel.id ? "selected" : ""}`}
                onClick={() => onSelectPanel(panel.id)}
              >
                <span>
                  {index + 1}. {panel.title}
                </span>
                <small>
                  {getCatalogItem(cameraShotCatalog, panel.shot).name} / {panel.duration}
                </small>
              </button>
            ))}
          </div>
        ) : (
          <div className="emptyState actionEmpty">
            <strong>No panels yet.</strong>
            <span>Capture the current stage as a comic-strip beat, then perform from it.</span>
            <button onClick={onAddPanel}>Add First Panel</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CharacterEditor({
  performer,
  character,
  selectedPartId,
  onSelectedPartChange,
  onCharacterChange,
  onRigChange,
  onStyleChange,
  onDesignChange,
  onRandomize,
  onMutate,
  onStyleMutate,
  onBehaviorChange,
  onPartChange,
  onPartDuplicate,
  onPartSwap,
  onPartClear
}) {
  if (!performer) return null;

  const baseCharacter = getCatalogItem(characterCatalog, performer.character);
  const rig = { ...baseCharacter.rigConfig, ...performer.state.rigConfig };
  const stylePreset = performer.state.stylePreset || baseCharacter.stylePreset;
  const selectedStyle = getCatalogItem(animationStyleCatalog, stylePreset);
  const behaviorPreset = performer.state.behaviorPreset || "none";
  const characterParts = performer.state.characterParts || {};
  const coreParts = characterPartCatalog.filter((part) => corePartSlots.includes(part.id));
  const addOnParts = characterPartCatalog.filter((part) => extraPartSlots.includes(part.id));
  const visiblePartSlots = [...coreParts, ...addOnParts];
  const selectedPart = getCatalogItem(characterPartCatalog, selectedPartId) || coreParts[0];
  const selectedPartValue = characterParts[selectedPart.id] || {};
  const hasParts = corePartSlots.some((slot) => {
    const part = characterParts[slot];
    return part?.source || part?.shape || part?.mode === "drawn";
  });
  const rigCheckItems = [
    { id: "head", label: "Head shape", required: true, quickFixSlot: "head", ok: Boolean(characterParts.head?.source || characterParts.head?.shape || characterParts.head?.mode === "drawn") },
    { id: "torso", label: "Body shape", required: true, quickFixSlot: "torso", ok: Boolean(characterParts.torso?.source || characterParts.torso?.shape || characterParts.torso?.mode === "drawn") },
    { id: "face", label: "Mouth on head", required: true, quickFixSlot: "head", ok: Boolean(characterParts.head?.source || characterParts.head?.shape || characterParts.head?.mode === "drawn" || rig.singleShape) },
    { id: "leftArm", label: rig.arms ? "Arms readable" : "Arms hidden", required: Boolean(rig.arms), quickFixSlot: "leftArm", ok: !rig.arms || Boolean(characterParts.leftArm?.source || characterParts.rightArm?.source || characterParts.leftArm?.shape || characterParts.rightArm?.shape || characterParts.leftArm?.mode === "drawn" || characterParts.rightArm?.mode === "drawn") },
    { id: "leftLeg", label: rig.legs ? "Legs readable" : "Legs hidden", required: Boolean(rig.legs), quickFixSlot: "leftLeg", ok: !rig.legs || Boolean(characterParts.leftLeg?.source || characterParts.rightLeg?.source || characterParts.leftLeg?.shape || characterParts.rightLeg?.shape || characterParts.leftLeg?.mode === "drawn" || characterParts.rightLeg?.mode === "drawn") }
  ];
  const missingRigParts = rigCheckItems.filter((item) => item.required && !item.ok);
  const rigReady = missingRigParts.length === 0;
  const firstMissingPart = missingRigParts[0]?.quickFixSlot || (!characterParts.head ? "head" : "torso");
  const firstMissingPartConfig = getCatalogItem(characterPartCatalog, firstMissingPart);
  const design = {
    name: performer.state.characterDesign?.name || `${baseCharacter.name} Puppet`,
    color: performer.state.characterDesign?.color || baseCharacter.color,
    accent: performer.state.characterDesign?.accent || baseCharacter.accent
  };

  return (
    <div className="characterEditor">
      <div className="dockGroup">
        <h2>Character Creator</h2>
        <div className="editorHeader">
          <Palette size={18} />
          <div>
            <strong>{design.name}</strong>
            <small>
              {hasParts
                ? "Keep assembling. Every part makes the rig less stock."
                : "This is only a rig. Add shapes, doodles, or images to make the character yours."}
            </small>
          </div>
        </div>
        <label className="characterCreatorSelect">
          Rig Model
          <select value={character || performer.character} onChange={(event) => onCharacterChange(event.target.value)}>
            {characterCatalog.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <div className="buildToolStrip" aria-label="Fast rig tools">
          <button
            type="button"
            title="Add a simple shape to the next missing part"
            onClick={() =>
              onPartChange(firstMissingPart, {
                label: firstMissingPartConfig.label,
                mode: "shape",
                shape: firstMissingPart === "torso" ? "bean" : "circle",
                source: ""
              })
            }
          >
            <Square size={15} />
            Shape
          </button>
          <button
            type="button"
            title="Make a rough drawn head placeholder"
            onClick={() =>
              onPartChange("head", {
                label: getCatalogItem(characterPartCatalog, "head").label,
                mode: "drawn",
                shape: "scribble",
                source: ""
              })
            }
          >
            <MousePointer2 size={15} />
            Doodle
          </button>
          <button
            type="button"
            title="Open the head image slot"
            onClick={() =>
              onPartChange("head", {
                label: getCatalogItem(characterPartCatalog, "head").label,
                mode: "image",
                shape: characterParts.head?.shape || "oval",
                source: characterParts.head?.source || ""
              })
            }
          >
            <Library size={15} />
            Image
          </button>
          <button
            type="button"
            title="Try a quick color shuffle"
            onClick={() =>
              onDesignChange({
                color: pickRandom(characterColorSwatches),
                accent: pickRandom(characterColorSwatches)
              })
            }
          >
            <Palette size={15} />
            Color
          </button>
          <button type="button" title="Clone the head part" onClick={() => onPartDuplicate("head")}>
            <Copy size={15} />
            Clone
          </button>
          <button
            type="button"
            title="Hide or show the head part"
            onClick={() => onPartChange("head", { hidden: !characterParts.head?.hidden })}
          >
            <X size={15} />
            {characterParts.head?.hidden ? "Show" : "Hide"}
          </button>
        </div>
      </div>

      <div className={`dockGroup rigCheckPanel ${missingRigParts.length ? "needsAttention" : "ready"}`}>
        <h2>Rig Check</h2>
        <small className="controlHint">
          {rigReady
            ? "Ready to perform. The face is anchored to the head and the required parts read on camera."
            : "Forgiving setup: stick-rig defaults still perform, but these quick fixes make the character read better on camera."}
        </small>
        <div className="rigCheckList">
          {rigCheckItems.map((item) => (
            <div className={`rigCheckItem ${item.ok ? "done" : ""}`} key={item.label}>
              <span>{item.ok ? "OK" : item.required ? "FIX" : "SKIP"}</span>
              <strong>{item.label}</strong>
              {!item.ok && item.required && (
                <button
                  onClick={() =>
                    onPartChange(item.quickFixSlot || item.id, {
                      label: getCatalogItem(characterPartCatalog, item.quickFixSlot || item.id).label,
                      mode: "shape",
                      shape: item.quickFixSlot === "torso" ? "bean" : "circle"
                    })
                  }
                >
                  Add Shape
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="dockGroup buildPartsPanel">
        <h2>Assemble Parts</h2>
        <small className="controlHint">
          Click the puppet on the canvas or pick a card, then shape it like a tiny paint program. Detailed rows move into Pro when you need them.
        </small>
        <div className="visualPartWorkbench" aria-label="Visual part builder">
          <div className="partPaletteBoard">
            {visiblePartSlots.map((part) => {
              const value = characterParts[part.id] || {};
              const populated = value.source || value.shape || value.mode === "drawn";
              return (
                <button
                  type="button"
                  key={part.id}
                  className={`partPaletteCard ${selectedPart.id === part.id ? "selected" : ""} ${populated ? "populated" : ""} ${value.hidden ? "hidden" : ""}`}
                  onClick={() => onSelectedPartChange(part.id)}
                >
                  <span
                    className={`partMiniPreview partShape-${value.shape || "scribble"}`}
                    style={{ "--part-tint": value.tint || design.color }}
                  >
          {value.source ? <img src={value.source} alt="" /> : null}
                  </span>
                  <strong>{part.name}</strong>
                  <small>{populated ? value.hidden ? "hidden" : "ready" : "empty"}</small>
                </button>
              );
            })}
          </div>
          <PartWorkbench
            part={selectedPart}
            value={selectedPartValue}
            fallbackColor={design.color}
            onChange={(patch) => onPartChange(selectedPart.id, { label: selectedPart.label, ...patch })}
            onDuplicate={() => onPartDuplicate(selectedPart.id)}
            onSwap={partSwapTargets[selectedPart.id] ? () => onPartSwap(selectedPart.id) : null}
            swapName={
              partSwapTargets[selectedPart.id]
                ? getCatalogItem(characterPartCatalog, partSwapTargets[selectedPart.id]).name
                : ""
            }
            onClear={() => onPartClear(selectedPart.id)}
          />
        </div>
        <div className="partBuilderList advancedControl">
          {coreParts.map((part) => (
            <PartBuilderRow
              key={part.id}
              part={part}
              value={characterParts[part.id]}
              onChange={(patch) => onPartChange(part.id, { label: part.label, ...patch })}
              onDuplicate={() => onPartDuplicate(part.id)}
              onSwap={partSwapTargets[part.id] ? () => onPartSwap(part.id) : null}
              swapName={partSwapTargets[part.id] ? getCatalogItem(characterPartCatalog, partSwapTargets[part.id]).name : ""}
              onClear={() => onPartClear(part.id)}
            />
          ))}
        </div>
      </div>

      <div className="advancedControl dockGroup buildPartsPanel optionalPartsPanel">
        <h2>Optional Add-Ons</h2>
        <small className="controlHint">
          Hats, odd appendages, handheld bits, and extra shapes stay off by default so new rigs open clean.
        </small>
        <div className="partBuilderList">
          {addOnParts.map((part) => (
            <PartBuilderRow
              key={part.id}
              part={part}
              value={characterParts[part.id]}
              onChange={(patch) => onPartChange(part.id, { label: part.label, ...patch })}
              onDuplicate={() => onPartDuplicate(part.id)}
              onSwap={partSwapTargets[part.id] ? () => onPartSwap(part.id) : null}
              swapName={partSwapTargets[part.id] ? getCatalogItem(characterPartCatalog, partSwapTargets[part.id]).name : ""}
              onClear={() => onPartClear(part.id)}
            />
          ))}
        </div>
      </div>

      <div className="dockGroup originalPanel">
        <h2>Playground Lab</h2>
        <div className="toyboxQuickStrip">
          <button onClick={onRandomize}>
            <Shuffle size={16} />
            Weird Starter
          </button>
          <button onClick={() => onMutate("odd-body")}>
            <Sparkles size={16} />
            Odd Body
          </button>
          <button onClick={() => onStyleMutate("collage")}>
            <Palette size={16} />
            Collage
          </button>
          <button onClick={() => onStyleMutate("roughen")}>
            <Wand2 size={16} />
            Roughen
          </button>
        </div>
        <small className="controlHint">
          Fast originality buttons first. Expert rig controls stay lower so new users can make a character before tuning one.
        </small>
        <div className="mutationGrid">
          {mutationRecipeCatalog.map((recipe) => (
            <button key={recipe.id} onClick={() => onMutate(recipe.id)}>
              <strong>{recipe.name}</strong>
              <span>{recipe.description}</span>
            </button>
          ))}
        </div>
        <label>
          Character Name
          <input
            value={design.name}
            maxLength={32}
            onChange={(event) => onDesignChange({ name: event.target.value })}
          />
        </label>
        <ColorPicker
          label="Body Color"
          value={design.color}
          onChange={(color) => onDesignChange({ color })}
        />
        <ColorPicker
          label="Face / Accent"
          value={design.accent}
          onChange={(accent) => onDesignChange({ accent })}
        />
      </div>

      <div className="dockGroup">
        <h2>Behavior</h2>
        <div className="behaviorGrid">
          {behaviorPresetCatalog.map((behavior) => (
            <button
              key={behavior.id}
              className={behaviorPreset === behavior.id ? "selected" : ""}
              title={behavior.description}
              onClick={() => onBehaviorChange(behavior.id)}
            >
              {behavior.name}
            </button>
          ))}
        </div>
        <small className="controlHint">Tiny built-in systems give a character personality before you animate.</small>
      </div>

      <div className="dockGroup advancedControl">
        <h2>Character Style Remix</h2>
        <div className="styleSummary">
          <strong>{selectedStyle.family}</strong>
          <small>
            {selectedStyle.theme} / {selectedStyle.texturePreset}
          </small>
        </div>
        <div className="styleGrid">
          {animationStyleCatalog.map((style) => (
            <button
              key={style.id}
              className={`styleButton ${stylePreset === style.id ? "selected" : ""}`}
              onClick={() => onStyleChange(style.id)}
            >
              <span>{style.name}</span>
              <small>{style.family}</small>
              <span className="styleSwatches" aria-hidden="true">
                {style.palette.map((color) => (
                  <i key={color} style={{ background: color }} />
                ))}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="dockGroup styleMutationPanel">
        <h2>Style Mutations</h2>
        <small className="controlHint">One-click pushes for roughness, texture, line weight, collage, patterns, and shadow weirdness.</small>
        <div className="mutationGrid">
          {styleMutationControls.map((mutation) => (
            <button key={mutation.id} onClick={() => onStyleMutate(mutation.id)}>
              <strong>{mutation.name}</strong>
              <span>{mutation.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="advancedControl tuningStack">
        <div className="dockGroup">
          <h2>Expert Rig Tuning</h2>
          <small className="controlHint">Use these once the broad playground buttons get you close.</small>
        </div>
        <EditorSelect
          label="Body"
          value={rig.body}
          options={bodyShapeCatalog}
          onChange={(body) => onRigChange({ body })}
        />
        <EditorSelect
          label="Limbs"
          value={rig.limbs}
          options={limbStyleCatalog}
          onChange={(limbs) => onRigChange({ limbs })}
        />
        <EditorSelect
          label="Walk Cycle"
          value={rig.walkCycle}
          options={walkCycleCatalog}
          onChange={(walkCycle) => onRigChange({ walkCycle })}
        />
        <EditorSelect
          label="Mouth"
          value={rig.mouthStyle}
          options={mouthStyleCatalog}
          onChange={(mouthStyle) => onRigChange({ mouthStyle })}
        />

        <div className="dockGroup">
          <h2>Parts</h2>
          <label className="toggleRow">
            <input
              type="checkbox"
              checked={rig.arms}
              onChange={(event) => onRigChange({ arms: event.target.checked })}
            />
            Arms
          </label>
          <label className="toggleRow">
            <input
              type="checkbox"
              checked={rig.legs}
              onChange={(event) => onRigChange({ legs: event.target.checked })}
            />
            Legs
          </label>
        </div>

        <EditorRange
          label="Arm Length"
          value={rig.armLength}
          min={22}
          max={64}
          onChange={(armLength) => onRigChange({ armLength })}
        />
        <EditorRange
          label="Leg Length"
          value={rig.legLength}
          min={18}
          max={58}
          onChange={(legLength) => onRigChange({ legLength })}
        />
      </div>
    </div>
  );
}

function BuildCanvasPartToolbar({ selectedPart, value = {}, fallbackColor, onChange, onDuplicate, onSwap, onClear }) {
  const importPartImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      onChange({
        mode: "image",
        source: String(reader.result || ""),
        shape: value.shape || "oval"
      });
    reader.readAsDataURL(file);
  };
  const nudge = (x = 0, y = 0) =>
    onChange({
      x: Math.max(-36, Math.min(36, (value.x || 0) + x)),
      y: Math.max(-36, Math.min(36, (value.y || 0) + y))
    });
  const hasPart = Boolean(value.source || value.shape || value.mode === "drawn");

  return (
    <div className="buildCanvasPartToolbar" aria-label="Canvas part editor">
      <div className="canvasPartHeader">
        <span
          className={`canvasPartPreview partShape-${value.shape || "scribble"} ${value.hidden ? "hidden" : ""}`}
          style={{ "--part-tint": value.tint || fallbackColor }}
        >
          {value.source ? <img src={value.source} alt="" /> : null}
        </span>
        <div>
          <strong>{selectedPart?.name || "Part"}</strong>
          <small>{hasPart ? "editing on canvas" : "empty stick guide"}</small>
        </div>
      </div>
      <div className="canvasPartState">
        <span>{hasPart ? "Made" : "Needs art"}</span>
        <span>{value.hidden ? "Hidden" : "Visible"}</span>
        <span>{Math.round((value.scale || 1) * 100)}%</span>
        <span>{value.rotate || 0}deg</span>
      </div>
      <div className="canvasPartActions">
        <button type="button" onClick={() => onChange({ mode: "shape", shape: selectedPart?.id === "torso" ? "bean" : "circle", source: "" })}>
          Shape
        </button>
        <button type="button" onClick={() => onChange({ mode: "drawn", shape: "scribble", source: "" })}>
          Doodle
        </button>
        <label>
          Image
          <input type="file" accept="image/*" onChange={(event) => importPartImage(event.target.files?.[0])} />
        </label>
        <button type="button" onClick={() => onChange({ hidden: !value.hidden })}>
          {value.hidden ? "Show" : "Hide"}
        </button>
      </div>
      <div className="canvasPartHandles" aria-label="Canvas part handles">
        <button type="button" onClick={() => onChange({ scale: Math.max(0.55, (value.scale || 1) - 0.08) })}>
          - Size
        </button>
        <button type="button" onClick={() => onChange({ scale: Math.min(1.65, (value.scale || 1) + 0.08) })}>
          + Size
        </button>
        <button type="button" onClick={() => onChange({ rotate: Math.max(-45, (value.rotate || 0) - 5) })}>
          Tilt L
        </button>
        <button type="button" onClick={() => onChange({ rotate: Math.min(45, (value.rotate || 0) + 5) })}>
          Tilt R
        </button>
      </div>
      <div className="canvasPartNudge" aria-label="Canvas nudge controls">
        <button type="button" onClick={() => nudge(0, -4)}>Up</button>
        <button type="button" onClick={() => nudge(-4, 0)}>Left</button>
        <button type="button" onClick={() => onChange({ x: 0, y: 0 })}>Center</button>
        <button type="button" onClick={() => nudge(4, 0)}>Right</button>
        <button type="button" onClick={() => nudge(0, 4)}>Down</button>
      </div>
      <div className="canvasPartSwatches" aria-label="Canvas part colors">
        {characterColorSwatches.slice(0, 8).map((color) => (
          <button
            type="button"
            key={color}
            className={value.tint === color ? "selected" : ""}
            aria-label={`Use ${color}`}
            style={{ background: color }}
            onClick={() => onChange({ tint: color })}
          />
        ))}
      </div>
      <div className="canvasPartFooter">
        <button type="button" disabled={!hasPart} onClick={onDuplicate}>
          Clone
        </button>
        <button type="button" disabled={!onSwap} onClick={onSwap || undefined}>
          Swap
        </button>
        <button type="button" disabled={!hasPart} onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  );
}

function PartWorkbench({ part, value = {}, fallbackColor, onChange, onDuplicate, onSwap, swapName, onClear }) {
  const mode = value.source ? "image" : value.mode || (value.shape ? "shape" : "empty");
  const nudge = (x = 0, y = 0) => onChange({ x: Math.max(-36, Math.min(36, (value.x || 0) + x)), y: Math.max(-36, Math.min(36, (value.y || 0) + y)) });
  const importPartImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      onChange({
        mode: "image",
        source: String(reader.result || ""),
        shape: value.shape || "oval"
      });
    reader.readAsDataURL(file);
  };

  return (
    <div className="partWorkbench">
      <div className="partWorkbenchHeader">
        <div
          className={`partWorkbenchPreview partShape-${value.shape || "scribble"} ${value.hidden ? "hidden" : ""}`}
          style={{ "--part-tint": value.tint || fallbackColor }}
        >
          {value.source ? <img src={value.source} alt="" /> : null}
        </div>
        <div>
          <strong>{part.name}</strong>
          <small>{mode === "empty" ? "stick guide until you make it yours" : mode}</small>
        </div>
      </div>

      <div className="partHandleStrip" aria-label={`Quick handles for ${part.name}`}>
        <button type="button" onClick={() => onChange({ scale: Math.max(0.55, (value.scale || 1) - 0.1) })}>
          - Size
        </button>
        <button type="button" onClick={() => onChange({ scale: Math.min(1.65, (value.scale || 1) + 0.1) })}>
          + Size
        </button>
        <button type="button" onClick={() => onChange({ rotate: Math.max(-45, (value.rotate || 0) - 6) })}>
          Tilt L
        </button>
        <button type="button" onClick={() => onChange({ rotate: Math.min(45, (value.rotate || 0) + 6) })}>
          Tilt R
        </button>
        <button type="button" onClick={() => onChange({ scale: 1, rotate: 0 })}>
          Reset
        </button>
      </div>

      <div className="partNudgePad" aria-label={`Move ${part.name}`}>
        <button type="button" onClick={() => nudge(0, -4)}>
          Up
        </button>
        <button type="button" onClick={() => nudge(-4, 0)}>
          Left
        </button>
        <button type="button" onClick={() => onChange({ x: 0, y: 0 })}>
          Center
        </button>
        <button type="button" onClick={() => nudge(4, 0)}>
          Right
        </button>
        <button type="button" onClick={() => nudge(0, 4)}>
          Down
        </button>
      </div>

      <div className="shapePaintGrid" aria-label={`Shapes for ${part.name}`}>
        {partShapeCatalog.map((shape) => (
          <button
            type="button"
            key={shape.id}
            className={value.shape === shape.id ? "selected" : ""}
            onClick={() => onChange({ mode: "shape", shape: shape.id, source: "" })}
          >
            <span className={`shapeChip partShape-${shape.id}`} />
            {shape.name}
          </button>
        ))}
      </div>

      <div className="partColorSwatches" aria-label={`Colors for ${part.name}`}>
        {characterColorSwatches.map((color) => (
          <button
            type="button"
            key={color}
            className={value.tint === color ? "selected" : ""}
            aria-label={color}
            style={{ background: color }}
            onClick={() => onChange({ tint: color })}
          />
        ))}
      </div>

      <div className="partWorkbenchActions">
        <label className="partFileButton">
          Import Image
          <input
            type="file"
            accept="image/*"
            onChange={(event) => importPartImage(event.target.files?.[0])}
          />
        </label>
        <button type="button" onClick={() => onChange({ mode: "drawn", source: "", shape: "scribble" })}>
          Doodle
        </button>
        <button type="button" disabled={mode === "empty"} onClick={onDuplicate}>
          Clone
        </button>
        <button type="button" disabled={!onSwap} title={swapName ? `Swap with ${swapName}` : "No matching slot"} onClick={onSwap || undefined}>
          Swap
        </button>
        <button type="button" onClick={() => onChange({ hidden: !value.hidden })}>
          {value.hidden ? "Show" : "Hide"}
        </button>
        <button type="button" onClick={onClear}>
          Clear
        </button>
      </div>

      <div className="partWorkbenchSliders">
        <label>
          X
          <input
            type="range"
            min="-36"
            max="36"
            step="2"
            value={value.x || 0}
            onChange={(event) => onChange({ x: Number(event.target.value) })}
          />
        </label>
        <label>
          Y
          <input
            type="range"
            min="-36"
            max="36"
            step="2"
            value={value.y || 0}
            onChange={(event) => onChange({ y: Number(event.target.value) })}
          />
        </label>
        <label>
          Size
          <input
            type="range"
            min="0.55"
            max="1.65"
            step="0.05"
            value={value.scale || 1}
            onChange={(event) => onChange({ scale: Number(event.target.value) })}
          />
        </label>
        <label>
          Rotate
          <input
            type="range"
            min="-45"
            max="45"
            step="3"
            value={value.rotate || 0}
            onChange={(event) => onChange({ rotate: Number(event.target.value) })}
          />
        </label>
      </div>
    </div>
  );
}

function PartBuilderRow({ part, value = {}, onChange, onDuplicate, onSwap, swapName, onClear }) {
  const mode = value.source ? "image" : value.mode || (value.shape ? "shape" : "empty");
  const importPartImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      onChange({
        mode: "image",
        source: String(reader.result || ""),
        shape: value.shape || "oval"
      });
    reader.readAsDataURL(file);
  };

  return (
    <div className="partBuilderRow">
      <div
        className={`partCardPreview partShape-${value.shape || "scribble"} ${value.hidden ? "hidden" : ""}`}
        style={{ "--part-tint": value.tint || "var(--paper)" }}
      >
        {value.source ? <img src={value.source} alt="" /> : null}
      </div>
      <div>
        <strong>{part.name}</strong>
        <small>{mode === "empty" ? "stick guide" : mode}</small>
      </div>
      <select
        value={value.shape || ""}
        onChange={(event) =>
          onChange({
            mode: "shape",
            shape: event.target.value,
            source: ""
          })
        }
      >
        <option value="">Shape...</option>
        {partShapeCatalog.map((shape) => (
          <option key={shape.id} value={shape.id}>
            {shape.name}
          </option>
        ))}
      </select>
      <input
        value={value.source || ""}
        placeholder="Image URL or imported file"
        onChange={(event) =>
          onChange({
            mode: "image",
            source: event.target.value,
            shape: value.shape || "oval"
          })
        }
      />
      <div className="partBuilderActions">
        <label className="partFileButton">
          Import
          <input
            type="file"
            accept="image/*"
            onChange={(event) => importPartImage(event.target.files?.[0])}
          />
        </label>
        <button
          type="button"
          onClick={() =>
            onChange({
              mode: "drawn",
              source: "",
              shape: "scribble"
            })
          }
        >
          Doodle
        </button>
        <button
          type="button"
          disabled={mode === "empty"}
          onClick={onDuplicate}
        >
          Clone
        </button>
        <button
          type="button"
          disabled={!onSwap}
          title={swapName ? `Swap with ${swapName}` : "No matching slot"}
          onClick={onSwap || undefined}
        >
          Swap
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({
              hidden: !value.hidden
            })
          }
        >
          {value.hidden ? "Show" : "Hide"}
        </button>
        <button type="button" onClick={onClear}>
          Clear
        </button>
      </div>
      <label className="partStretchControl">
        Size
        <input
          type="range"
          min="0.55"
          max="1.65"
          step="0.05"
          value={value.scale || 1}
          onChange={(event) => onChange({ scale: Number(event.target.value) })}
        />
      </label>
      <label className="partStretchControl">
        Rotate
        <input
          type="range"
          min="-45"
          max="45"
          step="3"
          value={value.rotate || 0}
          onChange={(event) => onChange({ rotate: Number(event.target.value) })}
        />
      </label>
      <div className="partTransformButtons">
        <button type="button" onClick={() => onChange({ scale: Math.max(0.55, (value.scale || 1) - 0.1) })}>
          Smaller
        </button>
        <button type="button" onClick={() => onChange({ scale: Math.min(1.65, (value.scale || 1) + 0.1) })}>
          Bigger
        </button>
        <button type="button" onClick={() => onChange({ rotate: 0, scale: 1 })}>
          Reset Fit
        </button>
      </div>
    </div>
  );
}

function EditorSelect({ label, value, options, onChange }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function ColorPicker({ label, value, onChange }) {
  return (
    <div className="colorPicker">
      <span className="rangeLabel">
        {label}
        <small>{value}</small>
      </span>
      <div className="swatchGrid">
        {characterColorSwatches.map((color) => (
          <button
            key={color}
            className={value === color ? "selected" : ""}
            style={{ background: color }}
            aria-label={color}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function EditorRange({ label, value, min, max, onChange }) {
  return (
    <label>
      <span className="rangeLabel">
        {label}
        <small>{value}</small>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

createRoot(document.getElementById("root")).render(<App />);
