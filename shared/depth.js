export const defaultDepthModel = {
  horizon: 20,
  foreground: 82,
  performerHorizonBuffer: 8,
  minScale: 0.42,
  maxScale: 1.46,
  minTrim: 0.82,
  maxTrim: 1.18,
  perspective: "front-stage",
  vanishingX: 50
};

export const perspectiveProfiles = {
  "front-stage": {
    id: "front-stage",
    lateralFar: 0.56,
    lateralNear: 1,
    verticalFar: 0.72,
    verticalNear: 1,
    convergence: 0.012,
    scaleDepthStrength: 1,
    scaleCurve: 1.18
  },
  "street-depth": {
    id: "street-depth",
    lateralFar: 0.38,
    lateralNear: 0.98,
    verticalFar: 0.6,
    verticalNear: 0.92,
    convergence: 0.028,
    scaleDepthStrength: 1.08,
    scaleCurve: 1.28
  },
  "side-view": {
    id: "side-view",
    lateralFar: 0.86,
    lateralNear: 0.96,
    verticalFar: 0.34,
    verticalNear: 0.48,
    convergence: 0,
    scaleDepthStrength: 0.34,
    scaleCurve: 1
  },
  "surreal-float": {
    id: "surreal-float",
    lateralFar: 0.72,
    lateralNear: 0.86,
    verticalFar: 0.64,
    verticalNear: 0.78,
    convergence: 0.006,
    scaleDepthStrength: 0.72,
    scaleCurve: 1.05
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
  return clamp((y - model.horizon) / (model.foreground - model.horizon), 0, 1);
}

function mix(from, to, progress) {
  return from + (to - from) * progress;
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
  const lateralSpeed = mix(model.lateralFar, model.lateralNear, progress);
  const verticalSpeed = mix(model.verticalFar, model.verticalNear, progress);
  const dx = input.dx * lateralSpeed;
  const dy = input.dy * verticalSpeed;
  const away = input.dy < 0;
  const toward = input.dy > 0;
  const convergenceDirection = away
    ? model.vanishingX - state.x
    : toward
      ? state.x - model.vanishingX
      : 0;
  const convergenceX = convergenceDirection * Math.abs(input.dy) * model.convergence;
  const nextX = clamp(state.x + dx + convergenceX, 5, 92);
  const minY = model.horizon + (model.performerHorizonBuffer ?? 0);
  const nextY = clamp(state.y + dy, minY, model.foreground);
  const nextScale = clamp(state.scale + input.dScale, model.minTrim, model.maxTrim);
  const groundSpeed = Math.hypot(dx, dy);

  return {
    ...state,
    x: nextX,
    y: nextY,
    scale: nextScale,
    facing: input.dx === 0 ? state.facing : input.dx > 0 ? 1 : -1,
    walking: input.dx !== 0 || input.dy !== 0,
    groundSpeed,
    depthProgress: getDepthProgress(nextY, model)
  };
}
