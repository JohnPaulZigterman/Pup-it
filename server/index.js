import express from "express";
import http from "http";
import { Server } from "socket.io";

const PORT = Number(process.env.PORT || 4111);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [CLIENT_ORIGIN, "http://127.0.0.1:5173"],
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e7
});

const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      scene: "studio",
      performers: new Map(),
      recording: false,
      takeStartedAt: null,
      events: [],
      audio: []
    });
  }
  return rooms.get(roomId);
}

function roomSnapshot(room) {
  return {
    id: room.id,
    scene: room.scene,
    recording: room.recording,
    takeStartedAt: room.takeStartedAt,
    performers: [...room.performers.values()].map((performer) => ({
      id: performer.id,
      name: performer.name,
      character: performer.character,
      state: performer.state
    }))
  };
}

function record(room, event) {
  if (!room.recording) return;
  room.events.push({
    ...event,
    at: Date.now() - room.takeStartedAt
  });
}

function buildAudioTracks(audioChunks) {
  const tracks = new Map();

  for (const chunk of audioChunks) {
    const trackId = `${chunk.performerId}:${chunk.character || "unknown"}`;
    if (!tracks.has(trackId)) {
      tracks.set(trackId, {
        id: trackId,
        performerId: chunk.performerId,
        performerName: chunk.performerName,
        character: chunk.character || "unknown",
        mimeType: chunk.mimeType,
        chunks: []
      });
    }

    const track = tracks.get(trackId);
    track.chunks.push({
      sequence: chunk.sequence,
      at: chunk.at,
      data: chunk.data
    });
  }

  return [...tracks.values()].map((track) => ({
    ...track,
    chunks: track.chunks.sort((a, b) => a.sequence - b.sequence)
  }));
}

io.on("connection", (socket) => {
  let activeRoomId = null;

  socket.on("room:join", ({ roomId, name, character }) => {
    activeRoomId = (roomId || "demo").trim().slice(0, 40) || "demo";
    const room = getRoom(activeRoomId);

    const performer = {
      id: socket.id,
      name: (name || "Performer").trim().slice(0, 32),
      character: character || "bean",
      state: {
        x: 48,
        y: 60,
        scale: 1,
        facing: 1,
        expression: "neutral",
        speaking: false,
        macro: null
      }
    };

    room.performers.set(socket.id, performer);
    socket.join(activeRoomId);
    socket.emit("room:snapshot", roomSnapshot(room));
    socket.to(activeRoomId).emit("performer:joined", performer);
    record(room, { type: "performer:joined", performer });
  });

  socket.on("performer:update", (state) => {
    if (!activeRoomId) return;
    const room = getRoom(activeRoomId);
    const performer = room.performers.get(socket.id);
    if (!performer) return;

    performer.state = { ...performer.state, ...state };
    socket.to(activeRoomId).emit("performer:update", {
      id: socket.id,
      state: performer.state
    });
    record(room, {
      type: "performer:update",
      performerId: socket.id,
      state: performer.state
    });
  });

  socket.on("scene:set", (scene) => {
    if (!activeRoomId) return;
    const room = getRoom(activeRoomId);
    room.scene = scene;
    io.to(activeRoomId).emit("scene:set", scene);
    record(room, { type: "scene:set", scene });
  });

  socket.on("macro:trigger", (macro) => {
    if (!activeRoomId) return;
    const room = getRoom(activeRoomId);
    socket.to(activeRoomId).emit("macro:trigger", {
      performerId: socket.id,
      macro
    });
    record(room, { type: "macro:trigger", performerId: socket.id, macro });
  });

  socket.on("take:start", () => {
    if (!activeRoomId) return;
    const room = getRoom(activeRoomId);
    room.recording = true;
    room.takeStartedAt = Date.now();
    room.events = [];
    room.audio = [];
    io.to(activeRoomId).emit("take:status", {
      recording: true,
      takeStartedAt: room.takeStartedAt
    });
  });

  socket.on("take:stop", () => {
    if (!activeRoomId) return;
    const room = getRoom(activeRoomId);
    room.recording = false;
    io.to(activeRoomId).emit("take:status", {
      recording: false,
      takeStartedAt: room.takeStartedAt
    });
  });

  socket.on("audio:chunk", ({ buffer, mimeType, sequence }) => {
    if (!activeRoomId || !buffer) return;
    const room = getRoom(activeRoomId);
    const performer = room.performers.get(socket.id);
    const payload = {
      performerId: socket.id,
      performerName: performer?.name || "Performer",
      character: performer?.character || "unknown",
      mimeType,
      sequence,
      at: room.takeStartedAt ? Date.now() - room.takeStartedAt : 0,
      data: Buffer.from(buffer).toString("base64")
    };
    if (room.recording) room.audio.push(payload);
    socket.to(activeRoomId).emit("audio:chunk", payload);
  });

  socket.on("disconnect", () => {
    if (!activeRoomId) return;
    const room = getRoom(activeRoomId);
    room.performers.delete(socket.id);
    socket.to(activeRoomId).emit("performer:left", socket.id);
    record(room, { type: "performer:left", performerId: socket.id });
  });
});

app.get("/api/rooms/:roomId/take", (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.json({
    roomId: room.id,
    scene: room.scene,
    takeStartedAt: room.takeStartedAt,
    exportedAt: new Date().toISOString(),
    events: room.events,
    audioTracks: buildAudioTracks(room.audio),
    audio: room.audio
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

server.listen(PORT, () => {
  console.log(`Pup-It realtime server listening on http://localhost:${PORT}`);
});
