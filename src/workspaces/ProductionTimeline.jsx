import React from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

function formatClipDuration(duration) {
  if (typeof duration === "number") {
    const seconds = Math.max(0, Math.round(duration / 1000));
    const minutes = Math.floor(seconds / 60);
    const remainder = String(seconds % 60).padStart(2, "0");
    return `${minutes}:${remainder}`;
  }
  return duration || "0:05";
}

export function ProductionTimeline({
  clips,
  canAddSelectedTake = false,
  onAddSelectedTake,
  onGoRecord,
  onRemoveClip,
  onMoveClip,
  onTrimClip,
  onUpdateClip
}) {
  const totalDuration = clips.reduce((total, clip) => total + (typeof clip.duration === "number" ? clip.duration : 0), 0);

  return (
    <div className="dockGroup productionTimelinePanel">
      <h2>Episode Assembly</h2>
      <small className="controlHint">
        Rough cuts now render as ordered clips. Keep it lightweight: arrange, trim, rename, render.
      </small>
      {clips.length ? (
        <>
          <div className="roughCutSummary">
            <span>
              <strong>{clips.length}</strong>
              Clips
            </span>
            <span>
              <strong>{formatClipDuration(totalDuration)}</strong>
              Total
            </span>
            <span>
              <strong>{clips.filter((clip) => clip.sourceType === "take").length}</strong>
              Takes
            </span>
          </div>
          <div className="timelineList">
            {clips.map((clip, index) => (
              <div className="timelineClip" key={clip.id}>
                <span>{index + 1}</span>
                <div>
                  <input
                    value={clip.title}
                    aria-label={`Rename ${clip.title}`}
                    onChange={(event) => onUpdateClip(clip.id, { title: event.target.value })}
                  />
                  <small>
                    {clip.sourceType} / {clip.shot} / {formatClipDuration(clip.duration)}
                  </small>
                </div>
                <div className="timelineClipActions">
                  <button aria-label={`Move ${clip.title} earlier`} onClick={() => onMoveClip(clip.id, -1)} disabled={index === 0}>
                    <ChevronLeft size={14} />
                  </button>
                  <button aria-label={`Shorten ${clip.title}`} onClick={() => onTrimClip(clip.id, -500)}>
                    -0.5s
                  </button>
                  <button aria-label={`Lengthen ${clip.title}`} onClick={() => onTrimClip(clip.id, 500)}>
                    +0.5s
                  </button>
                  <button aria-label={`Move ${clip.title} later`} onClick={() => onMoveClip(clip.id, 1)} disabled={index === clips.length - 1}>
                    <ChevronRight size={14} />
                  </button>
                  <button aria-label={`Remove ${clip.title}`} onClick={() => onRemoveClip(clip.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="emptyState actionEmpty">
          <strong>No rough cut yet.</strong>
          <span>Add the selected take, record one, or storyboard a shot. Rough cuts render in order.</span>
          <div className="emptyActionRow">
            <button onClick={onAddSelectedTake} disabled={!canAddSelectedTake}>
              Add Selected Take
            </button>
            <button onClick={onGoRecord}>Record Take</button>
          </div>
        </div>
      )}
    </div>
  );
}
