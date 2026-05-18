export function buildPrimaryNextAction({
  beginnerProgress,
  recording = false,
  startQuickShort,
  setMode,
  toggleTake
}) {
  if (!beginnerProgress.hasStartedShort) {
    return { label: "Start Show", detail: "Pick a rough launch pad.", action: () => startQuickShort("argument") };
  }
  if (!beginnerProgress.hasRig) {
    return { label: "Build Rig", detail: "Make the performer yours.", action: () => setMode("build") };
  }
  if (!beginnerProgress.hasSet) {
    return { label: "Build Space", detail: "Drop something into the space.", action: () => setMode("assets") };
  }
  if (!beginnerProgress.hasTake) {
    return {
      label: recording ? "Stop Take" : beginnerProgress.hasRehearsed ? "Record Take" : "Go Perform",
      detail: "Capture the bit.",
      action: beginnerProgress.hasRehearsed ? toggleTake : () => setMode("perform")
    };
  }
  if (!beginnerProgress.hasCut) {
    return { label: "Review Take", detail: "Replay and save the scene.", action: () => setMode("edit") };
  }
  if (!beginnerProgress.exported) {
    return { label: "Finish Short", detail: "Render or package the finished handoff.", action: () => setMode("edit") };
  }
  return { label: "Submit DoinkTV", detail: "Send the short for review.", action: () => setMode("edit") };
}

export function buildCommandItems({
  primaryNextAction,
  recording = false,
  setMode,
  toggleTake,
  openReviewMode,
  openAssetSearch,
  applyCharacterMutation,
  applyPolishPass,
  saveShowSession,
  undoLastAction,
  redoLastAction,
  canUndo = false,
  canRedo = false,
  exportProject,
  submitToDoinkTv
}) {
  return [
    { id: "next", label: `Next: ${primaryNextAction.label}`, keywords: "next step continue beginner flow do next", action: primaryNextAction.action },
    { id: "home", label: "Open show dashboard", keywords: "setup home project show", action: () => setMode("home") },
    { id: "cast", label: "Edit current character", keywords: "cast character rig build customize", action: () => setMode("build") },
    { id: "playground", label: "Open character playground", keywords: "playground weird mutate original character toybox", action: () => setMode("build") },
    {
      id: "mutate",
      label: "Make current character weirder",
      keywords: "mutate random weird rough original",
      action: () => {
        setMode("build");
        applyCharacterMutation("odd-body");
      }
    },
    { id: "sets", label: "Search settings and props", keywords: "assets objects settings props backgrounds", action: () => openAssetSearch("", "setting") },
    { id: "shots", label: "Open shot templates", keywords: "shot template blocking marks two shot reaction", action: () => setMode("perform") },
    { id: "mouth", label: "Find mouth and rig parts", keywords: "mouth face rig part lips", action: () => openAssetSearch("mouth", "rig-part") },
    { id: "kitchen", label: "Find kitchen scene pieces", keywords: "kitchen diner room background furniture", action: () => openAssetSearch("kitchen", "setting") },
    { id: "record", label: recording ? "Stop recording take" : "Record a take", keywords: "record stop take performance", action: toggleTake },
    { id: "review", label: "Review recorded scenes", keywords: "edit takes timeline review finish", action: openReviewMode },
    { id: "board", label: "Open storyboard mode", keywords: "storyboard panel comic strip planning", action: () => setMode("storyboard") },
    { id: "save", label: "Save show", keywords: "save autosave show session project", action: () => saveShowSession() },
    { id: "undo", label: "Undo last creative edit", keywords: "undo revert back history", action: undoLastAction, disabled: !canUndo },
    { id: "redo", label: "Redo creative edit", keywords: "redo forward history", action: redoLastAction, disabled: !canRedo },
    { id: "export", label: "Export short package", keywords: "finish export publish package video project", action: exportProject },
    { id: "submit-doinktv", label: "Submit to DoinkTV", keywords: "finish submit doinktv publish review package", action: submitToDoinkTv },
    { id: "light-polish", label: "Make it look cleaner", keywords: "lighting polish better professional clean", action: () => applyPolishPass("lighting") },
    { id: "texture-polish", label: "Add mixed-media texture", keywords: "texture paper pattern style weird", action: () => applyPolishPass("texture") },
    { id: "punch-polish", label: "Punch in for a reaction", keywords: "camera close reaction punch button", action: () => applyPolishPass("camera") }
  ];
}

export function findCommandMatch(commands, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return commands[0] || null;
  const queryTokens = normalized.split(/\s+/).filter(Boolean);
  return commands.find((command) => {
    const haystack = `${command.label} ${command.keywords}`.toLowerCase();
    return queryTokens.every((token) => haystack.includes(token));
  }) || null;
}
