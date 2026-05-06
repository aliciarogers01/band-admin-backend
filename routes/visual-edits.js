const express = require("express");
const db = require("../config/db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS visual_edits (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      page TEXT NOT NULL DEFAULT 'home',
      element_id TEXT NOT NULL,
      element_label TEXT NOT NULL DEFAULT '',
      content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      style_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      is_hidden BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(site_id, page, element_id)
    );

    CREATE TABLE IF NOT EXISTS visual_edit_history (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      page TEXT NOT NULL DEFAULT 'home',
      element_id TEXT NOT NULL,
      previous_edit JSONB,
      action TEXT NOT NULL DEFAULT 'update',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getSiteId(siteSlug) {
  await ensureTables();
  const site = await db.query("SELECT id FROM sites WHERE slug = $1", [siteSlug]);
  return site.rows[0]?.id || null;
}

router.get("/:siteSlug/:page", async (req, res) => {
  const siteId = await getSiteId(req.params.siteSlug);
  if (!siteId) return res.status(404).json({ error: "Site not found" });

  const result = await db.query(
    `SELECT * FROM visual_edits WHERE site_id = $1 AND page = $2 ORDER BY updated_at ASC`,
    [siteId, req.params.page]
  );

  res.json({ edits: result.rows });
});

router.put("/:siteSlug/:page/:elementId", requireAuth, async (req, res) => {
  const siteId = await getSiteId(req.params.siteSlug);
  if (!siteId) return res.status(404).json({ error: "Site not found" });

  const existing = await db.query(
    `SELECT to_jsonb(visual_edits.*) AS previous_edit FROM visual_edits WHERE site_id = $1 AND page = $2 AND element_id = $3`,
    [siteId, req.params.page, req.params.elementId]
  );

  await db.query(
    `INSERT INTO visual_edit_history (site_id, page, element_id, previous_edit, action)
     VALUES ($1, $2, $3, $4, 'update')`,
    [siteId, req.params.page, req.params.elementId, existing.rows[0]?.previous_edit || null]
  );

  const result = await db.query(
    `INSERT INTO visual_edits (site_id, page, element_id, element_label, content_json, style_json, is_hidden)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
     ON CONFLICT (site_id, page, element_id)
     DO UPDATE SET
       element_label = EXCLUDED.element_label,
       content_json = EXCLUDED.content_json,
       style_json = EXCLUDED.style_json,
       is_hidden = EXCLUDED.is_hidden,
       updated_at = NOW()
     RETURNING *`,
    [
      siteId,
      req.params.page,
      req.params.elementId,
      req.body.element_label || "",
      JSON.stringify(req.body.content_json || {}),
      JSON.stringify(req.body.style_json || {}),
      !!req.body.is_hidden,
    ]
  );

  res.json({ edit: result.rows[0] });
});

router.delete("/:siteSlug/:page/:elementId", requireAuth, async (req, res) => {
  const siteId = await getSiteId(req.params.siteSlug);
  if (!siteId) return res.status(404).json({ error: "Site not found" });

  const existing = await db.query(
    `SELECT to_jsonb(visual_edits.*) AS previous_edit FROM visual_edits WHERE site_id = $1 AND page = $2 AND element_id = $3`,
    [siteId, req.params.page, req.params.elementId]
  );

  await db.query(
    `INSERT INTO visual_edit_history (site_id, page, element_id, previous_edit, action)
     VALUES ($1, $2, $3, $4, 'delete')`,
    [siteId, req.params.page, req.params.elementId, existing.rows[0]?.previous_edit || null]
  );

  await db.query(
    `DELETE FROM visual_edits WHERE site_id = $1 AND page = $2 AND element_id = $3`,
    [siteId, req.params.page, req.params.elementId]
  );

  res.json({ ok: true });
});

router.delete("/:siteSlug/:page", requireAuth, async (req, res) => {
  const siteId = await getSiteId(req.params.siteSlug);
  if (!siteId) return res.status(404).json({ error: "Site not found" });

  const existing = await db.query(
    `SELECT jsonb_agg(to_jsonb(visual_edits.*)) AS previous_edit FROM visual_edits WHERE site_id = $1 AND page = $2`,
    [siteId, req.params.page]
  );

  await db.query(
    `INSERT INTO visual_edit_history (site_id, page, element_id, previous_edit, action)
     VALUES ($1, $2, '__whole_page__', $3, 'reset-page')`,
    [siteId, req.params.page, existing.rows[0]?.previous_edit || null]
  );

  await db.query(`DELETE FROM visual_edits WHERE site_id = $1 AND page = $2`, [siteId, req.params.page]);
  res.json({ ok: true });
});

router.post("/:siteSlug/:page/undo", requireAuth, async (req, res) => {
  const siteId = await getSiteId(req.params.siteSlug);
  if (!siteId) return res.status(404).json({ error: "Site not found" });

  const history = await db.query(
    `SELECT * FROM visual_edit_history WHERE site_id = $1 AND page = $2 ORDER BY created_at DESC LIMIT 1`,
    [siteId, req.params.page]
  );

  const last = history.rows[0];
  if (!last) return res.json({ ok: true, message: "Nothing to undo" });

  if (last.element_id === "__whole_page__") {
    await db.query(`DELETE FROM visual_edits WHERE site_id = $1 AND page = $2`, [siteId, req.params.page]);
    const previous = Array.isArray(last.previous_edit) ? last.previous_edit : [];
    for (const edit of previous) {
      await db.query(
        `INSERT INTO visual_edits (site_id, page, element_id, element_label, content_json, style_json, is_hidden, updated_at)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,NOW())
         ON CONFLICT (site_id, page, element_id)
         DO UPDATE SET element_label=EXCLUDED.element_label, content_json=EXCLUDED.content_json, style_json=EXCLUDED.style_json, is_hidden=EXCLUDED.is_hidden, updated_at=NOW()`,
        [siteId, req.params.page, edit.element_id, edit.element_label || "", JSON.stringify(edit.content_json || {}), JSON.stringify(edit.style_json || {}), !!edit.is_hidden]
      );
    }
  } else if (last.previous_edit) {
    const edit = last.previous_edit;
    await db.query(
      `INSERT INTO visual_edits (site_id, page, element_id, element_label, content_json, style_json, is_hidden, updated_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,NOW())
       ON CONFLICT (site_id, page, element_id)
       DO UPDATE SET element_label=EXCLUDED.element_label, content_json=EXCLUDED.content_json, style_json=EXCLUDED.style_json, is_hidden=EXCLUDED.is_hidden, updated_at=NOW()`,
      [siteId, req.params.page, edit.element_id, edit.element_label || "", JSON.stringify(edit.content_json || {}), JSON.stringify(edit.style_json || {}), !!edit.is_hidden]
    );
  } else {
    await db.query(
      `DELETE FROM visual_edits WHERE site_id = $1 AND page = $2 AND element_id = $3`,
      [siteId, req.params.page, last.element_id]
    );
  }

  await db.query(`DELETE FROM visual_edit_history WHERE id = $1`, [last.id]);
  res.json({ ok: true });
});

module.exports = router;
