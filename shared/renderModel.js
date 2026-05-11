export function safeRenderSlug(value) {
  return (value || "pup-it-render")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72) || "pup-it-render";
}

export function resolveRenderTake({ project = {}, selectedTake = null } = {}) {
  return (
    selectedTake ||
    project.takes?.find((take) => take.best) ||
    project.takes?.[0] ||
    null
  );
}

export function createRenderModel({
  project = {},
  selectedTake = null,
  timeline = [],
  title = "",
  requestedBy = ""
} = {}) {
  const take = resolveRenderTake({ project, selectedTake });
  const reviewTarget = project.publishingPackage?.reviewTarget || null;
  const durationMs = Math.max(
    1000,
    Math.min(
      take?.trimEndMs && take?.trimStartMs
        ? take.trimEndMs - take.trimStartMs
        : take?.durationMs || timeline[0]?.duration || 5000,
      45000
    )
  );

  return {
    schemaVersion: "pup-it.render-model.v1",
    title: title || take?.name || project.showName || "Pup-It render",
    slug: safeRenderSlug(title || take?.name || project.showName || "pup-it-render"),
    requestedBy,
    showName: project.showName || "Untitled Show",
    scene: take?.scene || project.scene || "studio",
    cameraShot: take?.cameraShot || project.cameraShot || "wide",
    lightingPreset: take?.lightingPreset || project.lightingPreset || "scene",
    backgroundTheme: take?.backgroundTheme || project.backgroundTheme || "painted-depth",
    objectStyle: take?.objectStyle || project.objectStyle || "soft-material",
    directorCamera: take?.directorCamera || project.directorCamera || {},
    durationMs,
    take,
    timeline,
    reviewTarget,
    sceneObjects: take?.sceneObjects || project.sceneObjects || [],
    floorMarks: take?.floorMarks || project.floorMarks || [],
    captions: project.publishingPackage?.captions || [],
    credits: project.publishingPackage?.credits || [],
    renderPlan: project.renderPlan || {}
  };
}
