const express = require("express");
const db = require("../config/db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

router.get("/:siteSlug", async (req, res) => {
  const result = await db.query(
    `SELECT settings.*
     FROM settings
     JOIN sites ON sites.id = settings.site_id
     WHERE sites.slug = $1`,
    [req.params.siteSlug]
  );

  res.json({ settings: result.rows[0] || null });
});

router.put("/:siteSlug", requireAuth, async (req, res) => {
  const site = await db.query("SELECT id FROM sites WHERE slug = $1", [
    req.params.siteSlug,
  ]);

  if (!site.rows[0]) {
    return res.status(404).json({ error: "Site not found" });
  }

  const {
    site_title,
    tagline,
    homepage_text,
    primary_color,
    background_color,
    text_color,
    logo_url,
    hero_image_url,
    background_image_url,
    font_family,
    layout_style,
  } = req.body;

  const result = await db.query(
    `INSERT INTO settings (
      site_id,
      site_title,
      tagline,
      homepage_text,
      primary_color,
      background_color,
      text_color,
      logo_url,
      hero_image_url,
      background_image_url,
      font_family,
      layout_style
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    ON CONFLICT (site_id)
    DO UPDATE SET
      site_title = EXCLUDED.site_title,
      tagline = EXCLUDED.tagline,
      homepage_text = EXCLUDED.homepage_text,
      primary_color = EXCLUDED.primary_color,
      background_color = EXCLUDED.background_color,
      text_color = EXCLUDED.text_color,
      logo_url = EXCLUDED.logo_url,
      hero_image_url = EXCLUDED.hero_image_url,
      background_image_url = EXCLUDED.background_image_url,
      font_family = EXCLUDED.font_family,
      layout_style = EXCLUDED.layout_style,
      updated_at = NOW()
    RETURNING *`,
    [
      site.rows[0].id,
      site_title || "",
      tagline || "",
      homepage_text || "",
      primary_color || "#39ff14",
      background_color || "#000000",
      text_color || "#ffffff",
      logo_url || "",
      hero_image_url || "",
      background_image_url || "",
      font_family || "Arial, sans-serif",
      layout_style || "classic",
    ]
  );

  res.json({ settings: result.rows[0] });
});

module.exports = router;