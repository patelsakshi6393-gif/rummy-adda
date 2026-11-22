'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LudoFrame() {
  const searchParams = useSearchParams();
  const autostart = searchParams.get('autostart') || '';
  const stake = searchParams.get('stake') || '';
  const players = searchParams.get('players') || '';

  const params = new URLSearchParams();
  if (autostart) params.set('autostart', autostart);
  if (stake) params.set('stake', stake);
  if (players) params.set('players', players);

  const qs = params.toString();
  const iframeSrc = `/games/ludo/index.html${qs ? `?${qs}` : ''}`;

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#0c132c] overflow-hidden">
      <iframe
        src={iframeSrc}
        className="w-full h-full border-0 select-none"
        title="Ludo Game"
        allow="autoplay; fullscreen"
      />
    </div>
  );
}

export default function LudoPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-[#0c132c] text-white flex items-center justify-center font-bold">Loading Ludo...</div>}>
      <LudoFrame />
    </Suspense>
  );
}
