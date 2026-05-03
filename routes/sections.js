const express = require("express");
const db = require("../config/db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

router.get("/:siteSlug/:page", async (req, res) => {
  const result = await db.query(
    `SELECT page_sections.*
     FROM page_sections
     JOIN sites ON sites.id = page_sections.site_id
     WHERE sites.slug = $1
     AND page_sections.page = $2
     ORDER BY sort_order ASC, created_at ASC`,
    [req.params.siteSlug, req.params.page]
  );

  res.json({ sections: result.rows });
});

router.post("/:siteSlug", requireAuth, async (req, res) => {
  const site = await db.query("SELECT id FROM sites WHERE slug = $1", [
    req.params.siteSlug,
  ]);

  if (!site.rows[0]) return res.status(404).json({ error: "Site not found" });

  const {
    page,
    section_type,
    title,
    body,
    image_url,
    button_text,
    button_url,
    sort_order,
    is_visible,
  } = req.body;

  const result = await db.query(
    `INSERT INTO page_sections
     (site_id, page, section_type, title, body, image_url, button_text, button_url, sort_order, is_visible)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      site.rows[0].id,
      page || "home",
      section_type || "text",
      title || "",
      body || "",
      image_url || "",
      button_text || "",
      button_url || "",
      Number(sort_order || 0),
      is_visible !== false,
    ]
  );

  res.json({ section: result.rows[0] });
});

router.put("/:siteSlug/:sectionId", requireAuth, async (req, res) => {
  const {
    page,
    section_type,
    title,
    body,
    image_url,
    button_text,
    button_url,
    sort_order,
    is_visible,
  } = req.body;

  const result = await db.query(
    `UPDATE page_sections
     SET page = $1,
         section_type = $2,
         title = $3,
         body = $4,
         image_url = $5,
         button_text = $6,
         button_url = $7,
         sort_order = $8,
         is_visible = $9
     WHERE id = $10
     AND site_id = (SELECT id FROM sites WHERE slug = $11)
     RETURNING *`,
    [
      page || "home",
      section_type || "text",
      title || "",
      body || "",
      image_url || "",
      button_text || "",
      button_url || "",
      Number(sort_order || 0),
      is_visible !== false,
      req.params.sectionId,
      req.params.siteSlug,
    ]
  );

  res.json({ section: result.rows[0] });
});

router.delete("/:siteSlug/:sectionId", requireAuth, async (req, res) => {
  await db.query(
    `DELETE FROM page_sections
     WHERE id = $1
     AND site_id = (SELECT id FROM sites WHERE slug = $2)`,
    [req.params.sectionId, req.params.siteSlug]
  );

  res.json({ ok: true });
});

module.exports = router;