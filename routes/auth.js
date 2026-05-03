const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

router.post("/login", async (req, res) => {
const { email, password } = req.body || {};

if (!email || !password) {
  return res.status(400).json({ error: "Email and password are required" });
}

  const result = await db.query("SELECT * FROM admins WHERE email = $1", [
    email.toLowerCase(),
  ]);

  const admin = result.rows[0];

  if (!admin) {
    return res.status(401).json({ error: "Invalid login" });
  }

  const validPassword = await bcrypt.compare(password, admin.password_hash);

  if (!validPassword) {
    return res.status(401).json({ error: "Invalid login" });
  }

  const token = jwt.sign(
    { id: admin.id, email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    admin: {
      id: admin.id,
      email: admin.email,
      must_change_password: admin.must_change_password,
    },
  });
});

router.post("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  const result = await db.query("SELECT * FROM admins WHERE id = $1", [
    req.admin.id,
  ]);

  const admin = result.rows[0];

  const validPassword = await bcrypt.compare(currentPassword, admin.password_hash);

  if (!validPassword) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db.query(
    "UPDATE admins SET password_hash = $1, must_change_password = false WHERE id = $2",
    [passwordHash, req.admin.id]
  );

  res.json({ ok: true });
});

module.exports = router;