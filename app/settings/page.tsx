'use client';

import React from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  Volume2,
  Shield,
  KeyRound,
  Bell,
  HeartHandshake,
  EyeOff,
  ChevronRight,
  Settings,
} from 'lucide-react';

export default function SettingsIndexPage() {
  const categories = [
    {
      title: 'Game & Audio',
      desc: 'Sound effects, music volume, and card animation toggles',
      href: '/settings/game-audio',
      icon: Volume2,
      color: 'text-amber-400',
    },
    {
      title: 'Security',
      desc: 'Active sessions, sign-in verification, and device security',
      href: '/settings/security',
      icon: Shield,
      color: 'text-emerald-400',
    },
    {
      title: 'Change Password',
      desc: 'Update your Firebase authentication account password',
      href: '/settings/change-password',
      icon: KeyRound,
      color: 'text-blue-400',
    },
    {
      title: 'Notifications',
      desc: 'Manage game alerts, tournament pings, and account notifications',
      href: '/settings/notifications',
      icon: Bell,
      color: 'text-purple-400',
    },
    {
      title: 'Safe Play & Limits',
      desc: 'Responsible gaming: daily deposit limits, cooling-off period',
      href: '/settings/safe-play',
      icon: HeartHandshake,
      color: 'text-rose-400',
    },
    {
      title: 'Privacy Settings',
      desc: 'Profile privacy, table visibility, and game history preferences',
      href: '/settings/privacy',
      icon: EyeOff,
      color: 'text-teal-400',
    },
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
        <Navbar />

        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">Settings & Preferences</h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Configure your game experience, audio preferences, and account security.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categories.map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.href}
                  href={c.href}
                  className="bg-[#12131e] border border-white/10 hover:border-amber-400/50 rounded-2xl p-5 flex items-center justify-between gap-4 transition-all hover:-translate-y-0.5 group shadow-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <Icon className={`w-5 h-5 ${c.color}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                        {c.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-1">{c.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
                </Link>
              );
            })}
          </div>
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
