-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- NOTES TABLE
-- ============================================
CREATE TYPE note_category AS ENUM (
  'movie',
  'book',
  'idea',
  'task',
  'plan',
  'recommendation',
  'quote',
  'other'
);

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  category note_category NOT NULL DEFAULT 'other',
  extracted_title VARCHAR(255),
  extracted_context TEXT,
  source_phone VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for category filtering and search
CREATE INDEX idx_notes_category ON notes(category);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX idx_notes_content_search ON notes USING gin(to_tsvector('english', content));

-- ============================================
-- ROLODEX TABLE
-- ============================================
CREATE TABLE rolodex (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  name_normalized VARCHAR(255) NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  source_phone VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for name lookup and search
CREATE INDEX idx_rolodex_name_normalized ON rolodex(name_normalized);
CREATE INDEX idx_rolodex_created_at ON rolodex(created_at DESC);
CREATE INDEX idx_rolodex_name_search ON rolodex USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- ============================================
-- CONVERSATION STATE TABLE
-- For managing multi-turn SMS interactions
-- ============================================
CREATE TYPE conversation_state AS ENUM (
  'idle',
  'awaiting_duplicate_response',
  'awaiting_confirmation'
);

CREATE TYPE pending_action AS ENUM (
  'create_note',
  'create_contact',
  'update_contact',
  'merge_contact'
);

CREATE TABLE conversation_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  state conversation_state NOT NULL DEFAULT 'idle',
  pending_action pending_action,
  pending_data JSONB,
  related_record_id UUID,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversation_phone ON conversation_states(phone_number);
CREATE INDEX idx_conversation_expires ON conversation_states(expires_at);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rolodex_updated_at
  BEFORE UPDATE ON rolodex
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_states_updated_at
  BEFORE UPDATE ON conversation_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rolodex ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_states ENABLE ROW LEVEL SECURITY;

-- Allow all operations (tighten when adding auth)
CREATE POLICY "Allow all notes operations" ON notes FOR ALL USING (true);
CREATE POLICY "Allow all rolodex operations" ON rolodex FOR ALL USING (true);
CREATE POLICY "Allow all conversation_states operations" ON conversation_states FOR ALL USING (true);
