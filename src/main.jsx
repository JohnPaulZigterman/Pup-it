import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import {
  Camera,
  Circle,
  Mic,
  MicOff,
  MousePointer2,
  Palette,
  Radio,
  Shuffle,
  Square,
  Theater,
  Video,
  Wand2
} from "lucide-react";
import {
  characterCatalog,
  animationStyleCatalog,
  bodyShapeCatalog,
  characterColorSwatches,
  expressionCatalog,
  getCatalogItem,
  idleMotionCatalog,
  limbStyleCatalog,
  macroCatalog,
  mouthStyleCatalog,
  originalNameParts,
  poseCatalog,
  sceneCatalog,
  walkCycleCatalog
} from "../shared/catalogs.js";
import { defaultCharacterId, defaultRoomId } from "../shared/schema.js";
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

function App() {
  const socketRef = useRef(null);
  const audioRef = useRef({ context: null, sequence: 0, recorder: null, stream: null });
  const mouthVideoRef = useRef(null);
  const mouthCameraRef = useRef({ stream: null, frame: null, baseline: null, lastSentAt: 0 });
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState(defaultRoomId);
  const [name, setName] = useState(`Performer ${Math.ceil(Math.random() * 99)}`);
  const [character, setCharacter] = useState(defaultCharacterId);
  const [scene, setScene] = useState(sceneCatalog[0].id);
  const [performers, setPerformers] = useState({});
  const [selfId, setSelfId] = useState(null);
  const [recording, setRecording] = useState(false);
  const [micLive, setMicLive] = useState(false);
  const [mouthCameraActive, setMouthCameraActive] = useState(false);
  const [mode, setMode] = useState("perform");
  const [status, setStatus] = useState("Create or join a room to start puppeteering.");

  const self = performers[selfId];
  const selectedScene = getCatalogItem(sceneCatalog, scene);

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
    socket.on("scene:set", setScene);
    socket.on("take:status", ({ recording: isRecording }) => {
      setRecording(isRecording);
      setStatus(isRecording ? "Recording movement and audio chunks." : "Take stopped. Export is ready.");
    });
    socket.on("macro:trigger", ({ performerId, macro }) => {
      flashMacro(performerId, macro);
    });
    socket.on("audio:chunk", playRemoteAudio);

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!joined || !selfId) return undefined;

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

        const nextPerformer = movePerformerFromInput(performer, input);
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
  }, [joined, selfId]);

  useEffect(() => {
    return () => stopMouthCamera();
  }, []);

  const joinRoom = (event) => {
    event.preventDefault();
    socketRef.current.connect();
    socketRef.current.emit("room:join", { roomId, name, character });
  };

  const updateSelf = (statePatch) => {
    if (!selfId) return;
    setPerformers((current) => {
      const performer = current[selfId];
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
  const setMouthOpen = (mouthOpen) => {
    const open = clamp(mouthOpen, 0, 1);
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
    if (!self || self.state.mouthControl !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const y = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
    setMouthOpen(Math.pow(1 - y, 1.35));
  };

  const handleStagePointerLeave = () => {
    if (!self || self.state.mouthControl !== "mouse") return;
    setMouthOpen(0);
  };

  const toggleTake = () => {
    socketRef.current.emit(recording ? "take:stop" : "take:start");
  };

  const exportTake = async () => {
    const response = await fetch(`${SERVER_URL}/api/rooms/${encodeURIComponent(roomId)}/take`);
    const take = await response.json();
    const blob = new Blob([JSON.stringify(take, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pup-it-${roomId}-take.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activePerformers = useMemo(() => performerList(performers), [performers]);

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
            {["perform", "build"].map((item) => (
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
        </div>
      </header>

      <section
        className={`stage ${selectedScene.className}`}
        onPointerMove={handleStagePointerMove}
        onPointerLeave={handleStagePointerLeave}
      >
        <div className="horizonGuide" />
        <div className="setFloor" />
            {activePerformers.map((performer) => (
          <Puppet key={performer.id} performer={performer} isSelf={performer.id === selfId} />
        ))}
      </section>

      <aside className="controlDock">
        {mode === "perform" ? (
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
          />
        ) : (
          <CharacterEditor
            performer={self}
            onRigChange={updateCharacterRig}
            onStyleChange={updateCharacterStyle}
            onDesignChange={updateCharacterDesign}
            onRandomize={randomizeCharacterDesign}
          />
        )}

        <div className="dockGroup performerGroup">
          <h2>Performers</h2>
          {activePerformers.map((performer) => (
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
    </main>
  );
}

function PerformControls({
  scene,
  self,
  onSceneChange,
  onExpressionChange,
  onPoseChange,
  onIdleMotionChange,
  onMouthControlChange,
  mouthCameraActive,
  onMacroTrigger
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

function CharacterEditor({ performer, onRigChange, onStyleChange, onDesignChange, onRandomize }) {
  if (!performer) return null;

  const baseCharacter = getCatalogItem(characterCatalog, performer.character);
  const rig = { ...baseCharacter.rigConfig, ...performer.state.rigConfig };
  const stylePreset = performer.state.stylePreset || baseCharacter.stylePreset;
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
        <div className="segmented">
          {animationStyleCatalog.map((style) => (
            <button
              key={style.id}
              className={stylePreset === style.id ? "selected" : ""}
              onClick={() => onStyleChange(style.id)}
            >
              {style.name}
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
