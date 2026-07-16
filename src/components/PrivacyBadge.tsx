import React from 'react';
import { Lock } from 'lucide-react';

interface PrivacyBadgeProps {
  prominent?: boolean;
}

export function PrivacyBadge({ prominent = false }: PrivacyBadgeProps) {
  if (prominent) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-[#6b9bd2]/10 border-2 border-[#6b9bd2] rounded-none">
        <Lock className={`w-4 h-4 ${prominent ? 'text-[#6b9bd2] animate-pulse' : 'text-[#999]'}`} />
        <span className="text-xs font-bold text-[#1a1a1a]">
          Your photo stays on your computer
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Lock className="w-4 h-4 text-[#6b9bd2] animate-pulse" />
      <span className="text-[10px] font-bold text-[#1a1a1a]/70">
        🔒 100% Private
      </span>
    </div>
  );
}