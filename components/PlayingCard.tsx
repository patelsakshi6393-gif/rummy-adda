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

function PlayingCardInner({
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
    sm: 'w-10 h-14 min-[390px]:w-11 min-[390px]:h-16 sm:w-13 sm:h-19 md:w-14 md:h-20 text-[9px] min-[390px]:text-[10px] sm:text-xs rounded-md sm:rounded-lg',
    hand: 'w-[38px] h-[58px] min-[390px]:w-[42px] min-[390px]:h-[64px] min-[420px]:w-[46px] min-[420px]:h-[70px] sm:w-[56px] sm:h-[82px] md:w-[64px] md:h-[94px] text-[10px] min-[390px]:text-xs sm:text-sm md:text-base rounded-md sm:rounded-xl',
    md: 'w-14 h-20 sm:w-16 sm:h-24 md:w-18 md:h-26 text-sm sm:text-base rounded-lg sm:rounded-xl',
    lg: 'w-20 h-28 sm:w-22 sm:h-32 md:w-24 md:h-36 text-base sm:text-lg rounded-xl',
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={isJoker ? 'Joker' : `${card.rank} of ${card.suit}${isWild ? ' (Wild Joker)' : ''}`}
      aria-pressed={isSelected ? true : undefined}
      aria-disabled={disabled ? true : undefined}
      onKeyDown={handleKeyDown}
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
        ${isSelected ? '-translate-y-3 ring-2 ring-amber-400 shadow-xl shadow-amber-500/30' : 'hover:-translate-y-1 shadow-sm hover:shadow-md'}
        ${disabled ? 'opacity-60 cursor-not-allowed hover:translate-y-0' : ''}
        bg-gradient-to-b from-amber-50 via-white to-slate-100 border border-slate-300
        flex flex-col justify-between p-0.5 min-[390px]:p-1 sm:p-1.5 font-semibold text-slate-900
        ${className}
      `}
      style={{
        zIndex: isSelected ? 40 : undefined,
        boxShadow: isSelected
          ? '0 8px 16px -2px rgba(245, 158, 11, 0.4), 0 3px 5px -1px rgba(0, 0, 0, 0.2)'
          : '0 2px 5px rgba(0,0,0,0.25)',
      }}
    >
      {/* Wild Joker Badge - anchored at top-left to avoid overlap obstruction */}
      {isWild && (
        <div className="absolute -top-1.5 left-0.5 z-20 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[6px] min-[390px]:text-[7px] sm:text-[8px] px-1 py-0.2 rounded shadow border border-amber-300 flex items-center gap-0.5 pointer-events-none">
          <span>★</span> JOKER
        </div>
      )}

      {/* Printed Joker Badge */}
      {isJoker && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-white to-amber-50 rounded-[inherit] flex flex-col items-center justify-center p-0.5 text-purple-700">
          <span className="text-sm min-[390px]:text-base sm:text-xl">🃏</span>
          <span className="text-[7px] min-[390px]:text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-purple-900 leading-none">Joker</span>
        </div>
      )}

      {!isJoker && (
        <>
          {/* Top-Left Rank & Suit */}
          <div className={`flex flex-col items-start leading-none ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
            <span className="font-extrabold text-[10px] min-[390px]:text-[11px] sm:text-xs md:text-sm tracking-tight leading-tight">{card.rank}</span>
            <span className="text-[10px] min-[390px]:text-[11px] sm:text-xs md:text-sm -mt-0.5 leading-tight">{suitSymbol}</span>
          </div>

          {/* Center Suit Symbol */}
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${isRed ? 'text-rose-600/85' : 'text-slate-900/85'}`}>
            <span className={size === 'sm' ? 'text-base min-[390px]:text-lg sm:text-xl' : size === 'hand' ? 'text-base min-[390px]:text-lg min-[420px]:text-xl sm:text-2xl md:text-3xl' : size === 'lg' ? 'text-4xl' : 'text-2xl sm:text-3xl'}>
              {suitSymbol}
            </span>
          </div>

          {/* Bottom-Right Rank & Suit */}
          <div className={`flex flex-col items-end leading-none rotate-180 ${isRed ? 'text-rose-600' : 'text-slate-900'}`}>
            <span className="font-extrabold text-[10px] min-[390px]:text-[11px] sm:text-xs md:text-sm tracking-tight leading-tight">{card.rank}</span>
            <span className="text-[10px] min-[390px]:text-[11px] sm:text-xs md:text-sm -mt-0.5 leading-tight">{suitSymbol}</span>
          </div>
        </>
      )}
    </div>
  );
}

export const PlayingCard = React.memo(PlayingCardInner, (prev, next) => {
  return (
    prev.card.id === next.card.id &&
    prev.card.suit === next.card.suit &&
    prev.card.rank === next.card.rank &&
    prev.card.isPrintedJoker === next.card.isPrintedJoker &&
    prev.isSelected === next.isSelected &&
    prev.wildJokerRank === next.wildJokerRank &&
    prev.disabled === next.disabled &&
    prev.size === next.size &&
    prev.className === next.className
  );
});

