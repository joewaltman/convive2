CREATE TABLE cron_runs (
  id SERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'error', 'skipped_locked')),
  error_message TEXT,
  summary JSONB
);

CREATE INDEX idx_cron_runs_job_started ON cron_runs(job_name, started_at DESC);
