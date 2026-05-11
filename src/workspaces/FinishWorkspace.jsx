import React from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  ExternalLink,
  Library,
  Play,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Video
} from "lucide-react";
import { hasUsableFinishTake } from "../workflows/finishFlow.js";
import { ProductionTimeline } from "./ProductionTimeline.jsx";

function formatDuration(durationMs = 0) {
  const seconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function SceneLibraryEditor({
  takes,
  selectedTake,
  playbackActive,
  projectExport,
  onRefresh,
  onSelectTake,
  onPlay,
  onTakeMetaChange,
  onMarkBestTake,
  onQuickTrim,
  onSaveTakeAsScene,
  onExportProject,
  onExportVideo,
  onExportThumbnail,
  onBackendRender,
  backendRendering,
  renderJob,
  finishTarget,
  finishTargetLabel,
  onFinishTargetChange,
  videoExporting,
  doinkSubmission,
  doinkSubmitting,
  doinkEndpointConfigured,
  onDoinkSubmissionChange,
  onSubmitToDoinkTv,
  onAddTakeToTimeline,
  timeline,
  episodeStatus,
  onEpisodeStatusChange,
  onRemoveTimelineClip,
  onMoveTimelineClip,
  onTrimTimelineClip,
  onUpdateTimelineClip,
  onModeChange,
  serverUrl
}) {
  const takeLaneSummary = selectedTake
    ? [
        { id: "motion", label: "Motion", count: selectedTake.tracks.motion.filter((event) => event.type === "performer:update").length },
        { id: "mouth", label: "Mouth", count: selectedTake.tracks.motion.filter((event) => event.state?.mouthOpen > 0 || event.state?.speaking).length },
        { id: "camera", label: "Camera", count: selectedTake.cameraShot ? 1 : 0 },
        { id: "cues", label: "Cues", count: selectedTake.tracks.motion.filter((event) => event.type === "macro:trigger").length },
        { id: "props", label: "Props", count: selectedTake.sceneObjects?.length || 0 },
        { id: "audio", label: "Audio", count: selectedTake.tracks.audio.length }
      ]
    : [];
  const reviewReadyStatuses = ["submitted", "ready_for_review", "approved", "scheduled", "published"];
  const hasSubmissionSource = Boolean(selectedTake || takes.length || timeline.length);
  const hasTargetTake = hasUsableFinishTake({
    target: finishTarget,
    selectedTake,
    takeLibrary: takes,
    productionTimeline: timeline
  });
  const packageChecklist = projectExport?.publishingPackage?.broadcastChecklist || [];
  const readiness = projectExport?.publishingPackage?.packageReadiness || {};
  const reviewTarget = projectExport?.publishingPackage?.reviewTarget;
  const readyCount = packageChecklist.filter((item) => item.done).length;
  const finalVideoPath = renderJob?.output?.videoPath || "";
  const finalVideoUrl = finalVideoPath ? `${serverUrl}${finalVideoPath}` : "";
  const audioMux = renderJob?.output?.audioMux || null;
  const renderSucceeded = renderJob?.status === "succeeded" && Boolean(finalVideoPath);
  const audioTrackCount = audioMux?.trackCount ?? selectedTake?.tracks?.audio?.length ?? 0;
  const audioStatus =
    audioMux?.status === "muxed"
      ? `${audioTrackCount} character track${audioTrackCount === 1 ? "" : "s"} mixed, separate tracks saved`
      : audioMux?.status === "skipped_no_audio"
        ? "No recorded character audio yet"
        : audioMux?.status === "skipped_ffmpeg_missing"
          ? "Separate tracks saved; FFmpeg not configured"
          : audioMux?.status === "failed"
            ? "Audio tracks saved, final mux needs attention"
            : audioTrackCount
              ? `${audioTrackCount} character audio track${audioTrackCount === 1 ? "" : "s"} ready`
              : "No audio tracks recorded";
  const submissionTitle = doinkSubmission.title.trim() || selectedTake?.name || `${projectExport?.showName || "Untitled Show"} Short`;
  const submissionDurationMs = selectedTake?.durationMs || timeline.reduce((total, clip) => total + (Number(clip.duration) || 0), 0);
  const doinkReviewChecklist = [
    { id: "title", label: "Title", done: Boolean(submissionTitle.trim()), detail: submissionTitle },
    { id: "creator", label: "Creator", done: Boolean(doinkSubmission.creatorName.trim()), detail: doinkSubmission.creatorName || "Add credit name" },
    { id: "target", label: "Target", done: hasSubmissionSource, detail: finishTargetLabel },
    { id: "video", label: "Video", done: Boolean(finalVideoPath), detail: finalVideoPath || "Render final WEBM" },
    { id: "package", label: "Package", done: readiness.readyForSubmission, detail: `${readyCount}/${packageChecklist.length || 1} package checks` },
    { id: "rights", label: "Rights", done: Boolean(doinkSubmission.rightsNotes.trim()), detail: doinkSubmission.rightsNotes ? "Included" : "Add note" }
  ];
  const doinkReadyCount = doinkReviewChecklist.filter((item) => item.done).length;
  const doinkMissing = doinkReviewChecklist.filter((item) => !item.done);
  const finishSteps = [
    {
      label: "Best take",
      done: Boolean(selectedTake?.best || takes.some((take) => take.best)),
      detail: selectedTake?.best ? selectedTake.name || "Selected take" : "Pick or mark the keeper"
    },
    {
      label: "Trim",
      done: Boolean(
        selectedTake &&
          ((selectedTake.trimStartMs || 0) > 0 ||
            (selectedTake.trimEndMs && selectedTake.trimEndMs < selectedTake.durationMs))
      ),
      detail:
        selectedTake && ((selectedTake.trimStartMs || 0) > 0 || selectedTake.trimEndMs)
          ? `${formatDuration(selectedTake.trimStartMs || 0)} to ${formatDuration(selectedTake.trimEndMs || selectedTake.durationMs)}`
          : "Optional, but useful"
    },
    {
      label: "Backend render",
      done: renderSucceeded,
      detail: backendRendering
        ? "Rendering now"
        : renderJob?.status === "failed"
          ? "Render failed; try again"
          : finalVideoPath || "Create review WEBM"
    },
    {
      label: "Audio",
      done: audioMux?.status === "muxed" || audioMux?.status === "skipped_no_audio",
      detail: audioStatus
    },
    {
      label: "Package",
      done: readiness.readyForSubmission,
      detail: `${readyCount}/${packageChecklist.length || 1} checklist items`
    },
    {
      label: "Submit",
      done: episodeStatus === "submitted",
      detail: "Send to DoinkTV review"
    }
  ];
  return (
    <div className="sceneEditor">
      <div className="dockGroup">
        <h2>Finish Short</h2>
        <div className="editorHeader">
          <Library size={18} />
          <div>
            <strong>{selectedTake?.name || "Recorded Scenes"}</strong>
            <small>Replay, name, trim, export, and submit. {takes.length} saved in this room.</small>
          </div>
        </div>
        <button className="wideAction" onClick={onRefresh}>
          <RefreshCw size={16} />
          Refresh
        </button>
        <div className="finishedShortPanel">
          <div className="finishedShortHeader">
            <span className="eyebrow">Finished Short Flow</span>
            <strong>{finalVideoPath ? "Final preview is ready." : "Render one clean review copy."}</strong>
            <small>
              {finishTargetLabel}. Best take, trim, render, package, submit. Everything needed for DoinkTV lives here.
            </small>
          </div>
          <div className="finishTargetPicker" aria-label="Finish target">
            <button
              className={finishTarget === "selected-take" ? "active" : ""}
              onClick={() => onFinishTargetChange("selected-take")}
            >
              Selected Take
            </button>
            <button
              className={finishTarget === "best-take" ? "active" : ""}
              onClick={() => onFinishTargetChange("best-take")}
            >
              Best Take
            </button>
            <button
              className={finishTarget === "rough-cut" ? "active" : ""}
              onClick={() => onFinishTargetChange("rough-cut")}
            >
              Rough Cut
            </button>
          </div>
          {finalVideoUrl ? (
            <video className="finalPreviewVideo" src={finalVideoUrl} controls muted playsInline />
          ) : renderJob?.status === "failed" ? (
            <div className="finalPreviewEmpty renderFailed">
              <Video size={28} />
              <span>Render failed. Check the backend, then try Render Final again.</span>
            </div>
          ) : (
            <div className="finalPreviewEmpty">
              <Video size={28} />
              <span>Backend render preview will appear here.</span>
            </div>
          )}
          <div className="finishStepGrid">
            {finishSteps.map((step) => (
              <div className={`finishStep ${step.done ? "done" : ""}`} key={step.label}>
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="doinkHandoffCard">
          <div>
            <span className="eyebrow">DoinkTV Handoff</span>
            <strong>{doinkReadyCount}/{doinkReviewChecklist.length} review pieces ready</strong>
            <small>
              Admins get the video path, project package, runtime, credits, audio track metadata, and your notes in one intake record.
            </small>
          </div>
          <div className="doinkManifestGrid">
            <span>
              <strong>{submissionTitle}</strong>
              Title
            </span>
            <span>
              <strong>{formatDuration(submissionDurationMs)}</strong>
              Runtime
            </span>
            <span>
              <strong>{audioTrackCount}</strong>
              Audio
            </span>
            <span>
              <strong>{doinkSubmission.preferredBlock}</strong>
              Block
            </span>
          </div>
          <div className="submissionChecklist compactChecklist">
            {doinkReviewChecklist.map((item) => (
              <span className={item.done ? "done" : ""} key={item.id} title={item.detail}>
                {item.label}
              </span>
            ))}
          </div>
          {doinkMissing.length ? (
            <small className="controlHint">Still useful to send, but better with: {doinkMissing.map((item) => item.label).join(", ")}.</small>
          ) : (
            <small className="controlHint">This is enough for a clean DoinkTV review pass.</small>
          )}
        </div>
        <div className="finishActionBar" aria-label="Finish actions">
          <button onClick={onBackendRender} disabled={backendRendering || !hasSubmissionSource}>
            <RefreshCw size={16} />
            {backendRendering ? "Rendering" : "Render Final"}
          </button>
          <a className={`buttonLike ${finalVideoUrl ? "" : "disabled"}`} href={finalVideoUrl || undefined} download>
            <Video size={16} />
            Download WEBM
          </a>
          <button onClick={onExportProject}>
            <Save size={16} />
            Package
          </button>
          <button onClick={onSubmitToDoinkTv} disabled={!hasSubmissionSource || doinkSubmitting || backendRendering}>
            <ExternalLink size={16} />
            DoinkTV
          </button>
          <button onClick={onExportVideo} disabled={!hasTargetTake || videoExporting}>
            <Video size={16} />
            {videoExporting ? "Browser Render" : "Browser WEBM"}
          </button>
          <button onClick={onExportThumbnail} disabled={!hasTargetTake}>
            <Camera size={16} />
            Thumbnail
          </button>
        </div>
      </div>

      <div className="dockGroup">
        <h2>Takes</h2>
        {takes.length ? (
          <div className="takeList">
            {takes.map((take) => (
              <button
                key={take.id}
                className={`takeButton ${selectedTake?.id === take.id ? "selected" : ""}`}
                onClick={() => onSelectTake(take.id)}
              >
                <span>{take.best ? `Best: ${take.name || "take"}` : take.name || "Untitled take"}</span>
                <small>
                  {take.scene} / {formatDuration(take.durationMs)}
                </small>
              </button>
            ))}
          </div>
        ) : (
          <div className="emptyState actionEmpty">
            <strong>No recorded takes yet.</strong>
            <span>Rehearse the scene, then record one short performance.</span>
            <button onClick={() => onModeChange("perform")}>Go Perform</button>
          </div>
        )}
      </div>

      {selectedTake && (
        <>
          <div className="dockGroup postTakeReward">
            <span className="eyebrow">Fresh Take</span>
            <strong>That is a cartoon now.</strong>
            <small>Play it back, trim the rough edges, save the scene, or push it straight into the cut.</small>
            <label className="takeNameField">
              Take Name
              <input
                value={selectedTake.name || ""}
                placeholder="Name the take before exporting"
                onChange={(event) => onTakeMetaChange({ name: event.target.value })}
              />
            </label>
            <div className="libraryActions">
              <button className={playbackActive ? "active" : ""} onClick={onPlay}>
                <Play size={16} />
                {playbackActive ? "Replaying" : "Replay"}
              </button>
              <button className={selectedTake.best ? "active" : ""} onClick={onMarkBestTake}>
                <Sparkles size={16} />
                {selectedTake.best ? "Best Take" : "Mark Best"}
              </button>
              <button onClick={() => onQuickTrim("start")}>
                <ChevronLeft size={16} />
                Trim In
              </button>
              <button onClick={() => onQuickTrim("end")}>
                <ChevronRight size={16} />
                Trim Out
              </button>
              <button onClick={onSaveTakeAsScene}>
                <Clapperboard size={16} />
                Save Scene
              </button>
              <button onClick={() => onAddTakeToTimeline(selectedTake)}>
                <Plus size={16} />
                Add Cut
              </button>
            </div>
          </div>

          <div className="dockGroup">
            <h2>Take Lanes</h2>
            <div className="laneSummaryGrid">
              {takeLaneSummary.map((lane) => (
                <div className={`laneSummaryItem ${lane.count ? "done" : ""}`} key={lane.id}>
                  <strong>{lane.count}</strong>
                  <span>{lane.label}</span>
                </div>
              ))}
            </div>
            <div className="editorStats">
              <span>
                <strong>{formatDuration(selectedTake.durationMs)}</strong>
                Duration
              </span>
              <span>
                <strong>{selectedTake.tracks.motion.length}</strong>
                Moves
              </span>
              <span>
                <strong>{selectedTake.tracks.audio.length}</strong>
                Audio Tracks
              </span>
              <span>
                <strong>{selectedTake.performers.length}</strong>
                Cast
              </span>
            </div>
            <small className="controlHint">
              Motion, mouth, camera, prop cues, and audio are kept as separate review lanes.
            </small>
          </div>

          <div className="dockGroup">
            <h2>Tracks</h2>
            {selectedTake.tracks.audio.length ? (
              selectedTake.tracks.audio.map((track) => (
                <div className="trackRow" key={track.id}>
                  <span>{track.performerName}</span>
                  <small>
                    {track.character} / {track.chunks.length} clips
                  </small>
                </div>
              ))
            ) : (
              <div className="emptyState actionEmpty">
                <strong>No audio tracks yet.</strong>
                <span>Turn on the mic, record another take, and each performer will export as a separate track.</span>
                <button onClick={() => onModeChange("perform")}>Record With Mic</button>
              </div>
            )}
          </div>

        </>
      )}

      <div className="dockGroup exportPlanPanel finishReadinessPanel">
        <h2>Finish Readiness</h2>
        <small className="controlHint">
          This mirrors the package manifest. It is not asking for perfection, just enough for a reviewable short.
        </small>
        <div className="readinessHeader">
          <strong>{readyCount}/{packageChecklist.length || 1}</strong>
          <span>{reviewTarget ? `${reviewTarget.type}: ${reviewTarget.name}` : "No review target yet"}</span>
        </div>
        <div className="renderChecklist">
          {packageChecklist.map((item) => (
            <span className={item.done ? "done" : ""} key={item.id}>
              {item.label}
            </span>
          ))}
          <span className={finalVideoPath ? "done" : ""}>WEBM rendered</span>
          <span className={reviewReadyStatuses.includes(episodeStatus) ? "done" : ""}>Review status set</span>
        </div>
        <small className="controlHint">
          {projectExport?.renderPlan?.preferredPreviewVideoName || "Export a WEBM"} /{" "}
          {projectExport?.renderPlan?.preferredThumbnailName || "export a thumbnail"}
        </small>
        {renderJob && (
          <div className={`renderJobCard ${renderJob.status === "failed" ? "failed" : ""}`}>
            <strong>Backend render: {renderJob.status}</strong>
            <small>{renderJob.output?.videoPath || "Waiting for artifact path."}</small>
            <small>Audio: {audioStatus}</small>
            {renderJob.error ? <small>Issue: {renderJob.error}</small> : null}
            {audioMux?.separateTracks?.length ? (
              <small>
                Separate tracks:{" "}
                {audioMux.separateTracks.map((track) => track.performerName || track.character || "Track").join(", ")}
              </small>
            ) : null}
          </div>
        )}
      </div>

      <div className="dockGroup doinkSubmissionPanel">
        <h2>Submit to DoinkTV</h2>
        <small className="controlHint">
          Send admins a review package with project data, credits, captions, take info, and broadcast notes.
          {doinkEndpointConfigured ? " Direct intake is configured." : " Local handoff uses the Pup-It intake endpoint."}
        </small>
        <div className="submissionGrid">
          <label>
            Short Title
            <input
              value={doinkSubmission.title}
              placeholder={selectedTake?.name || "Untitled DoinkTV short"}
              onChange={(event) => onDoinkSubmissionChange({ title: event.target.value })}
            />
          </label>
          <label>
            Creator
            <input
              value={doinkSubmission.creatorName}
              placeholder="Who should admins credit?"
              onChange={(event) => onDoinkSubmissionChange({ creatorName: event.target.value })}
            />
          </label>
          <label>
            Contact
            <input
              value={doinkSubmission.creatorContact}
              placeholder="Email, handle, or internal note"
              onChange={(event) => onDoinkSubmissionChange({ creatorContact: event.target.value })}
            />
          </label>
          <label>
            DoinkTV Block
            <select
              value={doinkSubmission.preferredBlock}
              onChange={(event) => onDoinkSubmissionChange({ preferredBlock: event.target.value })}
            >
              <option value="short">Short</option>
              <option value="bump">Bump</option>
              <option value="episode">Episode</option>
              <option value="late-night">Late Night</option>
              <option value="experimental">Experimental</option>
            </select>
          </label>
          <label className="wideField">
            Description
            <textarea
              rows={3}
              value={doinkSubmission.description}
              placeholder="What is this short, and why should it air?"
              onChange={(event) => onDoinkSubmissionChange({ description: event.target.value })}
            />
          </label>
          <label className="wideField">
            Content Notes
            <textarea
              rows={2}
              value={doinkSubmission.contentNotes}
              placeholder="Warnings, rating notes, or anything admins should know."
              onChange={(event) => onDoinkSubmissionChange({ contentNotes: event.target.value })}
            />
          </label>
          <label className="wideField">
            Rights And Credits
            <textarea
              rows={2}
              value={doinkSubmission.rightsNotes}
              onChange={(event) => onDoinkSubmissionChange({ rightsNotes: event.target.value })}
            />
          </label>
          <label className="wideField">
            Scheduling Notes
            <textarea
              rows={2}
              value={doinkSubmission.schedulingNotes}
              placeholder="Preferred slot, theme night, episode order, or leave blank."
              onChange={(event) => onDoinkSubmissionChange({ schedulingNotes: event.target.value })}
            />
          </label>
        </div>
        <div className="submissionChecklist">
          <span className={hasSubmissionSource ? "done" : ""}>Take or cut</span>
          <span className={selectedTake ? "done" : ""}>Preview target</span>
          <span className={doinkSubmission.creatorName.trim() ? "done" : ""}>Credit name</span>
          <span className={doinkSubmission.rightsNotes.trim() ? "done" : ""}>Rights note</span>
        </div>
        <small className="controlHint">When these notes look right, use the DoinkTV button in Finish actions.</small>
      </div>

      <div className="dockGroup">
        <h2>Episode Pipeline</h2>
        <label>
          Status
          <select value={episodeStatus} onChange={(event) => onEpisodeStatusChange(event.target.value)}>
            <option value="draft">Draft</option>
            <option value="rough_cut">Rough Cut</option>
            <option value="ready_for_review">Ready for Review</option>
            <option value="submitted">Submitted to DoinkTV</option>
            <option value="needs_changes">Needs Changes</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <div className="pipelineChecklist">
          <span className={takes.length ? "done" : ""}>Takes recorded</span>
          <span className={timeline.length ? "done" : ""}>Episode cut assembled</span>
          <span className={selectedTake?.audioTrackCount || selectedTake?.tracks?.audio?.length ? "done" : ""}>
            Character audio tracked
          </span>
          <span className={["approved", "scheduled", "published"].includes(episodeStatus) ? "done" : ""}>
            Producer approved
          </span>
        </div>
        <div className="reviewRoleStrip">
          <span>Performer</span>
          <span>Director</span>
          <span>Editor</span>
          <span>Producer</span>
        </div>
      </div>

      <ProductionTimeline
        clips={timeline}
        canAddSelectedTake={Boolean(selectedTake)}
        onAddSelectedTake={() => selectedTake && onAddTakeToTimeline(selectedTake)}
        onGoRecord={() => onModeChange("perform")}
        onRemoveClip={onRemoveTimelineClip}
        onMoveClip={onMoveTimelineClip}
        onTrimClip={onTrimTimelineClip}
        onUpdateClip={onUpdateTimelineClip}
      />
    </div>
  );
}
