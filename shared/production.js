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
    id: "hold-for-laugh",
    name: "Hold Laugh",
    soundSting: "tap",
    cameraShot: "close",
    selfState: { pose: "deadpan", expression: "weird", idleMotion: "held", mouthOpen: 0.04 }
  },
  {
    id: "public-access-zoom",
    name: "Bad Zoom",
    soundSting: "button",
    cameraShot: "reaction",
    lightingPreset: "flat-tv",
    selfState: { pose: "listen", expression: "neutral", idleMotion: "subtle" }
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
  showToolbox = null,
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
  const bestTake = takes.find((take) => take.best) || takes[0] || null;
  const packageReadiness = {
    hasRenderPlan: true,
    hasReviewTarget: Boolean(bestTake || timeline.length || storyboardPanels.length),
    hasThumbnail: Boolean(thumbnail),
    hasCaptions: captions.some((caption) => caption.text),
    hasCredits: credits.length > 0,
    hasLicenseMetadata: true,
    hasSeparateAudioTrackMetadata: takes.some((take) => take.audioTrackCount || take.tracks?.audio?.length)
  };
  const broadcastChecklist = [
    { id: "review-target", label: "Best take, cut, or board selected", done: packageReadiness.hasReviewTarget },
    { id: "thumbnail", label: "Thumbnail included", done: packageReadiness.hasThumbnail },
    { id: "captions", label: "Captions drafted", done: packageReadiness.hasCaptions },
    { id: "credits", label: "Credits/license notes attached", done: packageReadiness.hasCredits },
    { id: "audio-tracks", label: "Separate audio track metadata present", done: packageReadiness.hasSeparateAudioTrackMetadata }
  ];

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
      preferredPreviewVideoName: bestTake ? `pup-it-${bestTake.id || "take"}-preview.webm` : null,
      preferredThumbnailName: bestTake ? `pup-it-${bestTake.id || "take"}-thumbnail.png` : "pup-it-thumbnail.png",
      nextRenderer: "browser-preview-now, WebCodecs or FFmpeg worker next",
      deterministicRender: true,
      separateAudioTracks: true
    },
    publishingPackage: {
      videoPath: null,
      thumbnail,
      captions,
      credits,
      licenseMetadata: credits,
      broadcastChecklist,
      packageReadiness,
      reviewTarget: bestTake
        ? {
            type: "take",
            id: bestTake.id,
            name: bestTake.name || "Untitled take",
            durationMs: bestTake.durationMs,
            scene: bestTake.scene
          }
        : timeline[0]
        ? { type: "timeline", id: timeline[0].id, name: timeline[0].title }
        : storyboardPanels[0]
        ? { type: "storyboard", id: storyboardPanels[0].id, name: storyboardPanels[0].title }
        : null
    },
    showToolbox,
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

export function createShowToolbox({
  showName,
  cast = [],
  sceneObjects = [],
  sceneSets = [],
  assetReferences = [],
  storyboardPanels = [],
  timeline = [],
  takes = [],
  style = {},
  episodeStatus = "draft",
  doinkSubmission = {}
}) {
  const castItems = cast.map((performer) => ({
    id: performer.id,
    name: performer.name,
    character: performer.character,
    stylePreset: performer.state?.stylePreset || null,
    partCount: Object.values(performer.state?.characterParts || {}).filter(Boolean).length
  }));
  const setItems = sceneSets.map((set) => ({ id: set.id, name: set.name, objectCount: set.sceneObjects?.length || set.objects?.length || 0 }));
  const propItems = sceneObjects.map((object) => ({
    id: object.id,
    name: object.name,
    shape: object.shape,
    texturePreset: object.texturePreset,
    sourceUrl: object.sourceUrl || null
  }));
  const creditItems = assetReferences.map((asset) => ({
    name: asset.name,
    sourceUrl: asset.sourceUrl,
    license: asset.license,
    attribution: asset.attribution || asset.license || "Check source before publishing."
  }));
  const boardItems = storyboardPanels.map((panel) => ({ id: panel.id, title: panel.title, scene: panel.scene, shot: panel.shot }));
  const cutItems = timeline.map((clip) => ({ id: clip.id, title: clip.title, sourceType: clip.sourceType, duration: clip.duration }));
  const takeItems = takes.map((take) => ({
    id: take.id,
    name: take.name,
    durationMs: take.durationMs,
    audioTrackCount: take.audioTrackCount || take.tracks?.audio?.length || 0,
    best: Boolean(take.best)
  }));
  const submittedStatuses = ["submitted", "ready_for_review", "approved", "scheduled", "published"];
  const hasBestTake = takeItems.some((take) => take.best);
  const readinessSteps = [
    { id: "show", label: "Name the show", done: Boolean((showName || "").trim()), beginnerAction: "Name it", proUnlock: "Series metadata" },
    { id: "cast", label: "Build a rig", done: castItems.some((item) => item.partCount > 0) || castItems.length > 0, beginnerAction: "Pick a rig", proUnlock: "Advanced rig parts" },
    { id: "world", label: "Build the space", done: setItems.length > 0 || propItems.length > 0, beginnerAction: "Place one prop", proUnlock: "Reusable sets" },
    { id: "perform", label: "Record a take", done: takeItems.length > 0, beginnerAction: "Record", proUnlock: "Separate lanes" },
    { id: "cut", label: "Choose a cut", done: cutItems.length > 0 || hasBestTake, beginnerAction: "Pick best", proUnlock: "Rough cut timeline" },
    { id: "publish", label: "Ready for review", done: submittedStatuses.includes(episodeStatus), beginnerAction: "Submit", proUnlock: "DoinkTV package" }
  ];
  const missingSteps = readinessSteps.filter((step) => !step.done);
  const branchCatalog = [
    {
      id: "cast",
      label: "Cast Branch",
      mode: "build",
      ready: castItems.length > 0,
      count: castItems.length,
      beginnerVersion: "Pick a rig and make one obvious change.",
      proUnlock: "Swap parts, style parts, validate rigs, and save reusable characters.",
      showKitHome: "Cast"
    },
    {
      id: "world",
      label: "World Branch",
      mode: "assets",
      ready: setItems.length > 0 || propItems.length > 0,
      count: setItems.length + propItems.length,
      beginnerVersion: "Drop in one set piece or prop.",
      proUnlock: "Build reusable sets, prop libraries, textures, credits, and floor marks.",
      showKitHome: "Sets and props"
    },
    {
      id: "performance",
      label: "Performance Branch",
      mode: "perform",
      ready: takeItems.length > 0,
      count: takeItems.length,
      beginnerVersion: "Record one live take.",
      proUnlock: "Use cue pads, motion presets, camera punches, macros, and audio lanes.",
      showKitHome: "Takes"
    },
    {
      id: "finish",
      label: "Finish Branch",
      mode: "edit",
      ready: cutItems.length > 0 || hasBestTake || submittedStatuses.includes(episodeStatus),
      count: cutItems.length + (hasBestTake ? 1 : 0),
      beginnerVersion: "Mark the best take and render a review copy.",
      proUnlock: "Trim, assemble cuts, package metadata, and submit to DoinkTV.",
      showKitHome: "Cuts and exports"
    }
  ];
  const nextBranch = branchCatalog.find((branch) => !branch.ready) || branchCatalog[branchCatalog.length - 1];

  return {
    schemaVersion: "pup-it.show-toolbox.v2",
    showName: showName || "Untitled Show",
    status: episodeStatus,
    readiness: {
      completeCount: readinessSteps.length - missingSteps.length,
      totalCount: readinessSteps.length,
      percent: Math.round(((readinessSteps.length - missingSteps.length) / readinessSteps.length) * 100),
      nextStep: missingSteps[0] || null,
      steps: readinessSteps
    },
    productRule: {
      beginner: "One obvious next button.",
      experienced: "Pro controls stay nearby, not in the way.",
      home: "Reusable results live in this Show Kit."
    },
    branches: branchCatalog,
    quickReuse: {
      primaryCast: castItems[0]?.name || null,
      primarySet: setItems[0]?.name || null,
      primaryProp: propItems[0]?.name || null,
      bestTake: takeItems.find((take) => take.best)?.name || null,
      houseLook: [style.family, style.theme].filter(Boolean).join(" / ") || "Flexible / Show Native",
      nextRecommendedMode: nextBranch.mode,
      nextRecommendedAction: nextBranch.beginnerVersion
    },
    cast: castItems,
    styleGuide: {
      family: style.family || "Flexible",
      theme: style.theme || "Show Native",
      texturePreset: style.texturePreset || "paper-grain",
      backgroundTheme: style.backgroundTheme || null,
      objectStyle: style.objectStyle || null
    },
    sets: setItems,
    props: propItems,
    credits: creditItems,
    boards: boardItems,
    cuts: cutItems,
    takes: takeItems,
    submission: {
      targetChannel: "DoinkTV",
      preferredBlock: doinkSubmission.preferredBlock || "short",
      title: doinkSubmission.title || "",
      creatorName: doinkSubmission.creatorName || ""
    }
  };
}

export function createDoinkTvSubmissionPackage({
  project,
  submission = {},
  selectedTake = null,
  previewVideoFileName = null,
  projectPackageFileName = null,
  submittedAt = new Date().toISOString()
}) {
  const timelineDuration = (project.timeline || []).reduce((total, clip) => {
    const duration = typeof clip.duration === "number" ? clip.duration : 0;
    return total + duration;
  }, 0);
  const durationMs = selectedTake?.durationMs || timelineDuration || 0;
  const credits = project.publishingPackage?.credits || [];
  const hasReviewTarget = Boolean(selectedTake || project.publishingPackage?.reviewTarget || (project.timeline || []).length);
  const hasPreviewVideo = Boolean(previewVideoFileName);
  const hasProjectPackage = Boolean(projectPackageFileName);
  const hasCreator = Boolean((submission.creatorName || "").trim());
  const hasRights = Boolean((submission.rightsNotes || "").trim());
  const hasTitle = Boolean((submission.title || "").trim());
  const reviewChecklist = [
    { id: "title", label: "Title for schedule", done: hasTitle },
    { id: "creator", label: "Creator credit", done: hasCreator },
    { id: "target", label: "Take or cut selected", done: hasReviewTarget },
    { id: "preview-video", label: "Review video", done: hasPreviewVideo },
    { id: "project-package", label: "Project package", done: hasProjectPackage },
    { id: "rights", label: "Rights note", done: hasRights },
    { id: "credits", label: "Credits metadata", done: credits.length > 0 },
    { id: "captions", label: "Captions attached", done: Boolean(project.publishingPackage?.captions?.length) }
  ];
  const missingForReview = reviewChecklist.filter((item) => !item.done).map((item) => item.label);
  const audioTracks = (project.takes || []).map((take) => ({
    takeId: take.id,
    takeName: take.name,
    audioTrackCount: take.audioTrackCount || 0
  }));

  return {
    schemaVersion: "pup-it.doinktv-submission.v2",
    source: "pup-it",
    targetChannel: "DoinkTV",
    hostSite: "chillnet.me",
    status: "submitted_for_review",
    submittedAt,
    title: submission.title || `${project.showName || "Untitled Show"} Short`,
    description: submission.description || "",
    creatorName: submission.creatorName || "",
    creatorContact: submission.creatorContact || "",
    showName: project.showName,
    roomId: project.roomId,
    episodeTitle: submission.episodeTitle || selectedTake?.name || `${project.showName || "Untitled Show"} Episode`,
    preferredBlock: submission.preferredBlock || "short",
    schedulingNotes: submission.schedulingNotes || "",
    contentNotes: submission.contentNotes || "",
    rightsNotes:
      submission.rightsNotes ||
      "Created in Pup-It. Confirm imported material rights before public broadcast.",
    durationMs,
    previewVideoFileName,
    projectPackageFileName,
    adminSummary: {
      reviewTitle: submission.title || `${project.showName || "Untitled Show"} Short`,
      format: submission.preferredBlock || "short",
      runtimeSeconds: Math.round(durationMs / 1000),
      showName: project.showName,
      hasPreviewVideo,
      hasProjectPackage,
      missingForReview
    },
    deliveryManifest: {
      video: previewVideoFileName ? { filename: previewVideoFileName, purpose: "review-video" } : null,
      projectPackage: projectPackageFileName ? { filename: projectPackageFileName, purpose: "source-package" } : null,
      thumbnail: project.publishingPackage?.thumbnail || null,
      captions: project.publishingPackage?.captions || [],
      credits,
      audioTracks
    },
    reviewChecklist,
    missingForReview,
    thumbnail: project.publishingPackage?.thumbnail || null,
    captions: project.publishingPackage?.captions || [],
    credits,
    licenseMetadata: project.publishingPackage?.licenseMetadata || credits,
    audioTracks,
    adminReview: {
      approved: false,
      requestedChanges: "",
      scheduleSlot: null
    },
    project
  };
}
