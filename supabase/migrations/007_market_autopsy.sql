-- Market Autopsy tables for AI-powered company research reports

-- Ensure the updated_at trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Reports table
CREATE TABLE autopsy_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(255) NOT NULL,
  report_content TEXT,
  source_checklist JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'complete', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_autopsy_reports_status ON autopsy_reports(status);
CREATE INDEX idx_autopsy_reports_created ON autopsy_reports(created_at DESC);
CREATE INDEX idx_autopsy_reports_company ON autopsy_reports(company_name);

-- Annotations table
CREATE TABLE autopsy_annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES autopsy_reports(id) ON DELETE CASCADE,
  highlighted_text TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  note TEXT,
  color VARCHAR(20) NOT NULL DEFAULT 'yellow',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_autopsy_annotations_report ON autopsy_annotations(report_id);

-- Triggers for updated_at (reuse existing function)
CREATE TRIGGER update_autopsy_reports_updated_at
  BEFORE UPDATE ON autopsy_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_autopsy_annotations_updated_at
  BEFORE UPDATE ON autopsy_annotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (permissive, single-user system)
ALTER TABLE autopsy_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE autopsy_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all autopsy_reports operations" ON autopsy_reports
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all autopsy_annotations operations" ON autopsy_annotations
  FOR ALL USING (true) WITH CHECK (true);
