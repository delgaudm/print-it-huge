import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';

export function StyleTipBox() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="p-2 border-2 border-[#ff6b35] bg-[#ff6b35]/5 animate-slide-up">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-4 h-4 text-[#ff6b35] shrink-0 mt-0.5" />
        <div className="text-xs text-[#1a1a1a]">
          <span className="font-bold">Dots work great for portraits!</span>
          <span className="block mt-1 opacity-80">Feel free to pick whatever makes you happy though.</span>
        </div>
      </div>
    </div>
  );
}