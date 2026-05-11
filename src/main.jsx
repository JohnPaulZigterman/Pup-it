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
  FolderOpen,
  HelpCircle,
  Library,
  Mic,
  MicOff,
  MousePointer2,
  Palette,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Shuffle,
  Save,
  Square,
  Theater,
  Trash2,
  Video,
  Wand2,
  X
} from "lucide-react";
import {
  cameraShotCatalog,
  createProjectExport,
  createTimelineClip,
  directorActionCatalog,
  lightingPresetCatalog
} from "../shared/production.js";
import {
  characterCatalog,
  animationStyleCatalog,
  backgroundThemeCatalog,
  bodyShapeCatalog,
  characterColorSwatches,
  expressionCatalog,
  getCatalogItem,
  idleMotionCatalog,
  limbStyleCatalog,
  macroCatalog,
  mouthStyleCatalog,
  objectStyleCatalog,
  originalNameParts,
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
    title: "Shape A Character",
    body: "Build mode changes the current performer without breaking their identity: species, colors, rig parts, animation style, walk cycle, and mouth style stay reusable."
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
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

function formatDuration(durationMs = 0) {
  const seconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function makePreviewPerformers(take) {
  return indexPerformers(
    take.performers.map((performer, index) => ({
      id: performer.id,
      name: performer.name,
      character: performer.character,
      state: createPerformerState({
        x: 34 + index * 18,
        y: 60,
        pose: performer.pose,
        idleMotion: performer.idleMotion,
        mouthControl: performer.mouthControl,
        rigConfig: performer.rigConfig,
        stylePreset: performer.stylePreset,
        characterDesign: performer.characterDesign,
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

function createStoryboardPanel({ scene, performers, index, backgroundTheme, objectStyle, texturePreset }) {
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
  const [mode, setMode] = useState("perform");
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
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [status, setStatus] = useState("Create or join a room to start puppeteering.");

  const self = performers[selfId];
  const selectedScene = getCatalogItem(sceneCatalog, scene);
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

    const update = () => {
      setPerformers((current) => {
        const performer = current[selfId];
        if (!performer) return current;

        const input = inputFromPressedKeys(pressed);
        if (!hasInput(input)) {
          if (!performer.state.walking) return current;
          const nextPerformer = {
            ...performer,
            state: { ...performer.state, walking: false }
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
    const shows = loadStoredShows();
    setSavedShows(shows);
    if (shows[0]) {
      setSelectedShowId(shows[0].id);
      setShowName(shows[0].showName);
    }
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
  const setIdleMotion = (idleMotion) => updateSelf({ idleMotion });
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
  const randomizeCharacterDesign = () => {
    updateSelf({
      characterDesign: makeOriginalDesign(),
      rigConfig: makeOriginalRig(),
      stylePreset: pickRandom(animationStyleCatalog).id
    });
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
      texturePreset: stageTexturePreset
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
      cameraShot,
      lightingPreset,
      backgroundTheme,
      objectStyle,
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
      cameraShot,
      lightingPreset,
      backgroundTheme,
      objectStyle,
      cast: clonePerformers(activePerformers),
      storyboardPanels,
      productionTimeline,
      takes: takeLibrary.map(summarizeTakeForShow)
    };
  };

  const saveShowSession = () => {
    const session = createShowSession();
    const nextShows = [
      session,
      ...savedShows.filter((show) => show.id !== session.id)
    ].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    try {
      writeStoredShows(nextShows);
      setSavedShows(nextShows);
      setSelectedShowId(session.id);
      setShowName(session.showName);
      setStatus(`Saved show "${session.showName}".`);
    } catch (_error) {
      setStatus("This browser blocked show saving. Export the project as a backup.");
    }
  };

  const loadShowSession = (showId = selectedShowId) => {
    const session = savedShows.find((show) => show.id === showId);
    if (!session) return;
    clearPlayback();
    setSelectedShowId(session.id);
    setShowName(session.showName);
    setCameraShot(session.cameraShot || "wide");
    setLightingPreset(session.lightingPreset || "scene");
    setBackgroundTheme(session.backgroundTheme || "painted-depth");
    setObjectStyle(session.objectStyle || "soft-material");
    setStoryboardPanels(session.storyboardPanels || []);
    setSelectedStoryboardId(session.storyboardPanels?.[0]?.id || null);
    setProductionTimeline(session.productionTimeline || session.timeline || []);
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
              Character
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
    <main className="appShell">
      <header className="topBar">
        <div className="brandCompact">
          <Theater size={22} />
          <strong>Pup-It</strong>
          <span>{status}</span>
        </div>
        <div className="transport">
          <div className="modeSwitch" aria-label="Workflow mode">
            {["perform", "build", "edit", "storyboard"].map((item) => (
              <button
                key={item}
                className={mode === item ? "selected" : ""}
                onClick={() => setMode(item)}
              >
                {item}
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
        </div>
      </header>

      <section
        className={
          mode === "storyboard"
            ? "storyboardStage"
            : `stage ${selectedScene.className} ${selectedCameraShot.className} ${selectedLighting.className} ${selectedBackgroundTheme.className} ${selectedObjectStyle.className} texture-${stageTexturePreset}`
        }
        onPointerMove={handleStagePointerMove}
        onPointerLeave={handleStagePointerLeave}
      >
        {mode === "storyboard" ? (
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
              <div className="horizonGuide" />
              <div className="setFloor" />
              {stagePerformers.map((performer) => (
                <Puppet key={performer.id} performer={performer} isSelf={performer.id === selfId} />
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
            self={self}
            onSceneChange={changeScene}
            onExpressionChange={setExpression}
            onPoseChange={setPose}
            onIdleMotionChange={setIdleMotion}
            onMouthControlChange={setMouthControl}
            mouthCameraActive={mouthCameraActive}
            onMacroTrigger={triggerMacro}
            cameraShot={cameraShot}
            lightingPreset={lightingPreset}
            backgroundTheme={backgroundTheme}
            objectStyle={objectStyle}
            onCameraShotChange={setCameraShot}
            onLightingPresetChange={setLightingPreset}
            onBackgroundThemeChange={setBackgroundTheme}
            onObjectStyleChange={setObjectStyle}
            onDirectorAction={applyDirectorAction}
            onStoryboardCapture={addStoryboardPanel}
          />
        )}
        {mode === "build" && (
          <CharacterEditor
            performer={self}
            onRigChange={updateCharacterRig}
            onStyleChange={updateCharacterStyle}
            onDesignChange={updateCharacterDesign}
            onRandomize={randomizeCharacterDesign}
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
  self,
  cameraShot,
  lightingPreset,
  backgroundTheme,
  objectStyle,
  onSceneChange,
  onCameraShotChange,
  onLightingPresetChange,
  onBackgroundThemeChange,
  onObjectStyleChange,
  onExpressionChange,
  onPoseChange,
  onIdleMotionChange,
  onMouthControlChange,
  mouthCameraActive,
  onMacroTrigger,
  onDirectorAction,
  onStoryboardCapture
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

      <div className="dockGroup">
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

      <div className="dockGroup">
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

      <div className="dockGroup">
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

      <div className="dockGroup">
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
      className={`panelFrame ${panelScene.className} ${panelShot.className} ${panelLighting.className} ${panelBackgroundTheme.className} ${panelObjectStyle.className} texture-${panel.texturePreset || panelBackgroundTheme.texturePreset || "paper-grain"}`}
    >
      <div className="panelStageInner stageCamera">
        <div className="stageTexture" />
        <div className="stageLighting" />
        <div className="horizonGuide" />
        <div className="setFloor" />
        {panel.performers.map((performer) => (
          <Puppet key={performer.id} performer={performer} isSelf={false} />
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

function CharacterEditor({ performer, onRigChange, onStyleChange, onDesignChange, onRandomize }) {
  if (!performer) return null;

  const baseCharacter = getCatalogItem(characterCatalog, performer.character);
  const rig = { ...baseCharacter.rigConfig, ...performer.state.rigConfig };
  const stylePreset = performer.state.stylePreset || baseCharacter.stylePreset;
  const selectedStyle = getCatalogItem(animationStyleCatalog, stylePreset);
  const design = {
    name: performer.state.characterDesign?.name || `${baseCharacter.name} Original`,
    color: performer.state.characterDesign?.color || baseCharacter.color,
    accent: performer.state.characterDesign?.accent || baseCharacter.accent
  };

  return (
    <div className="characterEditor">
      <div className="dockGroup">
        <h2>Character Editor</h2>
        <div className="editorHeader">
          <Palette size={18} />
          <div>
            <strong>{design.name}</strong>
            <small>Make the preset weirder, then make it yours.</small>
          </div>
        </div>
      </div>

      <div className="dockGroup originalPanel">
        <h2>Make Original</h2>
        <button className="wideAction" onClick={onRandomize}>
          <Shuffle size={16} />
          Weird Starter
        </button>
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
