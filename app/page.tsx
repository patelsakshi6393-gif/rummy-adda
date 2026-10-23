'use client';

import React from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { RummyAddaLobby } from '@/components/RummyAddaLobby';

export default function HomePage() {
  return (
    <AuthGuard>
      <RummyAddaLobby />
    </AuthGuard>
  );
}
