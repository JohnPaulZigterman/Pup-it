import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import {
  Circle,
  Mic,
  MicOff,
  Palette,
  Radio,
  Square,
  Theater,
  Video,
  Wand2
} from "lucide-react";
import {
  characterCatalog,
  animationStyleCatalog,
  bodyShapeCatalog,
  expressionCatalog,
  getCatalogItem,
  idleMotionCatalog,
  limbStyleCatalog,
  macroCatalog,
  mouthStyleCatalog,
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

function App() {
  const socketRef = useRef(null);
  const audioRef = useRef({ context: null, sequence: 0, recorder: null, stream: null });
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState(defaultRoomId);
  const [name, setName] = useState(`Performer ${Math.ceil(Math.random() * 99)}`);
  const [character, setCharacter] = useState(defaultCharacterId);
  const [scene, setScene] = useState(sceneCatalog[0].id);
  const [performers, setPerformers] = useState({});
  const [selfId, setSelfId] = useState(null);
  const [recording, setRecording] = useState(false);
  const [micLive, setMicLive] = useState(false);
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

      <section className={`stage ${selectedScene.className}`}>
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
            onMacroTrigger={triggerMacro}
          />
        ) : (
          <CharacterEditor
            performer={self}
            onRigChange={updateCharacterRig}
            onStyleChange={updateCharacterStyle}
          />
        )}

        <div className="dockGroup performerGroup">
          <h2>Performers</h2>
          {activePerformers.map((performer) => (
            <div className="performerRow" key={performer.id}>
              <span>{performer.name}</span>
              <small>{getCatalogItem(characterCatalog, performer.character).name}</small>
            </div>
          ))}
        </div>
      </aside>
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

function CharacterEditor({ performer, onRigChange, onStyleChange }) {
  if (!performer) return null;

  const baseCharacter = getCatalogItem(characterCatalog, performer.character);
  const rig = { ...baseCharacter.rigConfig, ...performer.state.rigConfig };
  const stylePreset = performer.state.stylePreset || baseCharacter.stylePreset;

  return (
    <div className="characterEditor">
      <div className="dockGroup">
        <h2>Character Editor</h2>
        <div className="editorHeader">
          <Palette size={18} />
          <div>
            <strong>{baseCharacter.name}</strong>
            <small>Live rig overrides for this performer</small>
          </div>
        </div>
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
