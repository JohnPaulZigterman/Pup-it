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

  expect(getDepthProgress(back.y, street)).toBe(0);
  expect(getDepthProgress(front.y, street)).toBe(1);
  expect(getDepthScale(back.y, 1, street)).toBeLessThan(getDepthScale(front.y, 1, street));
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
