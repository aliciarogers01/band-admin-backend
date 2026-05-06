const express = require("express");
const db = require("../config/db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

function safeJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

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
    nav_links,
    social_links,
    signup_title,
    signup_description,
    signup_button_text,
    signup_success_text,
    notify_title,
    notify_description,
    notify_button_text,
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
      layout_style,
      nav_links,
      social_links,
      signup_title,
      signup_description,
      signup_button_text,
      signup_success_text,
      notify_title,
      notify_description,
      notify_button_text
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15,$16,$17,$18,$19,$20,$21)
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
      nav_links = EXCLUDED.nav_links,
      social_links = EXCLUDED.social_links,
      signup_title = EXCLUDED.signup_title,
      signup_description = EXCLUDED.signup_description,
      signup_button_text = EXCLUDED.signup_button_text,
      signup_success_text = EXCLUDED.signup_success_text,
      notify_title = EXCLUDED.notify_title,
      notify_description = EXCLUDED.notify_description,
      notify_button_text = EXCLUDED.notify_button_text,
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
      JSON.stringify(safeJsonArray(nav_links)),
      JSON.stringify(safeJsonArray(social_links)),
      signup_title || "",
      signup_description || "",
      signup_button_text || "Sign Up",
      signup_success_text || "Thank you! You are signed up.",
      notify_title || "",
      notify_description || "",
      notify_button_text || "Get Notified",
    ]
  );

  res.json({ settings: result.rows[0] });
});

module.exports = router;
