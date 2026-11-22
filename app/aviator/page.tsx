'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function AviatorFrame() {
  const searchParams = useSearchParams();
  const autostart = searchParams.get('autostart') || '';
  const stake = searchParams.get('stake') || '';

  const params = new URLSearchParams();
  if (autostart) params.set('autostart', autostart);
  if (stake) params.set('stake', stake);

  const qs = params.toString();
  const iframeSrc = `/games/aviator/index.html${qs ? `?${qs}` : ''}`;

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#0b0c10] overflow-hidden">
      <iframe
        src={iframeSrc}
        className="w-full h-full border-0 select-none"
        title="Aviator Game"
        allow="autoplay; fullscreen"
      />
    </div>
  );
}

export default function AviatorPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-[#0b0c10] text-white flex items-center justify-center font-bold">Loading Aviator...</div>}>
      <AviatorFrame />
    </Suspense>
  );
}
