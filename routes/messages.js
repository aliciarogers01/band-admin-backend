const express = require("express");
const db = require("../config/db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

router.post("/:siteSlug", async (req, res) => {
  const { fan_name, fan_email, message, fan_image_url, fan_art_url } = req.body;

  const site = await db.query("SELECT id FROM sites WHERE slug = $1", [
    req.params.siteSlug,
  ]);

  if (!site.rows[0]) return res.status(404).json({ error: "Site not found" });

  const result = await db.query(
    `INSERT INTO messages (site_id, fan_name, fan_email, message, fan_image_url, fan_art_url, is_approved)
     VALUES ($1, $2, $3, $4, $5, $6, false)
     RETURNING *`,
    [
      site.rows[0].id,
      fan_name || "",
      fan_email || "",
      message || "",
      fan_image_url || "",
      fan_art_url || "",
    ]
  );

  res.json({ message: result.rows[0] });
});

router.get("/:siteSlug", requireAuth, async (req, res) => {
  const result = await db.query(
    `SELECT messages.*
     FROM messages
     JOIN sites ON sites.id = messages.site_id
     WHERE sites.slug = $1
     ORDER BY messages.created_at DESC`,
    [req.params.siteSlug]
  );

  res.json({ messages: result.rows });
});

router.get("/:siteSlug/public", async (req, res) => {
  const result = await db.query(
    `SELECT messages.id,
            messages.fan_name,
            messages.message,
            messages.fan_image_url,
            messages.fan_art_url,
            messages.created_at
     FROM messages
     JOIN sites ON sites.id = messages.site_id
     WHERE sites.slug = $1
     AND messages.is_approved = true
     ORDER BY messages.created_at DESC`,
    [req.params.siteSlug]
  );

  res.json({ messages: result.rows });
});

router.get("/:siteSlug/:messageId/public", async (req, res) => {
  const result = await db.query(
    `SELECT messages.id,
            messages.fan_name,
            messages.message,
            messages.fan_image_url,
            messages.fan_art_url,
            messages.admin_reply,
            messages.replied_at,
            messages.created_at
     FROM messages
     JOIN sites ON sites.id = messages.site_id
     WHERE sites.slug = $1
     AND messages.id = $2
     AND messages.is_approved = true`,
    [req.params.siteSlug, req.params.messageId]
  );

  res.json({ message: result.rows[0] || null });
});

router.post("/:siteSlug/:messageId/approve", requireAuth, async (req, res) => {
  const result = await db.query(
    `UPDATE messages
     SET is_approved = true
     WHERE id = $1
     AND site_id = (SELECT id FROM sites WHERE slug = $2)
     RETURNING *`,
    [req.params.messageId, req.params.siteSlug]
  );

  if (!result.rows[0]) return res.status(404).json({ error: "Message not found" });

  res.json({ message: result.rows[0] });
});

router.post("/:siteSlug/:messageId/reject", requireAuth, async (req, res) => {
  const result = await db.query(
    `UPDATE messages
     SET is_approved = false
     WHERE id = $1
     AND site_id = (SELECT id FROM sites WHERE slug = $2)
     RETURNING *`,
    [req.params.messageId, req.params.siteSlug]
  );

  if (!result.rows[0]) return res.status(404).json({ error: "Message not found" });

  res.json({ message: result.rows[0] });
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

  if (!result.rows[0]) return res.status(404).json({ error: "Message not found" });

  res.json({ message: result.rows[0] });
});

router.delete("/:siteSlug/:messageId", requireAuth, async (req, res) => {
  await db.query(
    `DELETE FROM messages
     WHERE id = $1
     AND site_id = (SELECT id FROM sites WHERE slug = $2)`,
    [req.params.messageId, req.params.siteSlug]
  );

  res.json({ ok: true });
});

module.exports = router;
