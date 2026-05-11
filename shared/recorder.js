import { schemaVersion } from "./schema.js";

export function recordEvent(room, event, now = Date.now()) {
  if (!room.recording) return;
  room.events.push({
    ...event,
    at: now - room.takeStartedAt
  });
}

export function buildAudioTracks(audioChunks) {
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

export function createTakeExport(room, exportedAt = new Date().toISOString()) {
  return {
    schemaVersion,
    roomId: room.id,
    scene: room.scene,
    takeStartedAt: room.takeStartedAt,
    exportedAt,
    performers: [...room.performers.values()].map((performer) => ({
      id: performer.id,
      name: performer.name,
      character: performer.character,
      pose: performer.state.pose,
      idleMotion: performer.state.idleMotion,
      rigConfig: performer.state.rigConfig,
      stylePreset: performer.state.stylePreset
    })),
    tracks: {
      motion: room.events,
      audio: buildAudioTracks(room.audio)
    },
    events: room.events,
    audioTracks: buildAudioTracks(room.audio),
    audio: room.audio
  };
}
