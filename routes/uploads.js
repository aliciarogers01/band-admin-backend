const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const requireAuth = require("../middleware/auth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function mediaResourceType(mimetype) {
  if (mimetype && mimetype.startsWith("video/")) return "video";
  return "image";
}

function uploadToCloudinary(buffer, folder, resourceType = "image") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    stream.end(buffer);
  });
}

router.post("/:siteSlug", requireAuth, upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Media file is required" });
  }

  const isImage = req.file.mimetype && req.file.mimetype.startsWith("image/");
  const isVideo = req.file.mimetype && req.file.mimetype.startsWith("video/");

  if (!isImage && !isVideo) {
    return res.status(400).json({ error: "Only image and video files are allowed" });
  }

  try {
    const resourceType = mediaResourceType(req.file.mimetype);
    const result = await uploadToCloudinary(
      req.file.buffer,
      `band-sites/${req.params.siteSlug}`,
      resourceType
    );

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
      media_type: resourceType,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Cloudinary upload failed" });
  }
});

router.post("/:siteSlug/public", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Image file is required" });
  }

  if (!req.file.mimetype || !req.file.mimetype.startsWith("image/")) {
    return res.status(400).json({ error: "Only image files are allowed" });
  }

  try {
    const result = await uploadToCloudinary(
      req.file.buffer,
      `band-sites/${req.params.siteSlug}/fan-submissions`
    );

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Cloudinary upload failed" });
  }
});

module.exports = router;
