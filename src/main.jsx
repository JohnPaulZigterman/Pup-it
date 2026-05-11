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
  RefreshCw,
  Search,
  Shuffle,
  Save,
  Sparkles,
  Square,
  Theater,
  Trash2,
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
import "./styles.css";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4111";
const DOINKTV_SUBMISSION_URL = import.meta.env.VITE_DOINKTV_SUBMISSION_URL || "";
const SHOW_STORAGE_KEY = "pup-it-shows-v1";
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

const tutorialSteps = [
  {
    mode: "perform",
    title: "Perform Live",
    body: "Move your character with WASD or arrow keys, let mic audio drive the mouth by default, and trigger expressions, poses, and macros from the dock."
  },
  {
    mode: "build",
    title: "Build The Space",
    body: "Start with a rig model, then assemble the puppet from shapes, doodle placeholders, imported images, styles, parts, and behaviors."
  },
  {
    mode: "storyboard",
    title: "Plan The Scene",
    body: "Storyboard mode captures the current stage as comic-strip panels, then lets you label beats, shot sizes, and timing before recording."
  },
  {
    mode: "edit",
    title: "Review Takes",
    body: "Edit mode keeps recorded performances inside the app so you can browse scenes, play them back, and export takes with separate character audio tracks."
  }
];

const workflowSteps = [
  { id: "home", label: "Setup", mode: "home", description: "Choose a show, template, or next task." },
  { id: "cast", label: "Rigs", mode: "build", description: "Build performer rigs and make them original." },
  { id: "sets", label: "Materials", mode: "assets", description: "Gather raw settings, props, textures, and references." },
  { id: "perform", label: "Perform", mode: "perform", description: "Rehearse, record, and improvise live." },
  { id: "edit", label: "Edit", mode: "edit", description: "Review takes and assemble the episode." },
  { id: "storyboard", label: "Board", mode: "storyboard", description: "Plan comic-strip beats and shot flow." }
];

const developmentPathCards = [
  {
    id: "five-minute",
    label: "1",
    name: "Five-Minute Cartoon",
    promise: "Start, build, perform, replay, export.",
    focus: "Keep the beginner rail obvious enough that a first short can happen before the user starts managing software."
  },
  {
    id: "toybox",
    label: "2",
    name: "Creation Toybox",
    promise: "Make the show’s people, props, textures, and weird rules feel original.",
    focus: "Treat presets as raw material. Shapes, doodles, imports, mutations, and behaviors should push users toward their own voice."
  },
  {
    id: "studio",
    label: "3",
    name: "Performance Studio",
    promise: "Make performing feel smooth, funny, and worth replaying.",
    focus: "Motion, mouth, cue deck, camera, stings, and take review should feel like a playable comedy instrument."
  }
];

const publicVersionMilestones = [
  { id: "perform", name: "Joy Loop", detail: "Record, replay, laugh, trim, export." },
  { id: "toybox", name: "Toybox Identity", detail: "Original rigs, props, textures, and weird behavior." },
  { id: "formats", name: "Comedy Formats", detail: "Arguments, fake ads, desk bits, street pieces, bumpers." },
  { id: "render", name: "Render Path", detail: "Preview WEBM now, stage-matched video next, backend reliability later." }
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
  const fps = 12;
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
  const durationMs = Math.max(1000, Math.min(take.durationMs || 5000, 45000));
  const frameMs = 1000 / fps;

  recorder.start();
  for (let atMs = 0; atMs <= durationMs; atMs += frameMs) {
    while (eventIndex < events.length && (events[eventIndex].at || 0) <= atMs) {
      performers = applyTakeEventToPreview(performers, events[eventIndex]);
      eventIndex += 1;
    }
    drawPreviewVideoFrame(ctx, { take, performers, atMs, width, height });
    onFrame?.(Math.min(1, atMs / durationMs));
    await new Promise((resolve) => window.setTimeout(resolve, frameMs));
  }
  recorder.stop();
  return stopped;
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
    doinkSubmission: showBible.doinkSubmission || {}
  };
}

async function fetchPersistedShows() {
  const response = await fetch(`${SERVER_URL}/api/shows`);
  if (!response.ok) throw new Error("Show database unavailable");
  const data = await response.json();
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
        doinkSubmission: session.doinkSubmission
      }
    })
  });
  if (!response.ok) throw new Error("Show database unavailable");
  const data = await response.json();
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
    motionEventCount: take.motionEventCount
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
  const playbackTimersRef = useRef([]);
  const cameraTimersRef = useRef([]);
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState(defaultRoomId);
  const [showName, setShowName] = useState("Untitled Show");
  const [savedShows, setSavedShows] = useState([]);
  const [selectedShowId, setSelectedShowId] = useState("");
  const [name, setName] = useState(`Performer ${Math.ceil(Math.random() * 99)}`);
  const [character, setCharacter] = useState(defaultCharacterId);
  const [scene, setScene] = useState(sceneCatalog[0].id);
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
  const [tutorialStep, setTutorialStep] = useState(0);
  const [startedShortFormat, setStartedShortFormat] = useState("");
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
  const beginnerProgress = {
    hasShow: Boolean(showName.trim()),
    hasStartedShort: Boolean(startedShortFormat),
    hasRig: hasCustomRigParts,
    hasSet: sceneObjects.length > 0 || sceneSets.length > 0,
    hasRehearsed: mode === "perform" || takeLibrary.length > 0 || selectedTake,
    hasTake: takeLibrary.length > 0 || selectedTake,
    hasCut: productionTimeline.length > 0,
    readyToExport: productionTimeline.length > 0 || selectedTake,
    exported: exportHistory.length > 0
  };
  const activeStylePreset = self?.state.stylePreset || selfCharacter.stylePreset;
  const activeAnimationStyle = getCatalogItem(animationStyleCatalog, activeStylePreset);
  const activeTexturePreset = activeAnimationStyle.texturePreset || "paper-grain";
  const stageTexturePreset = selectedBackgroundTheme.texturePreset || activeTexturePreset;

  useEffect(() => {
    const socket = io(SERVER_URL, { autoConnect: false });
    socketRef.current = socket;

    socket.on("connect", () => setSelfId(socket.id));
    socket.on("room:snapshot", (snapshot) => {
      setScene(snapshot.scene);
      setRecording(snapshot.recording);
      setPerformers(indexPerformers(snapshot.performers));
      setJoined(true);
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
              travelLean: 0
            }
          };
          socketRef.current.emit("performer:update", nextPerformer.state);
          return upsertPerformer(current, nextPerformer);
        }

        const nextPerformer = movePerformerFromInput(performer, input, selectedScene);
        const nextState = nextPerformer.state;
        socketRef.current.emit("performer:update", nextState);
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
      const saved = window.localStorage.getItem("pup-it-tutorial-open");
      if (saved === "true") setTutorialOpen(true);
    } catch (_error) {
      setTutorialOpen(false);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("pup-it-tutorial-open", String(tutorialOpen));
    } catch (_error) {
      // Tutorial persistence is optional; the UI should keep working without storage.
    }
  }, [tutorialOpen]);

  const joinRoom = (event) => {
    event.preventDefault();
    socketRef.current.connect();
    socketRef.current.emit("room:join", { roomId, name, character });
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

  const updateCharacterRig = (patch) => {
    if (!self) return;
    const baseCharacter = getCatalogItem(characterCatalog, self.character);
    updateSelf({
      rigConfig: {
        ...baseCharacter.rigConfig,
        ...self.state.rigConfig,
        ...patch
      }
    });
  };

  const updateCharacterStyle = (stylePreset) => updateSelf({ stylePreset });
  const updateCharacterDesign = (patch) => {
    if (!self) return;
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
  const duplicateCharacterPart = (partId) => {
    if (!self) return;
    const currentParts = self.state.characterParts || {};
    const sourcePart = currentParts[partId];
    if (!sourcePart) return;
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
    const currentParts = self.state.characterParts || {};
    const nextParts = { ...currentParts };
    delete nextParts[partId];
    updateSelf({ characterParts: nextParts });
  };
  const randomizeCharacterDesign = () => {
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
    if (mutation.stylePreset) updateCharacterStyle(mutation.stylePreset);
    if (mutation.backgroundTheme) setBackgroundTheme(mutation.backgroundTheme);
    if (mutation.objectStyle) setObjectStyle(mutation.objectStyle);
    if (mutation.lightingPreset) setLightingPreset(mutation.lightingPreset);
    if (mutation.behaviorPreset) updateSelf({ behaviorPreset: mutation.behaviorPreset });
    if (mutation.motionFeel) updateSelf({ motionFeel: mutation.motionFeel });
    setStatus(`${mutation.name} style mutation applied. Remix it until it feels like your show.`);
  };

  const startQuickShort = (formatId) => {
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

  const addSceneObjectFromAsset = (asset) => {
    const sceneObject = createSceneObjectFromAsset(asset, sceneObjects.length);
    setSceneObjects((current) => [...current, sceneObject]);
    setSelectedSceneObjectId(sceneObject.id);
    setStatus(`Placed "${asset.name}" in the scene.`);
  };

  const addSceneObjectFromImage = (payload) => {
    if (!payload.imageUrl?.trim()) return;
    const sceneObject = createSceneObjectFromImage(
      { ...payload, imageUrl: payload.imageUrl.trim() },
      sceneObjects.length
    );
    setSceneObjects((current) => [...current, sceneObject]);
    setSelectedSceneObjectId(sceneObject.id);
    setStatus(`Placed "${sceneObject.name}" from image URL.`);
  };

  const addSceneObjectFromShape = (payload) => {
    const sceneObject = createSceneObjectFromShape(payload, sceneObjects.length);
    setSceneObjects((current) => [...current, sceneObject]);
    setSelectedSceneObjectId(sceneObject.id);
    setStatus(`Built "${sceneObject.name}" as an editable scene prop.`);
  };

  const updateSceneObject = (objectId, patch) => {
    setSceneObjects((current) =>
      current.map((object) => (object.id === objectId ? { ...object, ...patch } : object))
    );
  };

  const duplicateSceneObject = (objectId) => {
    const sourceObject = sceneObjects.find((object) => object.id === objectId);
    if (!sourceObject) return;
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
    updateSceneObject(objectId, { layer: clamp((object.layer || 0) + delta, 0, 6) });
  };

  const deleteSceneObject = (objectId) => {
    setSceneObjects((current) => current.filter((object) => object.id !== objectId));
    setSelectedSceneObjectId((current) => (current === objectId ? null : current));
  };

  const saveCurrentSceneSet = () => {
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
    setScene(nextScene);
    socketRef.current.emit("scene:set", nextScene);
  };

  const triggerMacro = (macro) => {
    updateSelf({ macro });
    socketRef.current.emit("macro:trigger", macro);
    playSoundSting(macro === "panic" ? "zap" : macro === "hop" ? "pop" : "tap");
    flashMacro(selfId, macro);
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
      socketRef.current.emit("take:stop");
      return;
    }
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

  const exportTake = async () => {
    const response = await fetch(`${SERVER_URL}/api/rooms/${encodeURIComponent(roomId)}/take`);
    const take = await response.json();
    downloadTake(take);
  };

  const openReviewMode = () => {
    loadTakeLibrary();
    setMode("edit");
  };

  const downloadTake = (take) => {
    const blob = new Blob([JSON.stringify(take, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pup-it-${take.roomId || roomId}-${take.id || "take"}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setExportHistory((current) => [
      { id: `take-${Date.now()}`, type: "take-json", exportedAt: new Date().toISOString() },
      ...current
    ]);
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

  const activePerformers = useMemo(() => performerList(performers), [performers]);
  const stagePerformers = useMemo(
    () => (mode === "edit" && previewPerformers ? performerList(previewPerformers) : activePerformers),
    [activePerformers, mode, previewPerformers]
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

  const removeTimelineClip = (clipId) => {
    setProductionTimeline((current) => current.filter((clip) => clip.id !== clipId));
  };

  const quickTrimSelectedTake = (edge) => {
    if (!selectedTake) return;
    const trimMs = 500;
    const currentStart = selectedTake.trimStartMs || 0;
    const currentEnd = selectedTake.trimEndMs ?? selectedTake.durationMs;
    const nextTake =
      edge === "start"
        ? { ...selectedTake, trimStartMs: Math.min(currentStart + trimMs, Math.max(0, currentEnd - 1000)) }
        : { ...selectedTake, trimEndMs: Math.max(currentStart + 1000, currentEnd - trimMs), durationMs: Math.max(1000, currentEnd - trimMs - currentStart) };
    setSelectedTake(nextTake);
    setStatus(`Trimmed ${edge} by half a second for review.`);
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
      takes: takeLibrary
    });

  const exportProject = () => {
    const project = createCurrentProjectExport();
    downloadJson(project, `pup-it-${roomId}-project.json`);
    setExportHistory((current) => [
      { id: `short-${Date.now()}`, type: "short-package", exportedAt: new Date().toISOString() },
      ...current
    ]);
    setStatus("Exported short package. Use Preview WEBM for quick video and Submit to DoinkTV for review handoff.");
  };

  const updateDoinkSubmission = (patch) => {
    setDoinkSubmission((current) => ({ ...current, ...patch }));
  };

  const submitToDoinkTv = async () => {
    if (doinkSubmitting) return;
    const project = createCurrentProjectExport();
    const submissionTake = selectedTake || takeLibrary[0] || null;
    const projectPackageFileName = `pup-it-${roomId}-project.json`;
    const previewVideoFileName = submissionTake
      ? `pup-it-${submissionTake.id || "take"}-preview.webm`
      : null;
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
      if (DOINKTV_SUBMISSION_URL) {
        const response = await fetch(DOINKTV_SUBMISSION_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submissionPackage)
        });
        if (!response.ok) throw new Error("DoinkTV submission endpoint rejected the package.");
        setStatus("Submitted to DoinkTV for admin review.");
      } else {
        downloadJson(submissionPackage, `pup-it-${roomId}-doinktv-submission.json`);
        setStatus("Created a DoinkTV submission package. Add VITE_DOINKTV_SUBMISSION_URL later for direct admin intake.");
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

  const queueVideoExport = () => {
    setMode("edit");
    setStatus("Use Preview WEBM for a quick video. The next render milestone is matching the full live stage more exactly.");
  };

  const exportSelectedTakeVideo = async () => {
    if (!selectedTake || videoExporting) return;
    setVideoExporting(true);
    setStatus("Rendering a browser preview video. Keep this tab open for a moment.");
    try {
      const blob = await exportTakePreviewVideo(selectedTake, {
        onFrame: (progress) => {
          if (progress === 0 || progress >= 0.98) return;
          setStatus(`Rendering preview video ${Math.round(progress * 100)}%.`);
        }
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pup-it-${selectedTake.id || "take"}-preview.webm`;
      link.click();
      URL.revokeObjectURL(url);
      setExportHistory((current) => [
        { id: `video-${Date.now()}`, type: "preview-webm", exportedAt: new Date().toISOString() },
        ...current
      ]);
      setStatus("Preview WEBM exported. Package export still carries project data, tracks, credits, and metadata.");
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

  const commandItems = [
    { id: "home", label: "Open show dashboard", keywords: "setup home project show", action: () => setMode("home") },
    { id: "cast", label: "Edit current character", keywords: "cast character rig build customize", action: () => setMode("build") },
    { id: "playground", label: "Open character playground", keywords: "playground weird mutate original character toybox", action: () => setMode("build") },
    { id: "mutate", label: "Make current character weirder", keywords: "mutate random weird rough original", action: () => { setMode("build"); applyCharacterMutation("odd-body"); } },
    { id: "sets", label: "Search settings and props", keywords: "assets objects settings props backgrounds", action: () => openAssetSearch("", "setting") },
    { id: "shots", label: "Open shot templates", keywords: "shot template blocking marks two shot reaction", action: () => setMode("perform") },
    { id: "mouth", label: "Find mouth and rig parts", keywords: "mouth face rig part lips", action: () => openAssetSearch("mouth", "rig-part") },
    { id: "kitchen", label: "Find kitchen scene pieces", keywords: "kitchen diner room background furniture", action: () => openAssetSearch("kitchen", "setting") },
    { id: "record", label: recording ? "Stop recording take" : "Record a take", keywords: "record stop take performance", action: toggleTake },
    { id: "review", label: "Review recorded scenes", keywords: "edit takes timeline review", action: openReviewMode },
    { id: "board", label: "Open storyboard mode", keywords: "storyboard panel comic strip planning", action: () => setMode("storyboard") },
    { id: "export", label: "Export short package", keywords: "export publish package video project", action: exportProject },
    { id: "video-export", label: "Prepare video export", keywords: "render video mp4 export movie", action: queueVideoExport },
    { id: "light-polish", label: "Make it look cleaner", keywords: "lighting polish better professional clean", action: () => applyPolishPass("lighting") },
    { id: "texture-polish", label: "Add mixed-media texture", keywords: "texture paper pattern style weird", action: () => applyPolishPass("texture") },
    { id: "punch-polish", label: "Punch in for a reaction", keywords: "camera close reaction punch button", action: () => applyPolishPass("camera") }
  ];

  const runCommand = (command) => {
    command.action();
    setCommandQuery("");
  };

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
      doinkSubmission
    };
  };

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
    setStatus(`Loaded show "${session.showName}".`);
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

  const showTutorialStep = (index) => {
    const nextIndex = (index + tutorialSteps.length) % tutorialSteps.length;
    setTutorialStep(nextIndex);
    setMode(tutorialSteps[nextIndex].mode);
    setTutorialOpen(true);
  };

  if (!joined) {
    return (
      <main className="entryShell">
        <section className="entryPanel">
          <div className="brandLockup">
            <Theater size={34} />
            <div>
              <h1>Pup-It</h1>
              <p>Live collaborative puppet animation.</p>
            </div>
          </div>
          <form onSubmit={joinRoom} className="joinForm">
            <label>
              Room
              <input value={roomId} onChange={(event) => setRoomId(event.target.value)} />
            </label>
            <label>
              Performer
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              Rig Model
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
        <CommandSearch
          query={commandQuery}
          commands={commandItems}
          onQueryChange={setCommandQuery}
          onRunCommand={runCommand}
        />
        <div className="transport">
          <div className="modeSwitch" aria-label="Workflow mode">
            {workflowSteps.map((step) => (
              <button
                key={step.id}
                className={mode === step.mode ? "selected" : ""}
                onClick={() => setMode(step.mode)}
              >
                {step.label}
              </button>
            ))}
          </div>
          <button className={recording ? "danger active" : ""} onClick={toggleTake}>
            {recording ? <Square size={17} /> : <Circle size={17} />}
            {recording ? "Stop" : "Record"}
          </button>
          <button onClick={openReviewMode}>
            <Video size={17} />
            Review
          </button>
          <button onClick={exportProject}>
            <Save size={17} />
            Export Short
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
            : `stage perspective-${selectedScene.perspective || "front-stage"} ${selectedScene.className} ${selectedCameraShot.className} ${selectedLighting.className} ${selectedBackgroundTheme.className} ${selectedObjectStyle.className} texture-${stageTexturePreset}`
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
            developmentPaths={developmentPathCards}
            publicMilestones={publicVersionMilestones}
            progress={beginnerProgress}
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
              <div className="horizonGuide" data-label={selectedScene.focusLabel || "Focus"} />
              <div className="focusPoint" aria-hidden="true" />
              <div className="setFloor" />
              {floorMarks.map((mark) => (
                <FloorMark key={mark.id} mark={mark} onActivate={moveSelfToMark} />
              ))}
              {sceneObjects.map((object) => (
                <SceneObject
                  key={object.id}
                  object={object}
                  selected={object.id === selectedSceneObjectId}
                  onSelect={setSelectedSceneObjectId}
                />
              ))}
              {stagePerformers.map((performer) => (
                <Puppet
                  key={performer.id}
                  performer={performer}
                  isSelf={performer.id === selfId}
                  depthModel={selectedScene}
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
          onShowNameChange={setShowName}
          onSelectedShowChange={setSelectedShowId}
          onSaveShow={saveShowSession}
          onLoadShow={loadShowSession}
          onExportShow={exportShowSession}
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
          onExport={exportProject}
          onAddToCut={() => selectedTake && addTakeToTimeline(selectedTake)}
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
            onRefresh={loadTakeLibrary}
            onSelectTake={selectTake}
            onPlay={playSelectedTake}
            onQuickTrim={quickTrimSelectedTake}
            onSaveTakeAsScene={saveSelectedTakeAsScene}
            onExport={downloadTake}
            onExportProject={exportProject}
            onQueueVideoExport={queueVideoExport}
            onExportVideo={exportSelectedTakeVideo}
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
            onModeChange={setMode}
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

        <div className="dockGroup performerGroup">
          <h2>Performers</h2>
          {stagePerformers.map((performer) => (
            <div className="performerRow" key={performer.id}>
              <span>{performer.name}</span>
              <small>
                {performer.state.characterDesign?.name ||
                  getCatalogItem(characterCatalog, performer.character).name}
              </small>
            </div>
          ))}
        </div>
      </aside>
      <video
        ref={mouthVideoRef}
        className={`mouthCameraPreview ${mouthCameraActive ? "visible" : ""}`}
        muted
        playsInline
      />
      {tutorialOpen && (
        <TutorialOverlay
          step={tutorialStep}
          mode={mode}
          onClose={() => setTutorialOpen(false)}
          onStepChange={showTutorialStep}
        />
      )}
    </main>
  );
}

function TutorialOverlay({ step, mode, onClose, onStepChange }) {
  const current = tutorialSteps[step];

  return (
    <section className="tutorialOverlay" aria-label="Tutorial">
      <div className="tutorialCard">
        <div className="tutorialHeader">
          <HelpCircle size={18} />
          <div>
            <strong>{current.title}</strong>
            <small>
              {step + 1} / {tutorialSteps.length} / {mode}
            </small>
          </div>
          <button aria-label="Close tutorial" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <p>{current.body}</p>
        <div className="tutorialModes">
          {tutorialSteps.map((item, index) => (
            <button
              key={item.mode}
              className={index === step ? "selected" : ""}
              onClick={() => onStepChange(index)}
            >
              {item.mode}
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

function CommandSearch({ query, commands, onQueryChange, onRunCommand }) {
  const normalized = query.trim().toLowerCase();
  const visibleCommands = normalized
    ? commands.filter((command) => `${command.label} ${command.keywords}`.toLowerCase().includes(normalized)).slice(0, 5)
    : commands.slice(0, 4);

  return (
    <div className="commandSearch">
      <Search size={16} />
      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search actions, assets, exports..."
        aria-label="Command search"
      />
      <div className="commandResults">
        {visibleCommands.map((command) => (
          <button key={command.id} onMouseDown={(event) => event.preventDefault()} onClick={() => onRunCommand(command)}>
            {command.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ShowDashboard({
  showName,
  savedShows,
  templates,
  shortFormats,
  developmentPaths,
  publicMilestones,
  progress,
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
  return (
    <div className="showDashboard">
      <section className="dashboardHero">
        <div>
          <span className="eyebrow">Production Home</span>
          <h1>{showName}</h1>
          <p>Make a weird thing, perform it live, replay it, and export a short without leaving the app.</p>
        </div>
        <div className="recordFlow">
          <span className={progress.hasRig ? "done" : ""}>Build</span>
          <span className={progress.hasSet ? "done" : ""}>Stage</span>
          <span className={progress.hasTake ? "done" : ""}>Record</span>
          <span className={progress.readyToExport ? "done" : ""}>Export</span>
        </div>
      </section>

      <section className="dashboardPriority" aria-label="Primary show actions">
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
        <button onClick={canFinish ? onExport : () => onModeChange("edit")}>
          <Video size={17} />
          <span>Finish</span>
          <strong>{canFinish ? "Export Short" : "Review the Cut"}</strong>
        </button>
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

      <section className="publicPathPanel" aria-label="Initial public version path">
        <div>
          <span className="eyebrow">Initial Public Version</span>
          <h2>Make one good short quickly, then make another one weirder.</h2>
        </div>
        <div className="publicMilestoneGrid">
          {publicMilestones.map((milestone) => (
            <article key={milestone.id}>
              <strong>{milestone.name}</strong>
              <span>{milestone.detail}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="philosophyPanel" aria-label="How to make a short">
        <div>
          <span className="eyebrow">How To Make A Short</span>
          <h2>Build a weird little world, perform inside it, finish the cartoon.</h2>
        </div>
        <div className="pathCardGrid">
          {developmentPaths.map((path) => (
            <article key={path.id} className="pathCard">
              <span>{path.label}</span>
              <strong>{path.name}</strong>
              <em>{path.promise}</em>
              <small>{path.focus}</small>
            </article>
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
  onExport,
  onAddToCut
}) {
  const steps = [
    {
      id: "short",
      label: "Start a short",
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
      label: "Build the space",
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
      label: "Export package",
      body: "Bundle the cut, captions, credits, and license notes for the outside world.",
      complete: "Export started. Make another bit while the idea is warm.",
      done: progress.exported,
      action: progress.readyToExport ? onExport : () => onModeChange("edit"),
      actionLabel: progress.readyToExport ? "Export" : "Finish"
    }
  ];
  const nextStep = steps.find((step) => !step.done) || steps[steps.length - 1];

  return (
    <div className="dockGroup beginnerRoadmap">
      <h2>Make A Short</h2>
      <div className="beginnerRail">
        <span>Start</span>
        <span>Build</span>
        <span>Perform</span>
        <span>Replay</span>
        <span>Export</span>
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
          <small>Replay it while the timing is fresh, then save it into the show.</small>
          <div className="libraryActions">
            <button onClick={onReplay}>
              <Play size={16} />
              Replay
            </button>
            <button onClick={onAddToCut}>
              <Plus size={16} />
              Add Cut
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

function SceneObject({ object, selected, onSelect }) {
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
      <span>{object.name}</span>
    </Component>
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
  onShowNameChange,
  onSelectedShowChange,
  onSaveShow,
  onLoadShow,
  onExportShow
}) {
  return (
    <div className="dockGroup showSessionPanel">
      <h2>Show</h2>
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
      <small className="controlHint">
        Saves the show look, cast customization, storyboard, timeline, and take list in this browser.
      </small>
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
  activeStyle,
  episodeStatus,
  onSaveShow,
  onModeChange
}) {
  return (
    <div className="dockGroup showBiblePanel">
      <h2>Show Toolbox</h2>
      <div className="bibleHeader">
        <strong>{showName}</strong>
        <small>Cast, sets, props, style, credits, and export rules for this show.</small>
        <small>{activeStyle.family} / {activeStyle.theme}</small>
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
      <div className="publicReadinessList">
        <span className={castCount ? "done" : ""}>Cast</span>
        <span className={sceneSetCount || propCount ? "done" : ""}>World</span>
        <span className={boardCount ? "done" : ""}>Board</span>
        <span className={timelineCount ? "done" : ""}>Cut</span>
        <span className={referenceCount ? "done" : ""}>Credits</span>
        <span className={["submitted", "ready_for_review", "approved", "scheduled", "published"].includes(episodeStatus) ? "done" : ""}>Review</span>
      </div>
      <div className="libraryActions">
        <button onClick={() => onModeChange("build")}>Rigs</button>
        <button onClick={() => onModeChange("assets")}>Props</button>
        <button onClick={onSaveShow}>
          <Save size={16} />
          Save Bible
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
          <span>Z / X / C</span>
          <strong>Wave, hop, panic</strong>
          <span>H</span>
          <strong>Hold/release idle</strong>
          <span>Q / E</span>
          <strong>Scale trim</strong>
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

function SceneLibraryEditor({
  takes,
  selectedTake,
  playbackActive,
  onRefresh,
  onSelectTake,
  onPlay,
  onQuickTrim,
  onSaveTakeAsScene,
  onExport,
  onExportProject,
  onQueueVideoExport,
  onExportVideo,
  videoExporting,
  doinkSubmission,
  doinkSubmitting,
  doinkEndpointConfigured,
  onDoinkSubmissionChange,
  onSubmitToDoinkTv,
  onAddTakeToTimeline,
  timeline,
  episodeStatus,
  onEpisodeStatusChange,
  onRemoveTimelineClip,
  onModeChange
}) {
  const takeLaneSummary = selectedTake
    ? [
        { id: "motion", label: "Motion", count: selectedTake.tracks.motion.filter((event) => event.type === "performer:update").length },
        { id: "mouth", label: "Mouth", count: selectedTake.tracks.motion.filter((event) => event.state?.mouthOpen > 0 || event.state?.speaking).length },
        { id: "camera", label: "Camera", count: selectedTake.cameraShot ? 1 : 0 },
        { id: "cues", label: "Cues", count: selectedTake.tracks.motion.filter((event) => event.type === "macro:trigger").length },
        { id: "props", label: "Props", count: selectedTake.sceneObjects?.length || 0 },
        { id: "audio", label: "Audio", count: selectedTake.tracks.audio.length }
      ]
    : [];
  const reviewReadyStatuses = ["submitted", "ready_for_review", "approved", "scheduled", "published"];
  const hasSubmissionSource = Boolean(selectedTake || takes.length || timeline.length);
  return (
    <div className="sceneEditor">
      <div className="dockGroup">
        <h2>Scene Library</h2>
        <div className="editorHeader">
          <Library size={18} />
          <div>
            <strong>{selectedTake?.name || "Recorded Scenes"}</strong>
            <small>{takes.length} saved in this room</small>
          </div>
        </div>
        <button className="wideAction" onClick={onRefresh}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="dockGroup">
        <h2>Takes</h2>
        {takes.length ? (
          <div className="takeList">
            {takes.map((take) => (
              <button
                key={take.id}
                className={`takeButton ${selectedTake?.id === take.id ? "selected" : ""}`}
                onClick={() => onSelectTake(take.id)}
              >
                <span>{take.name}</span>
                <small>
                  {take.scene} / {formatDuration(take.durationMs)}
                </small>
              </button>
            ))}
          </div>
        ) : (
          <div className="emptyState actionEmpty">
            <strong>No recorded takes yet.</strong>
            <span>Rehearse the scene, then record one short performance.</span>
            <button onClick={() => onModeChange("perform")}>Go Perform</button>
          </div>
        )}
      </div>

      {selectedTake && (
        <>
          <div className="dockGroup postTakeReward">
            <span className="eyebrow">Fresh Take</span>
            <strong>That is a cartoon now.</strong>
            <small>Play it back, trim the rough edges, save the scene, or push it straight into the cut.</small>
            <div className="libraryActions">
              <button className={playbackActive ? "active" : ""} onClick={onPlay}>
                <Play size={16} />
                {playbackActive ? "Replaying" : "Replay"}
              </button>
              <button onClick={() => onQuickTrim("start")}>
                <ChevronLeft size={16} />
                Trim In
              </button>
              <button onClick={() => onQuickTrim("end")}>
                <ChevronRight size={16} />
                Trim Out
              </button>
              <button onClick={onSaveTakeAsScene}>
                <Clapperboard size={16} />
                Save Scene
              </button>
              <button onClick={() => onAddTakeToTimeline(selectedTake)}>
                <Plus size={16} />
                Add Cut
              </button>
              <button onClick={onExportVideo} disabled={videoExporting}>
                <Video size={16} />
                {videoExporting ? "Rendering" : "Preview WEBM"}
              </button>
            </div>
          </div>

          <div className="dockGroup">
            <h2>Take Lanes</h2>
            <div className="laneSummaryGrid">
              {takeLaneSummary.map((lane) => (
                <div className={`laneSummaryItem ${lane.count ? "done" : ""}`} key={lane.id}>
                  <strong>{lane.count}</strong>
                  <span>{lane.label}</span>
                </div>
              ))}
            </div>
            <div className="editorStats">
              <span>
                <strong>{formatDuration(selectedTake.durationMs)}</strong>
                Duration
              </span>
              <span>
                <strong>{selectedTake.tracks.motion.length}</strong>
                Moves
              </span>
              <span>
                <strong>{selectedTake.tracks.audio.length}</strong>
                Audio Tracks
              </span>
              <span>
                <strong>{selectedTake.performers.length}</strong>
                Cast
              </span>
            </div>
            <small className="controlHint">
              Next pass: movement, mouth, camera, prop cues, and audio become separate editable lanes.
            </small>
          </div>

          <div className="dockGroup">
            <h2>Tracks</h2>
            {selectedTake.tracks.audio.length ? (
              selectedTake.tracks.audio.map((track) => (
                <div className="trackRow" key={track.id}>
                  <span>{track.performerName}</span>
                  <small>
                    {track.character} / {track.chunks.length} clips
                  </small>
                </div>
              ))
            ) : (
              <div className="emptyState actionEmpty">
                <strong>No audio tracks yet.</strong>
                <span>Turn on the mic, record another take, and each performer will export as a separate track.</span>
                <button onClick={() => onModeChange("perform")}>Record With Mic</button>
              </div>
            )}
          </div>

          <div className="dockGroup exportPlanPanel">
            <h2>Export Short</h2>
            <small className="controlHint">Preview WEBM gives a quick browser video; package export carries the project data, audio tracks, credits, and metadata.</small>
            <div className="renderChecklist">
              <span className="done">Preview</span>
              <span className={selectedTake.tracks.audio.length ? "done" : ""}>Audio</span>
              <span className={selectedTake.sceneObjects?.length ? "done" : ""}>Props</span>
              <span className={timeline.length ? "done" : ""}>Cut</span>
              <span className={reviewReadyStatuses.includes(episodeStatus) ? "done" : ""}>Review</span>
            </div>
            <div className="libraryActions">
              <button onClick={onExportProject}>
                <Save size={16} />
                Short Package
              </button>
              <button onClick={() => onExport(selectedTake)}>
                <Video size={16} />
                Raw Take JSON
              </button>
              <button onClick={onExportVideo} disabled={videoExporting}>
                <Clapperboard size={16} />
                {videoExporting ? "Rendering" : "Preview WEBM"}
              </button>
              <button onClick={onQueueVideoExport}>
                <Clapperboard size={16} />
                Render Roadmap
              </button>
            </div>
          </div>
        </>
      )}

      <div className="dockGroup doinkSubmissionPanel">
        <h2>Submit to DoinkTV</h2>
        <small className="controlHint">
          Send admins a review package with project data, credits, captions, take info, and broadcast notes.
          {doinkEndpointConfigured ? " Direct intake is configured." : " For now this downloads a handoff JSON."}
        </small>
        <div className="submissionGrid">
          <label>
            Short Title
            <input
              value={doinkSubmission.title}
              placeholder={selectedTake?.name || "Untitled DoinkTV short"}
              onChange={(event) => onDoinkSubmissionChange({ title: event.target.value })}
            />
          </label>
          <label>
            Creator
            <input
              value={doinkSubmission.creatorName}
              placeholder="Who should admins credit?"
              onChange={(event) => onDoinkSubmissionChange({ creatorName: event.target.value })}
            />
          </label>
          <label>
            Contact
            <input
              value={doinkSubmission.creatorContact}
              placeholder="Email, handle, or internal note"
              onChange={(event) => onDoinkSubmissionChange({ creatorContact: event.target.value })}
            />
          </label>
          <label>
            DoinkTV Block
            <select
              value={doinkSubmission.preferredBlock}
              onChange={(event) => onDoinkSubmissionChange({ preferredBlock: event.target.value })}
            >
              <option value="short">Short</option>
              <option value="bump">Bump</option>
              <option value="episode">Episode</option>
              <option value="late-night">Late Night</option>
              <option value="experimental">Experimental</option>
            </select>
          </label>
          <label className="wideField">
            Description
            <textarea
              rows={3}
              value={doinkSubmission.description}
              placeholder="What is this short, and why should it air?"
              onChange={(event) => onDoinkSubmissionChange({ description: event.target.value })}
            />
          </label>
          <label className="wideField">
            Content Notes
            <textarea
              rows={2}
              value={doinkSubmission.contentNotes}
              placeholder="Warnings, rating notes, or anything admins should know."
              onChange={(event) => onDoinkSubmissionChange({ contentNotes: event.target.value })}
            />
          </label>
          <label className="wideField">
            Rights And Credits
            <textarea
              rows={2}
              value={doinkSubmission.rightsNotes}
              onChange={(event) => onDoinkSubmissionChange({ rightsNotes: event.target.value })}
            />
          </label>
          <label className="wideField">
            Scheduling Notes
            <textarea
              rows={2}
              value={doinkSubmission.schedulingNotes}
              placeholder="Preferred slot, theme night, episode order, or leave blank."
              onChange={(event) => onDoinkSubmissionChange({ schedulingNotes: event.target.value })}
            />
          </label>
        </div>
        <div className="submissionChecklist">
          <span className={hasSubmissionSource ? "done" : ""}>Take or cut</span>
          <span className={selectedTake ? "done" : ""}>Preview target</span>
          <span className={doinkSubmission.creatorName.trim() ? "done" : ""}>Credit name</span>
          <span className={doinkSubmission.rightsNotes.trim() ? "done" : ""}>Rights note</span>
        </div>
        <button
          className="wideAction"
          onClick={onSubmitToDoinkTv}
          disabled={!hasSubmissionSource || doinkSubmitting}
        >
          <ExternalLink size={16} />
          {doinkSubmitting ? "Submitting" : "Submit to DoinkTV"}
        </button>
      </div>

      <div className="dockGroup">
        <h2>Episode Pipeline</h2>
        <label>
          Status
          <select value={episodeStatus} onChange={(event) => onEpisodeStatusChange(event.target.value)}>
            <option value="draft">Draft</option>
            <option value="rough_cut">Rough Cut</option>
            <option value="ready_for_review">Ready for Review</option>
            <option value="submitted">Submitted to DoinkTV</option>
            <option value="needs_changes">Needs Changes</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <div className="pipelineChecklist">
          <span className={takes.length ? "done" : ""}>Takes recorded</span>
          <span className={timeline.length ? "done" : ""}>Episode cut assembled</span>
          <span className={selectedTake?.audioTrackCount || selectedTake?.tracks?.audio?.length ? "done" : ""}>
            Character audio tracked
          </span>
          <span className={["approved", "scheduled", "published"].includes(episodeStatus) ? "done" : ""}>
            Producer approved
          </span>
        </div>
        <div className="reviewRoleStrip">
          <span>Performer</span>
          <span>Director</span>
          <span>Editor</span>
          <span>Producer</span>
        </div>
      </div>

      <ProductionTimeline
        clips={timeline}
        onRemoveClip={onRemoveTimelineClip}
        onExportProject={onExportProject}
      />
    </div>
  );
}

function ProductionTimeline({ clips, onRemoveClip, onExportProject }) {
  return (
    <div className="dockGroup productionTimelinePanel">
      <h2>Episode Assembly</h2>
      <small className="controlHint">
        This is the rough cut shelf for now. Detailed lane editing will move here as recording gets richer.
      </small>
      {clips.length ? (
        <div className="timelineList">
          {clips.map((clip, index) => (
            <div className="timelineClip" key={clip.id}>
              <span>{index + 1}</span>
              <div>
                <strong>{clip.title}</strong>
                <small>
                  {clip.sourceType} / {clip.shot} / {formatClipDuration(clip.duration)}
                </small>
              </div>
              <button aria-label={`Remove ${clip.title}`} onClick={() => onRemoveClip(clip.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="emptyState actionEmpty">
          <strong>No rough cut yet.</strong>
          <span>Add the selected take above, or storyboard a shot and add that panel.</span>
          <button onClick={onExportProject}>Export Current Package</button>
        </div>
      )}
      <button className="wideAction" onClick={onExportProject}>
        <Video size={16} />
        Export Short Package
      </button>
    </div>
  );
}

function formatClipDuration(duration) {
  if (typeof duration === "number") return formatDuration(duration);
  return duration || "0:05";
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
          <Puppet key={performer.id} performer={performer} isSelf={false} depthModel={panelScene} />
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
  const hasParts = corePartSlots.some((slot) => {
    const part = characterParts[slot];
    return part?.source || part?.shape || part?.mode === "drawn";
  });
  const rigCheckItems = [
    { id: "head", label: "Head", required: true, ok: Boolean(characterParts.head?.source || characterParts.head?.shape || characterParts.head?.mode === "drawn") },
    { id: "torso", label: "Torso", required: true, ok: Boolean(characterParts.torso?.source || characterParts.torso?.shape || characterParts.torso?.mode === "drawn") },
    { id: "leftArm", label: "Arms", required: Boolean(rig.arms), ok: !rig.arms || Boolean(characterParts.leftArm?.source || characterParts.rightArm?.source || characterParts.leftArm?.shape || characterParts.rightArm?.shape || characterParts.leftArm?.mode === "drawn" || characterParts.rightArm?.mode === "drawn") },
    { id: "leftLeg", label: "Legs", required: Boolean(rig.legs), ok: !rig.legs || Boolean(characterParts.leftLeg?.source || characterParts.rightLeg?.source || characterParts.leftLeg?.shape || characterParts.rightLeg?.shape || characterParts.leftLeg?.mode === "drawn" || characterParts.rightLeg?.mode === "drawn") }
  ];
  const missingRigParts = rigCheckItems.filter((item) => item.required && !item.ok);
  const design = {
    name: performer.state.characterDesign?.name || `${baseCharacter.name} Puppet`,
    color: performer.state.characterDesign?.color || baseCharacter.color,
    accent: performer.state.characterDesign?.accent || baseCharacter.accent
  };

  return (
    <div className="characterEditor">
      <div className="dockGroup">
        <h2>Build Your Rig</h2>
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
      </div>

      <div className={`dockGroup rigCheckPanel ${missingRigParts.length ? "needsAttention" : "ready"}`}>
        <h2>Rig Check</h2>
        <small className="controlHint">
          Forgiving setup: stick-rig defaults still perform, but these quick fixes make the character read better on camera.
        </small>
        <div className="rigCheckList">
          {rigCheckItems.map((item) => (
            <div className={`rigCheckItem ${item.ok ? "done" : ""}`} key={item.label}>
              <span>{item.ok ? "OK" : item.required ? "FIX" : "SKIP"}</span>
              <strong>{item.label}</strong>
              {!item.ok && item.required && (
                <button
                  onClick={() =>
                    onPartChange(item.id, {
                      label: getCatalogItem(characterPartCatalog, item.id).label,
                      mode: "shape",
                      shape: item.id === "torso" ? "bean" : "circle"
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
          Start with simple shapes, mark a rough drawn part, or import your own image for each body piece.
        </small>
        <div className="partBuilderList">
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
      <div className={`partCardPreview partShape-${value.shape || "scribble"} ${value.hidden ? "hidden" : ""}`}>
        {value.source ? <img src={value.source} alt="" /> : <span>{value.label || part.label}</span>}
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
