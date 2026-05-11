export const tutorialSteps = [
  {
    mode: "perform",
    title: "Perform Live",
    body: "Move your character with WASD or arrow keys, let mic audio drive the mouth by default, and trigger expressions, poses, and macros from the dock."
  },
  {
    mode: "build",
    title: "Build The Space",
    body: "Start with a rig model, then assemble the puppet from shapes, doodle placeholders, imported images, styles, parts, and behaviors."
  },
  {
    mode: "storyboard",
    title: "Plan The Scene",
    body: "Storyboard mode captures the current stage as comic-strip panels, then lets you label beats, shot sizes, and timing before recording."
  },
  {
    mode: "edit",
    title: "Review Takes",
    body: "Edit mode keeps recorded performances inside the app so you can browse scenes, play them back, and export takes with separate character audio tracks."
  }
];

export const workflowSteps = [
  { id: "home", label: "Setting", mode: "home", description: "Choose the show, starting setting, and first task." },
  { id: "cast", label: "Creator", mode: "build", description: "Choose a rig model and customize it like a character creator." },
  { id: "sets", label: "Place", mode: "assets", description: "Place settings, props, textures, and raw materials into the scene." },
  { id: "perform", label: "Perform", mode: "perform", description: "Rehearse, record, and improvise live." },
  { id: "edit", label: "Finish", mode: "edit", description: "Replay, trim, export, and submit the short." },
  { id: "storyboard", label: "Board", mode: "storyboard", description: "Plan comic-strip beats and shot flow." }
];

export const developmentPathCards = [
  {
    id: "five-minute",
    label: "1",
    name: "Five-Minute Cartoon",
    promise: "Start, build, perform, replay, export.",
    focus: "Keep the beginner rail obvious enough that a first short can happen before the user starts managing software."
  },
  {
    id: "toybox",
    label: "2",
    name: "Creation Toybox",
    promise: "Make the show's people, props, textures, and weird rules feel original.",
    focus: "Treat presets as raw material. Shapes, doodles, imports, mutations, and behaviors should push users toward their own voice."
  },
  {
    id: "studio",
    label: "3",
    name: "Performance Studio",
    promise: "Make performing feel smooth, funny, and worth replaying.",
    focus: "Motion, mouth, cue deck, camera, stings, and take review should feel like a playable comedy instrument."
  }
];

export const publicVersionMilestones = [
  { id: "perform", name: "Joy Loop", detail: "Record, replay, laugh, trim, export." },
  { id: "toybox", name: "Toybox Identity", detail: "Original rigs, props, textures, and weird behavior." },
  { id: "formats", name: "Comedy Formats", detail: "Arguments, fake ads, desk bits, street pieces, bumpers." },
  { id: "render", name: "Render Path", detail: "720p WEBM now, stage-matched video next, backend reliability later." }
];

export function computeBeginnerProgress({
  showName,
  hasCustomRigParts,
  sceneObjectCount,
  sceneSetCount,
  mode,
  takeCount,
  selectedTake,
  timelineCount,
  exportCount,
  startedShortFormat,
  episodeStatus
}) {
  const submittedStatuses = ["submitted", "ready_for_review", "approved", "scheduled", "published"];
  return {
    hasShow: Boolean(showName.trim()),
    hasStartedShort: Boolean(startedShortFormat),
    hasRig: Boolean(hasCustomRigParts),
    hasSet: sceneObjectCount > 0 || sceneSetCount > 0,
    hasRehearsed: mode === "perform" || takeCount > 0 || Boolean(selectedTake),
    hasTake: takeCount > 0 || Boolean(selectedTake),
    hasCut: timelineCount > 0,
    readyToExport: timelineCount > 0 || Boolean(selectedTake),
    exported: exportCount > 0,
    hasSubmitted: submittedStatuses.includes(episodeStatus)
  };
}
