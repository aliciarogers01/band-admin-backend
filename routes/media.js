const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const db = require("../config/db");
const requireAuth = require("../middleware/auth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    stream.end(buffer);
  });
}

router.get("/:siteSlug", requireAuth, async (req, res) => {
  const result = await db.query(
    `SELECT media.*
     FROM media
     JOIN sites ON sites.id = media.site_id
     WHERE sites.slug = $1
     ORDER BY media.created_at DESC`,
    [req.params.siteSlug]
  );

  res.json({ media: result.rows });
});

router.post("/:siteSlug", requireAuth, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Image file is required" });

  const site = await db.query("SELECT id FROM sites WHERE slug = $1", [
    req.params.siteSlug,
  ]);

  if (!site.rows[0]) return res.status(404).json({ error: "Site not found" });

  const uploaded = await uploadToCloudinary(
    req.file.buffer,
    `band-sites/${req.params.siteSlug}`
  );

  const result = await db.query(
    `INSERT INTO media (site_id, url, public_id, label, alt_text)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      site.rows[0].id,
      uploaded.secure_url,
      uploaded.public_id,
      req.body.label || "",
      req.body.alt_text || "",
    ]
  );

  res.json({ media: result.rows[0] });
});

router.delete("/:siteSlug/:mediaId", requireAuth, async (req, res) => {
  const result = await db.query(
    `SELECT media.*
     FROM media
     JOIN sites ON sites.id = media.site_id
     WHERE media.id = $1
     AND sites.slug = $2`,
    [req.params.mediaId, req.params.siteSlug]
  );

  const item = result.rows[0];

  if (!item) return res.status(404).json({ error: "Media not found" });

  await cloudinary.uploader.destroy(item.public_id);

  await db.query("DELETE FROM media WHERE id = $1", [item.id]);

  res.json({ ok: true });
});

module.exports = router;