import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';

/** A sticky note with a quick tip. Own background so it reads on light and dark. */
export function StyleTipBox() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="-rotate-1 rounded-lg bg-[#ffe9a8] p-3 shadow-sheet">
      <div className="flex items-start gap-2">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#8a6a14]" />
        <div className="text-xs leading-snug text-[#4a3b12]">
          <span className="font-bold">Psst — dots are great for portraits.</span>
          <span className="mt-0.5 block opacity-80">Dither loves detailed photos. Pick whatever makes you happy.</span>
        </div>
      </div>
    </div>
  );
}
