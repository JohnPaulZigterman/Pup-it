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

function takeTrimDuration(take = {}) {
  if (typeof take.trimEndMs === "number") return Math.max(1000, take.trimEndMs - (take.trimStartMs || 0));
  return Math.max(1000, take.durationMs || 5000);
}

function resolveTimelineTake(clip, timelineTakes = []) {
  if (!clip || clip.sourceType !== "take") return null;
  return timelineTakes.find((take) => take.id === clip.sourceId) || null;
}

function createTimelineSegments({ timeline = [], timelineTakes = [], project = {} } = {}) {
  let cursor = 0;
  return timeline.map((clip, index) => {
    const take = resolveTimelineTake(clip, timelineTakes);
    const fallbackTake = {
      id: clip.sourceId || clip.id,
      name: clip.title || `Clip ${index + 1}`,
      scene: clip.scene || project.scene || "studio",
      cameraShot: clip.shot || project.cameraShot || "wide",
      lightingPreset: clip.lightingPreset || project.lightingPreset || "scene",
      backgroundTheme: clip.backgroundTheme || project.backgroundTheme || "painted-depth",
      objectStyle: clip.objectStyle || project.objectStyle || "soft-material",
      durationMs: clip.duration || 5000,
      performers: [],
      tracks: { motion: [], audio: [] },
      sceneObjects: project.sceneObjects || [],
      floorMarks: project.floorMarks || []
    };
    const sourceTake = take || fallbackTake;
    const durationMs = Math.max(1000, Math.min(clip.duration || takeTrimDuration(sourceTake), 45000));
    const segment = {
      id: clip.id,
      index: index + 1,
      sourceType: clip.sourceType,
      sourceId: clip.sourceId,
      title: clip.title || sourceTake.name || `Clip ${index + 1}`,
      startMs: cursor,
      durationMs,
      trimStartMs: sourceTake.trimStartMs || 0,
      take: {
        ...sourceTake,
        scene: clip.scene || sourceTake.scene || project.scene || "studio",
        cameraShot: clip.shot || sourceTake.cameraShot || project.cameraShot || "wide",
        lightingPreset: clip.lightingPreset || sourceTake.lightingPreset || project.lightingPreset || "scene",
        backgroundTheme: clip.backgroundTheme || sourceTake.backgroundTheme || project.backgroundTheme || "painted-depth",
        objectStyle: clip.objectStyle || sourceTake.objectStyle || project.objectStyle || "soft-material",
        durationMs
      }
    };
    cursor += durationMs;
    return segment;
  });
}

export function createRenderModel({
  project = {},
  selectedTake = null,
  timeline = [],
  timelineTakes = [],
  finishTarget = "selected-take",
  title = "",
  requestedBy = ""
} = {}) {
  const take = resolveRenderTake({ project, selectedTake });
  const timelineSegments = finishTarget === "rough-cut"
    ? createTimelineSegments({ timeline, timelineTakes, project })
    : [];
  const timelineDurationMs = timelineSegments.reduce((total, segment) => total + segment.durationMs, 0);
  const reviewTarget = project.publishingPackage?.reviewTarget || null;
  const durationMs = Math.max(
    1000,
    Math.min(
      timelineDurationMs ||
      (typeof take?.trimEndMs === "number"
        ? take.trimEndMs - (take.trimStartMs || 0)
        : take?.durationMs || timeline[0]?.duration || 5000),
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
    sceneDepth: take?.sceneDepth || project.sceneDepth || null,
    cameraShot: take?.cameraShot || project.cameraShot || "wide",
    lightingPreset: take?.lightingPreset || project.lightingPreset || "scene",
    backgroundTheme: take?.backgroundTheme || project.backgroundTheme || "painted-depth",
    objectStyle: take?.objectStyle || project.objectStyle || "soft-material",
    directorCamera: take?.directorCamera || project.directorCamera || {},
    trimStartMs: take?.trimStartMs || 0,
    trimEndMs: take?.trimEndMs || null,
    durationMs,
    take,
    timeline,
    timelineSegments,
    finishTarget,
    reviewTarget,
    sceneObjects: take?.sceneObjects || project.sceneObjects || [],
    floorMarks: take?.floorMarks || project.floorMarks || [],
    captions: project.publishingPackage?.captions || [],
    credits: project.publishingPackage?.credits || [],
    renderPlan: project.renderPlan || {}
  };
}
