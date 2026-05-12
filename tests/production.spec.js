import { expect, test } from "@playwright/test";
import { createDoinkTvSubmissionPackage, createProjectExport, createShowToolbox } from "../shared/production.js";
import { createRenderModel } from "../shared/renderModel.js";
import { buildDoinkReviewChecklist, buildRenderPreflight, summarizeFinishConfidence, summarizeTakeSpark } from "../src/workflows/finishReadiness.js";
import { getTutorialTrack, getWorkspaceIdentity, makeShortMilestones, tutorialTracks } from "../src/workflow/shortFlow.js";

test("DoinkTV package includes admin review manifest and missing-item guidance", () => {
  const project = {
    showName: "Desk Weirdos",
    roomId: "qa-room",
    timeline: [{ id: "clip-1", title: "Cold Open", duration: 12000 }],
    publishingPackage: {
      reviewTarget: { type: "timeline", id: "clip-1", name: "Cold Open" },
      thumbnail: { source: "stage" },
      captions: [{ text: "Hello from the desk." }],
      credits: [{ name: "Original prop", license: "Created in Pup-It" }],
      licenseMetadata: [{ name: "Original prop", license: "Created in Pup-It" }]
    },
    takes: [{ id: "take-1", name: "Take 1", audioTrackCount: 2 }]
  };

  const submission = createDoinkTvSubmissionPackage({
    project,
    submission: {
      title: "Desk Weirdos Test",
      creatorName: "QA Creator",
      rightsNotes: "All material created in Pup-It.",
      preferredBlock: "bump"
    },
    previewVideoFileName: "/renders/desk-weirdos.webm",
    projectPackageFileName: "desk-weirdos-package.json"
  });

  expect(submission.schemaVersion).toBe("pup-it.doinktv-submission.v2");
  expect(submission.adminSummary.missingForReview).toEqual([]);
  expect(submission.deliveryManifest.video.filename).toBe("/renders/desk-weirdos.webm");
  expect(submission.deliveryManifest.audioTracks[0].audioTrackCount).toBe(2);
  expect(submission.reviewChecklist.every((item) => item.done)).toBe(true);
});

test("Show Kit branches keep beginner actions, pro unlocks, and reusable homes together", () => {
  const toolbox = createShowToolbox({
    showName: "Tiny Arguments",
    cast: [
      {
        id: "performer-1",
        name: "The Shape",
        character: "single-shape",
        state: { characterParts: { head: { mode: "shape" }, mouth: { mode: "shape" } } }
      }
    ],
    sceneObjects: [{ id: "prop-1", name: "Bad Chair", shape: "square", texturePreset: "photocopy" }],
    sceneSets: [{ id: "set-1", name: "Kitchen", sceneObjects: [{ id: "prop-1" }] }],
    takes: [{ id: "take-1", name: "Argument Take", durationMs: 9000, best: true, audioTrackCount: 1 }],
    timeline: [{ id: "clip-1", title: "Argument Cut", duration: 9000 }],
    style: { family: "Public Access", theme: "Copy Shop", texturePreset: "photocopy" },
    episodeStatus: "draft"
  });

  expect(toolbox.schemaVersion).toBe("pup-it.show-toolbox.v2");
  expect(toolbox.branches.map((branch) => branch.id)).toEqual(["cast", "world", "performance", "finish"]);
  expect(toolbox.branches.every((branch) => branch.beginnerVersion && branch.proUnlock && branch.showKitHome)).toBe(true);
  expect(toolbox.branches.find((branch) => branch.id === "finish").ready).toBe(true);
  expect(toolbox.quickReuse.primaryCast).toBe("The Shape");
  expect(toolbox.quickReuse.primarySet).toBe("Kitchen");
  expect(toolbox.quickReuse.bestTake).toBe("Argument Take");
});

test("finish confidence separates ready enough from review ready", () => {
  const checklist = buildDoinkReviewChecklist({
    submissionTitle: "One Good Bit",
    creatorName: "QA",
    hasSubmissionSource: true,
    finishTargetLabel: "Best take",
    finalVideoPath: "",
    readiness: { readyForSubmission: true },
    readyCount: 5,
    packageChecklistLength: 5,
    rightsNotes: "Original material."
  });
  const confidence = summarizeFinishConfidence({ checklist, hasRender: false, hasSource: true });

  expect(confidence.readyEnough).toBe(true);
  expect(confidence.reviewReady).toBe(false);
  expect(confidence.missing.map((item) => item.id)).toEqual(["video"]);
});

test("workspace identity keeps the creative app modes legible", () => {
  expect(makeShortMilestones.map((step) => step.shortLabel)).toEqual(["Start", "Rig", "Space", "Perform", "Review", "Finish"]);
  expect(getWorkspaceIdentity("build")).toMatchObject({ label: "Rig", role: "Paint Studio" });
  expect(getWorkspaceIdentity("perform")).toMatchObject({ label: "Perform", role: "Live Studio" });
  expect(getWorkspaceIdentity("edit")).toMatchObject({ label: "Finish", role: "Production Desk" });
});

test("tutorial tracks scale from first cartoon to expert app tour", () => {
  expect(tutorialTracks.map((track) => track.id)).toEqual(["ultra", "beginner", "intermediate", "advanced", "expert"]);
  expect(getTutorialTrack("ultra")).toMatchObject({ setupLabel: "Set Me Up", level: "First cartoon" });
  expect(getTutorialTrack("expert").steps.length).toBeGreaterThan(6);
  expect(getTutorialTrack("missing").id).toBe("beginner");
});

test("render model preserves scene depth and direct-manipulated part offsets", () => {
  const take = {
    id: "take-offsets",
    name: "Offset Rig Take",
    scene: "studio",
    durationMs: 3000,
    performers: [
      {
        id: "performer-1",
        name: "Dragged Head",
        character: "bear",
        state: {
          x: 46,
          y: 70,
          characterParts: {
            head: { mode: "shape", shape: "circle", x: 18, y: -10, scale: 1.2 },
            torso: { mode: "shape", shape: "bean", x: -6, y: 5 }
          }
        }
      }
    ],
    tracks: { motion: [], audio: [] }
  };
  const project = createProjectExport({
    roomId: "render-depth",
    showName: "Render Depth Show",
    scene: "studio",
    perspective: "front-stage",
    sceneDepth: { horizon: 56, foreground: 84, focusX: 50, focusY: 56 },
    cameraShot: "wide",
    lightingPreset: "flat-tv",
    backgroundTheme: "painted-depth",
    objectStyle: "soft-material",
    sceneObjects: [],
    sceneSets: [],
    floorMarks: [],
    assetReferences: [],
    storyboardPanels: [],
    timeline: [],
    takes: [take]
  });
  const renderModel = createRenderModel({ project, selectedTake: take });

  expect(renderModel.sceneDepth).toMatchObject({ horizon: 56, foreground: 84, focusX: 50 });
  expect(renderModel.take.performers[0].state.characterParts.head).toMatchObject({ x: 18, y: -10, scale: 1.2 });
});

test("render preflight separates render blockers from optional review file", () => {
  const preflight = buildRenderPreflight({
    hasSubmissionSource: true,
    finishTargetLabel: "Selected take",
    renderDurationMs: 5000,
    renderClipCount: 1,
    renderDepthChecks: [
      { ready: true },
      { ready: true },
      { ready: true },
      { ready: true },
      { ready: false }
    ],
    audioReady: false,
    audioTrackCount: 0,
    renderSucceeded: false
  });

  expect(preflight.readyToRender).toBe(true);
  expect(preflight.status).toBe("ready");
  expect(preflight.blockers).toEqual([]);
  expect(preflight.checks.find((item) => item.id === "deliverable").done).toBe(false);
});

test("take spark rewards live performance ingredients", () => {
  const spark = summarizeTakeSpark({
    durationMs: 8000,
    performers: [{ id: "one" }, { id: "two" }],
    sceneObjects: [{ id: "prop" }],
    cameraShot: "reaction",
    tracks: {
      motion: [
        { type: "performer:update", state: { x: 44 } },
        { type: "performer:update", state: { x: 45, mouthOpen: 0.4 } },
        { type: "performer:update", state: { x: 46, speaking: true } },
        { type: "performer:update", state: { x: 47 } },
        { type: "macro:trigger", macro: "panic" }
      ],
      audio: [{ performerId: "one" }]
    }
  });

  expect(spark.score).toBeGreaterThanOrEqual(70);
  expect(spark.label).toMatch(/take|keeper/i);
  expect(spark.details).toContain("has a cue moment");
});
