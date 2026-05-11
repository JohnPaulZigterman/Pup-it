import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import {
  Circle,
  Mic,
  MicOff,
  Radio,
  Square,
  Theater,
  Video,
  Wand2
} from "lucide-react";
import "./styles.css";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4111";

const characters = [
  { id: "bean", name: "Bean", color: "#f76f53", accent: "#fee17a" },
  { id: "noodle", name: "Noodle", color: "#57a773", accent: "#f7f1d1" },
  { id: "square", name: "Square", color: "#5d8bf4", accent: "#ffb7c3" },
  { id: "moon", name: "Moon", color: "#d4a5ff", accent: "#1f2030" }
];

const scenes = [
  { id: "studio", name: "Studio", className: "sceneStudio" },
  { id: "street", name: "Street", className: "sceneStreet" },
  { id: "space", name: "Space", className: "sceneSpace" }
];

const macros = [
  { id: "wave", name: "Wave" },
  { id: "hop", name: "Hop" },
  { id: "squash", name: "Squash" },
  { id: "panic", name: "Panic" }
];

const depth = {
  horizon: 20,
  foreground: 82,
  minScale: 0.42,
  maxScale: 1.46
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getDepthScale(y, trim = 1) {
  const progress = clamp((y - depth.horizon) / (depth.foreground - depth.horizon), 0, 1);
  const eased = Math.pow(progress, 1.18);
  return (depth.minScale + (depth.maxScale - depth.minScale) * eased) * trim;
}

function App() {
  const socketRef = useRef(null);
  const audioRef = useRef({ context: null, sequence: 0, recorder: null, stream: null });
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("demo");
  const [name, setName] = useState(`Performer ${Math.ceil(Math.random() * 99)}`);
  const [character, setCharacter] = useState(characters[0].id);
  const [scene, setScene] = useState(scenes[0].id);
  const [performers, setPerformers] = useState({});
  const [selfId, setSelfId] = useState(null);
  const [recording, setRecording] = useState(false);
  const [micLive, setMicLive] = useState(false);
  const [status, setStatus] = useState("Create or join a room to start puppeteering.");

  const self = performers[selfId];
  const selectedScene = scenes.find((item) => item.id === scene) || scenes[0];

  useEffect(() => {
    const socket = io(SERVER_URL, { autoConnect: false });
    socketRef.current = socket;

    socket.on("connect", () => setSelfId(socket.id));
    socket.on("room:snapshot", (snapshot) => {
      setScene(snapshot.scene);
      setRecording(snapshot.recording);
      setPerformers(Object.fromEntries(snapshot.performers.map((p) => [p.id, p])));
      setJoined(true);
      setStatus(`Live in room "${snapshot.id}". Open another tab to test multiplayer.`);
    });
    socket.on("performer:joined", (performer) => {
      setPerformers((current) => ({ ...current, [performer.id]: performer }));
    });
    socket.on("performer:left", (id) => {
      setPerformers((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    });
    socket.on("performer:update", ({ id, state }) => {
      setPerformers((current) => ({
        ...current,
        [id]: current[id] ? { ...current[id], state } : current[id]
      }));
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

        const state = performer.state;
        let dx = 0;
        let dy = 0;
        let scale = state.scale;

        if (pressed.has("ArrowLeft") || pressed.has("a")) dx -= 1.2;
        if (pressed.has("ArrowRight") || pressed.has("d")) dx += 1.2;
        if (pressed.has("ArrowUp") || pressed.has("w")) dy -= 1.2;
        if (pressed.has("ArrowDown") || pressed.has("s")) dy += 1.2;
        if (pressed.has("q")) scale -= 0.005;
        if (pressed.has("e")) scale += 0.005;

        if (!dx && !dy && scale === state.scale) return current;

        const nextState = {
          ...state,
          x: clamp(state.x + dx, 5, 92),
          y: clamp(state.y + dy, depth.horizon, depth.foreground),
          scale: clamp(scale, 0.82, 1.18),
          facing: dx === 0 ? state.facing : dx > 0 ? 1 : -1
        };

        socketRef.current.emit("performer:update", nextState);
        return {
          ...current,
          [selfId]: { ...performer, state: nextState }
        };
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
      return {
        ...current,
        [selfId]: { ...performer, state: nextState }
      };
    });
  };

  const setExpression = (expression) => updateSelf({ expression });

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
      return {
        ...current,
        [performerId]: { ...performer, state: { ...performer.state, macro } }
      };
    });
    window.setTimeout(() => {
      setPerformers((current) => {
        const performer = current[performerId];
        if (!performer) return current;
        return {
          ...current,
          [performerId]: { ...performer, state: { ...performer.state, macro: null } }
        };
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

  const performerList = useMemo(() => Object.values(performers), [performers]);

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
                {characters.map((item) => (
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
        {performerList.map((performer) => (
          <Puppet key={performer.id} performer={performer} isSelf={performer.id === selfId} />
        ))}
      </section>

      <aside className="controlDock">
        <div className="dockGroup">
          <h2>Scene</h2>
          <div className="segmented">
            {scenes.map((item) => (
              <button
                key={item.id}
                className={scene === item.id ? "selected" : ""}
                onClick={() => changeScene(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div className="dockGroup">
          <h2>Expression</h2>
          <div className="segmented">
            {["neutral", "happy", "mad", "weird"].map((expression) => (
              <button
                key={expression}
                className={self?.state.expression === expression ? "selected" : ""}
                onClick={() => setExpression(expression)}
              >
                {expression}
              </button>
            ))}
          </div>
        </div>

        <div className="dockGroup">
          <h2>Macros</h2>
          <div className="macroGrid">
            {macros.map((macro) => (
              <button key={macro.id} onClick={() => triggerMacro(macro.id)}>
                <Wand2 size={16} />
                {macro.name}
              </button>
            ))}
          </div>
        </div>

        <div className="dockGroup performerGroup">
          <h2>Performers</h2>
          {performerList.map((performer) => (
            <div className="performerRow" key={performer.id}>
              <span>{performer.name}</span>
              <small>{characters.find((item) => item.id === performer.character)?.name}</small>
            </div>
          ))}
        </div>
      </aside>
    </main>
  );
}

function Puppet({ performer, isSelf }) {
  const character = characters.find((item) => item.id === performer.character) || characters[0];
  const { state } = performer;
  const scale = getDepthScale(state.y, state.scale);
  const face = {
    neutral: ["•", "•", "—"],
    happy: ["^", "^", "⌣"],
    mad: [">", "<", "—"],
    weird: ["o", "O", "~"]
  }[state.expression || "neutral"];

  return (
    <div
      className={`puppet ${state.macro ? `macro-${state.macro}` : ""} ${isSelf ? "self" : ""}`}
      style={{
        left: `${state.x}%`,
        top: `${state.y}%`,
        zIndex: Math.round(state.y * 10),
        transform: `translate(-50%, -100%) scale(${scale})`
      }}
    >
      <div className="nameTag">{performer.name}</div>
      <div
        className="puppetBody"
        style={{
          "--puppet": character.color,
          "--accent": character.accent,
          "--facing": state.facing
        }}
      >
        <div className={`mouth ${state.speaking ? "talking" : ""}`}>{face[2]}</div>
        <span className="eye left">{face[0]}</span>
        <span className="eye right">{face[1]}</span>
      </div>
      <div className="shadow" />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
