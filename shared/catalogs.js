export const characterCatalog = [
  {
    id: "bear",
    name: "Bear",
    archetype: "bear",
    rig: "full-body",
    stylePreset: "storybook-pastel",
    color: "#9b6b4a",
    accent: "#fff2a8",
    rigConfig: {
      body: "round",
      limbs: "rubber-hose",
      arms: true,
      legs: true,
      armLength: 44,
      legLength: 30,
      walkCycle: "rubber",
      mouthStyle: "flap"
    }
  },
  {
    id: "mouse",
    name: "Mouse",
    archetype: "mouse",
    rig: "full-body",
    stylePreset: "simple-doodle",
    color: "#b6b1c9",
    accent: "#ffd2df",
    rigConfig: {
      body: "tall",
      limbs: "noodle",
      arms: true,
      legs: true,
      armLength: 38,
      legLength: 44,
      walkCycle: "floaty",
      mouthStyle: "flap"
    }
  },
  {
    id: "owl",
    name: "Owl",
    archetype: "owl",
    rig: "full-body",
    stylePreset: "paper-cutout",
    color: "#8db7ff",
    accent: "#fff2a8",
    rigConfig: {
      body: "round",
      limbs: "hinged",
      arms: true,
      legs: true,
      armLength: 50,
      legLength: 24,
      walkCycle: "stiff",
      mouthStyle: "shape"
    }
  },
  {
    id: "snake",
    name: "Snake",
    archetype: "snake",
    rig: "full-body",
    stylePreset: "soft-ink",
    color: "#8fd8b5",
    accent: "#2b2d42",
    rigConfig: {
      body: "tall",
      limbs: "stick",
      arms: false,
      legs: false,
      armLength: 22,
      legLength: 18,
      walkCycle: "floaty",
      mouthStyle: "minimal"
    }
  }
];

export const sceneCatalog = [
  {
    id: "studio",
    name: "Kitchen Moon",
    className: "sceneStudio",
    horizon: 20,
    foreground: 82,
    performerHorizonBuffer: 8
  },
  {
    id: "street",
    name: "Soft Alley",
    className: "sceneStreet",
    horizon: 20,
    foreground: 82,
    performerHorizonBuffer: 8
  },
  {
    id: "space",
    name: "Dream Static",
    className: "sceneSpace",
    horizon: 20,
    foreground: 82,
    performerHorizonBuffer: 8
  }
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
  {
    id: "simple-doodle",
    name: "Simple Doodle",
    family: "Indie Web",
    theme: "Handmade Bright",
    palette: ["#f6a6b2", "#fff2a8", "#8fd8b5"]
  },
  {
    id: "storybook-pastel",
    name: "Storybook Pastel",
    family: "Family TV",
    theme: "Soft Cozy",
    palette: ["#8fd8b5", "#fff6d7", "#c7a8ff"]
  },
  {
    id: "paper-cutout",
    name: "Paper Cutout",
    family: "Limited Cutout",
    theme: "Construction Paper",
    palette: ["#8db7ff", "#ffd2df", "#fff2a8"]
  },
  {
    id: "soft-ink",
    name: "Soft Ink",
    family: "Modern Adult",
    theme: "Warm Offbeat",
    palette: ["#c7a8ff", "#fff6d7", "#2b2d42"]
  },
  {
    id: "chibi-pop",
    name: "Chibi Pop",
    family: "Anime Comedy",
    theme: "Candy Energy",
    palette: ["#ff9ad5", "#8db7ff", "#fff2a8"]
  },
  {
    id: "sitcom-line",
    name: "Sitcom Line",
    family: "Primetime Sitcom",
    theme: "Clean Broadcast",
    palette: ["#f5c07a", "#9ed0ff", "#f2f0dd"]
  },
  {
    id: "minimal-comic",
    name: "Minimal Comic",
    family: "Newspaper Comic",
    theme: "Deadpan Strip",
    palette: ["#f7f3df", "#2b2d42", "#efcf55"]
  },
  {
    id: "flat-paper",
    name: "Flat Paper",
    family: "Motion Graphic",
    theme: "Poster Shapes",
    palette: ["#ffbf8f", "#8fd8b5", "#2b2d42"]
  },
  {
    id: "paper-diorama",
    name: "Paper Diorama",
    family: "Paper RPG",
    theme: "Layered Stage",
    palette: ["#f2d16b", "#78b6e8", "#f16f5c"]
  },
  {
    id: "adult-surreal",
    name: "Adult Surreal",
    family: "Late-Night Weird",
    theme: "Mixed Media",
    palette: ["#e96f4c", "#ffe66d", "#312b38"]
  },
  {
    id: "prestige-clean",
    name: "Prestige Clean",
    family: "Streaming Comedy",
    theme: "Polished Flat",
    palette: ["#f1c27d", "#78b6e8", "#f9f1dc"]
  },
  {
    id: "action-anime",
    name: "Action Anime",
    family: "Action Adventure",
    theme: "Sharp Impact",
    palette: ["#f05d5e", "#2b2d42", "#f4f4ff"]
  },
  {
    id: "puppet-collage",
    name: "Puppet Collage",
    family: "Live Puppet",
    theme: "Felt Cutout",
    palette: ["#6fb98f", "#f2d16b", "#845c44"]
  }
];

export const styleAdapterCatalog = [
  {
    id: "simple-doodle",
    bodyScaleX: 1,
    bodyScaleY: 1,
    limbScale: 1,
    eyeScale: 1,
    lineWidth: 4,
    corner: "47% 53% 38% 45%",
    outline: "#2b2d42",
    highlightOpacity: 0.22,
    shadowOpacity: 0.16,
    textureOpacity: 0.08
  },
  {
    id: "storybook-pastel",
    bodyScaleX: 1.02,
    bodyScaleY: 1.06,
    limbScale: 1.05,
    eyeScale: 1.04,
    lineWidth: 4,
    corner: "50% 50% 40% 42%",
    outline: "#3f4256",
    highlightOpacity: 0.34,
    shadowOpacity: 0.12,
    textureOpacity: 0.05
  },
  {
    id: "paper-cutout",
    bodyScaleX: 1.04,
    bodyScaleY: 0.96,
    limbScale: 0.92,
    eyeScale: 0.92,
    lineWidth: 4,
    corner: "12px 18px 10px 16px",
    outline: "#25242e",
    highlightOpacity: 0.12,
    shadowOpacity: 0.22,
    textureOpacity: 0.12
  },
  {
    id: "soft-ink",
    bodyScaleX: 0.98,
    bodyScaleY: 1.03,
    limbScale: 0.96,
    eyeScale: 0.98,
    lineWidth: 5,
    corner: "48% 52% 43% 40%",
    outline: "#202332",
    highlightOpacity: 0.18,
    shadowOpacity: 0.14,
    textureOpacity: 0.09
  },
  {
    id: "chibi-pop",
    bodyScaleX: 1.08,
    bodyScaleY: 0.86,
    limbScale: 0.72,
    eyeScale: 1.36,
    lineWidth: 4,
    corner: "54% 46% 45% 48%",
    outline: "#20203a",
    highlightOpacity: 0.3,
    shadowOpacity: 0.1,
    textureOpacity: 0.03
  },
  {
    id: "sitcom-line",
    bodyScaleX: 0.92,
    bodyScaleY: 1.18,
    limbScale: 0.86,
    eyeScale: 0.86,
    lineWidth: 3,
    corner: "36% 40% 28% 32%",
    outline: "#171821",
    highlightOpacity: 0.08,
    shadowOpacity: 0.1,
    textureOpacity: 0.02
  },
  {
    id: "minimal-comic",
    bodyScaleX: 0.96,
    bodyScaleY: 0.98,
    limbScale: 0.78,
    eyeScale: 0.72,
    lineWidth: 4,
    corner: "44% 50% 42% 44%",
    outline: "#1f2028",
    highlightOpacity: 0,
    shadowOpacity: 0.05,
    textureOpacity: 0.01
  },
  {
    id: "flat-paper",
    bodyScaleX: 1.05,
    bodyScaleY: 0.92,
    limbScale: 0.84,
    eyeScale: 0.82,
    lineWidth: 5,
    corner: "8px 12px 7px 11px",
    outline: "#2c2934",
    highlightOpacity: 0.04,
    shadowOpacity: 0.18,
    textureOpacity: 0.08
  },
  {
    id: "paper-diorama",
    bodyScaleX: 1.12,
    bodyScaleY: 0.84,
    limbScale: 0.76,
    eyeScale: 1.04,
    lineWidth: 4,
    corner: "10px 14px 8px 12px",
    outline: "#2c2934",
    highlightOpacity: 0.18,
    shadowOpacity: 0.24,
    textureOpacity: 0.14
  },
  {
    id: "adult-surreal",
    bodyScaleX: 1.08,
    bodyScaleY: 0.9,
    limbScale: 0.9,
    eyeScale: 0.78,
    lineWidth: 6,
    corner: "18px 42% 12px 35%",
    outline: "#201b22",
    highlightOpacity: 0.08,
    shadowOpacity: 0.28,
    textureOpacity: 0.2
  },
  {
    id: "prestige-clean",
    bodyScaleX: 0.94,
    bodyScaleY: 1.12,
    limbScale: 0.88,
    eyeScale: 0.9,
    lineWidth: 3,
    corner: "34% 36% 30% 32%",
    outline: "#181a24",
    highlightOpacity: 0.12,
    shadowOpacity: 0.09,
    textureOpacity: 0.02
  },
  {
    id: "action-anime",
    bodyScaleX: 0.88,
    bodyScaleY: 1.22,
    limbScale: 1.08,
    eyeScale: 1.22,
    lineWidth: 4,
    corner: "42% 38% 28% 30%",
    outline: "#14151d",
    highlightOpacity: 0.24,
    shadowOpacity: 0.2,
    textureOpacity: 0.04
  },
  {
    id: "puppet-collage",
    bodyScaleX: 1.04,
    bodyScaleY: 1.02,
    limbScale: 1.14,
    eyeScale: 0.88,
    lineWidth: 5,
    corner: "50% 45% 41% 47%",
    outline: "#3d3026",
    highlightOpacity: 0.16,
    shadowOpacity: 0.24,
    textureOpacity: 0.18
  }
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
