import { motionFeelCatalog } from "./catalogs.js";

export const defaultDepthModel = {
  horizon: 56,
  foreground: 84,
  performerHorizonBuffer: 2,
  minScale: 0.42,
  maxScale: 1.46,
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
    convergence: 0.004,
    scaleDepthStrength: 1,
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
    convergence: 0.014,
    scaleDepthStrength: 1.08,
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
    convergence: 0,
    scaleDepthStrength: 0.34,
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
    convergence: 0.003,
    scaleDepthStrength: 0.72,
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

export function hasResidualMotion(state, threshold = 0.035) {
  return Math.hypot(state.motionVx || 0, state.motionVy || 0) > threshold;
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

function easeVelocity(current, target, amount, frameScale) {
  const adjustedAmount = 1 - Math.pow(1 - amount, frameScale);
  return current + (target - current) * adjustedAmount;
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
  const currentPoint = clampPointToFloor({ x: state.x, y: state.y }, model);
  const progress = currentPoint.floor.progress;
  const softenedProgress = clamp(progress + model.horizonSoftness, 0, 1);
  const profile = getMotionProfile(state.motionFeel);
  const frameScale = clamp(input.deltaMs ?? 16.67, 8, 48) / 16.67;
  const lateralSpeed = mix(model.lateralFar, model.lateralNear, softenedProgress);
  const verticalSpeed = mix(model.verticalFar, model.verticalNear, softenedProgress);
  const movingDiagonally = input.dx !== 0 && input.dy !== 0;
  const diagonalTrim = movingDiagonally ? Math.SQRT1_2 : 1;
  const targetVx = input.dx * diagonalTrim * profile.speed * lateralSpeed;
  const targetVy = input.dy * diagonalTrim * profile.speed * verticalSpeed;
  const activelyMoving = input.dx !== 0 || input.dy !== 0;
  const easing = activelyMoving ? profile.acceleration : profile.deceleration;
  const beforeVx = state.motionVx || 0;
  const beforeVy = state.motionVy || 0;
  let motionVx = easeVelocity(state.motionVx || 0, targetVx, easing, frameScale);
  let motionVy = easeVelocity(state.motionVy || 0, targetVy, easing, frameScale);

  if (!activelyMoving && Math.hypot(motionVx, motionVy) < 0.025) {
    motionVx = 0;
    motionVy = 0;
  }

  const dx = motionVx * frameScale;
  const hitBack = currentPoint.y <= model.floor.backY + 0.001 && motionVy < 0;
  const hitFront = currentPoint.y >= model.floor.frontY - 0.001 && motionVy > 0;
  if (hitBack || hitFront) {
    motionVy = 0;
  }

  const floorRatio = getFloorRatio(currentPoint.x, currentPoint.floor);
  const proposedY = currentPoint.y + motionVy * frameScale;
  const nextFloor = getFloorAtY(proposedY, model);
  const depthProjectedX = projectFloorRatio(floorRatio, nextFloor);
  const nextXBeforeClamp = depthProjectedX + dx;
  const nextPoint = clampPointToFloor({ x: nextXBeforeClamp, y: nextFloor.y }, model);
  const hitLeft = nextPoint.x <= nextPoint.floor.left + 0.001 && motionVx < 0;
  const hitRight = nextPoint.x >= nextPoint.floor.right - 0.001 && motionVx > 0;
  if (hitLeft || hitRight) {
    motionVx = 0;
  }

  const nextScale = clamp(state.scale + input.dScale * frameScale, model.minTrim, model.maxTrim);
  const groundSpeed = Math.hypot(motionVx, motionVy);
  const accelerationX = motionVx - beforeVx;
  const accelerationY = motionVy - beforeVy;
  const travelLean = clamp(motionVx * profile.lean, -profile.maxLean, profile.maxLean);
  const anticipationLean = clamp(accelerationX * profile.maxLean * 1.5, -profile.maxLean * 0.75, profile.maxLean * 0.75);
  const anticipationSquash = clamp(1 + Math.abs(accelerationY) * 0.035 - Math.abs(accelerationX) * 0.01, 0.96, 1.08);

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
    depthProgress: nextPoint.floor.progress
  };
}
