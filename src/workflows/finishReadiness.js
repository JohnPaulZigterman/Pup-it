export function formatDuration(durationMs = 0) {
  const seconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function describeAudioStatus({ audioMux = null, selectedTake = null } = {}) {
  const audioTrackCount = audioMux?.trackCount ?? selectedTake?.tracks?.audio?.length ?? 0;
  if (audioMux?.status === "muxed") {
    return {
      audioTrackCount,
      audioReady: true,
      label: `${audioTrackCount} character track${audioTrackCount === 1 ? "" : "s"} mixed, separate tracks saved`
    };
  }
  if (audioMux?.status === "skipped_no_audio") {
    return { audioTrackCount, audioReady: true, label: "No recorded character audio yet" };
  }
  if (audioMux?.status === "skipped_ffmpeg_missing") {
    return { audioTrackCount, audioReady: Boolean(audioTrackCount), label: "Separate tracks saved; FFmpeg not configured" };
  }
  if (audioMux?.status === "failed") {
    return { audioTrackCount, audioReady: false, label: "Audio tracks saved, final mux needs attention" };
  }
  if (audioTrackCount) {
    return {
      audioTrackCount,
      audioReady: true,
      label: `${audioTrackCount} character audio track${audioTrackCount === 1 ? "" : "s"} ready`
    };
  }
  return { audioTrackCount, audioReady: false, label: "No audio tracks recorded" };
}

export function buildDoinkReviewChecklist({
  submissionTitle = "",
  creatorName = "",
  hasSubmissionSource = false,
  finishTargetLabel = "",
  finalVideoPath = "",
  readiness = {},
  readyCount = 0,
  packageChecklistLength = 0,
  rightsNotes = ""
} = {}) {
  return [
    { id: "title", label: "Title", done: Boolean(submissionTitle.trim()), detail: submissionTitle },
    { id: "creator", label: "Creator", done: Boolean(creatorName.trim()), detail: creatorName || "Add credit name" },
    { id: "target", label: "Target", done: hasSubmissionSource, detail: finishTargetLabel },
    { id: "video", label: "Video", done: Boolean(finalVideoPath), detail: finalVideoPath || "Render final WEBM" },
    { id: "package", label: "Package", done: Boolean(readiness.readyForSubmission), detail: `${readyCount}/${packageChecklistLength || 1} package checks` },
    { id: "rights", label: "Rights", done: Boolean(rightsNotes.trim()), detail: rightsNotes ? "Included" : "Add note" }
  ];
}

export function summarizeFinishConfidence({
  checklist = [],
  hasRender = false,
  hasSource = false,
  episodeStatus = "draft"
} = {}) {
  const doneCount = checklist.filter((item) => item.done).length;
  const totalCount = checklist.length || 1;
  const reviewStatuses = ["submitted", "ready_for_review", "approved", "scheduled", "published"];
  const score = Math.round(((doneCount + (hasRender ? 1 : 0) + (hasSource ? 1 : 0)) / (totalCount + 2)) * 100);
  const readyEnough = score >= 70 && hasSource;
  const reviewReady = readyEnough && hasRender;
  return {
    doneCount,
    totalCount,
    score,
    readyEnough,
    reviewReady,
    submitted: reviewStatuses.includes(episodeStatus),
    missing: checklist.filter((item) => !item.done)
  };
}

export function buildRenderPreflight({
  hasSubmissionSource = false,
  finishTargetLabel = "",
  renderDurationMs = 0,
  renderClipCount = 0,
  renderDepthChecks = [],
  audioReady = false,
  audioTrackCount = 0,
  backendRendering = false,
  renderSucceeded = false,
  finalVideoPath = ""
} = {}) {
  const depthReadyCount = renderDepthChecks.filter((item) => item.ready).length;
  const depthReady = depthReadyCount >= Math.min(4, renderDepthChecks.length || 4);
  const checks = [
    {
      id: "source",
      label: "Source selected",
      done: hasSubmissionSource,
      detail: hasSubmissionSource ? finishTargetLabel : "Pick or record a take"
    },
    {
      id: "timing",
      label: "Timing known",
      done: renderDurationMs > 0 && renderClipCount > 0,
      detail: renderDurationMs > 0 ? `${formatDuration(renderDurationMs)} / ${renderClipCount || 1} clip${(renderClipCount || 1) === 1 ? "" : "s"}` : "No runtime yet"
    },
    {
      id: "fidelity",
      label: "Stage fidelity",
      done: depthReady,
      detail: `${depthReadyCount}/${renderDepthChecks.length || 5} visual context checks`
    },
    {
      id: "audio",
      label: "Audio plan",
      done: audioReady || audioTrackCount === 0,
      detail: audioTrackCount ? `${audioTrackCount} character track${audioTrackCount === 1 ? "" : "s"}` : "Silent short is OK"
    },
    {
      id: "deliverable",
      label: "Review file",
      done: renderSucceeded,
      detail: finalVideoPath || (backendRendering ? "Rendering now" : "Render Final creates this")
    }
  ];
  const blockers = checks.filter((item) => !item.done && item.id !== "deliverable");
  const readyToRender = blockers.length === 0 && hasSubmissionSource && !backendRendering;
  const doneCount = checks.filter((item) => item.done).length;

  return {
    checks,
    blockers,
    readyToRender,
    score: Math.round((doneCount / checks.length) * 100),
    status: renderSucceeded ? "rendered" : backendRendering ? "rendering" : readyToRender ? "ready" : "needs-attention"
  };
}

export function summarizeTakeSpark(take = null) {
  if (!take) {
    return {
      score: 0,
      label: "No take yet",
      details: ["Record a quick performance first."],
      laneCount: 0
    };
  }
  const motionEvents = take.tracks?.motion || [];
  const audioEvents = take.tracks?.audio || [];
  const mouthEvents = motionEvents.filter((event) => event.state?.mouthOpen > 0.08 || event.state?.speaking);
  const cueEvents = motionEvents.filter((event) => event.type === "macro:trigger" || event.macro || event.state?.macro);
  const hasCamera = Boolean(take.cameraShot && take.cameraShot !== "wide");
  const hasProps = Boolean(take.sceneObjects?.length);
  const laneCount = [
    motionEvents.length > 4,
    mouthEvents.length > 2,
    cueEvents.length > 0,
    audioEvents.length > 0,
    hasCamera,
    hasProps,
    (take.performers?.length || 0) > 1
  ].filter(Boolean).length;
  const durationMs = take.durationMs || 0;
  const durationScore = durationMs >= 3000 && durationMs <= 45000 ? 18 : durationMs > 0 ? 9 : 0;
  const score = Math.min(
    100,
    durationScore +
      Math.min(22, motionEvents.length * 2) +
      Math.min(16, mouthEvents.length * 3) +
      (audioEvents.length ? 14 : 0) +
      (cueEvents.length ? 12 : 0) +
      (hasCamera ? 8 : 0) +
      (hasProps ? 5 : 0) +
      ((take.performers?.length || 0) > 1 ? 5 : 0)
  );
  const label =
    score >= 78
      ? "Airing-energy take"
      : score >= 58
        ? "Funny little keeper"
        : score >= 34
          ? "Good rough pass"
          : "Needs one more perform pass";
  const details = [
    motionEvents.length > 4 ? "body motion reads" : "add a little movement",
    mouthEvents.length > 2 || audioEvents.length ? "mouth/audio has life" : "talk or open the mouth",
    cueEvents.length ? "has a cue moment" : "try one cue button",
    hasCamera ? "camera changed" : "wide shot only"
  ];

  return { score, label, details, laneCount };
}
