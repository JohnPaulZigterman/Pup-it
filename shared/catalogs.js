export const characterCatalog = [
  {
    id: "bean",
    name: "Bean",
    rig: "full-body",
    stylePreset: "flat-cutout",
    color: "#f76f53",
    accent: "#fee17a",
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
    stylePreset: "flat-cutout",
    color: "#57a773",
    accent: "#f7f1d1",
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
    color: "#5d8bf4",
    accent: "#ffb7c3",
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
    color: "#d4a5ff",
    accent: "#1f2030",
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
  { id: "studio", name: "Studio", className: "sceneStudio", horizon: 20, foreground: 82 },
  { id: "street", name: "Street", className: "sceneStreet", horizon: 20, foreground: 82 },
  { id: "space", name: "Space", className: "sceneSpace", horizon: 20, foreground: 82 }
];

export const macroCatalog = [
  { id: "wave", name: "Wave", kind: "gesture", durationMs: 850 },
  { id: "hop", name: "Hop", kind: "movement", durationMs: 850 },
  { id: "squash", name: "Squash", kind: "deform", durationMs: 850 },
  { id: "panic", name: "Panic", kind: "emotion", durationMs: 850 }
];

export const expressionCatalog = [
  { id: "neutral", name: "neutral", face: ["*", "*", "-"] },
  { id: "happy", name: "happy", face: ["^", "^", "u"] },
  { id: "mad", name: "mad", face: [">", "<", "-"] },
  { id: "weird", name: "weird", face: ["o", "O", "~"] }
];

export const animationStyleCatalog = [
  { id: "flat-cutout", name: "Flat Cutout" },
  { id: "paper-cutout", name: "Paper Cutout" },
  { id: "ink-line", name: "Ink Line" }
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
