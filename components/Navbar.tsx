'use client';

import React, { useState } from 'react';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getPlayableBalance } from '@/lib/types';
import {
  Coins,
  PlusCircle,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Trophy,
  History,
  Grid,
  Menu,
  X,
  Settings,
  HelpCircle,
  Share2,
  Gift,
  BarChart2,
} from 'lucide-react';
import { ReferralPromptModal } from '@/components/ReferralPromptModal';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, wallet, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const totalBalance = getPlayableBalance(wallet);

  const navLinks = [
    { label: 'Lobby', href: '/lobby', icon: Grid },
    { label: 'Tables', href: '/tables', icon: Grid },
    { label: 'Tournaments', href: '/tournaments', icon: Trophy },
    { label: 'How to Play', href: '/how-to-play', icon: HelpCircle },
    { label: 'My Games', href: '/my-games', icon: History },
    { label: 'Wallet', href: '/wallet', icon: Coins },
  ];

  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
    router.push('/login');
  };

  return (
    <nav className="sticky top-0 z-40 bg-[#0c0d14]/90 backdrop-blur-md border-b border-amber-500/20 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo */}
          <NextLink href={user ? '/lobby' : '/'} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#150a0f] rounded-[10px] flex items-center justify-center">
                <span className="text-xl font-black text-amber-400">♠</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                RUMMY<span className="text-rose-500">ADDA</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold">
                Royal Indian Salon
              </span>
            </div>
          </NextLink>

          {/* Tablet & Desktop Navigation */}
          {user && (
            <div className="hidden md:flex items-center gap-0.5 lg:gap-1.5">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <NextLink
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-2 lg:px-3 py-1.5 lg:py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all ${
                      active
                        ? 'bg-gradient-to-r from-amber-500/20 to-rose-500/10 text-amber-300 border border-amber-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-amber-400" />
                    <span>{item.label}</span>
                  </NextLink>
                );
              })}
            </div>
          )}

          {/* Right Header Section */}
          <div className="hidden md:flex items-center gap-2 lg:gap-4">
            {user ? (
              <>
                {/* Wallet Badge & Quick Add Cash */}
                <div className="flex items-center gap-1.5 lg:gap-2 bg-[#171822] border border-amber-500/30 rounded-xl p-1 lg:p-1.5 shadow-inner">
                  <NextLink href="/wallet" className="flex items-center gap-1.5 lg:gap-2 px-2 lg:px-2.5 py-1">
                    <Coins className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-amber-400 animate-pulse" />
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] lg:text-[10px] text-slate-400 uppercase tracking-wider font-medium">Balance</span>
                      <span className="text-xs lg:text-sm font-black text-amber-300">
                        ₹{totalBalance.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </NextLink>

                  <NextLink
                    href="/wallet/deposit"
                    className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-[11px] lg:text-xs px-2.5 lg:px-3 py-1.5 rounded-lg shadow-md transition-transform hover:scale-105"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>ADD CASH</span>
                  </NextLink>
                </div>

                {/* Profile & Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2.5 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-600 to-amber-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                      {profile?.displayName?.charAt(0).toUpperCase() || 'P'}
                    </div>
                    <div className="flex flex-col text-left pr-1">
                      <span className="text-xs font-bold text-slate-200 truncate max-w-[100px]">
                        {profile?.displayName || 'Player'}
                      </span>
                      <span className="text-[10px] font-mono text-amber-400/90 font-medium">
                        {profile?.playerId || 'RA-XXXXXX'}
                      </span>
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div
                      onMouseLeave={() => setDropdownOpen(false)}
                      className="absolute right-0 mt-2 w-56 bg-[#13141f] border border-amber-500/30 rounded-2xl shadow-2xl py-2 z-50 text-slate-200 divide-y divide-white/5"
                    >
                      <div className="px-4 py-2.5">
                        <p className="text-xs text-slate-400">Signed in as</p>
                        <p className="text-sm font-bold text-white truncate">{profile?.displayName}</p>
                        <p className="text-xs font-mono text-amber-400">{profile?.playerId}</p>
                      </div>

                      <div className="py-1">
                        {(user?.email === 'supportalkabrain@gmail.com' || profile?.role === 'admin') && (
                          <>
                            <NextLink
                              href="/admin-panel"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-xs bg-emerald-500/15 text-emerald-300 font-bold hover:bg-emerald-500/25 border-b border-emerald-500/20 mb-1"
                            >
                              <ShieldCheck className="w-4 h-4 text-emerald-400" />
                              <span>WhatsApp Operations Admin</span>
                            </NextLink>
                            <NextLink
                              href="/admin"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-xs bg-amber-500/15 text-amber-300 font-bold hover:bg-amber-500/25 border-b border-amber-500/20 mb-1"
                            >
                              <ShieldCheck className="w-4 h-4 text-amber-400" />
                              <span>Admin Control Panel</span>
                            </NextLink>
                          </>
                        )}
                        <NextLink
                          href="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs hover:bg-white/5 hover:text-amber-300"
                        >
                          <UserIcon className="w-4 h-4 text-amber-400" />
                          <span>My Profile</span>
                        </NextLink>
                        <NextLink
                          href="/profile/account"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs hover:bg-white/5 hover:text-amber-300"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>Account Overview</span>
                        </NextLink>
                        <NextLink
                          href="/profile/game-statistics"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs hover:bg-white/5 hover:text-amber-300"
                        >
                          <BarChart2 className="w-4 h-4 text-blue-400" />
                          <span>Game Statistics</span>
                        </NextLink>
                        <NextLink
                          href="/profile/rewards"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs hover:bg-white/5 hover:text-amber-300"
                        >
                          <Gift className="w-4 h-4 text-purple-400" />
                          <span>Royale Rewards</span>
                        </NextLink>
                        <NextLink
                          href="/profile/referrals"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs hover:bg-white/5 hover:text-amber-300"
                        >
                          <Share2 className="w-4 h-4 text-rose-400" />
                          <span>Refer & Earn</span>
                        </NextLink>
                      </div>

                      <div className="py-1">
                        <NextLink
                          href="/settings"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs hover:bg-white/5 hover:text-amber-300"
                        >
                          <Settings className="w-4 h-4 text-slate-400" />
                          <span>Game Settings</span>
                        </NextLink>
                        <NextLink
                          href="/contact"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs hover:bg-white/5 hover:text-amber-300"
                        >
                          <HelpCircle className="w-4 h-4 text-teal-400" />
                          <span>Support & WhatsApp</span>
                        </NextLink>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10 text-left font-semibold"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Log Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <NextLink
                  href="/how-to-play"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 rounded-xl border border-amber-500/30 transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>How to Play</span>
                </NextLink>
                <NextLink
                  href="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  Log In
                </NextLink>
                <NextLink
                  href="/signup"
                  className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-xl hover:from-amber-400 hover:to-amber-500 shadow-md shadow-amber-500/20 transition-all"
                >
                  Sign Up Free
                </NextLink>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <NextLink
                href="/wallet/deposit"
                className="flex items-center gap-1 bg-amber-500 text-black text-xs font-black px-2.5 py-1.5 rounded-lg"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>₹{totalBalance.toLocaleString('en-IN')}</span>
              </NextLink>
            )}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg bg-white/5 text-slate-300 hover:text-white"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0e0f18] border-b border-amber-500/20 px-4 pt-3 pb-6 space-y-2">
          {user ? (
            <>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 mb-3">
                <div>
                  <p className="text-sm font-bold text-white">{profile?.displayName}</p>
                  <p className="text-xs font-mono text-amber-400">{profile?.playerId}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase">Balance</span>
                  <p className="text-base font-black text-amber-400">₹{totalBalance.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NextLink
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/5"
                  >
                    <Icon className="w-4 h-4 text-amber-400" />
                    <span>{item.label}</span>
                  </NextLink>
                );
              })}

              <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2">
                {(user?.email === 'supportalkabrain@gmail.com' || profile?.role === 'admin') && (
                  <>
                    <NextLink
                      href="/admin-panel"
                      onClick={() => setMenuOpen(false)}
                      className="col-span-2 px-3 py-2 rounded-lg bg-emerald-500/20 text-xs text-emerald-300 font-bold text-center border border-emerald-500/30"
                    >
                      WhatsApp Operations Admin
                    </NextLink>
                    <NextLink
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="col-span-2 px-3 py-2 rounded-lg bg-amber-500/20 text-xs text-amber-300 font-bold text-center border border-amber-500/30"
                    >
                      Admin Control Panel
                    </NextLink>
                  </>
                )}
                <NextLink
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2 rounded-lg bg-white/5 text-xs text-slate-300 font-medium text-center"
                >
                  My Profile
                </NextLink>
                <NextLink
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2 rounded-lg bg-white/5 text-xs text-slate-300 font-medium text-center"
                >
                  Settings
                </NextLink>
                <NextLink
                  href="/contact"
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2 rounded-lg bg-white/5 text-xs text-slate-300 font-medium text-center"
                >
                  Support
                </NextLink>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-lg bg-rose-500/20 text-xs text-rose-300 font-medium text-center"
                >
                  Log Out
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <NextLink
                href="/how-to-play"
                onClick={() => setMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-sm flex items-center justify-center gap-2"
              >
                <HelpCircle className="w-4 h-4" />
                <span>How to Play Rummy (Guide)</span>
              </NextLink>
              <NextLink
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl border border-white/10 text-white font-semibold text-sm"
              >
                Log In
              </NextLink>
              <NextLink
                href="/signup"
                onClick={() => setMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-sm"
              >
                Sign Up Free
              </NextLink>
            </div>
          )}
        </div>
      )}

      {/* 5-Minute In-App Screen Time Referral Popup */}
      <ReferralPromptModal />
    </nav>
  );
}
