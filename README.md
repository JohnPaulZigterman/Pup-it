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

Copy `.env.example` to `.env` if you need local overrides:

```bash
VITE_SERVER_URL=http://localhost:4111
VITE_DOINKTV_SUBMISSION_URL=
```

`VITE_DOINKTV_SUBMISSION_URL` is optional. When it is empty, the app downloads a DoinkTV submission package JSON for admin handoff. When it points to an intake endpoint, the **Submit to DoinkTV** button posts that package directly.

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

## Render Deployment

The repo includes `render.yaml` for a Render Blueprint deployment with one Node web service and one Postgres database.

Recommended Render settings:

- Build command: `npm ci && npm run render:build`
- Pre-deploy command: `npm run db:migrate`
- Start command: `npm start`
- Health check path: `/health`

The production server serves the built Vite app from `dist/`, Socket.IO, API routes, render artifacts under `/renders`, and the SPA fallback from the same origin. In production, the browser client uses the deployed origin by default, so `VITE_SERVER_URL` can stay empty for a single Render web service.

Important environment variables:

- `DATABASE_URL`: supplied by the Render Postgres database in the Blueprint.
- `CLIENT_ORIGIN`: optional comma-separated allowed browser origins. Set this to the final Render URL or your custom domain when known.
- `PUBLIC_BASE_URL`: optional deployed public URL, useful when a custom domain is attached.
- `VITE_DOINKTV_SUBMISSION_URL`: optional external DoinkTV intake endpoint. Leave empty to use Pup-It's built-in `/api/doinktv/submissions` handoff.
- `PGSSLMODE=require`: optional when connecting to an external Postgres URL that requires SSL.
- `PLAYWRIGHT_BROWSERS_PATH=0`: recommended on Render so Chromium is installed into the deployed app bundle.
- `PLAYWRIGHT_CHROMIUM_ARGS`: optional space-separated Chromium launch flags. Production defaults to `--no-sandbox --disable-setuid-sandbox`.

Backend rendering depends on Playwright Chromium and `ffmpeg-static`. `npm run render:build` builds the Vite client and installs the Chromium browser binary needed by `server/renderWorker.js`.

Health endpoints:

- `GET /health`: deployment health check. It stays 200 even if Postgres is not configured, so the app can boot with local/browser fallback.
- `GET /ready`: stricter readiness check. It returns 503 if the client bundle is missing or a configured database is unavailable.

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
