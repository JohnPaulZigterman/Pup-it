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
const SHOW_STORAGE_KEY = "pup-it-shows-v1";

const tutorialSteps = [
  {
    mode: "perform",
    title: "Perform Live",
    body: "Move your character with WASD or arrow keys, use mouse height for mouth movement, and trigger expressions, poses, and macros from the dock."
  },
  {
    mode: "build",
    title: "Build The Space",
    body: "Choose a rig model, then assemble the puppet from shapes, doodle placeholders, imported images, styles, parts, and behaviors."
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
  { id: "cast", label: "Cast", mode: "build", description: "Design performers and reusable character rigs." },
  { id: "sets", label: "Sets", mode: "assets", description: "Find settings, props, textures, and references." },
  { id: "perform", label: "Perform", mode: "perform", description: "Rehearse, record, and improvise live." },
  { id: "edit", label: "Edit", mode: "edit", description: "Review takes and assemble the episode." },
  { id: "storyboard", label: "Board", mode: "storyboard", description: "Plan comic-strip beats and shot flow." }
];

const showStarterTemplates = [
  {
    id: "two-hander",
    name: "Two Characters Talking",
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
    shape: asset.previewStyle || "object"
  };
}

function createSceneObjectFromImage({ name, imageUrl, license, attribution }, index = 0) {
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
    takes: showBible.takes || []
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
        takes: session.takes
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
  const audioRef = useRef({ context: null, sequence: 0, recorder: null, stream: null });
  const mouthVideoRef = useRef(null);
  const mouthValueRef = useRef(0);
  const mouthCameraRef = useRef({ stream: null, frame: null, baseline: null, lastSentAt: 0 });
  const playbackTimersRef = useRef([]);
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
  const [mode, setMode] = useState("home");
  const [experienceMode, setExperienceMode] = useState("beginner");
  const [commandQuery, setCommandQuery] = useState("");
  const [cameraShot, setCameraShot] = useState("wide");
  const [lightingPreset, setLightingPreset] = useState("scene");
  const [backgroundTheme, setBackgroundTheme] = useState("painted-depth");
  const [objectStyle, setObjectStyle] = useState("soft-material");
  const [takeLibrary, setTakeLibrary] = useState([]);
  const [selectedTake, setSelectedTake] = useState(null);
  const [previewPerformers, setPreviewPerformers] = useState(null);
  const [playbackActive, setPlaybackActive] = useState(false);
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
      }
      setStatus(isRecording ? "Recording movement and audio chunks." : "Take saved to the scene library.");
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
    return () => stopMouthCamera();
  }, []);

  useEffect(() => {
    if (joined && mode === "edit") loadTakeLibrary();
  }, [joined, mode, roomId]);

  useEffect(() => {
    return () => clearPlayback();
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
    const walkableTop = selectedScene.horizon + (selectedScene.performerHorizonBuffer || 0);
    updateSelf({
      x: clamp(mark.x, 5, 92),
      y: clamp(mark.y, walkableTop, selectedScene.foreground),
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
    const open = immediate ? target : previous * 0.58 + target * 0.42;
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
        updateSelf({ mouthControl: "mouse", mouthOpen: 0, speaking: false });
        setStatus("Camera mouth control was blocked. Mouse mouth control is still active.");
      }
      return;
    }

    stopMouthCamera();
    mouthValueRef.current = 0;
    updateSelf({ mouthControl, mouthOpen: 0, speaking: false });
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
        characterPartCatalog.map((part) => [
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
    flashMacro(selfId, macro);
    window.setTimeout(() => updateSelf({ macro: null }), 850);
  };

  const applyDirectorAction = (actionId) => {
    const action = getCatalogItem(directorActionCatalog, actionId);
    if (action.cameraShot) setCameraShot(action.cameraShot);
    if (action.lightingPreset) setLightingPreset(action.lightingPreset);
    if (action.selfState) updateSelf(action.selfState);
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

  const toggleMic = async () => {
    if (micLive) {
      audioRef.current.recorder?.stop();
      audioRef.current.stream?.getTracks().forEach((track) => track.stop());
      audioRef.current = { ...audioRef.current, recorder: null, stream: null };
      setMicLive(false);
      updateSelf({ speaking: false });
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    audioRef.current.stream = stream;
    audioRef.current.recorder = recorder;
    audioRef.current.sequence = 0;

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
    updateSelf({ speaking: true });
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
    socketRef.current.emit(recording ? "take:stop" : "take:start");
  };

  const exportTake = async () => {
    const response = await fetch(`${SERVER_URL}/api/rooms/${encodeURIComponent(roomId)}/take`);
    const take = await response.json();
    downloadTake(take);
  };

  const downloadTake = (take) => {
    const blob = new Blob([JSON.stringify(take, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pup-it-${take.roomId || roomId}-${take.id || "take"}.json`;
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

  const selectTake = async (takeId) => {
    const response = await fetch(
      `${SERVER_URL}/api/rooms/${encodeURIComponent(roomId)}/takes/${encodeURIComponent(takeId)}`
    );
    if (!response.ok) return;
    const take = await response.json();
    clearPlayback();
    setSelectedTake(take);
    setPreviewPerformers(makePreviewPerformers(take));
    setScene(take.scene);
    setMode("edit");
  };

  const clearPlayback = () => {
    playbackTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    playbackTimersRef.current = [];
    setPlaybackActive(false);
  };

  const playSelectedTake = () => {
    if (!selectedTake) return;
    clearPlayback();
    setScene(selectedTake.scene);
    setPreviewPerformers(makePreviewPerformers(selectedTake));
    setPlaybackActive(true);

    const events = [...selectedTake.tracks.motion].sort((a, b) => a.at - b.at);
    const lastAt = events.length ? events[events.length - 1].at : selectedTake.durationMs || 0;

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

  const activePerformers = useMemo(() => performerList(performers), [performers]);
  const stagePerformers = useMemo(
    () => (mode === "edit" && previewPerformers ? performerList(previewPerformers) : activePerformers),
    [activePerformers, mode, previewPerformers]
  );
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
  };

  const removeTimelineClip = (clipId) => {
    setProductionTimeline((current) => current.filter((clip) => clip.id !== clipId));
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

  const exportProject = () => {
    const project = createProjectExport({
      roomId,
      showName,
      scene,
      perspective: selectedScene.perspective,
      cameraShot,
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
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pup-it-${roomId}-project.json`;
    link.click();
    URL.revokeObjectURL(url);
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
      const walkableTop = templateScene.horizon + (templateScene.performerHorizonBuffer || 0);
      updateSelf({
        x: clamp(template.marks[0].x, 5, 92),
        y: clamp(template.marks[0].y, walkableTop, templateScene.foreground),
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
    { id: "review", label: "Review recorded scenes", keywords: "edit takes timeline review", action: () => { loadTakeLibrary(); setMode("edit"); } },
    { id: "board", label: "Open storyboard mode", keywords: "storyboard panel comic strip planning", action: () => setMode("storyboard") },
    { id: "export", label: "Export full project package", keywords: "export publish package video project", action: exportProject },
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
      takes: takeLibrary.map(summarizeTakeForShow)
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
          <button onClick={exportTake}>
            <Video size={17} />
            Export Take
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
                "--scene-focus-y": `${selectedScene.focusY || selectedScene.horizon}%`
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
            takeCount={takeLibrary.length}
            panelCount={storyboardPanels.length}
            timelineCount={productionTimeline.length}
            onApplyTemplate={applyShowTemplate}
            onModeChange={setMode}
            onAssetSearch={openAssetSearch}
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
            mouthCameraActive={mouthCameraActive}
            onMacroTrigger={triggerMacro}
            cameraShot={cameraShot}
            lightingPreset={lightingPreset}
            backgroundTheme={backgroundTheme}
            objectStyle={objectStyle}
            floorMarks={floorMarks}
            shotTemplates={shotTemplateCatalog}
            onCameraShotChange={setCameraShot}
            onLightingPresetChange={setLightingPreset}
            onBackgroundThemeChange={setBackgroundTheme}
            onObjectStyleChange={setObjectStyle}
            onDirectorAction={applyDirectorAction}
            onStoryboardCapture={addStoryboardPanel}
            onMoveToMark={moveSelfToMark}
            onSetMarkFromSelf={setCurrentPositionAsMark}
            onApplyShotTemplate={applyShotTemplate}
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
            onBehaviorChange={(behaviorPreset) => updateSelf({ behaviorPreset })}
            onPartChange={updateCharacterPart}
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
            onExport={downloadTake}
            onAddTakeToTimeline={addTakeToTimeline}
            timeline={productionTimeline}
            episodeStatus={episodeStatus}
            onEpisodeStatusChange={setEpisodeStatus}
            onRemoveTimelineClip={removeTimelineClip}
            onExportProject={exportProject}
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
  takeCount,
  panelCount,
  timelineCount,
  onApplyTemplate,
  onModeChange,
  onAssetSearch,
  onLoadShow
}) {
  return (
    <div className="showDashboard">
      <section className="dashboardHero">
        <div>
          <span className="eyebrow">Production Home</span>
          <h1>{showName}</h1>
          <p>Make a weird thing, perform it live, then turn it into a reusable show.</p>
        </div>
        <div className="recordFlow">
          <span>Rehearse</span>
          <span>Record</span>
          <span>Review</span>
          <span>Export</span>
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
          <span>timeline</span>
        </div>
      </section>

      <section className="dashboardGrid">
        <div className="dashboardPanel">
          <h2>Start Fast</h2>
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
          <h2>Jump To</h2>
          <div className="dashboardActions">
            <button onClick={() => onModeChange("build")}>
              <Sparkles size={16} />
              Playground
            </button>
            <button onClick={() => onAssetSearch("furniture", "object")}>
              <Library size={16} />
              Find Props
            </button>
            <button onClick={() => onModeChange("perform")}>
              <Circle size={16} />
              Perform
            </button>
            <button onClick={() => onModeChange("edit")}>
              <ListChecks size={16} />
              Review Takes
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
        <span>Character</span>
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

function SceneObject({ object, selected, onSelect }) {
  const Component = onSelect ? "button" : "div";
  return (
    <Component
      className={`sceneObject sceneObject-${object.shape} ${selected ? "selected" : ""} ${object.locked ? "locked" : ""}`}
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

function PerformControls({
  scene,
  selectedScene,
  selectedPerspective,
  self,
  cameraShot,
  lightingPreset,
  backgroundTheme,
  objectStyle,
  floorMarks,
  shotTemplates,
  onSceneChange,
  onCameraShotChange,
  onLightingPresetChange,
  onBackgroundThemeChange,
  onObjectStyleChange,
  onExpressionChange,
  onPoseChange,
  onIdleMotionChange,
  onMotionFeelChange,
  onMouthControlChange,
  mouthCameraActive,
  onMacroTrigger,
  onDirectorAction,
  onStoryboardCapture,
  onMoveToMark,
  onSetMarkFromSelf,
  onApplyShotTemplate
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

      <div className="dockGroup">
        <h2>Director</h2>
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

      <div className="dockGroup">
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
          <span>Mouse height</span>
          <strong>Mouth open</strong>
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
          Smooth is the beginner default. Direct hits marks faster; Loose keeps more handmade drift.
        </small>
      </div>

      <div className="dockGroup">
        <h2>Mouth Control</h2>
        <div className="segmented">
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
        <small className="controlHint">
          {self?.state.mouthControl === "camera"
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
  const searchQuery = search.trim().toLowerCase();
  const filteredAssets = assets.filter((asset) => {
    const matchesFormat = filter === "all" || asset.format === filter;
    const matchesTarget = target === "all" || asset.targets?.includes(target);
    const matchesSearch = !searchQuery || getAssetSearchText(asset).includes(searchQuery);
    return matchesFormat && matchesTarget && matchesSearch;
  });

  return (
    <div className="assetLibrary">
      <div className="dockGroup">
        <h2>Asset Library</h2>
        <div className="editorHeader">
          <Library size={18} />
          <div>
            <strong>Curated Free Sources</strong>
            <small>CC0 assets can be imported directly. Mixed-license sources stay reference-only.</small>
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
        <h2>Import Image URL</h2>
        <label>
          Name
          <input value={imageName} onChange={(event) => setImageName(event.target.value)} placeholder="Couch, skyline, weird sign..." />
        </label>
        <label>
          Image URL
          <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." />
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
              attribution: imageLicense
            });
            setImageName("");
            setImageUrl("");
          }}
        >
          <Plus size={16} />
          Place Image
        </button>
        <small className="controlHint">Use cleared, CC0, public-domain, or team-owned images for production.</small>
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
                    Place
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
          <div className="emptyState">No assets match that search yet.</div>
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
          <div className="emptyState">No external assets attached to this show yet.</div>
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
  onExport,
  onAddTakeToTimeline,
  timeline,
  episodeStatus,
  onEpisodeStatusChange,
  onRemoveTimelineClip,
  onExportProject
}) {
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
          <div className="emptyState">No recorded takes yet.</div>
        )}
      </div>

      {selectedTake && (
        <>
          <div className="dockGroup">
            <h2>Timeline</h2>
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
              <div className="emptyState">No audio tracks.</div>
            )}
          </div>

          <div className="libraryActions">
            <button className={playbackActive ? "active" : ""} onClick={onPlay}>
              <Play size={16} />
              {playbackActive ? "Playing" : "Play Scene"}
            </button>
            <button onClick={() => onAddTakeToTimeline(selectedTake)}>
              <Plus size={16} />
              Timeline
            </button>
            <button onClick={() => onExport(selectedTake)}>
              <Video size={16} />
              Export
            </button>
          </div>
        </>
      )}

      <div className="dockGroup">
        <h2>Episode Pipeline</h2>
        <label>
          Status
          <select value={episodeStatus} onChange={(event) => onEpisodeStatusChange(event.target.value)}>
            <option value="draft">Draft</option>
            <option value="rough_cut">Rough Cut</option>
            <option value="ready_for_review">Ready for Review</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>
        </label>
        <div className="pipelineChecklist">
          <span className={takes.length ? "done" : ""}>Takes recorded</span>
          <span className={timeline.length ? "done" : ""}>Timeline assembled</span>
          <span className={selectedTake?.audioTrackCount || selectedTake?.tracks?.audio?.length ? "done" : ""}>
            Character audio tracked
          </span>
          <span className={["approved", "scheduled", "published"].includes(episodeStatus) ? "done" : ""}>
            Producer approved
          </span>
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
    <div className="dockGroup">
      <h2>Production Timeline</h2>
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
        <div className="emptyState">No timeline clips yet.</div>
      )}
      <button className="wideAction" onClick={onExportProject}>
        <Video size={16} />
        Export Project
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
          <div className="emptyState">No panels yet.</div>
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
  onBehaviorChange,
  onPartChange,
  onPartClear
}) {
  if (!performer) return null;

  const baseCharacter = getCatalogItem(characterCatalog, performer.character);
  const rig = { ...baseCharacter.rigConfig, ...performer.state.rigConfig };
  const stylePreset = performer.state.stylePreset || baseCharacter.stylePreset;
  const selectedStyle = getCatalogItem(animationStyleCatalog, stylePreset);
  const behaviorPreset = performer.state.behaviorPreset || "none";
  const characterParts = performer.state.characterParts || {};
  const hasParts = Object.values(characterParts).some((part) => part?.source || part?.shape || part?.mode === "drawn");
  const design = {
    name: performer.state.characterDesign?.name || `${baseCharacter.name} Puppet`,
    color: performer.state.characterDesign?.color || baseCharacter.color,
    accent: performer.state.characterDesign?.accent || baseCharacter.accent
  };

  return (
    <div className="characterEditor">
      <div className="dockGroup">
        <h2>Build The Space</h2>
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

      <div className="dockGroup buildPartsPanel">
        <h2>Assemble Parts</h2>
        <small className="controlHint">
          Start with simple shapes, mark a rough drawn part, or paste an image URL for each body piece.
        </small>
        <div className="partBuilderList">
          {characterPartCatalog.map((part) => (
            <PartBuilderRow
              key={part.id}
              part={part}
              value={characterParts[part.id]}
              onChange={(patch) => onPartChange(part.id, { label: part.label, ...patch })}
              onClear={() => onPartClear(part.id)}
            />
          ))}
        </div>
      </div>

      <div className="dockGroup originalPanel">
        <h2>Playground Lab</h2>
        <button className="wideAction" onClick={onRandomize}>
          <Shuffle size={16} />
          Weird Starter
        </button>
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

      <div className="dockGroup">
        <h2>Animation Style</h2>
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

function PartBuilderRow({ part, value = {}, onChange, onClear }) {
  const mode = value.source ? "image" : value.mode || (value.shape ? "shape" : "empty");

  return (
    <div className="partBuilderRow">
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
        placeholder="Image URL"
        onChange={(event) =>
          onChange({
            mode: "image",
            source: event.target.value,
            shape: value.shape || "oval"
          })
        }
      />
      <div className="partBuilderActions">
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
        <button type="button" onClick={onClear}>
          Clear
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
