export const tutorialTracks = [
  {
    id: "ultra",
    name: "Ultra Beginner",
    level: "First cartoon",
    setupLabel: "Set Me Up",
    description: "The fastest possible route: one simple rig, one simple room, one take.",
    steps: [
      {
        mode: "home",
        title: "Start With Almost Nothing",
        body: "Use Set Me Up to load the Single Shape Mouth Rig in Kitchen Moon. Your only job is to make one small change and perform."
      },
      {
        mode: "build",
        title: "Make One Shape Yours",
        body: "Click Shape or Doodle in the canvas part editor. This is the lowest-friction character path: one body, one mouth, no complicated limbs."
      },
      {
        mode: "perform",
        title: "Talk And Move",
        body: "Use WASD or arrow keys to walk around. Turn on Mic if you want audio to drive the mouth automatically."
      },
      {
        mode: "edit",
        title: "Replay, Render, Done",
        body: "After recording, Pup-It jumps to Finish. Replay the take, Render Final when ready, and keep the result good enough."
      }
    ]
  },
  {
    id: "beginner",
    name: "Beginner",
    level: "Guided short",
    description: "Build a tiny original short without learning every pro control.",
    steps: [
      {
        mode: "home",
        title: "Pick A Rough Launch Pad",
        body: "Start with a format like Weird Argument, Fake Commercial, or Street Bit. Templates are launch pads, not finished identities."
      },
      {
        mode: "build",
        title: "Customize The Rig",
        body: "Use the canvas editor, Shape, Doodle, Image, Color, and Weird Starter. Make the character feel like it belongs to your show."
      },
      {
        mode: "assets",
        title: "Build The Space",
        body: "Place one prop or material, then edit it directly on the stage with the Canvas Object Editor."
      },
      {
        mode: "perform",
        title: "Record A Quick Take",
        body: "Use the Performance readiness strip, Live Pad, and Record Take. Keep the first pass short enough to replay immediately."
      },
      {
        mode: "edit",
        title: "Finish Enough To Share",
        body: "Mark the best take, check Ready Enough Score, render a review copy, and package the short."
      }
    ]
  },
  {
    id: "intermediate",
    name: "Intermediate",
    level: "Reusable show kit",
    description: "Learn the tools that make one good bit become a repeatable show.",
    steps: [
      {
        mode: "build",
        title: "Part-Based Rig Builder",
        body: "Edit head, torso, limbs, accessories, and appendages. Duplicate, swap, hide, stretch, import images, and validate the rig."
      },
      {
        mode: "assets",
        title: "Props, Sets, And Materials",
        body: "Search raw materials, import your own images, build props from shapes, and save reusable sets into the Show Kit."
      },
      {
        mode: "storyboard",
        title: "Storyboard Beats",
        body: "Capture panels from the current stage, label shot size and timing, then perform from a planned beat."
      },
      {
        mode: "perform",
        title: "Performance Presets And Cues",
        body: "Try Smooth TV, Loose Puppet, Live Pad, Cue Deck, camera punches, prop reveals, sound stings, and lighting shifts."
      },
      {
        mode: "edit",
        title: "Takes Become A Cut",
        body: "Keep the best take, trim in/out, save a scene board, add clips to the timeline, and review separate motion/audio lanes."
      }
    ]
  },
  {
    id: "advanced",
    name: "Advanced",
    level: "Production workflow",
    description: "Learn the pro controls without losing the fast cartoon loop.",
    steps: [
      {
        mode: "build",
        title: "Advanced Rig And Style",
        body: "Switch to Pro, tune body, limbs, walk cycle, mouth type, part transforms, style presets, mutations, textures, and behavior systems."
      },
      {
        mode: "perform",
        title: "Director Camera And Floor Marks",
        body: "Use shot templates, follow camera, punch-in, shake, lighting presets, floor marks, and scene perspective controls."
      },
      {
        mode: "assets",
        title: "Asset Rights And Show Materials",
        body: "Use CC0-safe assets, attach license metadata, import references, build sets, and make sure public-use material is tracked."
      },
      {
        mode: "edit",
        title: "Render And Review",
        body: "Choose Selected Take, Best Take, or Rough Cut. Watch Source, Queue, Frames, Audio, and Deliver in the render pipeline."
      },
      {
        mode: "edit",
        title: "DoinkTV Handoff",
        body: "Fill title, creator, rights, content notes, scheduling notes, package metadata, and submit a review package to DoinkTV."
      }
    ]
  },
  {
    id: "expert",
    name: "Expert",
    level: "Whole app tour",
    description: "A full feature map for users who want to understand nearly every system.",
    steps: [
      {
        mode: "home",
        title: "Production Rail And Command Search",
        body: "Use the workflow rail, Next button, dashboard, command search, saved shows, autosave draft, templates, and the five-minute trial."
      },
      {
        mode: "build",
        title: "Complete Character System",
        body: "Rig models, canvas part editor, visual part cards, optional add-ons, image imports, color swatches, mutations, style remix, behavior, expert rig tuning."
      },
      {
        mode: "assets",
        title: "Complete Space System",
        body: "Raw materials, CC0 library, search filters, asset targets, local image imports, prop maker, canvas object editor, scene object list, saved sets."
      },
      {
        mode: "perform",
        title: "Complete Performance System",
        body: "Keyboard motion, mouse/audio/camera mouth modes, performance presets, motion feel, Live Pad, Cue Deck, macros, floor marks, director camera, lighting."
      },
      {
        mode: "storyboard",
        title: "Complete Storyboard System",
        body: "Capture panels, duplicate/delete boards, set shot/lighting/theme, write captions, add panels to timeline, and perform from a panel."
      },
      {
        mode: "edit",
        title: "Complete Finish System",
        body: "Take library, post-take reward, lanes, tracks, timeline, render pipeline, browser export, thumbnail, package, Ready Enough Score, delivery preview."
      },
      {
        mode: "edit",
        title: "Show Kit And Broadcast Path",
        body: "Show Kit tech tree, cast/world/performance/finish branches, credits/license data, DoinkTV submission, episode statuses, save/load/export show."
      }
    ]
  }
];

export function getTutorialTrack(trackId) {
  return tutorialTracks.find((track) => track.id === trackId) || tutorialTracks[1];
}

export const workflowSteps = [
  { id: "home", label: "Start", mode: "home", description: "Choose the show, starting setting, and first task." },
  { id: "cast", label: "Rig", mode: "build", description: "Choose a rig model and customize it like a character creator." },
  { id: "sets", label: "Space", mode: "assets", description: "Place settings, props, textures, and raw materials into the scene." },
  { id: "perform", label: "Perform", mode: "perform", description: "Rehearse, record, and improvise live." },
  { id: "edit", label: "Finish", mode: "edit", description: "Review, trim, export, and submit the short." },
  { id: "storyboard", label: "Board", mode: "storyboard", description: "Plan comic-strip beats and shot flow." }
];

export const makeShortMilestones = [
  { id: "start", label: "Start", shortLabel: "Start", description: "Pick a show and a rough bit." },
  { id: "rig", label: "Build Rig", shortLabel: "Rig", description: "Make the performer yours." },
  { id: "space", label: "Build Space", shortLabel: "Space", description: "Give the bit somewhere to happen." },
  { id: "perform", label: "Perform", shortLabel: "Perform", description: "Rehearse and record live." },
  { id: "review", label: "Review", shortLabel: "Review", description: "Replay, trim, and keep the best take." },
  { id: "finish", label: "Export / Submit", shortLabel: "Finish", description: "Render, package, and submit when ready." }
];

export const workspaceIdentity = {
  home: {
    label: "Start",
    role: "Launchpad",
    description: "Continue a show, pick a format, or follow the next best step."
  },
  build: {
    label: "Rig",
    role: "Paint Studio",
    description: "Click the puppet, shape parts, import images, and make the performer yours."
  },
  assets: {
    label: "Space",
    role: "Set Builder",
    description: "Assemble props, materials, settings, and reusable stage pieces."
  },
  perform: {
    label: "Perform",
    role: "Live Studio",
    description: "Play the character, cue reactions, record takes, and keep the bit moving."
  },
  edit: {
    label: "Finish",
    role: "Production Desk",
    description: "Review takes, render, package, and submit a short."
  },
  storyboard: {
    label: "Board",
    role: "Storyboard",
    description: "Stage comic-strip beats and shot flow before recording."
  }
};

export function getWorkspaceIdentity(mode) {
  return workspaceIdentity[mode] || workspaceIdentity.home;
}

export function computeBeginnerProgress({
  showName,
  hasCustomRigParts,
  sceneObjectCount,
  sceneSetCount,
  mode,
  takeCount,
  selectedTake,
  timelineCount,
  exportCount,
  startedShortFormat,
  episodeStatus
}) {
  const submittedStatuses = ["submitted", "ready_for_review", "approved", "scheduled", "published"];
  return {
    hasShow: Boolean(showName.trim()),
    hasStartedShort: Boolean(startedShortFormat),
    hasRig: Boolean(hasCustomRigParts),
    hasSet: sceneObjectCount > 0 || sceneSetCount > 0,
    hasRehearsed: mode === "perform" || takeCount > 0 || Boolean(selectedTake),
    hasTake: takeCount > 0 || Boolean(selectedTake),
    hasCut: timelineCount > 0,
    readyToExport: timelineCount > 0 || Boolean(selectedTake),
    exported: exportCount > 0,
    hasSubmitted: submittedStatuses.includes(episodeStatus)
  };
}
