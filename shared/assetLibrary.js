export const assetFormatCatalog = [
  { id: "rig", name: "Rig" },
  { id: "rig-part", name: "Rig Part" },
  { id: "separated-parts", name: "Separated Parts" },
  { id: "svg-vector", name: "SVG / Vector" },
  { id: "sprite-sheet", name: "Sprite Sheet" },
  { id: "portrait", name: "Portrait" },
  { id: "object", name: "Object" },
  { id: "prop", name: "Prop" },
  { id: "setting", name: "Setting" },
  { id: "background", name: "Background" }
];

export const assetTargetCatalog = [
  { id: "rig", name: "Rigs" },
  { id: "rig-part", name: "Rig Parts" },
  { id: "object", name: "Objects" },
  { id: "setting", name: "Settings" },
  { id: "sprite", name: "Sprites" },
  { id: "reference", name: "References" }
];

export const assetSceneSearchPresets = [
  "street",
  "kitchen",
  "office",
  "bedroom",
  "forest",
  "space",
  "wood",
  "stucco",
  "wallpaper",
  "signs",
  "furniture",
  "vehicles",
  "isometric"
];

export const assetImportTypeCatalog = [
  { id: "convert-to-puppet", name: "Convert to Puppet" },
  { id: "use-as-reference", name: "Use as Reference" },
  { id: "use-as-sprite", name: "Use as Sprite" }
];

export const curatedAssetLibrary = [
  {
    id: "rgs-modular-vector-characters",
    name: "Modular Vector Character Bases",
    provider: "RGS_Dev",
    sourceUrl: "https://itch.io/e/12024601/rgs-dev-published-free-cc0-modular-animated-vector-characters-2d",
    license: "CC0",
    attribution: "No attribution required. Credit RGS_Dev if desired.",
    format: "separated-parts",
    targets: ["rig", "rig-part"],
    importTypes: ["convert-to-puppet", "use-as-reference"],
    description: "Separated body parts designed for recoloring and recombining.",
    tags: ["modular", "vector", "body parts", "starter cast"],
    previewStyle: "modular",
    recommended: {
      character: "mouse",
      stylePreset: "graphic-flat",
      rigConfig: { body: "tall", limbs: "hinged", arms: true, legs: true, mouthStyle: "flap" },
      characterDesign: { name: "Vector Base", color: "#f1d089", accent: "#425466" }
    }
  },
  {
    id: "gdquest-cc0-prototype-sprites",
    name: "CC0 Prototype Sprite Set",
    provider: "GDQuest",
    sourceUrl: "https://github.com/GDQuest/game-sprites",
    license: "CC0",
    attribution: "No attribution required. Credit GDQuest if desired.",
    format: "sprite-sheet",
    targets: ["sprite", "object", "reference"],
    importTypes: ["use-as-reference", "use-as-sprite"],
    description: "Public-domain game sprites useful for roughing in characters and props.",
    tags: ["prototype", "sprites", "game-ready", "cc0"],
    previewStyle: "sprite",
    recommended: {
      character: "bear",
      stylePreset: "flat-paper",
      characterDesign: { name: "Prototype Sprite", color: "#ffbf8f", accent: "#2b2d42" }
    }
  },
  {
    id: "kenney-public-domain-packs",
    name: "Public-Domain Game Asset Packs",
    provider: "Kenney",
    sourceUrl: "https://kenney.nl/assets",
    license: "CC0",
    attribution: "No attribution required. Credit Kenney if desired.",
    format: "prop",
    targets: ["object", "setting", "sprite"],
    importTypes: ["use-as-reference", "use-as-sprite"],
    description: "Broad CC0 packs for props, icons, simple characters, tiles, and interface pieces.",
    tags: ["props", "icons", "cc0", "starter library"],
    keywords: [
      "objects",
      "props",
      "furniture",
      "signs",
      "vehicles",
      "tiles",
      "interface",
      "scene dressing",
      "street",
      "park",
      "house",
      "office",
      "kitchen",
      "bedroom",
      "interior"
    ],
    previewStyle: "kenney",
    recommended: {
      objectStyle: "soft-material",
      backgroundTheme: "broadcast-flat"
    }
  },
  {
    id: "kenney-background-elements-redux",
    name: "Background Elements Redux",
    provider: "Kenney / GDevelop",
    sourceUrl: "https://gdevelop.io/asset-store/free/background-elements-redux-generic-backgrounds",
    license: "CC0",
    attribution: "CC0 public domain. Credit Kenney/GDevelop community if desired.",
    format: "background",
    targets: ["setting", "object", "sprite"],
    importTypes: ["use-as-reference", "use-as-sprite"],
    description: "Ready-to-use background pieces for quickly assembling simple scenes.",
    tags: ["backgrounds", "scene parts", "cc0", "environment"],
    keywords: [
      "background",
      "setting",
      "scene",
      "sky",
      "cloud",
      "hill",
      "tree",
      "mountain",
      "street",
      "park",
      "exterior",
      "stage",
      "layered"
    ],
    previewStyle: "kenney",
    recommended: {
      backgroundTheme: "broadcast-flat",
      objectStyle: "cutout-prop"
    }
  },
  {
    id: "screaming-brain-cc0-backgrounds-textures",
    name: "CC0 Backgrounds + Texture Packs",
    provider: "Screaming Brain Studios",
    sourceUrl: "https://screamingbrainstudios.com/downloads/",
    license: "CC0",
    attribution: "No attribution required. Credit Screaming Brain Studios if desired.",
    format: "background",
    targets: ["setting", "object", "sprite"],
    importTypes: ["use-as-reference", "use-as-sprite"],
    description: "Large public-domain library of textures, space backgrounds, planets, tiles, and surface materials.",
    tags: ["textures", "backgrounds", "tiles", "cc0"],
    keywords: [
      "space",
      "planet",
      "sky",
      "texture",
      "wood",
      "stone",
      "metal",
      "stucco",
      "wallpaper",
      "floor",
      "tile",
      "abstract",
      "material",
      "surface",
      "parallax"
    ],
    previewStyle: "texture",
    recommended: {
      backgroundTheme: "pattern-studio",
      objectStyle: "textured-cutout"
    }
  },
  {
    id: "drummyfish-public-domain-scene-pack",
    name: "Big Public-Domain Asset Pack",
    provider: "drummyfish",
    sourceUrl: "https://drummyfish.itch.io/big-asset-pack-by-drummyfish",
    license: "CC0",
    attribution: "No attribution required. Credit drummyfish if desired.",
    format: "object",
    targets: ["object", "setting", "sprite"],
    importTypes: ["use-as-reference", "use-as-sprite"],
    description: "A broad public-domain mixed pack with 2D images, textures, 3D models, fonts, and sounds.",
    tags: ["mixed assets", "objects", "textures", "cc0"],
    keywords: [
      "objects",
      "props",
      "texture",
      "3d model",
      "font",
      "sound",
      "tiles",
      "terrain",
      "machine",
      "vehicle",
      "sign",
      "weird",
      "retro",
      "background"
    ],
    previewStyle: "object",
    recommended: {
      objectStyle: "textured-cutout",
      backgroundTheme: "warehouse-noir"
    }
  },
  {
    id: "itch-cc0-2d-scene-discovery",
    name: "itch.io CC0 2D Scene Discovery",
    provider: "itch.io creators",
    sourceUrl: "https://itch.io/game-assets/tag-2d/tag-cc0",
    license: "CC0",
    attribution: "Check the individual asset page. Prefer packs explicitly marked CC0.",
    format: "background",
    targets: ["setting", "object", "sprite", "reference"],
    importTypes: ["use-as-reference", "use-as-sprite"],
    description: "Search shelf for CC0 2D backgrounds, props, textures, tile packs, and set pieces.",
    tags: ["cc0", "backgrounds", "props", "discovery"],
    keywords: [
      "background",
      "setting",
      "object",
      "prop",
      "forest",
      "city",
      "street",
      "kitchen",
      "bedroom",
      "space",
      "isometric",
      "floor",
      "tiles",
      "furniture",
      "building",
      "interior",
      "exterior"
    ],
    previewStyle: "pixel",
    recommended: {
      objectStyle: "cutout-prop",
      backgroundTheme: "pattern-studio"
    }
  },
  {
    id: "itch-cc0-character-sprites",
    name: "CC0 Character Sprite Discovery",
    provider: "itch.io creators",
    sourceUrl: "https://itch.io/game-assets/free/tag-cc0/tag-sprites",
    license: "CC0",
    attribution: "Check the individual asset page. Prefer packs explicitly marked CC0.",
    format: "sprite-sheet",
    targets: ["sprite", "rig", "reference"],
    importTypes: ["use-as-reference", "use-as-sprite"],
    description: "A discovery shelf for free CC0 sprites, often pixel-art or top-down characters.",
    tags: ["cc0", "sprites", "community", "discovery"],
    keywords: ["character", "sprite", "walk cycle", "top-down", "side-view", "humanoid", "creature", "npc"],
    previewStyle: "pixel",
    recommended: {
      character: "owl",
      stylePreset: "minimal-comic",
      characterDesign: { name: "CC0 Sprite Reference", color: "#8db7ff", accent: "#fff2a8" }
    }
  },
  {
    id: "opengameart-cc0-character-search",
    name: "OpenGameArt CC0 Character Search",
    provider: "OpenGameArt",
    sourceUrl: "https://opengameart.org/",
    license: "Mixed",
    attribution: "License varies per asset. Import only CC0 for one-click use; record attribution for CC-BY.",
    format: "sprite-sheet",
    targets: ["sprite", "setting", "object", "reference"],
    importTypes: ["use-as-reference"],
    description: "Large open art portal for characters, backgrounds, props, textures, and sounds. Every asset must be checked before production use.",
    tags: ["mixed license", "sprites", "backgrounds", "props", "search", "needs review"],
    keywords: [
      "background",
      "setting",
      "object",
      "prop",
      "tileset",
      "texture",
      "sprite",
      "rig",
      "music",
      "sound",
      "license review"
    ],
    previewStyle: "oga",
    recommended: {
      character: "snake",
      stylePreset: "paper-diorama"
    }
  },
  {
    id: "opengameart-lpc-reference",
    name: "LPC Character Sheet Reference",
    provider: "OpenGameArt contributors",
    sourceUrl: "https://opengameart.org/",
    license: "Attribution / Share-Alike",
    attribution: "Attribution and share-alike obligations may apply. Treat as reference until verified.",
    format: "sprite-sheet",
    targets: ["sprite", "rig", "reference"],
    importTypes: ["use-as-reference"],
    description: "Useful example of full walk-cycle sprite organization, but not safe for one-click production import.",
    tags: ["walk cycle", "license warning", "reference only"],
    keywords: ["walk cycle", "character sheet", "sprite", "rig", "humanoid", "body parts", "animation reference"],
    previewStyle: "warning",
    recommended: {
      character: "mouse",
      stylePreset: "sitcom-line"
    }
  },
  {
    id: "user-owned-character-reference",
    name: "User-Owned Character Reference",
    provider: "Your team",
    sourceUrl: "",
    license: "User Supplied",
    attribution: "Only use characters, sprites, or models your team created, licensed, commissioned, or cleared.",
    format: "portrait",
    targets: ["reference", "rig"],
    importTypes: ["use-as-reference"],
    description: "Attach an existing cleared character as a visual target before rebuilding it as a Pup-It rig.",
    tags: ["owned", "cleared", "character", "reference", "rights review"],
    keywords: ["owned", "licensed", "commissioned", "model", "sprite", "reference", "rig", "character"],
    previewStyle: "reference",
    recommended: {
      character: "bear",
      stylePreset: "toon-real"
    }
  },
  {
    id: "parody-rights-review-reference",
    name: "Parody / Rights Review Reference",
    provider: "Rights review",
    sourceUrl: "https://www.copyright.gov/fair-use/",
    license: "Rights Review",
    attribution: "Parody/fair use is case-specific. Keep reference-only until producer/legal approval.",
    format: "portrait",
    targets: ["reference"],
    importTypes: ["use-as-reference"],
    description: "A workflow bucket for comedy/parody targets that should inspire a new rig rather than import protected art directly.",
    tags: ["parody", "fair use", "reference only", "approval", "comedy"],
    keywords: ["parody", "satire", "celebrity", "existing character", "copyright", "rights", "reference", "approval"],
    previewStyle: "warning",
    recommended: {
      character: "mouse",
      stylePreset: "minimal-comic"
    }
  }
];

export function isOneClickSafeAsset(asset) {
  return asset.license === "CC0";
}

export function getAssetSearchText(asset) {
  return [
    asset.name,
    asset.provider,
    asset.license,
    asset.format,
    asset.description,
    ...(asset.targets || []),
    ...(asset.tags || []),
    ...(asset.keywords || []),
    ...(asset.importTypes || [])
  ]
    .join(" ")
    .toLowerCase();
}

export function getAssetLibraryItem(id) {
  return curatedAssetLibrary.find((asset) => asset.id === id) || curatedAssetLibrary[0];
}
