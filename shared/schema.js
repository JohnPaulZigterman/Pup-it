export const schemaVersion = "pup-it.take.v1";

export const defaultRoomId = "demo";
export const defaultSceneId = "studio";
export const defaultCharacterId = "bear";

export function sanitizeRoomId(roomId) {
  return (roomId || defaultRoomId).trim().slice(0, 40) || defaultRoomId;
}

export function sanitizePerformerName(name) {
  return (name || "Performer").trim().slice(0, 32) || "Performer";
}

export function createPerformerState(overrides = {}) {
  return {
    x: 48,
    y: 68,
    scale: 1,
    facing: 1,
    expression: "neutral",
    speaking: false,
    mouthOpen: 0,
    mouthControl: "audio",
    walking: false,
    motionFeel: "smooth",
    motionVx: 0,
    motionVy: 0,
    groundSpeed: 0,
    travelLean: 0,
    anticipationLean: 0,
    anticipationSquash: 1,
    depthProgress: 0.65,
    behaviorPreset: "none",
    pose: "neutral",
    idleMotion: "alive",
    blinkSeed: 0,
    macro: null,
    rigConfig: null,
    stylePreset: null,
    characterDesign: null,
    characterParts: null,
    ...overrides
  };
}

export function createPerformer({ id, name, character = defaultCharacterId, state = {} }) {
  return {
    id,
    name: sanitizePerformerName(name),
    character,
    state: createPerformerState(state)
  };
}

export function createRoom({ id, scene = defaultSceneId }) {
  return {
    id,
    scene,
    performers: new Map(),
    recording: false,
    takeStartedAt: null,
    events: [],
    audio: [],
    takes: []
  };
}

export function serializePerformer(performer) {
  return {
    id: performer.id,
    name: performer.name,
    character: performer.character,
    state: performer.state
  };
}

export function roomSnapshot(room) {
  return {
    id: room.id,
    scene: room.scene,
    recording: room.recording,
    takeStartedAt: room.takeStartedAt,
    performers: [...room.performers.values()].map(serializePerformer)
  };
}
