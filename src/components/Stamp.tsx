import { useEffect, useState } from 'react';

/**
 * Rubber-stamp celebration, slammed down when the PDF is ready.
 * On brand: print shops stamp things; confetti cannons don't.
 */
export function Stamp({ trigger }: { trigger: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!trigger) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-32 left-1/2 z-50 -translate-x-1/2"
    >
      <div className="stamp-slam rounded-xl border-4 border-moss/70 px-6 py-3 text-center shadow-sheet"
        style={{ backgroundColor: 'rgba(255, 252, 245, 0.82)', backdropFilter: 'blur(2px)' }}
      >
        <div className="font-display text-2xl font-extrabold uppercase tracking-[0.18em] text-moss">
          Ready to print
        </div>
        <div className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-moss/80">
          0 uploads · 0 servers · 100% yours
        </div>
      </div>
    </div>
  );
}
