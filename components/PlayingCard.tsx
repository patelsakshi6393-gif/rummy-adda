'use client';

import React from 'react';
import { Card, Rank } from '@/lib/types';

interface PlayingCardProps {
  card: Card;
  wildJokerRank?: Rank;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'hand';
  disabled?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchMove?: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchEnd?: (e: React.TouchEvent<HTMLDivElement>) => void;
  className?: string;
}

export function PlayingCard({
  card,
  wildJokerRank,
  isSelected,
  onClick,
  size = 'md',
  disabled,
  draggable,
  onDragStart,
  onDragEnd,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  className = '',
}: PlayingCardProps) {
  const isWild = wildJokerRank && card.rank === wildJokerRank && !card.isPrintedJoker;
  const isJoker = card.isPrintedJoker || card.rank === 'JOKER';

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

  const suitSymbols: Record<string, string> = {
    spades: '♠',
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    joker: '★',
  };

  const suitSymbol = suitSymbols[card.suit] || '★';

  const sizeClasses = {
    sm: 'w-7 h-10.5 min-[400px]:w-7.5 min-[400px]:h-11.5 sm:w-9 sm:h-13 text-[8px] sm:text-[10px] rounded',
    hand: 'w-7 h-10.5 min-[400px]:w-7.5 min-[400px]:h-11.5 sm:w-8.5 sm:h-13 md:w-10 md:h-15 text-[8px] sm:text-[10px] rounded sm:rounded-md',
    md: 'w-9 h-13.5 sm:w-11 sm:h-16 md:w-13 md:h-19 text-xs rounded-md sm:rounded-lg',
    lg: 'w-12 h-18 sm:w-15 sm:h-22 md:w-17 md:h-25 text-sm rounded-xl',
  };

  return (
    <div
      onClick={disabled ? undefined : onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={`
        relative select-none transition-all duration-150 transform cursor-pointer
        ${sizeClasses[size]}
        ${isSelected ? '-translate-y-2 ring-2 ring-amber-400 shadow-xl shadow-amber-500/30' : 'hover:-translate-y-0.5 shadow-sm hover:shadow-md'}
        ${disabled ? 'opacity-60 cursor-not-allowed hover:translate-y-0' : ''}
        bg-gradient-to-b from-amber-50 via-white to-slate-100 border border-slate-300
        flex flex-col justify-between p-0.5 font-semibold text-slate-900
        ${className}
      `}
      style={{
        boxShadow: isSelected
          ? '0 8px 16px -2px rgba(245, 158, 11, 0.4), 0 3px 5px -1px rgba(0, 0, 0, 0.2)'
          : '0 2px 5px rgba(0,0,0,0.25)',
      }}
    >
      {/* Wild Joker Badge */}
      {isWild && (
        <div className="absolute -top-1.5 -right-1.5 z-10 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[7px] sm:text-[8px] px-1 py-0.2 rounded-full shadow border border-amber-300 flex items-center gap-0.5">
          <span>★</span> JOKER
        </div>
      )}

      {/* Printed Joker Badge */}
      {isJoker && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-white to-amber-50 rounded-[inherit] flex flex-col items-center justify-center p-0.5 text-purple-700">
          <span className="text-base sm:text-lg">🃏</span>
          <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-purple-900">Joker</span>
        </div>
      )}

      {!isJoker && (
        <>
          {/* Top-Left Rank & Suit */}
          <div className={`flex flex-col items-start leading-none ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
            <span className="font-extrabold text-[9px] sm:text-[10px] tracking-tight">{card.rank}</span>
            <span className="text-[10px] sm:text-[11px] -mt-0.5">{suitSymbol}</span>
          </div>

          {/* Center Suit Symbol */}
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${isRed ? 'text-rose-600/85' : 'text-slate-900/85'}`}>
            <span className={size === 'sm' || size === 'hand' ? 'text-base sm:text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'}>
              {suitSymbol}
            </span>
          </div>

          {/* Bottom-Right Rank & Suit */}
          <div className={`flex flex-col items-end leading-none rotate-180 ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
            <span className="font-extrabold text-[9px] sm:text-[10px] tracking-tight">{card.rank}</span>
            <span className="text-[10px] sm:text-[11px] -mt-0.5">{suitSymbol}</span>
          </div>
        </>
      )}
    </div>
  );
}
