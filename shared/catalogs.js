export const characterCatalog = [
  {
    id: "bear",
    name: "Bear",
    archetype: "bear",
    rig: "full-body",
    stylePreset: "toon-real",
    color: "#9a6a4f",
    accent: "#f2c878",
    rigConfig: {
      body: "round",
      limbs: "rubber-hose",
      arms: true,
      legs: true,
      armLength: 48,
      legLength: 28,
      walkCycle: "rubber",
      mouthStyle: "flap"
    }
  },
  {
    id: "mouse",
    name: "Mouse",
    archetype: "mouse",
    rig: "full-body",
    stylePreset: "soft-ink",
    color: "#b7aec5",
    accent: "#f0b9ca",
    rigConfig: {
      body: "tall",
      limbs: "noodle",
      arms: true,
      legs: true,
      armLength: 42,
      legLength: 40,
      walkCycle: "floaty",
      mouthStyle: "flap"
    }
  },
  {
    id: "owl",
    name: "Owl",
    archetype: "owl",
    rig: "full-body",
    stylePreset: "stucco-toon",
    color: "#8aa9d6",
    accent: "#f3d98b",
    rigConfig: {
      body: "round",
      limbs: "hinged",
      arms: true,
      legs: true,
      armLength: 46,
      legLength: 22,
      walkCycle: "stiff",
      mouthStyle: "shape"
    }
  },
  {
    id: "snake",
    name: "Snake",
    archetype: "snake",
    rig: "full-body",
    stylePreset: "borderless-painterly",
    color: "#88caa2",
    accent: "#39504c",
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
  },
  {
    id: "fuzzball",
    name: "Fuzzball",
    archetype: "fuzzball",
    rig: "abstract",
    stylePreset: "adult-surreal",
    color: "#2d2b36",
    accent: "#f6d94f",
    rigConfig: {
      body: "round",
      limbs: "stick",
      arms: false,
      legs: false,
      armLength: 18,
      legLength: 16,
      walkCycle: "floaty",
      mouthStyle: "minimal"
    }
  },
  {
    id: "moonblock",
    name: "Moonblock",
    archetype: "moonblock",
    rig: "abstract",
    stylePreset: "abstract-block",
    color: "#63b7d8",
    accent: "#f4e36f",
    rigConfig: {
      body: "square",
      limbs: "stick",
      arms: false,
      legs: false,
      armLength: 18,
      legLength: 16,
      walkCycle: "stiff",
      mouthStyle: "shape"
    }
  },
  {
    id: "shard",
    name: "Shard",
    archetype: "shard",
    rig: "abstract",
    stylePreset: "adult-surreal",
    color: "#d76d58",
    accent: "#fff2a8",
    rigConfig: {
      body: "triangle",
      limbs: "hinged",
      arms: true,
      legs: true,
      armLength: 34,
      legLength: 24,
      walkCycle: "stiff",
      mouthStyle: "minimal"
    }
  },
  {
    id: "blobstack",
    name: "Blob Stack",
    archetype: "blobstack",
    rig: "abstract",
    stylePreset: "borderless-painterly",
    color: "#8fd8b5",
    accent: "#c7a8ff",
    rigConfig: {
      body: "blob",
      limbs: "noodle",
      arms: true,
      legs: false,
      armLength: 34,
      legLength: 18,
      walkCycle: "floaty",
      mouthStyle: "flap"
    }
  },
  {
    id: "staticling",
    name: "Staticling",
    archetype: "staticling",
    rig: "abstract",
    stylePreset: "paper-cutout",
    color: "#f5f1e8",
    accent: "#8db7ff",
    rigConfig: {
      body: "square",
      limbs: "stick",
      arms: true,
      legs: true,
      armLength: 30,
      legLength: 24,
      walkCycle: "rubber",
      mouthStyle: "shape"
    }
  }
];

export const sceneCatalog = [
  {
    id: "studio",
    name: "Kitchen Moon",
    className: "sceneStudio",
    perspective: "front-stage",
    perspectiveNote: "Front-facing set with theatrical depth. Lateral movement compresses near the horizon.",
    horizon: 20,
    foreground: 82,
    performerHorizonBuffer: 8,
    vanishingX: 50
  },
  {
    id: "street",
    name: "Soft Alley",
    className: "sceneStreet",
    perspective: "street-depth",
    perspectiveNote: "Street-depth blocking. Moving away subtly pulls characters toward the vanishing point.",
    horizon: 20,
    foreground: 82,
    performerHorizonBuffer: 8,
    vanishingX: 55
  },
  {
    id: "space",
    name: "Dream Static",
    className: "sceneSpace",
    perspective: "surreal-float",
    perspectiveNote: "Floaty surreal space with gentler scale changes and looser floor logic.",
    horizon: 20,
    foreground: 82,
    performerHorizonBuffer: 8,
    vanishingX: 50
  }
];

export const perspectiveCatalog = [
  {
    id: "front-stage",
    name: "Front Stage",
    description: "Traditional 2D stage depth: farther movement gets smaller and slower."
  },
  {
    id: "street-depth",
    name: "Street Depth",
    description: "A mild one-point perspective where away/toward movement converges into the set."
  },
  {
    id: "side-view",
    name: "Side View",
    description: "Mostly horizontal blocking with very little depth scaling."
  },
  {
    id: "surreal-float",
    name: "Surreal Float",
    description: "Loose animated space with softer scale and ground rules."
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
    palette: ["#f6a6b2", "#fff2a8", "#8fd8b5"],
    texturePreset: "paper-grain"
  },
  {
    id: "storybook-pastel",
    name: "Storybook Pastel",
    family: "Family TV",
    theme: "Soft Cozy",
    palette: ["#8fd8b5", "#fff6d7", "#c7a8ff"],
    texturePreset: "soft-wash"
  },
  {
    id: "paper-cutout",
    name: "Paper Cutout",
    family: "Limited Cutout",
    theme: "Construction Paper",
    palette: ["#8db7ff", "#ffd2df", "#fff2a8"],
    texturePreset: "static-pattern"
  },
  {
    id: "soft-ink",
    name: "Soft Ink",
    family: "Modern Adult",
    theme: "Warm Offbeat",
    palette: ["#c7a8ff", "#fff6d7", "#2b2d42"],
    texturePreset: "ink-grain"
  },
  {
    id: "chibi-pop",
    name: "Chibi Pop",
    family: "Anime Comedy",
    theme: "Candy Energy",
    palette: ["#ff9ad5", "#8db7ff", "#fff2a8"],
    texturePreset: "clean"
  },
  {
    id: "sitcom-line",
    name: "Sitcom Line",
    family: "Primetime Sitcom",
    theme: "Clean Broadcast",
    palette: ["#f5c07a", "#9ed0ff", "#f2f0dd"],
    texturePreset: "clean"
  },
  {
    id: "minimal-comic",
    name: "Minimal Comic",
    family: "Newspaper Comic",
    theme: "Deadpan Strip",
    palette: ["#f7f3df", "#2b2d42", "#efcf55"],
    texturePreset: "halftone"
  },
  {
    id: "flat-paper",
    name: "Flat Paper",
    family: "Motion Graphic",
    theme: "Poster Shapes",
    palette: ["#ffbf8f", "#8fd8b5", "#2b2d42"],
    texturePreset: "paper-grain"
  },
  {
    id: "paper-diorama",
    name: "Paper Diorama",
    family: "Paper RPG",
    theme: "Layered Stage",
    palette: ["#f2d16b", "#78b6e8", "#f16f5c"],
    texturePreset: "static-pattern"
  },
  {
    id: "adult-surreal",
    name: "Adult Surreal",
    family: "Late-Night Weird",
    theme: "Mixed Media",
    palette: ["#e96f4c", "#ffe66d", "#312b38"],
    texturePreset: "photocopy"
  },
  {
    id: "prestige-clean",
    name: "Prestige Clean",
    family: "Streaming Comedy",
    theme: "Polished Flat",
    palette: ["#f1c27d", "#78b6e8", "#f9f1dc"],
    texturePreset: "soft-wash"
  },
  {
    id: "action-anime",
    name: "Action Anime",
    family: "Action Adventure",
    theme: "Sharp Impact",
    palette: ["#f05d5e", "#2b2d42", "#f4f4ff"],
    texturePreset: "speed-grain"
  },
  {
    id: "puppet-collage",
    name: "Puppet Collage",
    family: "Live Puppet",
    theme: "Felt Cutout",
    palette: ["#6fb98f", "#f2d16b", "#845c44"],
    texturePreset: "fabric"
  },
  {
    id: "borderless-painterly",
    name: "Borderless Painterly",
    family: "Editorial Animation",
    theme: "Soft Painted",
    palette: ["#f26f5c", "#7fc7b2", "#f8e6a0"],
    texturePreset: "soft-wash"
  },
  {
    id: "borderless-collage",
    name: "Borderless Collage",
    family: "Mixed Media",
    theme: "Cut Color",
    palette: ["#4257a7", "#f05d5e", "#f2d16b"],
    texturePreset: "paper-grain"
  },
  {
    id: "graphic-flat",
    name: "Graphic Flat",
    family: "Streaming Comedy",
    theme: "Clean Shape",
    palette: ["#2f343f", "#f4a261", "#84dcc6"],
    texturePreset: "clean"
  },
  {
    id: "toon-real",
    name: "Toon Real",
    family: "Contemporary TV",
    theme: "Painted Material",
    palette: ["#b97657", "#f1d089", "#425466"],
    texturePreset: "soft-wash"
  },
  {
    id: "wallpaper-cutout",
    name: "Wallpaper Cutout",
    family: "Pattern Comedy",
    theme: "Vintage Wallpaper",
    palette: ["#d96c75", "#f4d6a0", "#436b63"],
    texturePreset: "wallpaper"
  },
  {
    id: "abstract-block",
    name: "Abstract Block",
    family: "Modernist Comedy",
    theme: "Museum Shapes",
    palette: ["#de4d3f", "#245c9c", "#f1c84b"],
    texturePreset: "abstract-geo"
  },
  {
    id: "stucco-toon",
    name: "Stucco Toon",
    family: "Textured TV",
    theme: "Painted Wall",
    palette: ["#d8b493", "#7aa58d", "#3f4652"],
    texturePreset: "stucco"
  },
  {
    id: "woodblock-toon",
    name: "Woodblock Toon",
    family: "Material Cutout",
    theme: "Wood Grain",
    palette: ["#9c6a3d", "#e1b36d", "#34424a"],
    texturePreset: "woodgrain"
  }
];

export const backgroundThemeCatalog = [
  {
    id: "scene-native",
    name: "Scene Native",
    description: "Use the current set art and its built-in texture.",
    className: "bg-theme-scene",
    texturePreset: null
  },
  {
    id: "soft-painted",
    name: "Soft Painted",
    description: "Borderless washes and gentle paper texture.",
    className: "bg-theme-soft-painted",
    texturePreset: "soft-wash"
  },
  {
    id: "painted-depth",
    name: "Painted Depth",
    description: "Painterly planes, atmospheric distance, and grounded shadows.",
    className: "bg-theme-painted-depth",
    texturePreset: "soft-wash"
  },
  {
    id: "late-night-copy",
    name: "Late-Night Copy",
    description: "Photocopy grit for adult comedy scenes.",
    className: "bg-theme-late-night-copy",
    texturePreset: "photocopy"
  },
  {
    id: "paper-stage",
    name: "Paper Stage",
    description: "Layered cut-paper atmosphere for diorama staging.",
    className: "bg-theme-paper-stage",
    texturePreset: "static-pattern"
  },
  {
    id: "broadcast-flat",
    name: "Broadcast Flat",
    description: "Clean color fields for sitcom-style blocking.",
    className: "bg-theme-broadcast-flat",
    texturePreset: "clean"
  },
  {
    id: "pattern-held",
    name: "Pattern Held",
    description: "Texture-forward backgrounds for stylized pattern behavior.",
    className: "bg-theme-pattern-held",
    texturePreset: "fabric"
  },
  {
    id: "vintage-wallpaper",
    name: "Vintage Wallpaper",
    description: "Repeating wall motifs with aged-paper color and soft seams.",
    className: "bg-theme-vintage-wallpaper",
    texturePreset: "wallpaper"
  },
  {
    id: "abstract-gallery",
    name: "Abstract Gallery",
    description: "Public-domain modernist geometry, color fields, and imperfect print texture.",
    className: "bg-theme-abstract-gallery",
    texturePreset: "abstract-geo"
  },
  {
    id: "wood-panel",
    name: "Wood Panel",
    description: "Warm grain and panel rhythm for interiors, stages, and weird dens.",
    className: "bg-theme-wood-panel",
    texturePreset: "woodgrain"
  },
  {
    id: "stucco-wall",
    name: "Stucco Wall",
    description: "Rough plaster texture for grounded exterior and studio walls.",
    className: "bg-theme-stucco-wall",
    texturePreset: "stucco"
  }
];

export const objectStyleCatalog = [
  {
    id: "match-character",
    name: "Match Character",
    description: "Props and floor pieces inherit the scene's mixed-media treatment.",
    className: "object-match-character"
  },
  {
    id: "thin-ink",
    name: "Thin Ink",
    description: "Light prop outlines for cleaner contemporary TV staging.",
    className: "object-thin-ink"
  },
  {
    id: "borderless",
    name: "Borderless",
    description: "Shape-only props with shadows doing the separation.",
    className: "object-borderless"
  },
  {
    id: "paper-cut",
    name: "Paper Cut",
    description: "Visible paper edges and small offset shadows.",
    className: "object-paper-cut"
  },
  {
    id: "soft-material",
    name: "Soft Material",
    description: "Subtle bevels and contact shadows without looking photoreal.",
    className: "object-soft-material"
  }
];

export const styleAdapterCatalog = [
  {
    id: "simple-doodle",
    bodyScaleX: 1,
    bodyScaleY: 1,
    limbScale: 1,
    eyeScale: 1,
    lineWidth: 2.5,
    corner: "47% 53% 38% 45%",
    outline: "#2b2d42",
    highlightOpacity: 0.22,
    shadowOpacity: 0.16,
    textureOpacity: 0.08,
    texturePreset: "paper-grain"
  },
  {
    id: "storybook-pastel",
    bodyScaleX: 1.02,
    bodyScaleY: 1.06,
    limbScale: 1.05,
    eyeScale: 1.04,
    lineWidth: 2.25,
    corner: "50% 50% 40% 42%",
    outline: "#3f4256",
    highlightOpacity: 0.34,
    shadowOpacity: 0.12,
    textureOpacity: 0.05,
    texturePreset: "soft-wash"
  },
  {
    id: "paper-cutout",
    bodyScaleX: 1.04,
    bodyScaleY: 0.96,
    limbScale: 0.92,
    eyeScale: 0.92,
    lineWidth: 2.5,
    corner: "12px 18px 10px 16px",
    outline: "#25242e",
    highlightOpacity: 0.12,
    shadowOpacity: 0.22,
    textureOpacity: 0.12,
    texturePreset: "static-pattern"
  },
  {
    id: "soft-ink",
    bodyScaleX: 0.98,
    bodyScaleY: 1.03,
    limbScale: 0.96,
    eyeScale: 0.98,
    lineWidth: 3,
    corner: "48% 52% 43% 40%",
    outline: "#202332",
    highlightOpacity: 0.18,
    shadowOpacity: 0.14,
    textureOpacity: 0.09,
    texturePreset: "ink-grain"
  },
  {
    id: "chibi-pop",
    bodyScaleX: 1.08,
    bodyScaleY: 0.86,
    limbScale: 0.72,
    eyeScale: 1.36,
    lineWidth: 2.5,
    corner: "54% 46% 45% 48%",
    outline: "#20203a",
    highlightOpacity: 0.3,
    shadowOpacity: 0.1,
    textureOpacity: 0.03,
    texturePreset: "clean"
  },
  {
    id: "sitcom-line",
    bodyScaleX: 0.92,
    bodyScaleY: 1.18,
    limbScale: 0.86,
    eyeScale: 0.86,
    lineWidth: 2,
    corner: "36% 40% 28% 32%",
    outline: "#171821",
    highlightOpacity: 0.08,
    shadowOpacity: 0.1,
    textureOpacity: 0.02,
    texturePreset: "clean"
  },
  {
    id: "minimal-comic",
    bodyScaleX: 0.96,
    bodyScaleY: 0.98,
    limbScale: 0.78,
    eyeScale: 0.72,
    lineWidth: 1.75,
    corner: "44% 50% 42% 44%",
    outline: "#1f2028",
    highlightOpacity: 0,
    shadowOpacity: 0.05,
    textureOpacity: 0.01,
    texturePreset: "halftone"
  },
  {
    id: "flat-paper",
    bodyScaleX: 1.05,
    bodyScaleY: 0.92,
    limbScale: 0.84,
    eyeScale: 0.82,
    lineWidth: 2.5,
    corner: "8px 12px 7px 11px",
    outline: "#2c2934",
    highlightOpacity: 0.04,
    shadowOpacity: 0.18,
    textureOpacity: 0.08,
    texturePreset: "paper-grain"
  },
  {
    id: "paper-diorama",
    bodyScaleX: 1.12,
    bodyScaleY: 0.84,
    limbScale: 0.76,
    eyeScale: 1.04,
    lineWidth: 2.25,
    corner: "10px 14px 8px 12px",
    outline: "#2c2934",
    highlightOpacity: 0.18,
    shadowOpacity: 0.24,
    textureOpacity: 0.14,
    texturePreset: "static-pattern"
  },
  {
    id: "adult-surreal",
    bodyScaleX: 1.08,
    bodyScaleY: 0.9,
    limbScale: 0.9,
    eyeScale: 0.78,
    lineWidth: 3,
    corner: "18px 42% 12px 35%",
    outline: "#201b22",
    highlightOpacity: 0.08,
    shadowOpacity: 0.28,
    textureOpacity: 0.2,
    texturePreset: "photocopy"
  },
  {
    id: "prestige-clean",
    bodyScaleX: 0.94,
    bodyScaleY: 1.12,
    limbScale: 0.88,
    eyeScale: 0.9,
    lineWidth: 1.5,
    corner: "34% 36% 30% 32%",
    outline: "#181a24",
    highlightOpacity: 0.12,
    shadowOpacity: 0.09,
    textureOpacity: 0.02,
    texturePreset: "soft-wash"
  },
  {
    id: "action-anime",
    bodyScaleX: 0.88,
    bodyScaleY: 1.22,
    limbScale: 1.08,
    eyeScale: 1.22,
    lineWidth: 2.5,
    corner: "42% 38% 28% 30%",
    outline: "#14151d",
    highlightOpacity: 0.24,
    shadowOpacity: 0.2,
    textureOpacity: 0.04,
    texturePreset: "speed-grain"
  },
  {
    id: "puppet-collage",
    bodyScaleX: 1.04,
    bodyScaleY: 1.02,
    limbScale: 1.14,
    eyeScale: 0.88,
    lineWidth: 2.25,
    corner: "50% 45% 41% 47%",
    outline: "#3d3026",
    highlightOpacity: 0.16,
    shadowOpacity: 0.24,
    textureOpacity: 0.18,
    texturePreset: "fabric"
  },
  {
    id: "borderless-painterly",
    bodyScaleX: 1.02,
    bodyScaleY: 1.02,
    limbScale: 0.94,
    eyeScale: 0.92,
    lineWidth: 0,
    corner: "48% 52% 44% 42%",
    outline: "transparent",
    borderless: true,
    highlightOpacity: 0.28,
    shadowOpacity: 0.18,
    textureOpacity: 0.04,
    texturePreset: "soft-wash"
  },
  {
    id: "borderless-collage",
    bodyScaleX: 1.08,
    bodyScaleY: 0.94,
    limbScale: 0.86,
    eyeScale: 0.78,
    lineWidth: 0,
    corner: "10px 16px 8px 14px",
    outline: "transparent",
    borderless: true,
    highlightOpacity: 0.1,
    shadowOpacity: 0.28,
    textureOpacity: 0.12,
    texturePreset: "paper-grain"
  },
  {
    id: "graphic-flat",
    bodyScaleX: 0.96,
    bodyScaleY: 1.06,
    limbScale: 0.82,
    eyeScale: 0.82,
    lineWidth: 0.75,
    corner: "12px",
    outline: "rgba(24, 26, 36, 0.38)",
    highlightOpacity: 0.02,
    shadowOpacity: 0.08,
    textureOpacity: 0,
    texturePreset: "clean"
  },
  {
    id: "toon-real",
    bodyScaleX: 0.98,
    bodyScaleY: 1.08,
    limbScale: 0.92,
    eyeScale: 0.9,
    lineWidth: 1.25,
    corner: "44% 48% 36% 40%",
    outline: "rgba(24, 26, 36, 0.58)",
    highlightOpacity: 0.24,
    shadowOpacity: 0.22,
    textureOpacity: 0.025,
    texturePreset: "soft-wash"
  },
  {
    id: "wallpaper-cutout",
    bodyScaleX: 1.04,
    bodyScaleY: 0.98,
    limbScale: 0.9,
    eyeScale: 0.84,
    lineWidth: 1.5,
    corner: "16px 40% 12px 32%",
    outline: "rgba(43, 45, 66, 0.62)",
    highlightOpacity: 0.12,
    shadowOpacity: 0.18,
    textureOpacity: 0.12,
    texturePreset: "wallpaper"
  },
  {
    id: "abstract-block",
    bodyScaleX: 1.08,
    bodyScaleY: 0.92,
    limbScale: 0.82,
    eyeScale: 0.78,
    lineWidth: 1,
    corner: "10px",
    outline: "rgba(23, 24, 32, 0.54)",
    highlightOpacity: 0.08,
    shadowOpacity: 0.18,
    textureOpacity: 0.1,
    texturePreset: "abstract-geo"
  },
  {
    id: "stucco-toon",
    bodyScaleX: 0.98,
    bodyScaleY: 1.06,
    limbScale: 0.9,
    eyeScale: 0.86,
    lineWidth: 1.25,
    corner: "44% 50% 36% 42%",
    outline: "rgba(44, 43, 52, 0.5)",
    highlightOpacity: 0.2,
    shadowOpacity: 0.2,
    textureOpacity: 0.14,
    texturePreset: "stucco"
  },
  {
    id: "woodblock-toon",
    bodyScaleX: 1.02,
    bodyScaleY: 1,
    limbScale: 0.88,
    eyeScale: 0.8,
    lineWidth: 1.5,
    corner: "12px 20px 10px 18px",
    outline: "rgba(45, 33, 24, 0.58)",
    highlightOpacity: 0.14,
    shadowOpacity: 0.24,
    textureOpacity: 0.16,
    texturePreset: "woodgrain"
  }
];

export const bodyShapeCatalog = [
  { id: "round", name: "Round" },
  { id: "tall", name: "Tall" },
  { id: "block", name: "Block" },
  { id: "square", name: "Square" },
  { id: "triangle", name: "Shard" },
  { id: "blob", name: "Blob" }
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
