import React from 'react';
import Link from 'next/link';
import { ShieldCheck, MessageCircle, AlertCircle, Award } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#08090f] border-t border-amber-500/20 text-slate-400 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        {/* Brand Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-slate-950 font-black">
              ♠
            </div>
            <span className="text-lg font-black tracking-wider text-white">
              RUMMY<span className="text-rose-500">ADDA</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            India&apos;s authentic real-time 13-card rummy gaming platform. Experience server-authoritative multiplayer tables, Points Rummy, and Pool 101 in a luxury royal atmosphere.
          </p>
          <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Skill Game & Fair Play Protected</span>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-4">Games & Lobby</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/how-to-play" className="text-amber-400 font-semibold hover:text-amber-300 transition-colors">How to Play (Rules Guide)</Link></li>
            <li><Link href="/lobby" className="hover:text-white transition-colors">Games Lobby</Link></li>
            <li><Link href="/tables" className="hover:text-white transition-colors">Cash Tables</Link></li>
            <li><Link href="/tournaments" className="hover:text-white transition-colors">Tournaments & Freerolls</Link></li>
            <li><Link href="/my-games" className="hover:text-white transition-colors">My Game History</Link></li>
            <li><Link href="/wallet" className="hover:text-white transition-colors">Wallet & Cashout</Link></li>
          </ul>
        </div>

        {/* Policies */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-4">Integrity & Policies</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/fair-play" className="hover:text-white transition-colors">Fair Play Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link href="/settings/safe-play" className="hover:text-white transition-colors">Responsible Gaming (18+)</Link></li>
            <li><Link href="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
          </ul>
        </div>

        {/* WhatsApp Support Box */}
        <div className="bg-[#12131d] border border-amber-500/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <MessageCircle className="w-5 h-5 text-emerald-400" />
            <span>Dedicated Support</span>
          </div>
          <p className="text-xs text-slate-300">
            For deposit queries, wallet assistance, and account support:
          </p>
          <a
            href="https://wa.me/919277182389?text=Hello%20RummyAdda%20Support,%20I%20need%20assistance"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-transform hover:scale-105"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chat on WhatsApp Support</span>
          </a>
          <p className="text-[10px] text-slate-400 text-center">
            Official WhatsApp Desk • 24/7 Player Help
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-4">
        <p>© {new Date().getFullYear()} RummyAdda. All rights reserved. Rummy is a game of skill.</p>
        <div className="flex items-center gap-2 text-rose-400 font-semibold">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Strictly 18+ Only. Play Responsibly.</span>
        </div>
      </div>
    </footer>
  );
}
