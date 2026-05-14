const express = require("express");
const db = require("../config/db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

function cleanSocialUrls(value) {
  if (Array.isArray(value)) {
    return value
      .filter(item => item && item.url)
      .map(item => ({
        label: item.label || "Link",
        url: item.url
      }));
  }

  return [];
}

router.get("/:siteSlug", async (req, res) => {
  const result = await db.query(
    `SELECT shows.*
     FROM shows
     JOIN sites ON sites.id = shows.site_id
     WHERE sites.slug = $1
     ORDER BY show_date ASC, start_time ASC`,
    [req.params.siteSlug]
  );

  res.json({ shows: result.rows });
});

router.post("/:siteSlug", requireAuth, async (req, res) => {
  const {
    show_date,
    end_date,
    start_time,
    end_time,
    venue,
    city,
    state,
    social_urls,
    image_url,
    notes
  } = req.body;

  const site = await db.query("SELECT id FROM sites WHERE slug = $1", [
    req.params.siteSlug,
  ]);

  if (!site.rows[0]) return res.status(404).json({ error: "Site not found" });

  const result = await db.query(
    `INSERT INTO shows (
      site_id,
      show_date,
      end_date,
      start_time,
      end_time,
      venue,
      city,
      state,
      social_urls,
      image_url,
      notes
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)
     RETURNING *`,
    [
      site.rows[0].id,
      show_date,
      end_date || null,
      start_time || null,
      end_time || null,
      venue,
      city || "",
      state || "",
      JSON.stringify(cleanSocialUrls(social_urls)),
      image_url || "",
      notes || ""
    ]
  );

  res.json({ show: result.rows[0] });
});

router.put("/:siteSlug/:showId", requireAuth, async (req, res) => {
  const {
    show_date,
    end_date,
    start_time,
    end_time,
    venue,
    city,
    state,
    social_urls,
    image_url,
    notes
  } = req.body;

  const result = await db.query(
    `UPDATE shows
     SET show_date = $1,
         end_date = $2,
         start_time = $3,
         end_time = $4,
         venue = $5,
         city = $6,
         state = $7,
         social_urls = $8::jsonb,
         image_url = $9,
         notes = $10
     WHERE id = $11
     AND site_id = (SELECT id FROM sites WHERE slug = $12)
     RETURNING *`,
    [
      show_date,
      end_date || null,
      start_time || null,
      end_time || null,
      venue,
      city || "",
      state || "",
      JSON.stringify(cleanSocialUrls(social_urls)),
      image_url || "",
      notes || "",
      req.params.showId,
      req.params.siteSlug,
    ]
  );

  if (!result.rows[0]) {
    return res.status(404).json({ error: "Show not found" });
  }

  res.json({ show: result.rows[0] });
});

router.delete("/:siteSlug/:showId", requireAuth, async (req, res) => {
  await db.query(
    `DELETE FROM shows
     WHERE id = $1
     AND site_id = (SELECT id FROM sites WHERE slug = $2)`,
    [req.params.showId, req.params.siteSlug]
  );

  res.json({ ok: true });
});

module.exports = router;