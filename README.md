# Pup-It

Pup-It is a browser-based prototype for collaborative live puppet animation. The MVP is built around real-time performance: multiple users join a room, control characters together, record movement events, relay microphone audio chunks, switch scenes, and trigger simple animation macros.

The current visual direction favors bright handmade cartoons: simple shapes, cozy surreal palettes, soft ink lines, and intentionally odd character designs.

## MVP Loop

- Join the same room from two browser tabs or machines.
- Move your puppet with `WASD` or arrow keys.
- Move toward the horizon to automatically shrink the puppet, or toward camera to enlarge it.
- Use `Q` and `E` for small scale-trim adjustments when a shot needs a cheat.
- Change expressions, scenes, and macros from the control dock.
- Use pose presets and idle modes to add acting beats, blinking, and breathing without hand-animating.
- Drive body movement with the keyboard and mouth movement with either mouse position or webcam capture.
- Switch to Build mode to name, color, randomize, and reshape an original character.
- Style presets act as adapters, so the same character design can translate across simple doodle, chibi, sitcom-line, minimal comic, and flat paper looks.
- Start a take to record movement events and relayed audio chunks.
- Export the take as JSON with separate audio tracks for each character/performer.

## Development

```bash
npm install
npm run dev
```

The client runs on Vite's default port, usually `http://localhost:5173`.
The realtime server runs on `http://localhost:4111`.

## Postgres Persistence

Pup-It is set up to use Postgres for durable show and episode data while keeping live performance rooms in memory for fast realtime puppeteering.

Set `DATABASE_URL`, then run the migration:

```bash
$env:DATABASE_URL="postgres://user:password@localhost:5432/pup_it"
npm run db:migrate
npm run dev
```

The current persisted API surface is intentionally small and expandable:

- `GET /api/shows`
- `POST /api/shows`
- `PUT /api/shows/:showId`
- `GET /api/shows/:showId`
- `GET /api/shows/:showId/episodes`
- `POST /api/shows/:showId/episodes`
- `PATCH /api/episodes/:episodeId/status`

If `DATABASE_URL` is not configured, the app still runs and show saving falls back to browser storage.

## Architecture Direction

- `shared/` contains data contracts and reusable logic used by both browser and server.
- `src/engine/` owns performance state changes such as movement and local performer updates.
- `src/renderer/` owns visual puppet rendering so new looks can be swapped in later.
- `src/modules/` is the early registry for workflow modes and future plug-in style tools.
- `server/` owns realtime rooms, recording sessions, and export endpoints.
- `server/repositories/` owns persistence boundaries so Postgres can grow without leaking SQL through the app.
- `server/migrations/` owns database schema changes.

The intended growth pattern is to add capabilities as modules around stable schemas, not to keep expanding one large app file.

## Near-Term Roadmap

- Timeline playback and editable motion curves.
- Character rig editor with reusable body parts.
- WebRTC audio for lower-latency live monitoring.
- Persistent projects, scenes, characters, and takes.
- Export to video through a render pipeline.
