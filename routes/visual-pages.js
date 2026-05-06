const express = require("express");
const db = require("../config/db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

router.get("/:siteSlug/:page", async (req, res) => {
  const result = await db.query(
    `SELECT visual_pages.*
     FROM visual_pages
     JOIN sites ON sites.id = visual_pages.site_id
     WHERE sites.slug = $1
     AND visual_pages.page = $2`,
    [req.params.siteSlug, req.params.page]
  );

  res.json({ page: result.rows[0] || null });
});

router.put("/:siteSlug/:page", requireAuth, async (req, res) => {
  const site = await db.query("SELECT id FROM sites WHERE slug = $1", [
    req.params.siteSlug,
  ]);

  if (!site.rows[0]) return res.status(404).json({ error: "Site not found" });

  const { project_data, html, css } = req.body;

  const result = await db.query(
    `INSERT INTO visual_pages (site_id, page, project_data, html, css, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (site_id, page)
     DO UPDATE SET
       project_data = EXCLUDED.project_data,
       html = EXCLUDED.html,
       css = EXCLUDED.css,
       updated_at = NOW()
     RETURNING *`,
    [
      site.rows[0].id,
      req.params.page,
      project_data || {},
      html || "",
      css || "",
    ]
  );

  res.json({ page: result.rows[0] });
});

router.delete("/:siteSlug/:page", requireAuth, async (req, res) => {
  await db.query(
    `DELETE FROM visual_pages
     WHERE page = $1
     AND site_id = (SELECT id FROM sites WHERE slug = $2)`,
    [req.params.page, req.params.siteSlug]
  );

  res.json({ ok: true });
});

module.exports = router;