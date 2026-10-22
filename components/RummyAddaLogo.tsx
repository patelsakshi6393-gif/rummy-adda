'use client';

import React, { useState } from 'react';

interface RummyAddaLogoProps {
  className?: string;
  size?: number;
}

export function RummyAddaLogo({ className = '', size = 260 }: RummyAddaLogoProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {/* Ambient background glow */}
      <div
        className="absolute rounded-full pointer-events-none -z-10 animate-pulse"
        style={{
          width: `${size * 1.25}px`,
          height: `${size * 1.25}px`,
          background:
            'radial-gradient(circle, rgba(0, 210, 255, 0.25) 0%, rgba(245, 168, 23, 0.15) 40%, transparent 70%)',
          filter: 'blur(24px)',
        }}
      />

      {!imageError ? (
        <picture className="w-full h-full flex items-center justify-center">
          <source srcSet="/rummy-adda-badge.webp" type="image/webp" />
          <img
            src="/rummy-adda-badge.png"
            alt="Rummy Adda"
            width={size}
            height={size}
            className="w-full h-full object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.7)] hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
            loading="eager"
            decoding="sync"
          />
        </picture>
      ) : (
        /* Crisp Vector SVG Fallback */
        <svg
          viewBox="0 0 500 500"
          className="w-full h-full drop-shadow-[0_12px_30px_rgba(0,0,0,0.7)]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="goldCrown" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff3a8" />
              <stop offset="30%" stopColor="#ffd23f" />
              <stop offset="70%" stopColor="#e69c24" />
              <stop offset="100%" stopColor="#a76307" />
            </linearGradient>

            <linearGradient id="swooshGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff4500" />
              <stop offset="25%" stopColor="#ffaa00" />
              <stop offset="55%" stopColor="#00e5ff" />
              <stop offset="100%" stopColor="#0077ff" />
            </linearGradient>

            <filter id="neonCyanGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Deep dark backing circle */}
          <circle cx="250" cy="250" r="225" fill="#0d1424" stroke="#00e5ff" strokeWidth="3" filter="url(#neonCyanGlow)" />

          {/* Outer Circuit Nodes & Traces */}
          <g stroke="#00d2ff" strokeWidth="2.5" fill="none" opacity="0.8">
            <circle cx="250" cy="250" r="215" strokeDasharray="16 12 8 12" />
            
            {/* Circuit traces */}
            <path d="M 60 250 L 35 250 M 440 250 L 465 250" />
            <circle cx="35" cy="250" r="4" fill="#00e5ff" />
            <circle cx="465" cy="250" r="4" fill="#00e5ff" />

            <path d="M 115 115 L 90 90 M 385 115 L 410 90" />
            <circle cx="90" cy="90" r="4" fill="#00e5ff" />
            <circle cx="410" cy="90" r="4" fill="#00e5ff" />

            <path d="M 115 385 L 90 410 M 385 385 L 410 410" />
            <circle cx="90" cy="410" r="4" fill="#00e5ff" />
            <circle cx="410" cy="410" r="4" fill="#00e5ff" />
          </g>

          {/* Golden Crown */}
          <g transform="translate(180, 95) scale(0.7)">
            <polygon
              points="100,10 135,70 180,25 170,110 30,110 20,25 65,70"
              fill="url(#goldCrown)"
              stroke="#593400"
              strokeWidth="3"
            />
            {/* Crown Jewels */}
            <circle cx="100" cy="18" r="6" fill="#ff2a55" stroke="#fff" strokeWidth="1.5" />
            <circle cx="25" cy="32" r="5" fill="#00e5ff" stroke="#fff" strokeWidth="1.5" />
            <circle cx="175" cy="32" r="5" fill="#00e5ff" stroke="#fff" strokeWidth="1.5" />
            <circle cx="65" cy="72" r="4" fill="#ffe57f" />
            <circle cx="135" cy="72" r="4" fill="#ffe57f" />
            <rect x="30" y="98" width="140" height="12" rx="6" fill="#ffd23f" stroke="#8c5300" strokeWidth="2" />
          </g>

          {/* Typography: RUMMY ADDA */}
          <g textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900">
            {/* RUMMY */}
            <text
              x="250"
              y="225"
              fontSize="48"
              letterSpacing="2"
              fill="#ffffff"
              stroke="#0a1020"
              strokeWidth="5"
              paintOrder="stroke fill"
            >
              RUMMY
            </text>

            {/* ADDA */}
            <text
              x="250"
              y="275"
              fontSize="46"
              letterSpacing="3"
              fill="#ffffff"
              stroke="#0a1020"
              strokeWidth="5"
              paintOrder="stroke fill"
            >
              ADDA
            </text>

            <text
              x="250"
              y="295"
              fontSize="11"
              letterSpacing="2"
              fill="#00e5ff"
              fontWeight="700"
              opacity="0.9"
            >
              rummyadda.com
            </text>
          </g>

          {/* 3 Playing Cards Fan */}
          <g transform="translate(190, 310) scale(0.65)">
            {/* Left Card: Ace of Spades */}
            <g transform="translate(10, 20) rotate(-18)">
              <rect width="64" height="92" rx="7" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
              <text x="10" y="24" fontSize="18" fontWeight="bold" fill="#0f172a">A</text>
              <text x="32" y="58" fontSize="26" textAnchor="middle" fill="#0f172a">♠</text>
            </g>

            {/* Center Card: Ace of Hearts */}
            <g transform="translate(42, 5)">
              <rect width="64" height="92" rx="7" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
              <text x="10" y="24" fontSize="18" fontWeight="bold" fill="#dc2626">A</text>
              <text x="32" y="58" fontSize="26" textAnchor="middle" fill="#dc2626">♥</text>
            </g>

            {/* Right Card: King of Diamonds */}
            <g transform="translate(74, 20) rotate(18)">
              <rect width="64" height="92" rx="7" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
              <text x="10" y="24" fontSize="18" fontWeight="bold" fill="#dc2626">K</text>
              <text x="32" y="58" fontSize="26" textAnchor="middle" fill="#dc2626">♦</text>
            </g>
          </g>

          {/* Dynamic 3D Curved Swoosh Arrow */}
          <g filter="url(#neonCyanGlow)">
            <path
              d="M 170 410 C 210 435 290 430 330 380 C 350 355 358 315 365 270"
              fill="none"
              stroke="url(#swooshGrad)"
              strokeWidth="14"
              strokeLinecap="round"
            />
            {/* Arrow Head */}
            <polygon
              points="365,250 350,285 380,280"
              fill="#00e5ff"
              stroke="#0077ff"
              strokeWidth="2"
            />
          </g>
        </svg>
      )}
    </div>
  );
}
