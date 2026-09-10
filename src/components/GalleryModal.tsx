import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { GalleryGroup, GalleryItem, GALLERY_GROUP_FILTERS, galleryThumbUrl } from '../lib/gallery';

interface GalleryModalProps {
  open: boolean;
  darkMode: boolean;
  items: GalleryItem[] | null;
  loadingSlug: string | null;
  onClose: () => void;
  onSelect: (item: GalleryItem) => void;
}

export function GalleryModal({ open, darkMode, items, loadingSlug, onClose, onSelect }: GalleryModalProps) {
  const [filter, setFilter] = useState<GalleryGroup | 'all'>('all');

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

  if (!open) return null;

  const visibleItems = (items ?? []).filter((item) => filter === 'all' || item.group === filter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Pick a picture">
      <div
        className={`absolute inset-0 backdrop-blur-sm ${darkMode ? 'bg-black/70' : 'bg-ink/50'}`}
        onClick={onClose}
      />
      <div className={`relative flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border shadow-lift ${darkMode ? 'border-[#3a332b] bg-[#211c17]' : 'border-line bg-sheet'}`}>
        <div className={`flex items-start justify-between gap-4 border-b p-5 pb-4 ${darkMode ? 'border-[#3a332b]' : 'border-line'}`}>
          <div>
            <h2 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-[#f0e9dd]' : 'text-ink'}`} style={{ fontFamily: 'var(--font-display)' }}>
              Pick a picture
            </h2>
            <p className={`mt-0.5 text-sm ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>
              Museum artwork, free to print — every image is public domain or CC0.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close gallery"
            className={`rounded-full border p-2 transition-all hover:shadow-lift ${darkMode ? 'border-[#3a332b] bg-[#2a241e] text-[#f0e9dd] hover:bg-accent hover:text-white' : 'border-line bg-paper text-ink hover:bg-accent hover:text-white'}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 px-5 pt-4">
          {GALLERY_GROUP_FILTERS.map(({ id, label }) => {
            const active = filter === id;
            return (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${active ? 'bg-accent text-white shadow-sm' : darkMode ? 'border border-[#3a332b] bg-[#2a241e] text-[#a1988c] hover:text-[#f0e9dd]' : 'border border-line bg-paper text-ink-soft hover:text-ink'}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items === null ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3">
              <Loader2 className={`h-6 w-6 animate-spin ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`} />
              <p className={`text-sm font-medium ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>Opening the print shop…</p>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="flex h-48 items-center justify-center px-6 text-center">
              <p className={`text-sm font-medium ${darkMode ? 'text-[#a1988c]' : 'text-ink-soft'}`}>
                Couldn't load the gallery — you can still upload your own image.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visibleItems.map((item) => {
                const isLoading = loadingSlug === item.slug;
                return (
                  <button
                    key={item.slug}
                    onClick={() => onSelect(item)}
                    disabled={loadingSlug !== null}
                    className={`group flex flex-col rounded-xl border p-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-lift disabled:cursor-wait ${darkMode ? 'border-[#3a332b] bg-[#191512] hover:border-accent' : 'border-line bg-paper hover:border-accent'} ${isLoading ? 'ring-2 ring-accent' : ''}`}
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg">
                      <img
                        src={galleryThumbUrl(item)}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-[1.04] ${isLoading ? 'opacity-40' : ''}`}
                      />
                      {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-accent" />
                        </div>
                      )}
                    </div>
                    <p className={`mt-2 line-clamp-1 text-xs font-bold ${darkMode ? 'text-[#f0e9dd]' : 'text-ink'}`}>{item.title}</p>
                    <p className={`text-[11px] ${darkMode ? 'text-[#8d8375]' : 'text-ink-soft'}`}>
                      {item.artist} · {item.year}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className={`border-t px-5 py-2.5 ${darkMode ? 'border-[#3a332b]' : 'border-line'}`}>
          <p className={`text-center font-mono text-[11px] ${darkMode ? 'text-[#8d8375]' : 'text-ink-soft/80'}`}>
            All images are public domain or CC0, courtesy of museum open-access programs.
          </p>
        </div>
      </div>
    </div>
  );
}
