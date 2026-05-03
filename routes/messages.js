const express = require("express");
const db = require("../config/db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

router.post("/:siteSlug", async (req, res) => {
  const { fan_name, fan_email, message } = req.body;

  const site = await db.query("SELECT id FROM sites WHERE slug = $1", [
    req.params.siteSlug,
  ]);

  if (!site.rows[0]) {
    return res.status(404).json({ error: "Site not found" });
  }

  const result = await db.query(
    `INSERT INTO messages (site_id, fan_name, fan_email, message)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [site.rows[0].id, fan_name || "", fan_email || "", message]
  );

  res.json({ message: result.rows[0] });
});

router.get("/:siteSlug", requireAuth, async (req, res) => {
  const result = await db.query(
    `SELECT messages.*
     FROM messages
     JOIN sites ON sites.id = messages.site_id
     WHERE sites.slug = $1
     ORDER BY created_at DESC`,
    [req.params.siteSlug]
  );

  res.json({ messages: result.rows });
});

router.post("/:siteSlug/:messageId/reply", requireAuth, async (req, res) => {
  const result = await db.query(
    `UPDATE messages
     SET admin_reply = $1, replied_at = NOW()
     WHERE id = $2
     AND site_id = (SELECT id FROM sites WHERE slug = $3)
     RETURNING *`,
    [req.body.admin_reply || "", req.params.messageId, req.params.siteSlug]
  );

  res.json({ message: result.rows[0] });
});

module.exports = router;