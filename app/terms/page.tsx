import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <div className="border-b border-white/10 pb-6">
          <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">Legal Agreement</span>
          <h1 className="text-3xl font-black text-white mt-1">Terms of Service</h1>
          <p className="text-xs text-slate-400 mt-1">Last Updated: October 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white">1. Nature of the Service</h2>
          <p>
            RummyAdda provides an online platform for playing Indian Rummy (13-Card Rummy, Points Rummy, Pool 101, and Deal Rummy). Rummy is recognized under Indian jurisprudence as a game of preponderance of skill.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white">2. Eligibility & Age Restriction</h2>
          <p>
            You must be at least 18 years of age to register and participate in RummyAdda tables. Access from restricted states (including Assam, Odisha, Telangana, Andhra Pradesh, Nagaland, and Sikkim) where skill-game cash contests are restricted by local statutes is strictly prohibited.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white">3. User Accounts and Player IDs</h2>
          <p>
            Each user is allocated a unique Player ID (e.g. RA-XXXXXX). You are solely responsible for maintaining the confidentiality of your credentials. You agree never to share your account, credentials, or OTP with third parties.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white">4. Prototype Financial Safety Disclosures</h2>
          <p>
            Live real-money settlement remains in development and testing mode unless explicitly configured. Deposit flows are routed via verified WhatsApp support requests. Automated payment gateways do not move real fiat capital without verified regulatory and operational clearances.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white">5. Fair Play and Anti-Collusion</h2>
          <p>
            Multiple accounts, table collusion, device sharing during the same match, or software automation are strictly prohibited. Violators face immediate disqualification and account termination.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
