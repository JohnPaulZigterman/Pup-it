import { query } from "../db.js";

const reviewStatuses = new Set([
  "draft",
  "rough_cut",
  "ready_for_review",
  "submitted",
  "needs_changes",
  "approved",
  "scheduled",
  "published"
]);

function slugify(value) {
  return (value || "untitled-show")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72) || `show-${Date.now()}`;
}

function showFromRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    showName: row.name,
    description: row.description || "",
    houseStyle: row.house_style || {},
    cast: row.cast || [],
    assetReferences: row.asset_references || [],
    showBible: row.show_bible || {},
    publishingRules: row.publishing_rules || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function episodeFromRow(row) {
  return {
    id: row.id,
    showId: row.show_id,
    seasonNumber: row.season_number,
    episodeNumber: row.episode_number,
    title: row.title,
    description: row.description || "",
    status: row.status,
    metadata: row.metadata || {},
    scenes: row.scenes || [],
    takes: row.takes || [],
    finalCuts: row.final_cuts || [],
    publishingPackages: row.publishing_packages || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function renderJobFromRow(row) {
  return {
    id: row.id,
    episodeId: row.episode_id,
    status: row.status,
    renderer: row.renderer,
    request: row.request || {},
    output: row.output || {},
    error: row.error || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listShows({ limit = 25 } = {}) {
  const result = await query(
    `select *
     from shows
     order by updated_at desc
     limit $1`,
    [Math.max(1, Math.min(Number(limit) || 25, 100))]
  );
  return result.rows.map(showFromRow);
}

export async function upsertShow(payload) {
  const slug = payload.slug || payload.id || slugify(payload.showName || payload.name);
  const result = await query(
    `insert into shows (
       slug,
       name,
       description,
       house_style,
       cast,
       asset_references,
       show_bible,
       publishing_rules
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (slug) do update set
       name = excluded.name,
       description = excluded.description,
       house_style = excluded.house_style,
       cast = excluded.cast,
       asset_references = excluded.asset_references,
       show_bible = excluded.show_bible,
       publishing_rules = excluded.publishing_rules,
       updated_at = now()
     returning *`,
    [
      slug,
      payload.showName || payload.name || "Untitled Show",
      payload.description || "",
      payload.houseStyle || {
        scene: payload.scene,
        cameraShot: payload.cameraShot,
        lightingPreset: payload.lightingPreset,
        backgroundTheme: payload.backgroundTheme,
        objectStyle: payload.objectStyle
      },
      payload.cast || [],
      payload.assetReferences || [],
      payload.showBible || {
        storyboardPanels: payload.storyboardPanels || [],
        productionTimeline: payload.productionTimeline || []
      },
      payload.publishingRules || {}
    ]
  );
  return showFromRow(result.rows[0]);
}

export async function getShow(showIdOrSlug) {
  const result = await query(
    `select *
     from shows
     where id::text = $1 or slug = $1
     limit 1`,
    [showIdOrSlug]
  );
  return result.rows[0] ? showFromRow(result.rows[0]) : null;
}

export async function listEpisodes(showIdOrSlug) {
  const result = await query(
    `select episodes.*
     from episodes
     join shows on shows.id = episodes.show_id
     where shows.id::text = $1 or shows.slug = $1
     order by season_number asc, episode_number asc, updated_at desc`,
    [showIdOrSlug]
  );
  return result.rows.map(episodeFromRow);
}

export async function upsertEpisode(showIdOrSlug, payload) {
  const show = await getShow(showIdOrSlug);
  if (!show) return null;
  const status = reviewStatuses.has(payload.status) ? payload.status : "draft";
  const episodeId = payload.id || null;
  const result = await query(
    `insert into episodes (
       id,
       show_id,
       season_number,
       episode_number,
       title,
       description,
       status,
       metadata,
       scenes,
       takes,
       final_cuts,
       publishing_packages
     )
     values (coalesce($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     on conflict (show_id, season_number, episode_number) do update set
       season_number = excluded.season_number,
       episode_number = excluded.episode_number,
       title = excluded.title,
       description = excluded.description,
       status = excluded.status,
       metadata = excluded.metadata,
       scenes = excluded.scenes,
       takes = excluded.takes,
       final_cuts = excluded.final_cuts,
       publishing_packages = excluded.publishing_packages,
       updated_at = now()
     returning *`,
    [
      episodeId,
      show.id,
      Number(payload.seasonNumber || payload.season_number || 1),
      Number(payload.episodeNumber || payload.episode_number || 1),
      payload.title || "Untitled Episode",
      payload.description || "",
      status,
      payload.metadata || {},
      payload.scenes || [],
      payload.takes || [],
      payload.finalCuts || payload.final_cuts || [],
      payload.publishingPackages || payload.publishing_packages || []
    ]
  );
  return episodeFromRow(result.rows[0]);
}

export async function updateEpisodeStatus(episodeId, status) {
  if (!reviewStatuses.has(status)) {
    const error = new Error(`Unsupported review status: ${status}`);
    error.code = "INVALID_STATUS";
    throw error;
  }

  const result = await query(
    `update episodes
     set status = $2,
         updated_at = now()
     where id = $1
     returning *`,
    [episodeId, status]
  );
  return result.rows[0] ? episodeFromRow(result.rows[0]) : null;
}

export async function createRenderJob(payload) {
  const result = await query(
    `insert into render_jobs (
       episode_id,
       status,
       renderer,
       request,
       output,
       error
     )
     values ($1, $2, $3, $4, $5, $6)
     returning *`,
    [
      payload.episodeId || null,
      payload.status || "queued",
      payload.renderer || "browser-server",
      payload.request || {},
      payload.output || {},
      payload.error || null
    ]
  );
  return renderJobFromRow(result.rows[0]);
}

export async function updateRenderJob(jobId, patch) {
  const result = await query(
    `update render_jobs
     set status = coalesce($2, status),
         renderer = coalesce($3, renderer),
         request = coalesce($4, request),
         output = coalesce($5, output),
         error = $6,
         updated_at = now()
     where id = $1
     returning *`,
    [
      jobId,
      patch.status || null,
      patch.renderer || null,
      patch.request || null,
      patch.output || null,
      patch.error ?? null
    ]
  );
  return result.rows[0] ? renderJobFromRow(result.rows[0]) : null;
}

export async function getRenderJob(jobId) {
  const result = await query(
    `select *
     from render_jobs
     where id::text = $1
     limit 1`,
    [jobId]
  );
  return result.rows[0] ? renderJobFromRow(result.rows[0]) : null;
}
