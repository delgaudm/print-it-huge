-- Anonymous aggregate counters only: no IPs, no user agents, no identifiers.
-- Every row is a plain integer total.

CREATE TABLE IF NOT EXISTS counters (
  name  TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);

-- Per-day buckets (UTC day strings) for the "last 30 days" chart.
CREATE TABLE IF NOT EXISTS daily (
  stat  TEXT NOT NULL,
  day   TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (stat, day)
);
