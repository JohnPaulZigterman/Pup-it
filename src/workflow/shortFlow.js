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
  { id: "home", label: "Start", mode: "home", description: "Choose the show, starting setting, and first task." },
  { id: "cast", label: "Rig", mode: "build", description: "Choose a rig model and customize it like a character creator." },
  { id: "sets", label: "Space", mode: "assets", description: "Place settings, props, textures, and raw materials into the scene." },
  { id: "perform", label: "Perform", mode: "perform", description: "Rehearse, record, and improvise live." },
  { id: "edit", label: "Finish", mode: "edit", description: "Review, trim, export, and submit the short." },
  { id: "storyboard", label: "Board", mode: "storyboard", description: "Plan comic-strip beats and shot flow." }
];

export const makeShortMilestones = [
  { id: "start", label: "Start", shortLabel: "Start", description: "Pick a show and a rough bit." },
  { id: "rig", label: "Build Rig", shortLabel: "Rig", description: "Make the performer yours." },
  { id: "space", label: "Build Space", shortLabel: "Space", description: "Give the bit somewhere to happen." },
  { id: "perform", label: "Perform", shortLabel: "Perform", description: "Rehearse and record live." },
  { id: "review", label: "Review", shortLabel: "Review", description: "Replay, trim, and keep the best take." },
  { id: "finish", label: "Export / Submit", shortLabel: "Finish", description: "Render, package, and submit when ready." }
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
