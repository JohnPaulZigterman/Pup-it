# Pup-It

Pup-It is a browser-based prototype for collaborative live puppet animation. The MVP is built around real-time performance: multiple users join a room, control characters together, record movement events, relay microphone audio chunks, switch scenes, and trigger simple animation macros.

## MVP Loop

- Join the same room from two browser tabs or machines.
- Move your puppet with `WASD` or arrow keys.
- Move toward the horizon to automatically shrink the puppet, or toward camera to enlarge it.
- Use `Q` and `E` for small scale-trim adjustments when a shot needs a cheat.
- Change expressions, scenes, and macros from the control dock.
- Start a take to record movement events and relayed audio chunks.
- Export the take as JSON with separate audio tracks for each character/performer.

## Development

```bash
npm install
npm run dev
```

The client runs on Vite's default port, usually `http://localhost:5173`.
The realtime server runs on `http://localhost:4111`.

## Near-Term Roadmap

- Timeline playback and editable motion curves.
- Character rig editor with reusable body parts.
- WebRTC audio for lower-latency live monitoring.
- Persistent projects, scenes, characters, and takes.
- Export to video through a render pipeline.
