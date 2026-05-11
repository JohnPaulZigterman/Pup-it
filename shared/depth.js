export const defaultDepthModel = {
  horizon: 20,
  foreground: 82,
  performerHorizonBuffer: 8,
  minScale: 0.42,
  maxScale: 1.46,
  minTrim: 0.82,
  maxTrim: 1.18
};

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getDepthScale(y, trim = 1, depthModel = defaultDepthModel) {
  const progress = clamp(
    (y - depthModel.horizon) / (depthModel.foreground - depthModel.horizon),
    0,
    1
  );
  const eased = Math.pow(progress, 1.18);
  return (depthModel.minScale + (depthModel.maxScale - depthModel.minScale) * eased) * trim;
}

export function movePerformerState(state, input, depthModel = defaultDepthModel) {
  const nextX = clamp(state.x + input.dx, 5, 92);
  const minY = depthModel.horizon + (depthModel.performerHorizonBuffer ?? 0);
  const nextY = clamp(state.y + input.dy, minY, depthModel.foreground);
  const nextScale = clamp(state.scale + input.dScale, depthModel.minTrim, depthModel.maxTrim);

  return {
    ...state,
    x: nextX,
    y: nextY,
    scale: nextScale,
    facing: input.dx === 0 ? state.facing : input.dx > 0 ? 1 : -1,
    walking: input.dx !== 0 || input.dy !== 0
  };
}
