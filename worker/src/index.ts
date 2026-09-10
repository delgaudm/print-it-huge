// Anonymous aggregate counters for print-it-huge.
//
// Privacy contract: this worker never reads the client IP, never reads the
// User-Agent, sets no cookies, and stores nothing but integer totals of
// explicitly whitelisted events. With no identifiers and no device storage,
// the collected data is not personal data, so no consent banner is required.

/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
}

const STYLES = [
  'dots', 'squares', 'diamonds', 'lines', 'dither',
  'cmyk', 'hexagons', 'stippling', 'pixels', 'upscale',
];
const IMAGE_SOURCES = ['upload', 'drop', 'gallery'];
const PAPERS = ['letter', 'a4'];

const MAX_BODY_BYTES = 512;
const MAX_PAGES = 10_000;
const MAX_AREA_CM2 = 10_000_000; // 1000 m² — far above any real poster
const DAILY_WINDOW_DAYS = 30;

const isStr = (v: unknown): v is string => typeof v === 'string';

const intIn = (v: unknown, min: number, max: number): number | null => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const i = Math.round(v);
  return i >= min && i <= max ? i : null;
};

const allowedOrigins = (env: Env): Set<string> =>
  new Set(env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean));

const corsHeaders = (origin: string | null): Record<string, string> => {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
};

const json = (body: unknown, status: number, origin: string | null): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders(origin) },
  });

const noContent = (origin: string | null): Response =>
  new Response(null, { status: 204, headers: corsHeaders(origin) });

const today = (): string => new Date().toISOString().slice(0, 10);

// INSERT ... ON CONFLICT keeps every increment atomic; D1.batch runs the
// statements in one transaction, so a multi-counter event can't half-apply.
const inc = (db: D1Database, name: string, delta = 1): D1PreparedStatement =>
  db.prepare(
    'INSERT INTO counters (name, value) VALUES (?, ?) ON CONFLICT (name) DO UPDATE SET value = value + ?'
  ).bind(name, delta, delta);

const incDaily = (db: D1Database, stat: string, day: string, delta = 1): D1PreparedStatement =>
  db.prepare(
    'INSERT INTO daily (stat, day, value) VALUES (?, ?, ?) ON CONFLICT (stat, day) DO UPDATE SET value = value + ?'
  ).bind(stat, day, delta, delta);

interface EventBody {
  event?: unknown;
  props?: unknown;
}

const propsOf = (body: EventBody): Record<string, unknown> =>
  typeof body.props === 'object' && body.props !== null ? (body.props as Record<string, unknown>) : {};

async function handleEvent(request: Request, env: Env, origin: string): Promise<Response> {
  const length = Number(request.headers.get('Content-Length') ?? '0');
  if (length > MAX_BODY_BYTES) return json({ error: 'payload too large' }, 413, origin);

  let body: EventBody;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return json({ error: 'payload too large' }, 413, origin);
    body = JSON.parse(text) as EventBody;
  } catch {
    return json({ error: 'invalid JSON' }, 400, origin);
  }

  if (body.event === 'poster_generated') {
    const p = propsOf(body);
    const pages = intIn(p.pages, 1, MAX_PAGES);
    const areaCm2 = intIn(p.area_cm2, 0, MAX_AREA_CM2);
    if (
      !STYLES.includes(p.style as string) ||
      !PAPERS.includes(p.paper as string) ||
      pages === null || areaCm2 === null
    ) {
      return json({ error: 'invalid props' }, 400, origin);
    }
    const day = today();
    await env.DB.batch([
      inc(env.DB, 'posters'),
      inc(env.DB, 'pages', pages),
      inc(env.DB, 'area_cm2', areaCm2),
      inc(env.DB, `style:${p.style as string}`),
      inc(env.DB, `paper:${p.paper as string}`),
      incDaily(env.DB, 'posters', day),
      incDaily(env.DB, 'pages', day, pages),
    ]);
    return noContent(origin);
  }

  if (body.event === 'image_loaded') {
    const source = propsOf(body).source;
    if (!IMAGE_SOURCES.includes(source as string)) {
      return json({ error: 'invalid props' }, 400, origin);
    }
    await env.DB.batch([
      inc(env.DB, 'images'),
      inc(env.DB, `image:${source as string}`),
    ]);
    return noContent(origin);
  }

  if (body.event === 'poster_error') {
    const style = propsOf(body).style;
    if (!STYLES.includes(style as string)) {
      return json({ error: 'invalid props' }, 400, origin);
    }
    await env.DB.batch([inc(env.DB, 'errors')]);
    return noContent(origin);
  }

  return json({ error: 'unknown event' }, 400, origin);
}

async function handleStats(env: Env, origin: string): Promise<Response> {
  const counters = await env.DB.prepare('SELECT name, value FROM counters')
    .all<{ name: string; value: number }>();
  const since = new Date(Date.now() - (DAILY_WINDOW_DAYS - 1) * 86_400_000).toISOString().slice(0, 10);
  const daily = await env.DB.prepare(
    "SELECT day, stat, value FROM daily WHERE stat IN ('posters', 'pages') AND day >= ? ORDER BY day"
  ).bind(since).all<{ day: string; stat: string; value: number }>();

  const totals: Record<string, number> = {};
  const styles: Record<string, number> = {};
  const papers: Record<string, number> = {};
  const sources: Record<string, number> = {};
  for (const row of counters.results) {
    if (row.name.startsWith('style:')) styles[row.name.slice(6)] = row.value;
    else if (row.name.startsWith('paper:')) papers[row.name.slice(6)] = row.value;
    else if (row.name.startsWith('image:')) sources[row.name.slice(6)] = row.value;
    else totals[row.name] = row.value;
  }

  const byDay = new Map<string, { posters: number; pages: number }>();
  for (const row of daily.results) {
    const entry = byDay.get(row.day) ?? { posters: 0, pages: 0 };
    if (row.stat === 'posters') entry.posters = row.value;
    else entry.pages = row.value;
    byDay.set(row.day, entry);
  }
  const series = Array.from({ length: DAILY_WINDOW_DAYS }, (_, i) => {
    const day = new Date(Date.now() - (DAILY_WINDOW_DAYS - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    const entry = byDay.get(day) ?? { posters: 0, pages: 0 };
    return { day, ...entry };
  });

  return json({ totals: { ...totals, styles, papers, sources }, daily: series }, 200, origin);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origins = allowedOrigins(env);
    const origin = request.headers.get('Origin');
    const trusted = origin !== null && origins.has(origin);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(trusted ? origin : null) });
    }

    if (!trusted) return json({ error: 'origin not allowed' }, 403, null);

    try {
      if (url.pathname === '/api/event' && request.method === 'POST') {
        return await handleEvent(request, env, origin);
      }
      if (url.pathname === '/api/stats' && request.method === 'GET') {
        return await handleStats(env, origin);
      }
      return json({ error: 'not found' }, 404, origin);
    } catch (err) {
      console.error('stats worker error:', err);
      return json({ error: 'internal error' }, 500, origin);
    }
  },
};
