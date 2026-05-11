import { expect, test } from "@playwright/test";
import { createDoinkTvSubmissionPackage, createShowToolbox } from "../shared/production.js";
import { buildDoinkReviewChecklist, summarizeFinishConfidence } from "../src/workflows/finishReadiness.js";
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
