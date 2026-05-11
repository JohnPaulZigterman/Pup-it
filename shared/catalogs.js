export const characterCatalog = [
  {
    id: "bean",
    name: "Bean",
    rig: "simple-body",
    stylePreset: "flat-cutout",
    color: "#f76f53",
    accent: "#fee17a"
  },
  {
    id: "noodle",
    name: "Noodle",
    rig: "simple-body",
    stylePreset: "flat-cutout",
    color: "#57a773",
    accent: "#f7f1d1"
  },
  {
    id: "square",
    name: "Square",
    rig: "simple-body",
    stylePreset: "flat-cutout",
    color: "#5d8bf4",
    accent: "#ffb7c3"
  },
  {
    id: "moon",
    name: "Moon",
    rig: "simple-body",
    stylePreset: "flat-cutout",
    color: "#d4a5ff",
    accent: "#1f2030"
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

export function getCatalogItem(catalog, id, fallbackIndex = 0) {
  return catalog.find((item) => item.id === id) || catalog[fallbackIndex];
}
