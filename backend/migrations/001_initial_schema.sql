-- knowledge_base table
CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_code VARCHAR(10) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    case_no VARCHAR(100),
    court_type VARCHAR(20),
    year INTEGER,
    title TEXT NOT NULL,
    summary TEXT,
    full_text TEXT NOT NULL,
    statutes TEXT[],
    metadata JSONB DEFAULT '{}',
    chunk_count INTEGER DEFAULT 0,
    embedding_model VARCHAR(100),
    ingested_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- document_chunks table
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID REFERENCES knowledge_base(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    token_count INTEGER,
    source_code VARCHAR(10) NOT NULL,
    qdrant_point_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ingestion_jobs table
CREATE TABLE ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_code VARCHAR(10) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    total_documents INTEGER DEFAULT 0,
    processed_documents INTEGER DEFAULT 0,
    failed_documents INTEGER DEFAULT 0,
    error_log JSONB DEFAULT '[]',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- complaint_drafts table
CREATE TABLE complaint_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    case_type VARCHAR(50) NOT NULL,
    target_court VARCHAR(100),
    form_template_id UUID REFERENCES knowledge_base(id),
    draft_data JSONB NOT NULL,
    validation_result JSONB,
    completeness_score FLOAT,
    xml_export TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- judgment_drafts table
CREATE TABLE judgment_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    case_facts_hash VARCHAR(64) NOT NULL,
    draft_text TEXT NOT NULL,
    precedent_case_nos TEXT[],
    unverified_references TEXT[],
    pii_masked BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- case_predictions table
CREATE TABLE case_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    case_facts_hash VARCHAR(64) NOT NULL,
    predicted_outcome VARCHAR(50),
    confidence FLOAT NOT NULL,
    similar_cases_count INTEGER,
    win_loss_ratio FLOAT,
    top_precedent_case_nos TEXT[],
    factors JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- transcriptions table
CREATE TABLE transcriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    audio_file_url TEXT NOT NULL,
    duration_seconds INTEGER,
    transcript_text TEXT,
    speakers JSONB,
    low_confidence_segments JSONB,
    pii_masked BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- audit_log table (replaces localStorage-based CAL-130)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    query_hash VARCHAR(64),
    query_preview VARCHAR(200),
    agent_role VARCHAR(50),
    result_count INTEGER DEFAULT 0,
    confidence FLOAT,
    metadata JSONB DEFAULT '{}',
    prev_hash VARCHAR(64),
    entry_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- All indexes from design
CREATE INDEX idx_kb_source_code ON knowledge_base(source_code);
CREATE INDEX idx_kb_court_type ON knowledge_base(court_type);
CREATE INDEX idx_kb_case_no ON knowledge_base(case_no);
CREATE INDEX idx_kb_document_type ON knowledge_base(document_type);
CREATE INDEX idx_kb_year ON knowledge_base(year);
CREATE INDEX idx_kb_statutes ON knowledge_base USING GIN(statutes);
CREATE INDEX idx_kb_metadata ON knowledge_base USING GIN(metadata);
CREATE INDEX idx_chunks_kb_id ON document_chunks(knowledge_base_id);
CREATE INDEX idx_chunks_source ON document_chunks(source_code);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- Materialized view for dashboard
CREATE MATERIALIZED VIEW dashboard_case_stats AS
SELECT
    court_type,
    EXTRACT(YEAR FROM ingested_at) AS year,
    document_type,
    COUNT(*) AS case_count,
    AVG((metadata->>'processing_days')::float) AS avg_processing_days,
    COUNT(*) FILTER (WHERE metadata->>'status' = 'rejected') AS rejected_count,
    jsonb_agg(DISTINCT metadata->'rejection_reason') FILTER (WHERE metadata->>'status' = 'rejected') AS rejection_reasons
FROM knowledge_base
WHERE document_type IN ('judgment', 'complaint')
GROUP BY court_type, EXTRACT(YEAR FROM ingested_at), document_type;

-- Note: pg_cron schedule should be set up separately:
-- SELECT cron.schedule('refresh_dashboard_stats', '*/5 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_case_stats');
