import React from 'react';

/**
 * PrivacyTapeBadge component
 *
 * Displays a magenta "privacy tape" badge with a lock icon and privacy messaging.
 * This is a static decorative element with no animation.
 */
export function PrivacyTapeBadge() {
  return (
    <div className="absolute top-3 right-3 pointer-events-none z-20" aria-hidden="true">
      <div
        className="bg-[#ff6eb4] border-3 border-[#1a1a1a] p-4 transform rotate-[15deg]"
        style={{ boxShadow: '6px_6px_0px_0px_rgba(26,26,26,1)' }}
      >
        <div className="text-center">
          <div className="text-2xl mb-2">🔒</div>

          <p className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wide leading-none">
            YOUR PHOTOS STAY
          </p>
          <p className="text-lg font-bold text-[#1a1a1a] uppercase leading-tight">
            WITH YOU
          </p>

          <div className="my-2 border-t-2 border-[#1a1a1a]" />

          <p className="text-[10px] font-bold text-[#1a1a1a] uppercase leading-tight">
            We never see 'em!
          </p>
          <p className="text-[9px] font-medium text-[#1a1a1a] leading-tight opacity-90">
            100% on your computer
          </p>
        </div>
      </div>
    </div>
  );
}