'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Volume2, ArrowLeft, Check, Sparkles } from 'lucide-react';
import { soundManager } from '@/lib/sound';

export default function GameAudioSettingsPage() {
  const [sfx, setSfx] = useState(true);
  const [music, setMusic] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [animation, setAnimation] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleToggleSfx = () => {
    const next = !sfx;
    setSfx(next);
    soundManager.enabled = next;
    if (next) soundManager.playCardDraw();
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Link href="/settings" className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Settings</span>
          </Link>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Game & Audio Settings</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Customize sound effects, card dealing audio, and visual transitions.
            </p>
          </div>

          <div className="bg-[#12131e] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl text-xs">
            <div className="space-y-4 divide-y divide-white/5">
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h4 className="text-sm font-bold text-white">Card Sound Effects</h4>
                  <p className="text-slate-400 text-[11px]">Play audio when drawing, discarding, and melding cards</p>
                </div>
                <input
                  type="checkbox"
                  checked={sfx}
                  onChange={handleToggleSfx}
                  className="w-5 h-5 rounded text-amber-500 focus:ring-0 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Table Ambience & Background Music</h4>
                  <p className="text-slate-400 text-[11px]">Gentle acoustic Indian salon ambient soundtrack</p>
                </div>
                <input
                  type="checkbox"
                  checked={music}
                  onChange={() => setMusic(!music)}
                  className="w-5 h-5 rounded text-amber-500 focus:ring-0 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Haptic Vibration on Turn</h4>
                  <p className="text-slate-400 text-[11px]">Vibrate mobile device when active turn starts</p>
                </div>
                <input
                  type="checkbox"
                  checked={vibration}
                  onChange={() => setVibration(!vibration)}
                  className="w-5 h-5 rounded text-amber-500 focus:ring-0 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Smooth Card Animations</h4>
                  <p className="text-slate-400 text-[11px]">3D card fly transitions and shuffle animations</p>
                </div>
                <input
                  type="checkbox"
                  checked={animation}
                  onChange={() => setAnimation(!animation)}
                  className="w-5 h-5 rounded text-amber-500 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              {saved && <span className="text-emerald-400 font-bold text-xs flex items-center gap-1"><Check className="w-4 h-4" /> Preferences saved</span>}
              <button
                onClick={handleSave}
                className="ml-auto py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold text-xs shadow-md"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
