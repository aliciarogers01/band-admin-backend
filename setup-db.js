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

    CREATE TABLE IF NOT EXISTS visual_pages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      page TEXT NOT NULL DEFAULT 'home',
      project_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      html TEXT NOT NULL DEFAULT '',
      css TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(site_id, page)
    );

    CREATE TABLE IF NOT EXISTS shows (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      show_date DATE NOT NULL,
      venue TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      ticket_url TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      fan_name TEXT NOT NULL DEFAULT '',
      fan_email TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL,
      fan_image_url TEXT NOT NULL DEFAULT '',
      fan_art_url TEXT NOT NULL DEFAULT '',
      is_approved BOOLEAN NOT NULL DEFAULT false,
      admin_reply TEXT NOT NULL DEFAULT '',
      admin_image_url TEXT NOT NULL DEFAULT '',
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

    CREATE TABLE IF NOT EXISTS media (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      public_id TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      alt_text TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS page_sections (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      page TEXT NOT NULL DEFAULT 'home',
      section_type TEXT NOT NULL DEFAULT 'text',
      title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      button_text TEXT NOT NULL DEFAULT '',
      button_url TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_visible BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS visual_page_edits (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      page TEXT NOT NULL DEFAULT 'home',
      edits JSONB NOT NULL DEFAULT '{"items":{},"history":[]}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(site_id, page)
    );

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

  await db.query(
    `INSERT INTO admins (email, password_hash, must_change_password)
     VALUES ($1, $2, true)
     ON CONFLICT (email) DO NOTHING`,
    [adminEmail, adminPasswordHash]
  );

  await db.query(`
    ALTER TABLE shows
    ADD COLUMN IF NOT EXISTS end_date DATE,
    ADD COLUMN IF NOT EXISTS start_time TIME,
    ADD COLUMN IF NOT EXISTS end_time TIME,
    ADD COLUMN IF NOT EXISTS social_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '';

    ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS fan_image_url TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS fan_art_url TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS admin_image_url TEXT NOT NULL DEFAULT '';
  `);

  await db.query(`
    INSERT INTO sites (slug, domain, display_name)
    VALUES
      ('weirdsciencefw', 'weirdsciencefw.com', 'Weird Science FW'),
      ('driver8remband', 'driver8remband.com', 'Driver 8'),
      ('graverobber', 'graverobberpunk.com', 'Grave Robber')
    ON CONFLICT (domain)
    DO UPDATE SET
      slug = EXCLUDED.slug,
      display_name = EXCLUDED.display_name;
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
