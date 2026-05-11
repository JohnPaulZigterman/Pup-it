export const cameraShotCatalog = [
  {
    id: "wide",
    name: "Wide",
    description: "Full stage, best for blocking and group movement.",
    className: "shot-wide"
  },
  {
    id: "two-shot",
    name: "Two Shot",
    description: "A tighter comedy setup for two performers.",
    className: "shot-two-shot"
  },
  {
    id: "close",
    name: "Close",
    description: "Expression-forward framing for dialogue and reactions.",
    className: "shot-close"
  },
  {
    id: "reaction",
    name: "Reaction",
    description: "A punch-in that makes small face changes read.",
    className: "shot-reaction"
  }
];

export const lightingPresetCatalog = [
  {
    id: "scene",
    name: "Scene",
    description: "Use the set's built-in lighting mood.",
    className: "light-scene"
  },
  {
    id: "cozy",
    name: "Cozy",
    description: "Warm, forgiving light for friendly dialogue.",
    className: "light-cozy"
  },
  {
    id: "flat-tv",
    name: "Flat TV",
    description: "Clean broadcast light with soft shadows.",
    className: "light-flat-tv"
  },
  {
    id: "dramatic",
    name: "Dramatic",
    description: "Harder rim light for reveals, arguments, and weird beats.",
    className: "light-dramatic"
  },
  {
    id: "night",
    name: "Night",
    description: "Cool, moody light for exterior or late scenes.",
    className: "light-night"
  }
];

export const directorActionCatalog = [
  {
    id: "reset-self",
    name: "Reset Self",
    cameraShot: "wide",
    selfState: { x: 48, y: 60, scale: 1, pose: "neutral", expression: "neutral" }
  },
  {
    id: "dialogue-ready",
    name: "Dialogue",
    cameraShot: "two-shot",
    selfState: { y: 62, pose: "listen", expression: "neutral", idleMotion: "subtle" }
  },
  {
    id: "reaction",
    name: "Reaction",
    soundSting: "button",
    cameraShot: "reaction",
    selfState: { pose: "surprise", expression: "weird", mouthOpen: 0.18 }
  },
  {
    id: "button",
    name: "Button",
    soundSting: "thump",
    cameraShot: "close",
    lightingPreset: "dramatic",
    selfState: { pose: "deadpan", expression: "neutral", mouthOpen: 0 }
  },
  {
    id: "prop-reveal",
    name: "Reveal Prop",
    soundSting: "pop",
    propCue: "reveal",
    cameraShot: "close"
  },
  {
    id: "lights-shift",
    name: "Lights Shift",
    soundSting: "zap",
    lightingPreset: "dramatic"
  },
  {
    id: "exit-beat",
    name: "Exit Beat",
    soundSting: "drop",
    selfState: { x: 92, pose: "deadpan", expression: "neutral", walking: false }
  }
];

export function createTimelineClip({ source, index }) {
  return {
    id: `clip-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    sourceType: source.sourceType,
    sourceId: source.id,
    title: source.title || source.name || `Clip ${index}`,
    scene: source.scene,
    shot: source.shot || "wide",
    lightingPreset: source.lightingPreset || "scene",
    backgroundTheme: source.backgroundTheme || "scene-native",
    objectStyle: source.objectStyle || "match-character",
    duration: source.duration || source.durationMs || 5000,
    notes: source.caption || ""
  };
}

export function createProjectExport({
  roomId,
  showName,
  scene,
  perspective,
  cameraShot,
  lightingPreset,
  backgroundTheme,
  objectStyle,
  episodeStatus = "draft",
  sceneObjects = [],
  sceneSets = [],
  floorMarks = [],
  assetReferences = [],
  storyboardPanels,
  timeline,
  takes,
  exportedAt = new Date().toISOString()
}) {
  const credits = [
    ...assetReferences.map((asset) => ({
      name: asset.name,
      sourceUrl: asset.sourceUrl,
      license: asset.license,
      attribution: asset.attribution || asset.license || "Check source before publishing."
    })),
    ...sceneObjects
      .filter((object) => object.license || object.attribution)
      .map((object) => ({
        name: object.name,
        sourceUrl: object.sourceUrl,
        license: object.license || "Show Built",
        attribution: object.attribution || "Created inside Pup-It."
      }))
  ];
  const captions = storyboardPanels.map((panel, index) => ({
    index: index + 1,
    title: panel.title,
    text: panel.caption || panel.notes || "",
    duration: panel.duration || "0:05"
  }));
  const thumbnail = storyboardPanels[0]
    ? {
        source: "storyboard-panel",
        panelId: storyboardPanels[0].id,
        title: storyboardPanels[0].title
      }
    : {
        source: "stage",
        scene,
        cameraShot
      };

  return {
    schemaVersion: "pup-it.project.v1",
    roomId,
    showName,
    scene,
    perspective,
    cameraShot,
    lightingPreset,
    backgroundTheme,
    objectStyle,
    episodeStatus,
    sceneObjects,
    sceneSets,
    floorMarks,
    assetReferences,
    renderPlan: {
      videoPath: null,
      nextRenderer: "browser-preview-now, WebCodecs or FFmpeg worker next",
      deterministicRender: true,
      separateAudioTracks: true
    },
    publishingPackage: {
      videoPath: null,
      thumbnail,
      captions,
      credits,
      licenseMetadata: credits
    },
    exportedAt,
    storyboardPanels,
    timeline,
    takes: takes.map((take) => ({
      id: take.id,
      name: take.name,
      scene: take.scene,
      durationMs: take.durationMs,
      performerCount: take.performerCount,
      audioTrackCount: take.audioTrackCount,
      motionEventCount: take.motionEventCount
    }))
  };
}
