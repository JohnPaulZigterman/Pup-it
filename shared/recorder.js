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
    cameraShot: room.takeViewContext?.cameraShot || "wide",
    lightingPreset: room.takeViewContext?.lightingPreset || "scene",
    backgroundTheme: room.takeViewContext?.backgroundTheme || "scene-native",
    objectStyle: room.takeViewContext?.objectStyle || "match-character",
    sceneObjects: room.takeViewContext?.sceneObjects || [],
    floorMarks: room.takeViewContext?.floorMarks || [],
    directorCamera: room.takeViewContext?.directorCamera || null,
    takeStartedAt: room.takeStartedAt,
    exportedAt,
    performers: [...room.performers.values()].map((performer) => ({
      id: performer.id,
      name: performer.name,
      character: performer.character,
      pose: performer.state.pose,
      idleMotion: performer.state.idleMotion,
      motionFeel: performer.state.motionFeel,
      behaviorPreset: performer.state.behaviorPreset,
      mouthControl: performer.state.mouthControl,
      rigConfig: performer.state.rigConfig,
      stylePreset: performer.state.stylePreset,
      characterDesign: performer.state.characterDesign,
      characterParts: performer.state.characterParts
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

export function getTakeDuration(take) {
  const motionMax = Math.max(0, ...take.tracks.motion.map((event) => event.at || 0));
  const audioMax = Math.max(
    0,
    ...take.tracks.audio.flatMap((track) => track.chunks.map((chunk) => chunk.at || 0))
  );
  return Math.max(motionMax, audioMax);
}

export function summarizeTake(take) {
  return {
    id: take.id,
    name: take.name,
    schemaVersion: take.schemaVersion,
    roomId: take.roomId,
    scene: take.scene,
    cameraShot: take.cameraShot || "wide",
    lightingPreset: take.lightingPreset || "scene",
    backgroundTheme: take.backgroundTheme || "scene-native",
    objectStyle: take.objectStyle || "match-character",
    sceneObjectCount: take.sceneObjects?.length || 0,
    directorCamera: take.directorCamera || null,
    takeStartedAt: take.takeStartedAt,
    exportedAt: take.exportedAt,
    durationMs: take.durationMs ?? getTakeDuration(take),
    performerCount: take.performers.length,
    motionEventCount: take.tracks.motion.length,
    audioTrackCount: take.tracks.audio.length
  };
}

export function createStoredTake(room, takeNumber = 1) {
  const take = createTakeExport(room);
  const durationMs = getTakeDuration(take);

  return {
    ...take,
    id: `take-${Date.now()}`,
    name: `${room.scene} take ${takeNumber}`,
    durationMs
  };
}
