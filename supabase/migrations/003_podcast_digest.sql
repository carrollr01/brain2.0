-- ============================================
-- PODCASTS CONFIG TABLE
-- ============================================
CREATE TABLE podcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  rss_url TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_podcasts_active ON podcasts(active);

-- ============================================
-- DIGESTS TABLE
-- ============================================
CREATE TABLE digests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  topic_of_day TEXT,
  unique_takes TEXT,
  top_developments TEXT,
  strong_opinions TEXT,
  people_power TEXT,
  contrarian_radar TEXT,
  forward_looking TEXT,
  actionable_intel TEXT,
  vibe_check TEXT,
  podcasts_included TEXT[] DEFAULT '{}',
  episode_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_digests_date ON digests(date DESC);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================
CREATE TRIGGER update_podcasts_updated_at
  BEFORE UPDATE ON podcasts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_digests_updated_at
  BEFORE UPDATE ON digests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all podcasts operations" ON podcasts FOR ALL USING (true);
CREATE POLICY "Allow all digests operations" ON digests FOR ALL USING (true);

-- ============================================
-- SEED PODCASTS WITH RSS FEEDS
-- ============================================
INSERT INTO podcasts (name, rss_url) VALUES
  ('Dwarkesh Podcast', 'https://api.substack.com/feed/podcast/69345.rss'),
  ('Cheeky Pint', 'https://feeds.transistor.fm/cheeky-pint-with-john-collison'),
  ('Lex Fridman Podcast', 'https://lexfridman.com/feed/podcast/'),
  ('Training Data', 'https://feeds.megaphone.fm/trainingdata'),
  ('Conversations with Tyler', 'https://cowenconvos.libsyn.com/rss'),
  ('In Good Company', 'https://feeds.acast.com/public/shows/in-good-company-with-nicolai-tangen'),
  ('Invest Like the Best', 'https://feeds.megaphone.fm/investlikethebest'),
  ('BG2Pod', 'https://feeds.megaphone.fm/BG2'),
  ('Call Me Back', 'https://feeds.simplecast.com/5gzMlOG1'),
  ('No Priors', 'https://feeds.megaphone.fm/nopriors'),
  ('a16z Podcast', 'https://feeds.simplecast.com/JGE3yC0V'),
  ('20VC', 'https://thetwentyminutevc.libsyn.com/rss'),
  ('Uncapped', 'https://feeds.megaphone.fm/PDP4191604852'),
  ('Founders', 'https://feeds.megaphone.fm/DSLLC6297708582');
