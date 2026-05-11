import { expect, test } from "@playwright/test";
import { createDoinkTvSubmissionPackage } from "../shared/production.js";

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

