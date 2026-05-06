const express = require("express");
const db = require("../config/db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

async function getSite(siteSlug) {
  const site = await db.query("SELECT id FROM sites WHERE slug = $1", [siteSlug]);
  return site.rows[0] || null;
}

router.get("/:siteSlug/:page", async (req, res) => {
  const site = await getSite(req.params.siteSlug);
  if (!site) return res.status(404).json({ error: "Site not found" });

  const result = await db.query(
    `SELECT edits FROM visual_page_edits WHERE site_id = $1 AND page = $2`,
    [site.id, req.params.page || "home"]
  );

  res.json({ edits: result.rows[0]?.edits || { items: {}, history: [] } });
});

router.put("/:siteSlug/:page", requireAuth, async (req, res) => {
  const site = await getSite(req.params.siteSlug);
  if (!site) return res.status(404).json({ error: "Site not found" });

  const page = req.params.page || "home";
  const edits = req.body.edits || { items: {}, history: [] };

  const result = await db.query(
    `INSERT INTO visual_page_edits (site_id, page, edits)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (site_id, page)
     DO UPDATE SET edits = EXCLUDED.edits, updated_at = NOW()
     RETURNING *`,
    [site.id, page, JSON.stringify(edits)]
  );

  res.json({ edits: result.rows[0].edits });
});

router.delete("/:siteSlug/:page", requireAuth, async (req, res) => {
  const site = await getSite(req.params.siteSlug);
  if (!site) return res.status(404).json({ error: "Site not found" });

  await db.query(`DELETE FROM visual_page_edits WHERE site_id = $1 AND page = $2`, [site.id, req.params.page || "home"]);
  res.json({ ok: true });
});

module.exports = router;
