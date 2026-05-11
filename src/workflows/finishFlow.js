export function resolveFinishTake({ target = "selected-take", selectedTake = null, takeLibrary = [], productionTimeline = [] } = {}) {
  const bestTake = takeLibrary.find((take) => take.best) || null;
  if (target === "best-take") return bestTake || selectedTake || takeLibrary[0] || null;
  if (target === "rough-cut") {
    const timelineTakeClip = productionTimeline.find((clip) => clip.sourceType === "take");
    return (
      takeLibrary.find((take) => take.id === timelineTakeClip?.sourceId) ||
      selectedTake ||
      bestTake ||
      takeLibrary[0] ||
      null
    );
  }
  return selectedTake || bestTake || takeLibrary[0] || null;
}

export function describeFinishTarget({
  target = "selected-take",
  selectedTake = null,
  takeLibrary = [],
  productionTimeline = []
} = {}) {
  if (target === "rough-cut") {
    return productionTimeline.length
      ? `Rough cut: ${productionTimeline.length} clip${productionTimeline.length === 1 ? "" : "s"}`
      : "Rough cut: add clips first";
  }
  if (target === "best-take") {
    const bestTake = takeLibrary.find((take) => take.best);
    return bestTake ? `Best take: ${bestTake.name || "Untitled take"}` : "Best take: mark a keeper";
  }
  const targetTake = resolveFinishTake({ target: "selected-take", selectedTake, takeLibrary, productionTimeline });
  return targetTake ? `Selected take: ${targetTake.name || "Untitled take"}` : "Selected take: record or choose one";
}

export function attachFinishMetadata({
  project,
  renderJob = null,
  finishTarget = "selected-take",
  finishTargetLabel = "",
  targetTake = null,
  productionTimeline = []
}) {
  if (renderJob?.output?.videoPath) {
    project.renderPlan.videoPath = renderJob.output.videoPath;
    project.publishingPackage.videoPath = renderJob.output.videoPath;
    project.publishingPackage.renderJob = {
      id: renderJob.id,
      status: renderJob.status,
      output: renderJob.output
    };
  }
  project.publishingPackage.finishTarget = {
    type: finishTarget,
    label: finishTargetLabel,
    takeId: targetTake?.id || null,
    timelineClipCount: productionTimeline.length
  };
  return project;
}

export function hasUsableFinishTake({ target = "selected-take", selectedTake = null, takeLibrary = [], productionTimeline = [] } = {}) {
  const hasBestTake = takeLibrary.some((take) => take.best);
  if (target === "rough-cut") return Boolean(productionTimeline.length || selectedTake || takeLibrary.length);
  if (target === "best-take") return Boolean(hasBestTake || selectedTake || takeLibrary.length);
  return Boolean(selectedTake || hasBestTake || takeLibrary.length);
}
