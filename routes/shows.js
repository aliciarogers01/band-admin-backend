const express = require("express");
const db = require("../config/db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

router.get("/:siteSlug", async (req, res) => {
  const result = await db.query(
    `SELECT shows.*
     FROM shows
     JOIN sites ON sites.id = shows.site_id
     WHERE sites.slug = $1
     ORDER BY show_date ASC`,
    [req.params.siteSlug]
  );

  res.json({ shows: result.rows });
});

router.post("/:siteSlug", requireAuth, async (req, res) => {
  const { show_date, venue, city, state, ticket_url, notes } = req.body;

  const site = await db.query("SELECT id FROM sites WHERE slug = $1", [
    req.params.siteSlug,
  ]);

  if (!site.rows[0]) return res.status(404).json({ error: "Site not found" });

  const result = await db.query(
    `INSERT INTO shows (site_id, show_date, venue, city, state, ticket_url, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [site.rows[0].id, show_date, venue, city || "", state || "", ticket_url || "", notes || ""]
  );

  res.json({ show: result.rows[0] });
});

router.put("/:siteSlug/:showId", requireAuth, async (req, res) => {
  const { show_date, venue, city, state, ticket_url, notes } = req.body;

  const result = await db.query(
    `UPDATE shows
     SET show_date = $1,
         venue = $2,
         city = $3,
         state = $4,
         ticket_url = $5,
         notes = $6
     WHERE id = $7
     AND site_id = (SELECT id FROM sites WHERE slug = $8)
     RETURNING *`,
    [
      show_date,
      venue,
      city || "",
      state || "",
      ticket_url || "",
      notes || "",
      req.params.showId,
      req.params.siteSlug,
    ]
  );

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