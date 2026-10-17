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
    sm: 'w-9 h-14 sm:w-11 sm:h-16 text-[10px] sm:text-xs rounded-md',
    hand: 'w-8 h-13 min-[400px]:w-9 min-[400px]:h-14 sm:w-11 sm:h-16 md:w-12 md:h-18 text-[9px] sm:text-xs rounded-md sm:rounded-lg',
    md: 'w-11 h-17 sm:w-13 sm:h-20 md:w-15 md:h-22 lg:w-16 lg:h-24 text-xs sm:text-sm rounded-lg',
    lg: 'w-15 h-22 sm:w-18 sm:h-27 md:w-20 md:h-30 text-sm sm:text-base rounded-xl',
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
        ${isSelected ? '-translate-y-3 ring-2 ring-amber-400 shadow-xl shadow-amber-500/30' : 'hover:-translate-y-1 shadow-md hover:shadow-lg'}
        ${disabled ? 'opacity-60 cursor-not-allowed hover:translate-y-0' : ''}
        bg-gradient-to-b from-amber-50 via-white to-slate-100 border border-slate-300
        flex flex-col justify-between p-1 font-semibold text-slate-900
        ${className}
      `}
      style={{
        boxShadow: isSelected
          ? '0 10px 20px -3px rgba(245, 158, 11, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)'
          : '0 4px 8px rgba(0,0,0,0.3)',
      }}
    >
      {/* Wild Joker Badge */}
      {isWild && (
        <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-md border border-amber-300 flex items-center gap-0.5">
          <span>★</span> JOKER
        </div>
      )}

      {/* Printed Joker Badge */}
      {isJoker && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-white to-amber-50 rounded-[inherit] flex flex-col items-center justify-center p-1 text-purple-700">
          <span className="text-xl">🃏</span>
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-900">Joker</span>
        </div>
      )}

      {!isJoker && (
        <>
          {/* Top-Left Rank & Suit */}
          <div className={`flex flex-col items-start leading-none ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
            <span className="font-bold tracking-tight">{card.rank}</span>
            <span className="text-[13px]">{suitSymbol}</span>
          </div>

          {/* Center Suit Symbol */}
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${isRed ? 'text-rose-600/90' : 'text-slate-900/90'}`}>
            <span className={size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-3xl' : 'text-2xl'}>
              {suitSymbol}
            </span>
          </div>

          {/* Bottom-Right Rank & Suit */}
          <div className={`flex flex-col items-end leading-none rotate-180 ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
            <span className="font-bold tracking-tight">{card.rank}</span>
            <span className="text-[13px]">{suitSymbol}</span>
          </div>
        </>
      )}
    </div>
  );
}
