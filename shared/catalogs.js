export const characterCatalog = [
  {
    id: "bean",
    name: "Bean",
    rig: "full-body",
    stylePreset: "trash-cutout",
    color: "#d64d2f",
    accent: "#f0d642",
    rigConfig: {
      body: "round",
      limbs: "rubber-hose",
      arms: true,
      legs: true,
      armLength: 38,
      legLength: 34,
      walkCycle: "rubber",
      mouthStyle: "flap"
    }
  },
  {
    id: "noodle",
    name: "Noodle",
    rig: "full-body",
    stylePreset: "xerox-grime",
    color: "#7bb051",
    accent: "#efe0b0",
    rigConfig: {
      body: "tall",
      limbs: "noodle",
      arms: true,
      legs: true,
      armLength: 46,
      legLength: 42,
      walkCycle: "floaty",
      mouthStyle: "flap"
    }
  },
  {
    id: "square",
    name: "Square",
    rig: "full-body",
    stylePreset: "paper-cutout",
    color: "#4f78c8",
    accent: "#f08ba2",
    rigConfig: {
      body: "block",
      limbs: "hinged",
      arms: true,
      legs: true,
      armLength: 36,
      legLength: 30,
      walkCycle: "stiff",
      mouthStyle: "shape"
    }
  },
  {
    id: "moon",
    name: "Moon",
    rig: "full-body",
    stylePreset: "ink-line",
    color: "#b884de",
    accent: "#151720",
    rigConfig: {
      body: "round",
      limbs: "stick",
      arms: true,
      legs: false,
      armLength: 34,
      legLength: 26,
      walkCycle: "floaty",
      mouthStyle: "minimal"
    }
  }
];

export const sceneCatalog = [
  { id: "studio", name: "Basement", className: "sceneStudio", horizon: 20, foreground: 82 },
  { id: "street", name: "Ditch", className: "sceneStreet", horizon: 20, foreground: 82 },
  { id: "space", name: "Bad TV", className: "sceneSpace", horizon: 20, foreground: 82 }
];

export const macroCatalog = [
  { id: "wave", name: "Wave", kind: "gesture", durationMs: 850 },
  { id: "hop", name: "Hop", kind: "movement", durationMs: 850 },
  { id: "squash", name: "Squash", kind: "deform", durationMs: 850 },
  { id: "panic", name: "Panic", kind: "emotion", durationMs: 850 }
];

export const poseCatalog = [
  {
    id: "neutral",
    name: "Neutral",
    expression: "neutral",
    bodyLean: 0,
    bodySquash: 1,
    armLeft: -34,
    armRight: 34,
    legLeft: -8,
    legRight: 8
  },
  {
    id: "listen",
    name: "Listen",
    expression: "neutral",
    bodyLean: -4,
    bodySquash: 1,
    armLeft: -12,
    armRight: 18,
    legLeft: -4,
    legRight: 5
  },
  {
    id: "point",
    name: "Point",
    expression: "mad",
    bodyLean: 3,
    bodySquash: 1,
    armLeft: -18,
    armRight: -78,
    legLeft: -10,
    legRight: 14
  },
  {
    id: "shrug",
    name: "Shrug",
    expression: "weird",
    bodyLean: 0,
    bodySquash: 0.96,
    armLeft: -76,
    armRight: 76,
    legLeft: -5,
    legRight: 5
  },
  {
    id: "surprise",
    name: "Surprise",
    expression: "weird",
    bodyLean: 0,
    bodySquash: 1.08,
    armLeft: -96,
    armRight: 96,
    legLeft: -14,
    legRight: 14
  },
  {
    id: "deadpan",
    name: "Deadpan",
    expression: "neutral",
    bodyLean: 0,
    bodySquash: 0.98,
    armLeft: 4,
    armRight: -4,
    legLeft: 0,
    legRight: 0
  }
];

export const idleMotionCatalog = [
  { id: "alive", name: "Alive" },
  { id: "subtle", name: "Subtle" },
  { id: "held", name: "Held" }
];

export const expressionCatalog = [
  { id: "neutral", name: "neutral", face: ["*", "*", "-"], blinkFace: ["-", "-", "-"] },
  { id: "happy", name: "happy", face: ["^", "^", "u"], blinkFace: ["-", "-", "u"] },
  { id: "mad", name: "mad", face: [">", "<", "-"], blinkFace: ["-", "-", "-"] },
  { id: "weird", name: "weird", face: ["o", "O", "~"], blinkFace: ["-", "-", "~"] }
];

export const animationStyleCatalog = [
  { id: "trash-cutout", name: "Trash Cutout" },
  { id: "xerox-grime", name: "Xerox Grime" },
  { id: "paper-cutout", name: "Paper Cutout" },
  { id: "ink-line", name: "Bad Ink" }
];

export const bodyShapeCatalog = [
  { id: "round", name: "Round" },
  { id: "tall", name: "Tall" },
  { id: "block", name: "Block" }
];

export const limbStyleCatalog = [
  { id: "rubber-hose", name: "Rubber Hose" },
  { id: "noodle", name: "Noodle" },
  { id: "hinged", name: "Hinged" },
  { id: "stick", name: "Stick" }
];

export const walkCycleCatalog = [
  { id: "rubber", name: "Rubber" },
  { id: "stiff", name: "Stiff" },
  { id: "floaty", name: "Floaty" },
  { id: "none", name: "None" }
];

export const mouthStyleCatalog = [
  { id: "flap", name: "Flap" },
  { id: "shape", name: "Shape" },
  { id: "minimal", name: "Minimal" }
];

export function getCatalogItem(catalog, id, fallbackIndex = 0) {
  return catalog.find((item) => item.id === id) || catalog[fallbackIndex];
}
