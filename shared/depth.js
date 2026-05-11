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
  focusY: 56
};

export const perspectiveProfiles = {
  "front-stage": {
    id: "front-stage",
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
  return {
    ...defaultDepthModel,
    ...profile,
    ...depthModel,
    perspective
  };
}

export function getDepthProgress(y, depthModel = defaultDepthModel) {
  const model = resolveDepthModel(depthModel);
  const walkableTop = model.horizon + (model.performerHorizonBuffer ?? 0);
  return clamp((y - walkableTop) / (model.foreground - walkableTop), 0, 1);
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
  const progress = getDepthProgress(state.y, model);
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
  let motionVx = easeVelocity(state.motionVx || 0, targetVx, easing, frameScale);
  let motionVy = easeVelocity(state.motionVy || 0, targetVy, easing, frameScale);

  if (!activelyMoving && Math.hypot(motionVx, motionVy) < 0.025) {
    motionVx = 0;
    motionVy = 0;
  }

  const dx = motionVx * frameScale;
  const dy = motionVy * frameScale;
  const movingThroughDepth = Math.abs(motionVy) > Math.abs(motionVx) * 0.28;
  const away = motionVy < -0.02;
  const toward = motionVy > 0.02;
  const focusPull = model.vanishingX - state.x;
  const convergenceStrength = movingThroughDepth
    ? away
      ? model.convergence
      : toward
        ? model.convergence * 0.32
        : 0
    : 0;
  const convergenceX = focusPull * Math.abs(motionVy) * convergenceStrength * frameScale;
  const nextX = clamp(state.x + dx + convergenceX, 5, 92);
  const minY = model.horizon + (model.performerHorizonBuffer ?? 0);
  const nextY = clamp(state.y + dy, minY, model.foreground);
  const nextScale = clamp(state.scale + input.dScale * frameScale, model.minTrim, model.maxTrim);
  const groundSpeed = Math.hypot(motionVx, motionVy);
  const travelLean = clamp(motionVx * profile.lean, -profile.maxLean, profile.maxLean);

  return {
    ...state,
    x: nextX,
    y: nextY,
    scale: nextScale,
    facing: Math.abs(motionVx) < 0.08 ? state.facing : motionVx > 0 ? 1 : -1,
    walking: groundSpeed > 0.03,
    motionVx,
    motionVy,
    groundSpeed,
    travelLean,
    depthProgress: getDepthProgress(nextY, model)
  };
}
