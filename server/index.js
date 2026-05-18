import express from "express";
import http from "http";
import { existsSync } from "node:fs";
import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { checkDatabase, isDatabaseConfigured } from "./db.js";
import { renderWithHeadlessChromium } from "./renderWorker.js";
import {
  createRenderJob,
  getShow,
  getRenderJob,
  listEpisodes,
  listShows,
  updateEpisodeStatus,
  updateRenderJob,
  upsertEpisode,
  upsertShow
} from "./repositories/projectRepository.js";
import { createDoinkTvSubmissionPackage } from "../shared/production.js";
import {
  createStoredTake,
  createTakeExport,
  recordEvent,
  summarizeTake
} from "../shared/recorder.js";
import {
  createPerformer,
  createRoom,
  roomSnapshot,
  sanitizePerformerName,
  sanitizeRoomId
} from "../shared/schema.js";

const PORT = Number(process.env.PORT || 4111);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.resolve(__dirname, "../dist");
const renderStaticRoot = path.resolve(__dirname, "../renders");
const ROOM_IDLE_TTL_MS = Number(process.env.ROOM_IDLE_TTL_MS || 1000 * 60 * 60 * 3);
const MAX_ROOM_TAKES = Number(process.env.MAX_ROOM_TAKES || 25);
const MAX_MEMORY_RECORDS = Number(process.env.MAX_MEMORY_RECORDS || 100);
const MAX_RENDER_ARTIFACT_DIRS = Number(process.env.MAX_RENDER_ARTIFACT_DIRS || 50);
const RENDER_ARTIFACT_TTL_MS = Number(process.env.RENDER_ARTIFACT_TTL_MS || 1000 * 60 * 60 * 24 * 7);
const allowedOrigins = new Set(
  [
    CLIENT_ORIGIN,
    process.env.PUBLIC_BASE_URL,
    "http://127.0.0.1:5173",
    "http://localhost:5173"
  ]
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean)
);
const clientBundleAvailable = existsSync(path.join(distRoot, "index.html"));
let databaseHealthCache = { checkedAt: 0, value: { configured: isDatabaseConfigured(), ok: false } };

function isAllowedSocketOrigin(origin) {
  if (!origin || allowedOrigins.has(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return process.env.NODE_ENV === "production" && hostname.endsWith(".onrender.com");
  } catch {
    return false;
  }
}

const app = express();
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "5mb" }));
app.use(
  "/renders",
  express.static(renderStaticRoot, {
    etag: true,
    maxAge: "1h"
  })
);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      callback(null, isAllowedSocketOrigin(origin));
    },
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e7
});

const rooms = new Map();
const memoryRenderJobs = new Map();
const memoryDoinkSubmissions = new Map();

function trimMapToLimit(map, limit = MAX_MEMORY_RECORDS) {
  while (map.size > limit) {
    const oldestKey = map.keys().next().value;
    if (!oldestKey) break;
    map.delete(oldestKey);
  }
}

function touchRoom(room) {
  room.lastActiveAt = Date.now();
}

function pruneRooms(now = Date.now()) {
  for (const [roomId, room] of rooms.entries()) {
    if (room.performers.size > 0 || room.recording) continue;
    if (now - (room.lastActiveAt || now) > ROOM_IDLE_TTL_MS) rooms.delete(roomId);
  }
}

async function pruneRenderArtifacts(now = Date.now()) {
  try {
    const entries = await readdir(renderStaticRoot, { withFileTypes: true });
    const dirs = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const fullPath = path.join(renderStaticRoot, entry.name);
          const info = await stat(fullPath);
          return { name: entry.name, fullPath, mtimeMs: info.mtimeMs };
        })
    );
    const expired = dirs.filter((dir) => now - dir.mtimeMs > RENDER_ARTIFACT_TTL_MS);
    const overflow = dirs
      .filter((dir) => !expired.some((expiredDir) => expiredDir.name === dir.name))
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(MAX_RENDER_ARTIFACT_DIRS);
    await Promise.all(
      [...expired, ...overflow].map((dir) =>
        rm(dir.fullPath, { recursive: true, force: true })
      )
    );
  } catch (_error) {
    // Artifact cleanup should never block a render or health check.
  }
}

async function getCachedDatabaseHealth({ maxAgeMs = 30000 } = {}) {
  if (Date.now() - databaseHealthCache.checkedAt < maxAgeMs) return databaseHealthCache.value;
  let database = { configured: isDatabaseConfigured(), ok: false };
  try {
    database = await checkDatabase();
  } catch (_error) {
    database = { configured: true, ok: false };
  }
  databaseHealthCache = { checkedAt: Date.now(), value: database };
  return database;
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

async function persistRenderJob(job) {
  try {
    return await createRenderJob(job);
  } catch (error) {
    if (error?.code !== "DATABASE_NOT_CONFIGURED") throw error;
    const memoryJob = {
      id: makeId("render"),
      episodeId: job.episodeId || null,
      status: job.status || "queued",
      renderer: job.renderer || "browser-server",
      request: job.request || {},
      output: job.output || {},
      error: job.error || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      persistence: "memory"
    };
    memoryRenderJobs.set(memoryJob.id, memoryJob);
    trimMapToLimit(memoryRenderJobs);
    return memoryJob;
  }
}

async function persistRenderJobUpdate(job, patch) {
  try {
    const updated = await updateRenderJob(job.id, patch);
    if (updated) return updated;
  } catch (error) {
    if (error?.code !== "DATABASE_NOT_CONFIGURED") throw error;
  }
  const memoryJob = {
    ...job,
    ...patch,
    output: patch.output || job.output || {},
    error: patch.error || "",
    updatedAt: new Date().toISOString(),
    persistence: "memory"
  };
  memoryRenderJobs.set(memoryJob.id, memoryJob);
  trimMapToLimit(memoryRenderJobs);
  return memoryJob;
}

function handleApiError(res, error) {
  if (error?.code === "DATABASE_NOT_CONFIGURED") {
    res.status(503).json({
      error: "Database not configured",
      detail: "Set DATABASE_URL and run server/migrations/001_core_project_model.sql."
    });
    return;
  }

  if (error?.code === "INVALID_STATUS") {
    res.status(400).json({ error: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({ error: "Unexpected server error" });
}

function getRoom(roomId) {
  pruneRooms();
  if (!rooms.has(roomId)) {
    rooms.set(roomId, createRoom({ id: roomId }));
  }
  const room = rooms.get(roomId);
  touchRoom(room);
  return room;
}

io.on("connection", (socket) => {
  let activeRoomId = null;

  socket.on("room:join", ({ roomId, name, character, scene }) => {
    activeRoomId = sanitizeRoomId(roomId);
    const room = getRoom(activeRoomId);
    if (scene && room.performers.size === 0) {
      room.scene = scene;
    }

    const performer = createPerformer({
      id: socket.id,
      name,
      character,
      state: {
        blinkSeed: Math.floor(Math.random() * 2400)
      }
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

  socket.on("performer:configure", ({ name, character, state }) => {
    if (!activeRoomId) return;
    const room = getRoom(activeRoomId);
    const performer = room.performers.get(socket.id);
    if (!performer) return;

    performer.name = sanitizePerformerName(name || performer.name);
    performer.character = character || performer.character;
    performer.state = { ...performer.state, ...state };
    io.to(activeRoomId).emit("performer:configured", performer);
    recordEvent(room, { type: "performer:configured", performer });
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

  socket.on("take:start", (viewContext = {}) => {
    if (!activeRoomId) return;
    const room = getRoom(activeRoomId);
    room.recording = true;
    room.takeStartedAt = Date.now();
    room.takeViewContext = viewContext;
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
    const wasRecording = room.recording;
    let savedTake = null;

    room.recording = false;
    if (wasRecording) {
      savedTake = createStoredTake(room, room.takes.length + 1);
      room.takes.unshift(savedTake);
      room.takes = room.takes.slice(0, MAX_ROOM_TAKES);
    }

    io.to(activeRoomId).emit("take:status", {
      recording: false,
      takeStartedAt: room.takeStartedAt,
      savedTake
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
  pruneRooms();
  const room = rooms.get(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.json(createTakeExport(room));
});

app.get("/api/rooms/:roomId/takes", (req, res) => {
  pruneRooms();
  const room = rooms.get(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.json({
    roomId: room.id,
    takes: room.takes.map(summarizeTake)
  });
});

app.get("/api/rooms/:roomId/takes/:takeId", (req, res) => {
  pruneRooms();
  const room = rooms.get(req.params.roomId);
  const take = room?.takes.find((item) => item.id === req.params.takeId);
  if (!take) {
    res.status(404).json({ error: "Take not found" });
    return;
  }

  res.json(take);
});

app.get("/api/shows", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "private, max-age=10");
    res.json({ shows: await listShows({ limit: req.query.limit }) });
  } catch (error) {
    if (error?.code === "DATABASE_NOT_CONFIGURED") {
      res.json({ shows: [], persistence: "local" });
      return;
    }
    handleApiError(res, error);
  }
});

app.post("/api/shows", async (req, res) => {
  try {
    res.status(201).json({ show: await upsertShow(req.body) });
  } catch (error) {
    if (error?.code === "DATABASE_NOT_CONFIGURED") {
      res.json({ show: null, persistence: "local" });
      return;
    }
    handleApiError(res, error);
  }
});

app.put("/api/shows/:showId", async (req, res) => {
  try {
    res.json({ show: await upsertShow({ ...req.body, id: req.params.showId, slug: req.params.showId }) });
  } catch (error) {
    if (error?.code === "DATABASE_NOT_CONFIGURED") {
      res.json({ show: null, persistence: "local" });
      return;
    }
    handleApiError(res, error);
  }
});

app.get("/api/shows/:showId", async (req, res) => {
  try {
    const show = await getShow(req.params.showId);
    if (!show) {
      res.status(404).json({ error: "Show not found" });
      return;
    }
    res.json({ show });
  } catch (error) {
    if (error?.code === "DATABASE_NOT_CONFIGURED") {
      res.status(404).json({ error: "Show not found", persistence: "local" });
      return;
    }
    handleApiError(res, error);
  }
});

app.get("/api/shows/:showId/episodes", async (req, res) => {
  try {
    res.json({ episodes: await listEpisodes(req.params.showId) });
  } catch (error) {
    if (error?.code === "DATABASE_NOT_CONFIGURED") {
      res.json({ episodes: [], persistence: "local" });
      return;
    }
    handleApiError(res, error);
  }
});

app.post("/api/shows/:showId/episodes", async (req, res) => {
  try {
    const episode = await upsertEpisode(req.params.showId, req.body);
    if (!episode) {
      res.status(404).json({ error: "Show not found" });
      return;
    }
    res.status(201).json({ episode });
  } catch (error) {
    handleApiError(res, error);
  }
});

app.patch("/api/episodes/:episodeId/status", async (req, res) => {
  try {
    const episode = await updateEpisodeStatus(req.params.episodeId, req.body.status);
    if (!episode) {
      res.status(404).json({ error: "Episode not found" });
      return;
    }
    res.json({ episode });
  } catch (error) {
    handleApiError(res, error);
  }
});

app.post("/api/render-jobs", async (req, res) => {
  try {
    const request = req.body || {};
    const queuedJob = await persistRenderJob({
      episodeId: request.episodeId || null,
      status: "queued",
      renderer: request.renderer || "browser-server",
      request,
      output: {}
    });
    const runningJob = await persistRenderJobUpdate(queuedJob, { status: "running" });
    let completedJob;
    try {
      const output = await renderWithHeadlessChromium(request, runningJob.id);
      completedJob = await persistRenderJobUpdate(runningJob, {
        status: "succeeded",
        output
      });
    } catch (renderError) {
      completedJob = await persistRenderJobUpdate(runningJob, {
        status: "failed",
        output: {},
        error: renderError.message || "Headless render failed."
      });
    }

    res.status(202).json({
      renderJob: completedJob,
      next: {
        pollUrl: `/api/render-jobs/${completedJob.id}`,
        submitUrl: "/api/doinktv/submissions"
      }
    });
    void pruneRenderArtifacts();
  } catch (error) {
    handleApiError(res, error);
  }
});

app.get("/api/render-jobs/:jobId", async (req, res) => {
  try {
    let renderJob = null;
    try {
      renderJob = await getRenderJob(req.params.jobId);
    } catch (error) {
      if (error?.code !== "DATABASE_NOT_CONFIGURED") throw error;
    }
    renderJob = renderJob || memoryRenderJobs.get(req.params.jobId);
    if (!renderJob) {
      res.status(404).json({ error: "Render job not found" });
      return;
    }
    res.json({ renderJob });
  } catch (error) {
    handleApiError(res, error);
  }
});

app.post("/api/doinktv/submissions", (req, res) => {
  const body = req.body || {};
  const project = body.project || body.package?.project || null;
  const submission = body.submission || body.package || body;
  const submissionPackage = project
    ? createDoinkTvSubmissionPackage({
        project,
        submission,
        selectedTake: body.selectedTake || null,
        previewVideoFileName: body.previewVideoFileName || body.renderJob?.output?.videoPath || null,
        projectPackageFileName: body.projectPackageFileName || null
      })
    : {
        ...submission,
        schemaVersion: submission.schemaVersion || "pup-it.doinktv-submission.v2",
        targetChannel: "DoinkTV",
        hostSite: "chillnet.me",
        status: "submitted_for_review",
        submittedAt: submission.submittedAt || new Date().toISOString()
      };
  const submissionRecord = {
    id: makeId("doinktv"),
    status: "submitted_for_review",
    receivedAt: new Date().toISOString(),
    renderJobId: body.renderJob?.id || body.renderJobId || null,
    package: submissionPackage
  };
  memoryDoinkSubmissions.set(submissionRecord.id, submissionRecord);
  trimMapToLimit(memoryDoinkSubmissions);
  res.status(202).json({
    submission: submissionRecord,
    review: {
      status: "submitted_for_review",
      adminQueue: "DoinkTV",
      message: "Submission accepted by the Pup-It integration endpoint."
    }
  });
});

app.get("/health", async (_req, res) => {
  const database = await getCachedDatabaseHealth();
  res.json({
    ok: true,
    service: "pup-it",
    clientBundle: clientBundleAvailable,
    database,
    renderArtifacts: "/renders",
    artifactPolicy: {
      maxDirectories: MAX_RENDER_ARTIFACT_DIRS,
      ttlMs: RENDER_ARTIFACT_TTL_MS
    },
    version: process.env.RENDER_GIT_COMMIT || process.env.npm_package_version || "local"
  });
});

app.get("/ready", async (_req, res) => {
  const database = await getCachedDatabaseHealth();
  const ready = clientBundleAvailable && (!database.configured || database.ok);
  res.status(ready ? 200 : 503).json({
    ready,
    clientBundle: clientBundleAvailable,
    database
  });
});

if (clientBundleAvailable) {
  app.use(
    express.static(distRoot, {
      etag: true,
      maxAge: "1y",
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      }
    })
  );
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/socket.io/") || req.path.startsWith("/renders/")) {
      next();
      return;
    }
    res.sendFile(path.join(distRoot, "index.html"));
  });
}

server.listen(PORT, () => {
  console.log(`Pup-It realtime server listening on http://localhost:${PORT}`);
});
