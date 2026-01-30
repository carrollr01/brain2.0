-- ============================================
-- GOOGLE OAUTH TOKENS TABLE
-- Stores single user's Google OAuth credentials
-- ============================================
CREATE TABLE google_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT NOT NULL,
  google_email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only allow one row (single user system)
CREATE UNIQUE INDEX single_oauth_token ON google_oauth_tokens ((true));

-- Trigger for updated_at
CREATE TRIGGER update_google_oauth_tokens_updated_at
  BEFORE UPDATE ON google_oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE google_oauth_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all google_oauth_tokens operations" ON google_oauth_tokens FOR ALL USING (true);

-- ============================================
-- CALENDAR EVENTS TABLE
-- Local record of created calendar events
-- ============================================
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_event_id VARCHAR(255) UNIQUE,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  end_time TIME,
  description TEXT,
  people TEXT[] DEFAULT '{}',
  has_google_meet BOOLEAN DEFAULT false,
  google_meet_link TEXT,
  original_message TEXT NOT NULL,
  source_phone VARCHAR(20),
  synced BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_calendar_events_date ON calendar_events(event_date DESC);
CREATE INDEX idx_calendar_events_created ON calendar_events(created_at DESC);
CREATE INDEX idx_calendar_events_synced ON calendar_events(synced);

-- Trigger for updated_at
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all calendar_events operations" ON calendar_events FOR ALL USING (true);
