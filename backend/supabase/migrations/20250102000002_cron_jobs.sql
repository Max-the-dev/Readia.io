-- ============================================
-- Penny.io Scheduled Jobs (pg_cron)
-- ============================================
--
-- This migration sets up automated scheduled jobs using pg_cron.
--
-- JOB 1: Daily popularity score recalculation (2 AM UTC)
--   - Algorithm: (views + likes*10 + purchases*50) * time_decay
--   - Time decay: exponential with 7-day half-life
--   - Replaces manual script: npm run recalculate-popularity
--
-- JOB 2: Daily draft cleanup (3 AM UTC)
--   - Deletes drafts older than 7 days
--   - Prevents database bloat
--
-- Management queries (run in SQL Editor):
--   View jobs: SELECT * FROM cron.job;
--   View history: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--   Unschedule: SELECT cron.unschedule('job-name');
-- ============================================

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- JOB 1: Daily popularity score recalculation (2 AM UTC)
SELECT cron.schedule(
  'recalculate-popularity-scores',
  '0 2 * * *',
  $$
  UPDATE articles
  SET popularity_score = (
    (views * 1 + likes * 10 + purchases * 50) *
    POWER(2, -EXTRACT(EPOCH FROM (NOW() - publish_date)) / (7 * 24 * 60 * 60))
  )
  WHERE publish_date IS NOT NULL;
  $$
);

-- JOB 2: Daily draft cleanup (3 AM UTC)
SELECT cron.schedule(
  'cleanup-expired-drafts',
  '0 3 * * *',
  $$
  DELETE FROM drafts WHERE expires_at <= NOW();
  $$
);
