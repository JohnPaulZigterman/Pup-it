export const workflowModes = [
  {
    id: "perform",
    name: "Perform",
    modules: ["stage", "transport", "puppet-controls", "audio-capture"]
  },
  {
    id: "edit",
    name: "Edit",
    modules: ["timeline", "motion-tracks", "audio-tracks"],
    enabled: false
  },
  {
    id: "build",
    name: "Build",
    modules: ["character-library", "rig-editor", "scene-editor"],
    enabled: false
  },
  {
    id: "render",
    name: "Render",
    modules: ["take-export", "video-render"],
    enabled: false
  }
];

export const moduleRegistry = {
  stage: { surface: "main", label: "Stage" },
  transport: { surface: "topbar", label: "Transport" },
  "puppet-controls": { surface: "dock", label: "Puppet Controls" },
  "audio-capture": { surface: "topbar", label: "Audio Capture" },
  timeline: { surface: "bottom", label: "Timeline" },
  "motion-tracks": { surface: "bottom", label: "Motion Tracks" },
  "audio-tracks": { surface: "bottom", label: "Audio Tracks" },
  "character-library": { surface: "dock", label: "Character Library" },
  "rig-editor": { surface: "main", label: "Rig Editor" },
  "scene-editor": { surface: "main", label: "Scene Editor" },
  "take-export": { surface: "topbar", label: "Take Export" },
  "video-render": { surface: "modal", label: "Video Render" }
};
