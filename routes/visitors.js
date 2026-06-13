const express = require("express");
const db = require("../config/db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

async function ensureVisitorTable() {
  await db.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS daily_visitors (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      visit_date DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'America/New_York')::date),
      ip_address TEXT NOT NULL,
      user_agent TEXT NOT NULL DEFAULT '',
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(site_id, visit_date, ip_address)
    );
  `);
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "";
}

async function deleteOldVisitorRows() {
  await db.query("DELETE FROM daily_visitors WHERE visit_date < ((NOW() AT TIME ZONE 'America/New_York')::date)");
}

router.post("/:siteSlug/track", async (req, res) => {
  try {
    await ensureVisitorTable();
    await deleteOldVisitorRows();

    const ipAddress = getClientIp(req);
    if (!ipAddress) {
      return res.status(400).json({ error: "Visitor IP could not be detected." });
    }

    const result = await db.query(
      `INSERT INTO daily_visitors (site_id, ip_address, user_agent)
       SELECT id, $2, $3
       FROM sites
       WHERE slug = $1
       ON CONFLICT (site_id, visit_date, ip_address)
       DO UPDATE SET
         last_seen_at = NOW(),
         user_agent = EXCLUDED.user_agent
       RETURNING id`,
      [
        req.params.siteSlug,
        ipAddress,
        String(req.headers["user-agent"] || "").slice(0, 500)
      ]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Site not found." });
    }

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS visitors
       FROM daily_visitors dv
       JOIN sites s ON s.id = dv.site_id
       WHERE s.slug = $1
         AND dv.visit_date = ((NOW() AT TIME ZONE 'America/New_York')::date)`,
      [req.params.siteSlug]
    );

    res.json({
      ok: true,
      date: new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date()),
      visitors: countResult.rows[0]?.visitors || 0
    });
  } catch (error) {
    console.error("Visitor tracking failed:", error);
    res.status(500).json({ error: "Visitor tracking failed." });
  }
});

router.get("/:siteSlug/today", requireAuth, async (req, res) => {
  try {
    await ensureVisitorTable();
    await deleteOldVisitorRows();

    const result = await db.query(
      `SELECT
         ((NOW() AT TIME ZONE 'America/New_York')::date)::text AS date,
         COUNT(dv.id)::int AS visitors
       FROM sites s
       LEFT JOIN daily_visitors dv
         ON dv.site_id = s.id
        AND dv.visit_date = ((NOW() AT TIME ZONE 'America/New_York')::date)
       WHERE s.slug = $1
       GROUP BY s.id`,
      [req.params.siteSlug]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Site not found." });
    }

    res.json({
      date: result.rows[0].date,
      visitors: result.rows[0].visitors
    });
  } catch (error) {
    console.error("Visitor count failed:", error);
    res.status(500).json({ error: "Visitor count failed." });
  }
});

module.exports = router;
