import express from "express";
import http from "http";
import { Server } from "socket.io";
import { createTakeExport, recordEvent } from "../shared/recorder.js";
import {
  createPerformer,
  createRoom,
  roomSnapshot,
  sanitizeRoomId
} from "../shared/schema.js";

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
    rooms.set(roomId, createRoom({ id: roomId }));
  }
  return rooms.get(roomId);
}

io.on("connection", (socket) => {
  let activeRoomId = null;

  socket.on("room:join", ({ roomId, name, character }) => {
    activeRoomId = sanitizeRoomId(roomId);
    const room = getRoom(activeRoomId);

    const performer = createPerformer({
      id: socket.id,
      name,
      character
    });

    room.performers.set(socket.id, performer);
    socket.join(activeRoomId);
    socket.emit("room:snapshot", roomSnapshot(room));
    socket.to(activeRoomId).emit("performer:joined", performer);
    recordEvent(room, { type: "performer:joined", performer });
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
    recordEvent(room, {
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
    recordEvent(room, { type: "scene:set", scene });
  });

  socket.on("macro:trigger", (macro) => {
    if (!activeRoomId) return;
    const room = getRoom(activeRoomId);
    socket.to(activeRoomId).emit("macro:trigger", {
      performerId: socket.id,
      macro
    });
    recordEvent(room, { type: "macro:trigger", performerId: socket.id, macro });
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
    recordEvent(room, { type: "performer:left", performerId: socket.id });
  });
});

app.get("/api/rooms/:roomId/take", (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.json(createTakeExport(room));
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

server.listen(PORT, () => {
  console.log(`Pup-It realtime server listening on http://localhost:${PORT}`);
});
