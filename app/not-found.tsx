import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 font-black text-2xl flex items-center justify-center border border-amber-500/40">
        404
      </div>
      <h1 className="text-2xl font-black text-white">Page Not Found</h1>
      <p className="text-xs text-slate-400 max-w-sm">
        The table or section you are looking for does not exist or has been relocated.
      </p>
      <Link
        href="/lobby"
        className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold text-xs"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Lobby</span>
      </Link>
    </div>
  );
}
