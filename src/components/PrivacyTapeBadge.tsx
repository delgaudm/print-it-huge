/**
 * PrivacyTapeBadge component
 *
 * An ink-stamp sticker in the drop zone: the privacy promise, always visible
 * where the photo lands. Solid sticker background so it reads on light and dark.
 */
export function PrivacyTapeBadge() {
  return (
    <div className="absolute right-4 top-4 z-20 rotate-[7deg] pointer-events-none" aria-hidden="true">
      <div
        className="rounded-lg border-[3px] border-blush/80 px-4 py-3 text-center shadow-sheet"
        style={{ backgroundColor: 'rgba(255, 252, 245, 0.85)', backdropFilter: 'blur(2px)' }}
      >
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-blush">
          Never uploaded
        </p>
        <p className="mt-1 font-display text-sm font-bold leading-tight text-ink">
          Your photo never
          <br />
          leaves this computer
        </p>
      </div>
    </div>
  );
}
