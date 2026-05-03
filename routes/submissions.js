const express = require("express");
const db = require("../config/db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

router.post("/:siteSlug", async (req, res) => {
  const { name, email, phone, message } = req.body;

  const site = await db.query("SELECT id FROM sites WHERE slug = $1", [
    req.params.siteSlug,
  ]);

  if (!site.rows[0]) {
    return res.status(404).json({ error: "Site not found" });
  }

  const result = await db.query(
    `INSERT INTO submissions (site_id, name, email, phone, message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [site.rows[0].id, name || "", email || "", phone || "", message || ""]
  );

  res.json({ submission: result.rows[0] });
});

router.get("/:siteSlug", requireAuth, async (req, res) => {
  const result = await db.query(
    `SELECT submissions.*
     FROM submissions
     JOIN sites ON sites.id = submissions.site_id
     WHERE sites.slug = $1
     ORDER BY created_at DESC`,
    [req.params.siteSlug]
  );

  res.json({ submissions: result.rows });
});

module.exports = router;