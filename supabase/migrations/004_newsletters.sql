-- ============================================
-- NEWSLETTER SOURCES CONFIG TABLE
-- ============================================
CREATE TABLE newsletter_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_email TEXT NOT NULL UNIQUE,
  sender_name TEXT NOT NULL,
  gmail_label TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_newsletter_sources_active ON newsletter_sources(active);

-- ============================================
-- NEWSLETTERS TABLE
-- ============================================
CREATE TABLE newsletters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES newsletter_sources(id) ON DELETE SET NULL,
  gmail_message_id TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  sender TEXT NOT NULL,
  content_html TEXT,
  content_text TEXT,
  summary TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_newsletters_received ON newsletters(received_at DESC);
CREATE INDEX idx_newsletters_source ON newsletters(source_id);
CREATE INDEX idx_newsletters_read ON newsletters(is_read);
CREATE INDEX idx_newsletters_gmail_id ON newsletters(gmail_message_id);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================
CREATE TRIGGER update_newsletter_sources_updated_at
  BEFORE UPDATE ON newsletter_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_newsletters_updated_at
  BEFORE UPDATE ON newsletters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE newsletter_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all newsletter_sources operations" ON newsletter_sources FOR ALL USING (true);
CREATE POLICY "Allow all newsletters operations" ON newsletters FOR ALL USING (true);

-- ============================================
-- SEED NEWSLETTER SOURCES
-- ============================================
INSERT INTO newsletter_sources (sender_name, sender_email) VALUES
  ('Stratechery', 'email@stratechery.com'),
  ('a16z', 'a16z@substack.com'),
  ('a16z Build', 'a16zbuild@substack.com'),
  ('TBPN', 'tbpn@substack.com'),
  ('Pirate Wires Daily', 'piratewires+daily@substack.com'),
  ('What I Read This Week', 'chamath@substack.com'),
  ('TLDR', 'dan@tldrnewsletter.com');
