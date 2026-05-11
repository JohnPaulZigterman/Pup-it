import { movePerformerState } from "../../shared/depth.js";

export function indexPerformers(performers) {
  return Object.fromEntries(performers.map((performer) => [performer.id, performer]));
}

export function performerList(performersById) {
  return Object.values(performersById);
}

export function upsertPerformer(performersById, performer) {
  return {
    ...performersById,
    [performer.id]: performer
  };
}

export function removePerformer(performersById, id) {
  const next = { ...performersById };
  delete next[id];
  return next;
}

export function updatePerformerState(performersById, id, statePatch) {
  const performer = performersById[id];
  if (!performer) return performersById;

  return {
    ...performersById,
    [id]: {
      ...performer,
      state: {
        ...performer.state,
        ...statePatch
      }
    }
  };
}

export function inputFromPressedKeys(pressed) {
  let dx = 0;
  let dy = 0;
  let dScale = 0;

  if (pressed.has("ArrowLeft") || pressed.has("a")) dx -= 1.2;
  if (pressed.has("ArrowRight") || pressed.has("d")) dx += 1.2;
  if (pressed.has("ArrowUp") || pressed.has("w")) dy -= 1.2;
  if (pressed.has("ArrowDown") || pressed.has("s")) dy += 1.2;
  if (pressed.has("q")) dScale -= 0.005;
  if (pressed.has("e")) dScale += 0.005;

  return { dx, dy, dScale };
}

export function hasInput(input) {
  return input.dx !== 0 || input.dy !== 0 || input.dScale !== 0;
}

export function movePerformerFromInput(performer, input, depthModel) {
  return {
    ...performer,
    state: movePerformerState(performer.state, input, depthModel)
  };
}
