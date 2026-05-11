export const characterCatalog = [
  {
    id: "bean",
    name: "Pebble",
    rig: "full-body",
    stylePreset: "simple-doodle",
    color: "#f6a6b2",
    accent: "#fff2a8",
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
    name: "Sprout",
    rig: "full-body",
    stylePreset: "storybook-pastel",
    color: "#8fd8b5",
    accent: "#fff6d7",
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
    name: "Pocket",
    rig: "full-body",
    stylePreset: "paper-cutout",
    color: "#8db7ff",
    accent: "#ffd2df",
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
    name: "Mote",
    rig: "full-body",
    stylePreset: "soft-ink",
    color: "#c7a8ff",
    accent: "#2b2d42",
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
  { id: "studio", name: "Kitchen Moon", className: "sceneStudio", horizon: 20, foreground: 82 },
  { id: "street", name: "Soft Alley", className: "sceneStreet", horizon: 20, foreground: 82 },
  { id: "space", name: "Dream Static", className: "sceneSpace", horizon: 20, foreground: 82 }
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
  { id: "simple-doodle", name: "Simple Doodle" },
  { id: "storybook-pastel", name: "Storybook Pastel" },
  { id: "paper-cutout", name: "Paper Cutout" },
  { id: "soft-ink", name: "Soft Ink" }
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

export const characterColorSwatches = [
  "#f6a6b2",
  "#fff2a8",
  "#8fd8b5",
  "#8db7ff",
  "#c7a8ff",
  "#fff6d7",
  "#2b2d42",
  "#ffbf8f"
];

export const originalNameParts = {
  first: ["Sleepy", "Tiny", "Cloud", "Pocket", "Moon", "Toast", "Secret", "Mochi"],
  second: ["Dot", "Errand", "Soup", "Bug", "Planet", "Friend", "Button", "Wish"]
};

export function getCatalogItem(catalog, id, fallbackIndex = 0) {
  return catalog.find((item) => item.id === id) || catalog[fallbackIndex];
}
