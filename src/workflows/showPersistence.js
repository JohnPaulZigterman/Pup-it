import { sceneCatalog, getCatalogItem } from "../../shared/catalogs.js";
import { defaultRoomId } from "../../shared/schema.js";

export const SHOW_STORAGE_KEY = "pup-it-shows-v1";
export const AUTOSAVE_DRAFT_KEY = "pup-it-autosave-draft-v1";

export function makeShowId(showName) {
  const slug = (showName || "untitled-show")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42);
  return slug || `show-${Date.now()}`;
}

export function loadStoredShows() {
  try {
    const stored = window.localStorage.getItem(SHOW_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

export function writeStoredShows(shows) {
  window.localStorage.setItem(SHOW_STORAGE_KEY, JSON.stringify(shows));
}

export function showSessionFromPersistedShow(show) {
  const showBible = show.showBible || {};
  const houseStyle = show.houseStyle || {};
  return {
    schemaVersion: "pup-it.show.v1",
    id: show.slug || show.id,
    databaseId: show.id,
    showName: show.showName || show.name || "Untitled Show",
    savedAt: show.updatedAt || show.updated_at || new Date().toISOString(),
    roomId: showBible.roomId || defaultRoomId,
    scene: houseStyle.scene || sceneCatalog[0].id,
    perspective: houseStyle.perspective,
    cameraShot: houseStyle.cameraShot || "wide",
    lightingPreset: houseStyle.lightingPreset || "scene",
    backgroundTheme: houseStyle.backgroundTheme || "painted-depth",
    objectStyle: houseStyle.objectStyle || "soft-material",
    cast: show.cast || [],
    episodeStatus: showBible.episodeStatus || "draft",
    sceneObjects: showBible.sceneObjects || [],
    sceneSets: showBible.sceneSets || [],
    floorMarks: showBible.floorMarks || [],
    assetReferences: show.assetReferences || [],
    storyboardPanels: showBible.storyboardPanels || [],
    productionTimeline: showBible.productionTimeline || [],
    takes: showBible.takes || [],
    renderHistory: showBible.renderHistory || [],
    doinkSubmission: showBible.doinkSubmission || {},
    showToolbox: showBible.showToolbox || {}
  };
}

export async function fetchPersistedShows(serverUrl) {
  const response = await fetch(`${serverUrl}/api/shows`);
  if (!response.ok) throw new Error("Show database unavailable");
  const data = await response.json();
  if (data.persistence === "local") throw new Error("Show database unavailable");
  return (data.shows || []).map(showSessionFromPersistedShow);
}

export async function persistShowSession(serverUrl, session) {
  const response = await fetch(`${serverUrl}/api/shows`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...session,
      slug: session.id,
      houseStyle: {
        scene: session.scene,
        perspective: session.perspective,
        cameraShot: session.cameraShot,
        lightingPreset: session.lightingPreset,
        backgroundTheme: session.backgroundTheme,
        objectStyle: session.objectStyle
      },
      showBible: {
        roomId: session.roomId,
        storyboardPanels: session.storyboardPanels,
        productionTimeline: session.productionTimeline,
        episodeStatus: session.episodeStatus,
        sceneObjects: session.sceneObjects,
        sceneSets: session.sceneSets,
        floorMarks: session.floorMarks,
        takes: session.takes,
        renderHistory: session.renderHistory,
        doinkSubmission: session.doinkSubmission,
        showToolbox: session.showToolbox
      }
    })
  });
  if (!response.ok) throw new Error("Show database unavailable");
  const data = await response.json();
  if (data.persistence === "local") throw new Error("Show database unavailable");
  return showSessionFromPersistedShow(data.show);
}

export async function persistEpisodeSnapshot(serverUrl, showId, session) {
  const response = await fetch(`${serverUrl}/api/shows/${encodeURIComponent(showId)}/episodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seasonNumber: 1,
      episodeNumber: 1,
      title: `${session.showName} Episode 1`,
      status: session.episodeStatus || "draft",
      metadata: {
        currentScene: session.scene,
        perspective: session.perspective,
        cameraShot: session.cameraShot,
        lightingPreset: session.lightingPreset,
        backgroundTheme: session.backgroundTheme,
        objectStyle: session.objectStyle
      },
      scenes: [
        {
          id: "current-stage",
          scene: session.scene,
          sceneObjects: session.sceneObjects || [],
          floorMarks: session.floorMarks || []
        }
      ],
      takes: session.takes || [],
      finalCuts: session.productionTimeline || [],
      publishingPackages: []
    })
  });
  if (!response.ok) throw new Error("Episode database unavailable");
  return response.json();
}

export function summarizeTakeForShow(take) {
  return {
    id: take.id,
    name: take.name,
    scene: take.scene,
    durationMs: take.durationMs,
    performerCount: take.performerCount,
    audioTrackCount: take.audioTrackCount,
    motionEventCount: take.motionEventCount,
    best: Boolean(take.best)
  };
}

export function floorMarksForSession(session, createDefaultFloorMarks) {
  return session.floorMarks || createDefaultFloorMarks(getCatalogItem(sceneCatalog, session.scene || sceneCatalog[0].id));
}
