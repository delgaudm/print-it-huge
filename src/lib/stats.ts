// Anonymous usage counters for the "Shop stats" scoreboard.
//
// Nothing here touches personal data: no cookies, no localStorage, no
// identifiers, and payloads are a few dozen bytes of numbers and enums —
// never image data. Tracking is compiled out entirely unless the deployer
// sets VITE_STATS_URL, so local dev and forks send nothing by default.

const STATS_URL = import.meta.env.VITE_STATS_URL;

export type PosterStyle =
  | 'dots' | 'squares' | 'diamonds' | 'lines' | 'dither'
  | 'cmyk' | 'hexagons' | 'stippling' | 'pixels' | 'upscale';

export type StatsEvent =
  | { name: 'image_loaded'; source: 'upload' | 'drop' | 'gallery' }
  | {
      name: 'poster_generated';
      style: PosterStyle;
      paper: 'letter' | 'a4';
      orientation: 'portrait' | 'landscape';
      colorMode: 'color' | 'mono';
      layoutMode: 'pages' | 'wallSpace';
      pages: number;
      area_cm2: number;
    }
  | { name: 'poster_error'; style: PosterStyle };

export function trackEvent(event: StatsEvent): void {
  if (!STATS_URL) return;
  const { name, ...props } = event;
  // text/plain keeps this a CORS "simple request" — no preflight round trip.
  try {
    void fetch(`${STATS_URL}/api/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ event: name, props }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Stats must never break the app.
  }
}

export interface StatsSnapshot {
  totals: {
    posters?: number;
    pages?: number;
    area_cm2?: number;
    images?: number;
    errors?: number;
    styles: Record<string, number>;
    papers: Record<string, number>;
    sources: Record<string, number>;
  };
  daily: { day: string; posters: number; pages: number }[];
}

export async function fetchStats(): Promise<StatsSnapshot> {
  if (!STATS_URL) throw new Error('Stats are not configured for this deployment');
  const res = await fetch(`${STATS_URL}/api/stats`);
  if (!res.ok) throw new Error(`Stats request failed (HTTP ${res.status})`);
  return (await res.json()) as StatsSnapshot;
}
