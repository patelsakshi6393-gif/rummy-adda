import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <div className="border-b border-white/10 pb-6">
          <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">Data Protection</span>
          <h1 className="text-3xl font-black text-white mt-1">Privacy Policy</h1>
          <p className="text-xs text-slate-400 mt-1">Last Updated: October 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white">1. Information We Collect</h2>
          <p>
            When you register on RummyAdda, we collect your display name, email address, account credentials, and generate a unique alphanumeric Player ID (e.g. RA-XXXXXX).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white">2. Card Game Privacy & Anti-Cheating</h2>
          <p>
            During a live game, your private 13-card hand is stored securely in your individual player session. Other players on the table can never access or view your hidden cards through client inspection.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white">3. Third-Party Sharing</h2>
          <p>
            We do not sell, rent, or trade player information to third-party advertisers. All transaction and support logs are maintained strictly for game continuity and customer service via our official WhatsApp support desk.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
