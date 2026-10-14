'use client';

import React, { useState } from 'react';
import { Download, Play, CheckCircle2, AlertCircle, Sparkles, ExternalLink } from 'lucide-react';

interface SplashScreenProps {
  onPlayNow: () => void;
  apkDownloadUrl?: string;
}

export function SplashScreen({
  onPlayNow,
  apkDownloadUrl = process.env.NEXT_PUBLIC_APK_URL ||
    'https://github.com/patelsakshi6393-gif/rummy-adda/releases/latest/download/rummyadda.apk',
}: SplashScreenProps) {
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'starting' | 'started'>('idle');

  const handleDownloadAndroidApp = () => {
    setDownloadStatus('starting');

    // Trigger direct APK download from GitHub Releases
    const link = document.createElement('a');
    link.href = apkDownloadUrl;
    link.setAttribute('download', 'rummyadda.apk');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadStatus('started');
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#0b1022] text-white px-4 py-8 select-none overflow-y-auto">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-amber-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Top spacer */}
      <div className="w-full flex justify-end max-w-md pt-2">
        <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase bg-white/5 px-3 py-1 rounded-full border border-white/10">
          Official Desktop & Mobile Web
        </span>
      </div>

      {/* Center Section: Logo Emblem */}
      <div className="relative flex flex-col items-center justify-center my-auto py-6">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          {/* Authentic RUMMY ADDA Emblem (SVG matching reference) */}
          <svg
            viewBox="0 0 400 400"
            className="w-full h-full drop-shadow-[0_10px_35px_rgba(0,180,255,0.25)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Crown Gradients */}
              <linearGradient id="crownGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff3a1" />
                <stop offset="35%" stopColor="#f59e0b" />
                <stop offset="70%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#92400e" />
              </linearGradient>

              {/* Cyan Energy Ribbon */}
              <linearGradient id="cyanRibbon" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0072ff" />
                <stop offset="50%" stopColor="#00c6ff" />
                <stop offset="100%" stopColor="#38ef7d" />
              </linearGradient>

              {/* Orange Flame Ribbon */}
              <linearGradient id="orangeRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff0844" />
                <stop offset="50%" stopColor="#ffb199" />
                <stop offset="100%" stopColor="#ff8c00" />
              </linearGradient>

              {/* Gold Ribbon */}
              <linearGradient id="goldSwirl" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="60%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#fef08a" />
              </linearGradient>

              {/* Circuit Glow Filter */}
              <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Circuit Background Circle & Traces */}
            <circle
              cx="200"
              cy="200"
              r="140"
              stroke="#00c6ff"
              strokeWidth="1.5"
              strokeDasharray="6 8"
              opacity="0.35"
              filter="url(#glowCyan)"
            />
            <circle
              cx="200"
              cy="200"
              r="156"
              stroke="#0088ff"
              strokeWidth="1"
              strokeDasharray="20 12 4 12"
              opacity="0.25"
            />

            {/* Circuit trace nodes */}
            <g opacity="0.6" stroke="#00d2ff" strokeWidth="1.5">
              <path d="M 60 200 H 90 L 110 220" fill="none" />
              <circle cx="60" cy="200" r="3" fill="#00d2ff" />
              <circle cx="110" cy="220" r="2" fill="#00d2ff" />

              <path d="M 340 200 H 310 L 290 180" fill="none" />
              <circle cx="340" cy="200" r="3" fill="#00d2ff" />
              <circle cx="290" cy="180" r="2" fill="#00d2ff" />

              <path d="M 120 70 L 140 90 H 165" fill="none" />
              <circle cx="120" cy="70" r="2.5" fill="#00d2ff" />

              <path d="M 280 70 L 260 90 H 235" fill="none" />
              <circle cx="280" cy="70" r="2.5" fill="#00d2ff" />

              <path d="M 110 320 L 130 300" fill="none" />
              <circle cx="110" cy="320" r="2" fill="#00d2ff" />
            </g>

            {/* Inner Dark Badge Base */}
            <circle
              cx="200"
              cy="200"
              r="118"
              fill="#080d1e"
              stroke="#00c6ff"
              strokeWidth="2"
              opacity="0.9"
            />

            {/* Royal Crown on Top */}
            <g transform="translate(145, 88) scale(0.55)">
              <path
                d="M 100 0 L 135 60 L 180 15 L 170 85 L 30 85 L 20 15 L 65 60 Z"
                fill="url(#crownGold)"
                filter="drop-shadow(0 4px 10px rgba(245, 158, 11, 0.5))"
              />
              {/* Crown jewels */}
              <circle cx="100" cy="2" r="5" fill="#ffffff" />
              <circle cx="20" cy="17" r="4" fill="#38bdf8" />
              <circle cx="180" cy="17" r="4" fill="#38bdf8" />
              <circle cx="65" cy="62" r="3" fill="#ef4444" />
              <circle cx="135" cy="62" r="3" fill="#ef4444" />
              {/* Crown base band */}
              <rect x="30" y="85" width="140" height="14" rx="4" fill="url(#crownGold)" />
              <circle cx="50" cy="92" r="2.5" fill="#fff" />
              <circle cx="80" cy="92" r="2.5" fill="#38bdf8" />
              <circle cx="100" cy="92" r="3" fill="#ef4444" />
              <circle cx="120" cy="92" r="2.5" fill="#38bdf8" />
              <circle cx="150" cy="92" r="2.5" fill="#fff" />
            </g>

            {/* Fanned Playing Cards */}
            <g transform="translate(142, 215)">
              {/* Card 1: Left (Tilted -18 deg) */}
              <g transform="rotate(-18 20 40)">
                <rect
                  x="0"
                  y="0"
                  width="36"
                  height="52"
                  rx="4"
                  fill="#f8fafc"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                  filter="drop-shadow(0 3px 6px rgba(0,0,0,0.6))"
                />
                <text x="5" y="14" fontSize="10" fontWeight="900" fill="#0f172a" fontFamily="sans-serif">
                  A
                </text>
                <text x="18" y="32" fontSize="16" fill="#0f172a" textAnchor="middle">
                  ♣
                </text>
              </g>

              {/* Card 3: Right (Tilted +18 deg) */}
              <g transform="rotate(18 96 40)">
                <rect
                  x="80"
                  y="0"
                  width="36"
                  height="52"
                  rx="4"
                  fill="#f8fafc"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                  filter="drop-shadow(0 3px 6px rgba(0,0,0,0.6))"
                />
                <text x="85" y="14" fontSize="10" fontWeight="900" fill="#dc2626" fontFamily="sans-serif">
                  K
                </text>
                <text x="98" y="32" fontSize="16" fill="#dc2626" textAnchor="middle">
                  ♦
                </text>
              </g>

              {/* Card 2: Center Ace of Hearts (Upright) */}
              <g transform="translate(40, -4)">
                <rect
                  x="0"
                  y="0"
                  width="38"
                  height="54"
                  rx="4"
                  fill="#ffffff"
                  stroke="#e2e8f0"
                  strokeWidth="1.5"
                  filter="drop-shadow(0 4px 8px rgba(0,0,0,0.7))"
                />
                <text x="6" y="14" fontSize="11" fontWeight="900" fill="#dc2626" fontFamily="sans-serif">
                  A
                </text>
                <text x="19" y="34" fontSize="18" fill="#dc2626" textAnchor="middle">
                  ♥
                </text>
              </g>
            </g>

            {/* Energetic 3D Swirling Waves (Cyan and Gold/Orange Arrow) */}
            {/* Fiery Gold/Orange Bottom Swirl */}
            <path
              d="M 120 295 C 150 325 210 325 250 280 C 275 250 285 200 280 170 C 275 195 260 230 230 255 C 190 285 145 285 120 295 Z"
              fill="url(#goldSwirl)"
              filter="drop-shadow(0 2px 8px rgba(245, 158, 11, 0.7))"
            />
            {/* Electric Cyan Swirl with Arrow Head */}
            <path
              d="M 105 280 C 120 315 175 345 235 305 C 270 280 295 230 300 175 C 285 195 260 240 225 265 C 175 295 130 275 105 280 Z"
              fill="url(#cyanRibbon)"
              filter="drop-shadow(0 3px 12px rgba(0, 198, 255, 0.8))"
            />
            {/* Arrow Head Pointing Up-Right */}
            <polygon
              points="300,165 315,190 285,182"
              fill="#00e5ff"
              filter="drop-shadow(0 2px 6px rgba(0, 229, 255, 0.9))"
            />

            {/* RUMMY ADDA Text */}
            {/* RUMMY (Curved / Top line) */}
            <text
              x="200"
              y="160"
              textAnchor="middle"
              fontFamily="Arial, Impact, sans-serif"
              fontWeight="900"
              fontSize="34"
              letterSpacing="2"
              fill="#ffffff"
              stroke="#0a1024"
              strokeWidth="4"
              paintOrder="stroke fill"
            >
              RUMMY
            </text>
            <text
              x="200"
              y="160"
              textAnchor="middle"
              fontFamily="Arial, Impact, sans-serif"
              fontWeight="900"
              fontSize="34"
              letterSpacing="2"
              fill="#ffffff"
            >
              RUMMY
            </text>

            {/* ADDA (Big Bold Headline) */}
            <text
              x="200"
              y="198"
              textAnchor="middle"
              fontFamily="Arial Black, Impact, sans-serif"
              fontWeight="900"
              fontSize="44"
              letterSpacing="3"
              fill="#ffffff"
              stroke="#060913"
              strokeWidth="6"
              paintOrder="stroke fill"
            >
              ADDA
            </text>
            <text
              x="200"
              y="198"
              textAnchor="middle"
              fontFamily="Arial Black, Impact, sans-serif"
              fontWeight="900"
              fontSize="44"
              letterSpacing="3"
              fill="#ffffff"
            >
              ADDA
            </text>

            {/* Domain / Subtext */}
            <text
              x="200"
              y="214"
              textAnchor="middle"
              fontFamily="sans-serif"
              fontWeight="700"
              fontSize="9"
              letterSpacing="1"
              fill="#38bdf8"
              opacity="0.9"
            >
              rummyadda.com
            </text>
          </svg>
        </div>

        {/* Brand Tagline */}
        <p className="mt-3 text-sm font-bold tracking-wider text-amber-300/90 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>India&apos;s Premier Rummy Destination</span>
        </p>
      </div>

      {/* Bottom Section: Buttons (Exact match to screenshot) */}
      <div className="w-full max-w-sm flex flex-col items-center gap-4 mb-4 z-10">
        {/* Button 1: Android App */}
        <button
          onClick={handleDownloadAndroidApp}
          className="w-full py-4 px-6 rounded-2xl bg-[#f5ad18] hover:bg-[#ffba26] active:scale-[0.98] text-slate-950 font-black text-xl tracking-wide shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
        >
          <Download className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          <span>Android App</span>
        </button>

        {/* Button 2: Play Now */}
        <button
          onClick={onPlayNow}
          className="w-full py-4 px-6 rounded-2xl bg-[#f5ad18] hover:bg-[#ffba26] active:scale-[0.98] text-slate-950 font-black text-xl tracking-wide shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-slate-950 text-slate-950" />
          <span>Play Now</span>
        </button>

        {/* Download notification popup if Android App was clicked */}
        {downloadStatus !== 'idle' && (
          <div className="w-full mt-2 p-3.5 rounded-xl bg-[#141b34] border border-amber-500/40 text-xs text-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-white text-sm">
                  {downloadStatus === 'starting' ? 'Starting Download...' : 'APK Download Initiated!'}
                </p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Downloading <span className="text-amber-300 font-mono">rummyadda.apk</span>. If the download doesn&apos;t start automatically,{' '}
                  <a
                    href={apkDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 underline font-bold inline-flex items-center gap-0.5"
                  >
                    Click Here <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Safe play notice */}
        <p className="text-[11px] text-slate-400 text-center mt-2">
          18+ Only • Play Responsibly • 100% Verified RNG & Secure Tables
        </p>
      </div>
    </div>
  );
}
