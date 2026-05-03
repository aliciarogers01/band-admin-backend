require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("./config/db");

async function setup() {
  const adminEmail = process.env.ADMIN_EMAIL.toLowerCase();
  const adminPasswordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);

  await db.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS admins (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      must_change_password BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sites (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      slug TEXT UNIQUE NOT NULL,
      domain TEXT UNIQUE,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS settings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      site_id UUID UNIQUE NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      site_title TEXT NOT NULL DEFAULT '',
      tagline TEXT NOT NULL DEFAULT '',
      homepage_text TEXT NOT NULL DEFAULT '',
      primary_color TEXT NOT NULL DEFAULT '#39ff14',
      background_color TEXT NOT NULL DEFAULT '#000000',
      text_color TEXT NOT NULL DEFAULT '#ffffff',
      logo_url TEXT NOT NULL DEFAULT '',
      hero_image_url TEXT NOT NULL DEFAULT '',
      background_image_url TEXT NOT NULL DEFAULT '',
      font_family TEXT NOT NULL DEFAULT 'Arial, sans-serif',
      layout_style TEXT NOT NULL DEFAULT 'classic',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS shows (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      show_date DATE NOT NULL,
      venue TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      ticket_url TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      fan_name TEXT NOT NULL DEFAULT '',
      fan_email TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL,
      admin_reply TEXT NOT NULL DEFAULT '',
      read_at TIMESTAMPTZ,
      replied_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(
    `INSERT INTO admins (email, password_hash, must_change_password)
     VALUES ($1, $2, true)
     ON CONFLICT (email) DO NOTHING`,
    [adminEmail, adminPasswordHash]
  );

  await db.query(`
    INSERT INTO sites (slug, domain, display_name)
    VALUES
      ('weirdsciencefw', 'weirdsciencefw.com', 'Weird Science FW'),
      ('driver8remband', 'driver8remband.com', 'Driver 8 R.E.M. Band'),
      ('graverobber', 'graverobberpunk.com', 'Grave Robber')
    ON CONFLICT (slug) DO NOTHING;
  `);

  await db.query(`
    INSERT INTO settings (site_id, site_title, tagline, homepage_text)
    SELECT id, display_name, 'Official band website', 'Edit this text from the admin panel.'
    FROM sites
    ON CONFLICT (site_id) DO NOTHING;
  `);

  console.log("Database setup complete.");
  await db.pool.end();
}

setup().catch((error) => {
  console.error(error);
  process.exit(1);
});