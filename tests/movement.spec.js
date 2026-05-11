import { expect, test } from "@playwright/test";
import { sceneCatalog } from "../shared/catalogs.js";
import {
  clampPointToFloor,
  getDepthProgress,
  getDepthScale,
  getFloorAtY,
  movePerformerState
} from "../shared/depth.js";
import { createPerformerState } from "../shared/schema.js";

const scene = (id) => sceneCatalog.find((item) => item.id === id);

function step(state, input, depthModel, count = 24) {
  let next = state;
  for (let index = 0; index < count; index += 1) {
    next = movePerformerState(next, { deltaMs: 16.67, dScale: 0, ...input }, depthModel);
  }
  return next;
}

test("scene floor clamps characters at the horizon and foreground", () => {
  const studio = scene("studio");
  const floorBack = getFloorAtY(0, studio);
  const floorFront = getFloorAtY(100, studio);
  const base = createPerformerState({ x: 50, y: 62, motionFeel: "direct" });

  const upstage = step(base, { dx: 0, dy: -1.2 }, studio, 90);
  expect(upstage.y).toBeGreaterThanOrEqual(floorBack.y);
  expect(Math.abs(upstage.motionVy)).toBeLessThan(0.05);

  const downstage = step(base, { dx: 0, dy: 1.2 }, studio, 120);
  expect(downstage.y).toBeLessThanOrEqual(floorFront.y);
  expect(Math.abs(downstage.motionVy)).toBeLessThan(0.05);
});

test("depth scale gets smaller away from the foreground", () => {
  const street = scene("street");
  const back = getFloorAtY(0, street);
  const front = getFloorAtY(100, street);
  const backScale = getDepthScale(back.y, 1, street);
  const frontScale = getDepthScale(front.y, 1, street);

  expect(getDepthProgress(back.y, street)).toBe(0);
  expect(getDepthProgress(front.y, street)).toBe(1);
  expect(backScale).toBeLessThan(frontScale);
  expect(frontScale - backScale).toBeLessThan(0.4);
});

test("upstage and downstage travel are even on the floor", () => {
  const studio = scene("studio");
  const base = createPerformerState({ x: 50, y: 70, motionFeel: "direct" });
  const upstage = step(base, { dx: 0, dy: -1.2 }, studio, 30);
  const downstage = step(base, { dx: 0, dy: 1.2 }, studio, 30);
  const upTravel = Math.abs(getDepthProgress(base.y, studio) - getDepthProgress(upstage.y, studio));
  const downTravel = Math.abs(getDepthProgress(downstage.y, studio) - getDepthProgress(base.y, studio));

  expect(Math.abs(upTravel - downTravel)).toBeLessThan(0.035);
});

test("motion feel presets expose performance-layer movement values", () => {
  const studio = scene("studio");
  const base = createPerformerState({ x: 50, y: 70, motionFeel: "loose" });
  const moved = step(base, { dx: 1.2, dy: 0 }, studio, 16);

  expect(moved.groundSpeed).toBeGreaterThan(0);
  expect(moved.travelLean).not.toBe(0);
  expect(moved.walkBounce).toBeGreaterThan(0);
  expect(moved.settleAmount).toBeGreaterThan(0);
});

test("smooth motion reaches useful speed quickly and settles cleanly", () => {
  const studio = scene("studio");
  const base = createPerformerState({ x: 50, y: 70, motionFeel: "smooth" });
  const started = step(base, { dx: 1, dy: 0 }, studio, 6);
  const continued = step(started, { dx: 1, dy: 0 }, studio, 12);
  const stopped = step(continued, { dx: 0, dy: 0 }, studio, 16);

  expect(started.x - base.x).toBeGreaterThan(3);
  expect(continued.groundSpeed).toBeGreaterThan(0.75);
  expect(stopped.groundSpeed).toBeLessThan(0.08);
  expect(stopped.walking).toBe(false);
});

test("movement speed modifiers help performers scoot or make tiny marks", () => {
  const studio = scene("studio");
  const base = createPerformerState({ x: 50, y: 70, motionFeel: "smooth" });
  const regular = step(base, { dx: 1, dy: 0, speedMultiplier: 1 }, studio, 18);
  const scoot = step(base, { dx: 1, dy: 0, speedMultiplier: 1.35 }, studio, 18);
  const tiny = step(base, { dx: 1, dy: 0, speedMultiplier: 0.45 }, studio, 18);

  expect(scoot.x - base.x).toBeGreaterThan(regular.x - base.x);
  expect(tiny.x - base.x).toBeLessThan(regular.x - base.x);
  expect(scoot.x).toBeLessThanOrEqual(getFloorAtY(scoot.y, studio).right);
});

test("performance visuals ease after movement instead of popping", () => {
  const studio = scene("studio");
  const base = createPerformerState({ x: 50, y: 70, motionFeel: "loose" });
  const moving = step(base, { dx: 1, dy: 0 }, studio, 14);
  const settling = step(moving, { dx: 0, dy: 0 }, studio, 4);
  const stopped = step(settling, { dx: 0, dy: 0 }, studio, 24);

  expect(Math.abs(moving.visualLean)).toBeGreaterThan(1);
  expect(Math.abs(settling.visualLean)).toBeGreaterThan(0.2);
  expect(Math.abs(stopped.visualLean)).toBeLessThan(Math.abs(settling.visualLean));
  expect(stopped.visualBounce).toBeLessThan(moving.visualBounce);
});

test("depth movement starts without visible hesitation", () => {
  const studio = scene("studio");
  const base = createPerformerState({ x: 50, y: 70, motionFeel: "smooth" });
  const moved = step(base, { dx: 0, dy: -1 }, studio, 8);
  const travel = Math.abs(getDepthProgress(base.y, studio) - getDepthProgress(moved.y, studio));

  expect(travel).toBeGreaterThan(0.08);
  expect(moved.y).toBeLessThan(base.y);
});

test("direction reversal is responsive without jumping off the floor", () => {
  const studio = scene("studio");
  const base = createPerformerState({ x: 50, y: 70, motionFeel: "smooth" });
  const away = step(base, { dx: 0, dy: -1.2 }, studio, 18);
  const returned = step(away, { dx: 0, dy: 1.2 }, studio, 18);

  expect(returned.y).toBeGreaterThan(away.y);
  expect(returned.y).toBeLessThanOrEqual(getFloorAtY(100, studio).y);
  expect(Math.abs(returned.motionVy)).toBeLessThan(0.03);
});

test("street depth preserves floor position while converging toward the horizon", () => {
  const street = scene("street");
  const front = getFloorAtY(100, street);
  const start = createPerformerState({
    x: front.left + (front.right - front.left) * 0.18,
    y: front.y,
    motionFeel: "direct"
  });
  const movedAway = step(start, { dx: 0, dy: -1.2 }, street, 40);
  const movedFloor = getFloorAtY(movedAway.y, street);

  expect(movedAway.x).toBeGreaterThanOrEqual(movedFloor.left);
  expect(movedAway.x).toBeLessThanOrEqual(movedFloor.right);
  expect(movedAway.x).toBeGreaterThan(start.x);
});

test("side-view movement keeps vertical travel subdued", () => {
  const sideView = {
    ...scene("studio"),
    perspective: "side-view",
    movementModel: {
      floor: {
        backLeft: 7,
        backRight: 93,
        frontLeft: 5,
        frontRight: 95
      }
    }
  };
  const base = createPerformerState({ x: 50, y: 70, motionFeel: "smooth" });
  const horizontal = step(base, { dx: 1.2, dy: 0 }, sideView, 20);
  const vertical = step(base, { dx: 0, dy: 1.2 }, sideView, 20);

  expect(horizontal.x - base.x).toBeGreaterThan(vertical.y - base.y);
});

test("manual floor clamp uses scene-specific trapezoid edges", () => {
  const street = scene("street");
  const clamped = clampPointToFloor({ x: 2, y: 48 }, street);

  expect(clamped.y).toBeGreaterThanOrEqual(street.horizon + street.performerHorizonBuffer);
  expect(clamped.x).toBeGreaterThanOrEqual(clamped.floor.left);
});
