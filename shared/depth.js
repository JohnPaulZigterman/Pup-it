import { motionFeelCatalog } from "./catalogs.js";

export const defaultDepthModel = {
  horizon: 56,
  foreground: 84,
  performerHorizonBuffer: 2,
  minScale: 0.74,
  maxScale: 1.12,
  minTrim: 0.82,
  maxTrim: 1.18,
  perspective: "front-stage",
  horizonSource: "focus-point",
  vanishingX: 50,
  focusY: 56,
  floor: {
    backY: 58,
    frontY: 84,
    backLeft: 22,
    backRight: 78,
    frontLeft: 8,
    frontRight: 92
  }
};

export const perspectiveProfiles = {
  "front-stage": {
    id: "front-stage",
    floor: {
      backLeft: 20,
      backRight: 80,
      frontLeft: 7,
      frontRight: 93
    },
    lateralFar: 0.56,
    lateralNear: 1,
    verticalFar: 0.72,
    verticalNear: 1,
    floorSpeed: 0.014,
    scaleDepthStrength: 0.72,
    scaleCurve: 1.08,
    horizonSoftness: 0.16
  },
  "street-depth": {
    id: "street-depth",
    floor: {
      backLeft: 40,
      backRight: 67,
      frontLeft: 5,
      frontRight: 96
    },
    lateralFar: 0.38,
    lateralNear: 0.98,
    verticalFar: 0.6,
    verticalNear: 0.92,
    floorSpeed: 0.0135,
    scaleDepthStrength: 0.86,
    scaleCurve: 1.18,
    horizonSoftness: 0.2
  },
  "side-view": {
    id: "side-view",
    floor: {
      backLeft: 7,
      backRight: 93,
      frontLeft: 5,
      frontRight: 95
    },
    lateralFar: 0.86,
    lateralNear: 0.96,
    verticalFar: 0.34,
    verticalNear: 0.48,
    floorSpeed: 0.0135,
    scaleDepthStrength: 0.22,
    scaleCurve: 1,
    horizonSoftness: 0.22
  },
  "surreal-float": {
    id: "surreal-float",
    floor: {
      backLeft: 14,
      backRight: 86,
      frontLeft: 9,
      frontRight: 91
    },
    lateralFar: 0.72,
    lateralNear: 0.86,
    verticalFar: 0.64,
    verticalNear: 0.78,
    floorSpeed: 0.012,
    scaleDepthStrength: 0.34,
    scaleCurve: 1.05,
    horizonSoftness: 0.28
  }
};

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function resolveDepthModel(depthModel = defaultDepthModel) {
  const perspective = depthModel.perspective || defaultDepthModel.perspective;
  const profile = perspectiveProfiles[perspective] || perspectiveProfiles[defaultDepthModel.perspective];
  const walkableTop =
    depthModel.movementModel?.floor?.backY ??
    depthModel.floor?.backY ??
    depthModel.horizon + (depthModel.performerHorizonBuffer ?? defaultDepthModel.performerHorizonBuffer);
  const walkableBottom =
    depthModel.movementModel?.floor?.frontY ??
    depthModel.floor?.frontY ??
    depthModel.foreground ??
    defaultDepthModel.foreground;
  const floor = {
    ...defaultDepthModel.floor,
    ...profile.floor,
    backY: walkableTop,
    frontY: walkableBottom,
    ...(depthModel.floor || {}),
    ...(depthModel.movementModel?.floor || {})
  };
  return {
    ...defaultDepthModel,
    ...profile,
    ...depthModel,
    ...(depthModel.movementModel || {}),
    perspective,
    floor
  };
}

export function getDepthProgress(y, depthModel = defaultDepthModel) {
  const model = resolveDepthModel(depthModel);
  return clamp((y - model.floor.backY) / (model.floor.frontY - model.floor.backY), 0, 1);
}

function mix(from, to, progress) {
  return from + (to - from) * progress;
}

export const motionProfiles = {
  ...Object.fromEntries(motionFeelCatalog.map((profile) => [profile.id, profile]))
};

export function getMotionProfile(id = "smooth") {
  return motionProfiles[id] || motionProfiles.smooth;
}

export function hasResidualMotion(state, threshold = 0.00035) {
  return Math.hypot(state.motionVx || 0, state.motionVy || 0) > threshold;
}

function snapVelocity(value, target, floorSpeed) {
  const snapThreshold = Math.max(0.00024, floorSpeed * 0.055);
  if (target === 0 && Math.abs(value) < snapThreshold) return 0;
  return value;
}

export function getFloorAtY(y, depthModel = defaultDepthModel) {
  const model = resolveDepthModel(depthModel);
  const clampedY = clamp(y, model.floor.backY, model.floor.frontY);
  const progress = getDepthProgress(clampedY, model);
  return {
    y: clampedY,
    progress,
    left: mix(model.floor.backLeft, model.floor.frontLeft, progress),
    right: mix(model.floor.backRight, model.floor.frontRight, progress)
  };
}

export function clampPointToFloor(point, depthModel = defaultDepthModel) {
  const floor = getFloorAtY(point.y, depthModel);
  return {
    x: clamp(point.x, floor.left, floor.right),
    y: floor.y,
    floor
  };
}

function getFloorRatio(x, floor) {
  const width = Math.max(1, floor.right - floor.left);
  return clamp((x - floor.left) / width, 0, 1);
}

function projectFloorRatio(ratio, floor) {
  return floor.left + (floor.right - floor.left) * ratio;
}

export function getFloorCoordinates(point, depthModel = defaultDepthModel) {
  const clamped = clampPointToFloor(point, depthModel);
  return {
    u: getFloorRatio(clamped.x, clamped.floor),
    z: clamped.floor.progress,
    point: clamped
  };
}

export function projectFloorCoordinates(coords, depthModel = defaultDepthModel) {
  const model = resolveDepthModel(depthModel);
  const z = clamp(coords.z, 0, 1);
  const y = mix(model.floor.backY, model.floor.frontY, z);
  const floor = getFloorAtY(y, model);
  const x = projectFloorRatio(clamp(coords.u, 0, 1), floor);
  return {
    x,
    y,
    floor
  };
}

function easeVelocity(current, target, amount, frameScale) {
  const adjustedAmount = 1 - Math.pow(1 - amount, frameScale);
  return current + (target - current) * adjustedAmount;
}

function easeSignal(current, target, amount, frameScale) {
  const safeCurrent = Number.isFinite(current) ? current : target;
  const adjustedAmount = 1 - Math.pow(1 - amount, frameScale);
  return safeCurrent + (target - safeCurrent) * adjustedAmount;
}

function cleanInputAxis(value, deadzone = 0.08) {
  if (Math.abs(value) < deadzone) return 0;
  const sign = Math.sign(value);
  const cleaned = (Math.abs(value) - deadzone) / (1 - deadzone);
  return clamp(cleaned, 0, 1) * sign;
}

function getAxisEase(current, target, activeEase, stopEase, reversalBoost = 1.75) {
  const baseEase = target === 0 ? stopEase : activeEase;
  return current * target < 0 ? Math.min(0.94, baseEase * reversalBoost) : baseEase;
}

export function getDepthScale(y, trim = 1, depthModel = defaultDepthModel) {
  const model = resolveDepthModel(depthModel);
  const progress = getDepthProgress(y, model);
  const eased = Math.pow(progress, model.scaleCurve);
  const balanced = 0.5 + (eased - 0.5) * model.scaleDepthStrength;
  const adjusted = clamp(balanced, 0, 1);
  return (model.minScale + (model.maxScale - model.minScale) * adjusted) * trim;
}

export function movePerformerState(state, input, depthModel = defaultDepthModel) {
  const model = resolveDepthModel(depthModel);
  const currentCoords = getFloorCoordinates({ x: state.x, y: state.y }, model);
  const progress = currentCoords.z;
  const softenedProgress = clamp(progress + model.horizonSoftness, 0, 1);
  const profile = getMotionProfile(state.motionFeel);
  const frameScale = clamp(input.deltaMs ?? 16.67, 8, 48) / 16.67;
  const lateralSpeed = mix(model.lateralFar, model.lateralNear, softenedProgress) * (model.floorSpeed || 0.012);
  const verticalSpeed = ((model.verticalFar + model.verticalNear) / 2) * (model.floorSpeed || 0.012);
  const inputX = cleanInputAxis(input.dx || 0, profile.deadzone);
  const inputY = cleanInputAxis(input.dy || 0, profile.deadzone);
  const movingDiagonally = inputX !== 0 && inputY !== 0;
  const diagonalTrim = movingDiagonally ? Math.SQRT1_2 : 1;
  const speedMultiplier = clamp(input.speedMultiplier ?? 1, 0.35, 1.5);
  const targetVx = inputX * diagonalTrim * profile.speed * speedMultiplier * lateralSpeed;
  const targetVy = inputY * diagonalTrim * profile.speed * speedMultiplier * verticalSpeed;
  const beforeVx = state.motionVx || 0;
  const beforeVy = state.motionVy || 0;
  const easingX = getAxisEase(beforeVx, targetVx, profile.acceleration, profile.deceleration, profile.reversal);
  const easingY = getAxisEase(
    beforeVy,
    targetVy,
    profile.depthAcceleration || profile.acceleration,
    profile.depthDeceleration || profile.deceleration,
    profile.reversal
  );
  let motionVx = easeVelocity(beforeVx, targetVx, easingX, frameScale);
  let motionVy = easeVelocity(beforeVy, targetVy, easingY, frameScale);

  const floorSpeed = model.floorSpeed || 0.012;

  motionVx = snapVelocity(motionVx, targetVx, floorSpeed);
  motionVy = snapVelocity(motionVy, targetVy, floorSpeed);

  if (targetVx === 0 && targetVy === 0 && Math.hypot(motionVx, motionVy) < floorSpeed * 0.1) {
    motionVx = 0;
    motionVy = 0;
  }

  const hitBack = currentCoords.z <= 0.001 && motionVy < 0;
  const hitFront = currentCoords.z >= 0.999 && motionVy > 0;
  if (hitBack || hitFront) {
    motionVy = 0;
  }

  const nextCoords = {
    u: clamp(currentCoords.u + motionVx * frameScale, 0, 1),
    z: clamp(currentCoords.z + motionVy * frameScale, 0, 1)
  };
  const nextPoint = projectFloorCoordinates(nextCoords, model);
  const hitLeft = nextCoords.u <= 0.001 && motionVx < 0;
  const hitRight = nextCoords.u >= 0.999 && motionVx > 0;
  if (hitLeft || hitRight) {
    motionVx = 0;
  }

  const nextScale = clamp(state.scale + input.dScale * frameScale, model.minTrim, model.maxTrim);
  const groundSpeed = Math.hypot(motionVx, motionVy) / floorSpeed;
  const accelerationX = motionVx - beforeVx;
  const accelerationY = motionVy - beforeVy;
  const travelLean = clamp((motionVx / floorSpeed) * profile.lean, -profile.maxLean, profile.maxLean);
  const anticipationLean = clamp((accelerationX / floorSpeed) * profile.maxLean * 1.5, -profile.maxLean * 0.75, profile.maxLean * 0.75);
  const settleSource = Math.max(Math.abs(accelerationX), Math.abs(accelerationY)) / floorSpeed;
  const settleAmount = clamp(settleSource * (profile.settle || 0.7), 0, 1);
  const walkBounce = clamp(groundSpeed * (profile.bounce || 0.7), 0, 1.45);
  const anticipationSquash = clamp(
    1 + Math.abs(accelerationY / floorSpeed) * 0.026 - Math.abs(accelerationX / floorSpeed) * 0.008,
    0.975,
    1.055
  );
  const visualEase = targetVx === 0 && targetVy === 0 ? 0.18 + (profile.deceleration || 0.5) * 0.25 : 0.34 + (profile.acceleration || 0.5) * 0.28;
  const visualLean = easeSignal(state.visualLean, travelLean + anticipationLean * 0.75, visualEase, frameScale);
  const visualBounce = easeSignal(state.visualBounce, walkBounce, visualEase, frameScale);
  const visualSquash = easeSignal(state.visualSquash, anticipationSquash, visualEase, frameScale);

  return {
    ...state,
    x: nextPoint.x,
    y: nextPoint.y,
    scale: nextScale,
    facing: Math.abs(motionVx) < 0.08 ? state.facing : motionVx > 0 ? 1 : -1,
    walking: groundSpeed > 0.03,
    motionVx,
    motionVy,
    groundSpeed,
    travelLean,
    anticipationLean,
    anticipationSquash,
    settleAmount,
    walkBounce,
    visualLean,
    visualBounce,
    visualSquash,
    motionIntent: inputX || inputY ? "moving" : groundSpeed > 0.03 ? "settling" : "idle",
    depthProgress: nextPoint.floor.progress
  };
}
