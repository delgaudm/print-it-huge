import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, X } from 'lucide-react';
import { fetchStats, StatsSnapshot } from '../lib/stats';

interface StatsModalProps {
  open: boolean;
  darkMode: boolean;
  onClose: () => void;
}

const fmt = (n: number): string => n.toLocaleString('en-US');

// A page stack runs ~0.1 mm per 80gsm sheet.
const stackCopy = (pages: number): string => {
  const mm = pages * 0.1;
  if (mm >= 1000) return `stacked flat, ${fmt(Math.round((mm / 1000) * 10) / 10)} m of paper`;
  if (mm >= 10) return `stacked flat, ${(mm / 10).toFixed(1)} cm of paper`;
  return `stacked flat, ${mm.toFixed(1)} mm of paper`;
};

const squareCopy = (cm2: number): string => {
  const sideM = Math.sqrt(cm2 / 10000);
  if (sideM >= 1) return `a square ${sideM.toFixed(1)} m on a side`;
  return `a square ${(sideM * 100).toFixed(0)} cm on a side`;
};

// Rasterbator-style scale anchors, picked by magnitude.
const areaComparison = (cm2: number): string => {
  const m2 = cm2 / 10000;
  if (m2 >= 440_000) return `${fmt(Math.round((m2 / 440_000) * 100))}% of the Vatican's floor space`;
  if (m2 >= 261) {
    const n = Math.round(m2 / 261);
    return `${fmt(n)} tennis court${n === 1 ? '' : 's'} of wall`;
  }
  if (m2 >= 4.18) {
    const n = Math.round(m2 / 4.18);
    return `${fmt(n)} ping-pong table${n === 1 ? '' : 's'} of wall`;
  }
  const n = Math.round(m2 / 1.6);
  return `${fmt(n)} door${n === 1 ? "'s" : "s'"} worth of wall`;
};

const STYLE_LABELS: Record<string, string> = {
  dots: 'Dots', squares: 'Squares', diamonds: 'Diamonds', lines: 'Lines',
  dither: 'Dither', cmyk: 'CMYK', hexagons: 'Hexagons', stippling: 'Stippling',
  pixels: 'Pixels', upscale: 'Upscale',
};

export function StatsModal({ open, darkMode, onClose }: StatsModalProps) {
  const [stats, setStats] = useState<StatsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStats(null);
    setError(null);
    fetchStats()
      .then((snapshot) => { if (!cancelled) setStats(snapshot); })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the scoreboard.');
      });
    return () => { cancelled = true; };
  }, [open]);

  if (!open) return null;

  const tileClass = `rounded-xl border p-4 ${darkMode ? 'border-[#3a332b] bg-[#191512]' : 'border-line bg-paper'}`;
  const eyebrowClass = `font-mono text-[10px] font-semibold uppercase tracking-widest ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`;
  const numberClass = `mt-1 text-3xl font-extrabold tracking-tight ${darkMode ? 'text-[#f0e9dd]' : 'text-ink'}`;
  const subClass = `mt-0.5 text-xs ${darkMode ? 'text-[#8d8375]' : 'text-ink-soft'}`;

  const totals = stats?.totals;
  const posters = totals?.posters ?? 0;
  const pages = totals?.pages ?? 0;
  const areaCm2 = totals?.area_cm2 ?? 0;
  const daily = stats?.daily ?? [];
  const chartMax = Math.max(...daily.map((d) => d.posters), 1);
  const styleEntries = Object.entries(totals?.styles ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const sources = totals?.sources ?? {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Shop stats">
      <div
        className={`absolute inset-0 backdrop-blur-sm ${darkMode ? 'bg-black/70' : 'bg-ink/50'}`}
        onClick={onClose}
      />
      <div className={`relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-lift ${darkMode ? 'border-[#3a332b] bg-[#211c17]' : 'border-line bg-sheet'}`}>
        <div className={`flex items-start justify-between gap-4 border-b p-5 pb-4 ${darkMode ? 'border-[#3a332b]' : 'border-line'}`}>
          <div>
            <h2 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-[#f0e9dd]' : 'text-ink'}`} style={{ fontFamily: 'var(--font-display)' }}>
              The shop scoreboard
            </h2>
            <p className={`mt-0.5 text-sm ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>
              How much wall the world has gone huge with — counted in anonymous numbers.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close stats"
            className={`rounded-full border p-2 transition-all hover:shadow-lift ${darkMode ? 'border-[#3a332b] bg-[#2a241e] text-[#f0e9dd] hover:bg-accent hover:text-white' : 'border-line bg-paper text-ink hover:bg-accent hover:text-white'}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {stats === null && error === null ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3">
              <Loader2 className={`h-6 w-6 animate-spin ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`} />
              <p className={`text-sm font-medium ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>Counting the dots…</p>
            </div>
          ) : error !== null ? (
            <div className="flex h-48 items-center justify-center px-6 text-center">
              <p className={`text-sm font-medium ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>
                The scoreboard is offline right now ({error}).
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className={tileClass}>
                  <p className={eyebrowClass}>Posters made</p>
                  <p className={numberClass}>{fmt(posters)}</p>
                  <p className={subClass}>each one trimmed, taped &amp; hung</p>
                </div>
                <div className={tileClass}>
                  <p className={eyebrowClass}>Pages printed</p>
                  <p className={numberClass}>{fmt(pages)}</p>
                  <p className={subClass}>{pages > 0 ? stackCopy(pages) : 'the tray awaits'}</p>
                </div>
                <div className={tileClass}>
                  <p className={eyebrowClass}>Wall covered</p>
                  <p className={numberClass}>
                    {areaCm2 >= 10_000 ? `${(areaCm2 / 10000).toLocaleString('en-US', { maximumFractionDigits: 1 })} m²` : `${fmt(areaCm2)} cm²`}
                  </p>
                  <p className={subClass}>{areaCm2 > 0 ? squareCopy(areaCm2) : 'plenty of wall left'}</p>
                </div>
              </div>

              {areaCm2 >= 4180 && (
                <p className={`mt-3 text-center text-sm font-semibold ${darkMode ? 'text-blush' : 'text-accent-deep'}`}>
                  Altogether, {areaComparison(areaCm2)}.
                </p>
              )}

              <div className="mt-5">
                <p className={eyebrowClass}>Posters per day · last 30 days</p>
                {daily.every((d) => d.posters === 0) ? (
                  <p className={`mt-3 rounded-xl border border-dashed p-6 text-center text-sm ${darkMode ? 'border-[#3a332b] text-[#8d8375]' : 'border-line-strong text-ink-soft'}`}>
                    No posters yet — the scoreboard is waiting for its first job.
                  </p>
                ) : (
                  <>
                    <svg viewBox="0 0 600 110" className="mt-2 w-full" role="img" aria-label="Posters generated per day over the last 30 days">
                      {daily.map((d, i) => {
                        const h = d.posters === 0 ? 3 : Math.max(8, (d.posters / chartMax) * 88);
                        return (
                          <rect
                            key={d.day}
                            x={i * 20 + 3}
                            y={100 - h}
                            width={14}
                            height={h}
                            rx={3}
                            fill={d.posters === 0 ? (darkMode ? '#3a332b' : '#e4daca') : '#e85d2f'}
                          >
                            <title>{`${d.day}: ${d.posters} poster${d.posters === 1 ? '' : 's'} · ${d.pages} pages`}</title>
                          </rect>
                        );
                      })}
                      <line x1="0" y1="100.5" x2="600" y2="100.5" stroke={darkMode ? '#3a332b' : '#e4daca'} strokeWidth="1" />
                    </svg>
                    <div className={`flex justify-between font-mono text-[10px] ${darkMode ? 'text-[#8d8375]' : 'text-ink-soft'}`}>
                      <span>30 days ago</span>
                      <span>peak day: {fmt(chartMax)}</span>
                      <span>today</span>
                    </div>
                  </>
                )}
              </div>

              {styleEntries.length > 0 && (
                <div className="mt-5">
                  <p className={eyebrowClass}>Favorite styles</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {styleEntries.map(([name, count]) => (
                      <span
                        key={name}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'border border-[#3a332b] bg-[#2a241e] text-[#f0e9dd]' : 'border border-line bg-paper text-ink'}`}
                      >
                        {STYLE_LABELS[name] ?? name}
                        <span className="ml-1.5 text-accent">{fmt(count)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(totals?.images ?? 0) > 0 && (
                <p className={`mt-5 font-mono text-[11px] ${darkMode ? 'text-[#8d8375]' : 'text-ink-soft'}`}>
                  {fmt(totals?.images ?? 0)} picture{(totals?.images ?? 0) === 1 ? '' : 's'} loaded
                  {sources.gallery ? ` · ${fmt(sources.gallery)} from the gallery` : ''}
                  {sources.upload || sources.drop ? ` · ${fmt((sources.upload ?? 0) + (sources.drop ?? 0))} your own` : ''}
                  {(totals?.errors ?? 0) > 0 ? ` · ${fmt(totals?.errors ?? 0)} misprint${(totals?.errors ?? 0) === 1 ? '' : 's'} along the way` : ''}
                </p>
              )}
            </>
          )}
        </div>

        <div className={`flex items-center gap-2 border-t px-5 py-3 ${darkMode ? 'border-[#3a332b]' : 'border-line'}`}>
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-moss" />
          <p className={`text-xs ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>
            Anonymous counters only — no cookies, no accounts, no images, nothing personal is stored.
          </p>
        </div>
      </div>
    </div>
  );
}
