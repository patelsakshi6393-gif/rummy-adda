'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getReferralLink, getCodeFromPlayerId } from '@/lib/referral-service';
import {
  X,
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  Coins,
  MessageCircle,
  Sparkles,
} from 'lucide-react';

const STORAGE_KEY = 'rummy_refer_dont_show_again';
const TRIGGER_SCREEN_TIME_MS = 5 * 60 * 1000; // 5 minutes (300,000 ms)

export function ReferralPromptModal() {
  const pathname = usePathname();
  const { user, profile } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Time accumulator in milliseconds
  const elapsedScreenTimeRef = useRef(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const referralCode = profile?.playerId ? getCodeFromPlayerId(profile.playerId) : 'REFROYAL';
  const referralLink = getReferralLink(referralCode);

  const isLobbyOrMainMenu = pathname === '/' || pathname === '/lobby';

  // 5-Minute Screen Time Tracker
  // "Aur refer wala na jab user aaye toh wahi user jab 5 minute tak ki 5 minute ka screen time ho jaye uska app mein tab ye refer wala pop-up aana chahiye. Game ke beech mein nahi jab woh lobby mein ho tab aana chahiye main menu mein."
  useEffect(() => {
    // If user already opted out with "Don't show again", never run
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true') {
      return;
    }

    // Interval to track active time every 1 second
    timerIntervalRef.current = setInterval(() => {
      // Only accumulate screen time and trigger when tab is visible
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      elapsedScreenTimeRef.current += 1000;

      // Check if 5 minutes reached
      if (elapsedScreenTimeRef.current >= TRIGGER_SCREEN_TIME_MS) {
        // "Game ke beech mein nahi jab woh lobby mein ho tab aana chahiye main menu mein."
        if (isLobbyOrMainMenu) {
          // Open popup!
          setIsOpen(true);
          elapsedScreenTimeRef.current = 0; // Reset counter for next 5 minutes
        }
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isLobbyOrMainMenu]);

  // If already reached 5 minutes while on another page, trigger when returning to lobby
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true') {
      return;
    }

    if (isLobbyOrMainMenu && elapsedScreenTimeRef.current >= TRIGGER_SCREEN_TIME_MS) {
      setIsOpen(true);
      elapsedScreenTimeRef.current = 0;
    }
  }, [pathname, isLobbyOrMainMenu]);

  // Handle Cut / Close
  // "Aur isme ek cut wala bhi option rahega aur agar woh ek bar cut kar deta hai aur don't show again that kar deta hai, don't show again kar deta hai uspe click karke checkbox par click karta hai toh ye dobara nahi dikhega. Warna user jitni bar bhi website refresh karega aur uske har 5 minute baad ye isko ye refer wala show karega."
  const handleClose = () => {
    if (dontShowAgain) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, 'true');
      }
    } else {
      // Reset timer to 0 so it will trigger after another 5 minutes of screen time
      elapsedScreenTimeRef.current = 0;
    }
    setIsOpen(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const shareWhatsAppUrl = `https://wa.me/?text=${encodeURIComponent(
    `Join me on RummyAdda - India's #1 Real-Time Indian Rummy Platform!\n\n🎁 Register using my referral code *${referralCode}* to get *₹20 FREE WELCOME BONUS* instantly!\n\n100% Real Players & Instant Cash Games:\n👉 ${referralLink}`
  )}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative bg-[#11121d] border border-amber-500/40 rounded-3xl p-5 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-gradient-to-b from-amber-500/20 to-transparent blur-3xl rounded-full pointer-events-none" />

        {/* Top Header with Cut (X) button */}
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#150a12] rounded-[14px] flex items-center justify-center text-amber-400">
                <Gift className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-black text-amber-300 uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Special Referral Offer</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                Invite Friends & Earn Free Chips!
              </h3>
            </div>
          </div>

          {/* Cut Option / Close Button */}
          {/* "Aur isme ek cut wala bhi option rahega" */}
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Cut / Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reward Explanation Cards */}
        <div className="grid grid-cols-2 gap-2.5 relative z-10">
          {/* Friend's Reward */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
              <Coins className="w-3.5 h-3.5" />
              <span>Your Friend Gets</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-white font-mono">
              20 <span className="text-xs font-sans text-emerald-300 font-bold">Chips</span>
            </p>
            <p className="text-[10px] text-slate-300 leading-tight">
              ₹20 Welcome Bonus Chips upon signup with your code!
            </p>
          </div>

          {/* User's Reward */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
              <Gift className="w-3.5 h-3.5" />
              <span>You Receive</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-300 font-mono">
              50 <span className="text-xs font-sans text-amber-300 font-bold">Chips</span>
            </p>
            <p className="text-[10px] text-slate-300 leading-tight">
              Credited directly to your wallet for each friend who registers!
            </p>
          </div>
        </div>

        {/* Referral Code Box */}
        <div className="p-4 rounded-2xl bg-[#090a12] border border-white/10 space-y-2 relative z-10">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Your Personal Referral Code
          </span>
          <div className="flex items-center justify-between gap-3">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-amber-400 select-all">
              {referralCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="py-1.5 px-3.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-xs font-bold border border-amber-400/40 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 relative z-10">
          {/* WhatsApp Share Button */}
          <a
            href={shareWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl font-black text-xs text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer uppercase tracking-wider"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Share Invite on WhatsApp</span>
          </a>

          {/* Copy Full Link Button */}
          <button
            onClick={handleCopyLink}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Referral Link Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Copy Referral Link</span>
              </>
            )}
          </button>
        </div>

        {/* "Don't show again" Checkbox & Cut Footer */}
        {/* "aur don't show again that kar deta hai, don't show again kar deta hai uspe click karke checkbox par click karta hai toh ye dobara nahi dikhega. Warna user jitni bar bhi website refresh karega aur uske har 5 minute baad ye isko ye refer wala show karega." */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs relative z-10">
          <label className="flex items-center gap-2 text-slate-400 hover:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded bg-[#090a12] border-white/20 text-amber-500 focus:ring-amber-400 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-[11px]">Don&apos;t show again (दोबारा न दिखाएं)</span>
          </label>

          <button
            onClick={handleClose}
            className="text-xs text-slate-400 hover:text-white font-bold px-2 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
