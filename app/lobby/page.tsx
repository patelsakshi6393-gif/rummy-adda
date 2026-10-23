'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/AuthGuard';
import { RummyAddaLobby } from '@/components/RummyAddaLobby';
import { clearActiveGameSession } from '@/lib/game-service';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GameState } from '@/lib/types';

export default function LobbyPage() {
  const { user } = useAuth();

  // If user returns to lobby after dropping/finishing, clear lingering session pointer
  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      try {
        const storedGameId =
          localStorage.getItem('rummy_active_game_id') ||
          localStorage.getItem('activeGameId');
        if (storedGameId) {
          getDoc(doc(db, 'games', storedGameId)).then((snap) => {
            if (snap.exists()) {
              const data = snap.data() as GameState;
              if (
                data.status === 'COMPLETED' ||
                data.phase === 'COMPLETED' ||
                data.droppedUids?.includes(user.uid)
              ) {
                clearActiveGameSession(user.uid);
              }
            } else {
              clearActiveGameSession(user.uid);
            }
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('Lobby session check warning:', err);
      }
    }
  }, [user]);

  return (
    <AuthGuard>
      <RummyAddaLobby />
    </AuthGuard>
  );
}
