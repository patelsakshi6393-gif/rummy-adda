'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MessageCircle, ShieldAlert, CheckCircle2, Send, Loader2, HelpCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const WHATSAPP_NUMBER = '917466990584';

export default function ContactPage() {
  const { user, profile } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;

    setSubmitting(true);
    try {
      const ticketId = `ticket_${Date.now()}`;
      await setDoc(doc(db, 'supportRequests', ticketId), {
        ticketId,
        uid: user?.uid || 'guest',
        playerId: profile?.playerId || 'GUEST',
        email: user?.email || '',
        subject,
        message,
        status: 'open',
        createdAt: new Date().toISOString(),
      });
      setSubmitted(true);
      setSubject('');
      setMessage('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07070a] text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">Player Support Desk</span>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Need Help? Contact RummyAdda</h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            Get instant resolution for deposit queries, wallet balance tracking, or match assistance.
          </p>
        </div>

        {/* Security Warning as per Prompt Requirement #29 */}
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-rose-300">Player Security Warning</p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              RummyAdda representatives will <strong>NEVER</strong> ask you for your account password, SMS OTP, or authentication token. Never share confidential credentials with anyone.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Direct WhatsApp Box */}
          <div className="bg-[#12131e] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 space-y-5 flex flex-col justify-between shadow-2xl">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <MessageCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Official WhatsApp Helpline</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Connect immediately with our dedicated support agents on WhatsApp for payment and account inquiries.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#090a12] border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Helpline Desk</span>
                <p className="text-lg font-black text-emerald-400">Official 24/7 Support Desk</p>
                <p className="text-[11px] text-slate-400">Available Daily: 24/7 Player Response</p>
              </div>
            </div>

            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                `Hello RummyAdda Support, I need assistance. My Player ID is ${profile?.playerId || 'not registered'}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 rounded-xl font-black text-slate-950 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              <span>CHAT ON WHATSAPP SUPPORT DESK</span>
            </a>
          </div>

          {/* Web Ticket Form */}
          <div className="bg-[#12131e] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-6 h-6 text-amber-400" />
              <h3 className="text-lg font-bold text-white">Submit Support Ticket</h3>
            </div>

            {submitted ? (
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white text-sm">Ticket Dispatched!</h4>
                <p className="text-xs text-slate-300">
                  Our operations team has received your ticket and will respond via your registered email shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-3 text-xs text-amber-400 font-bold hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 uppercase font-bold mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Deposit query, Rule clarification"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-[#090a12] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 uppercase font-bold mb-1">Message Description</label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your issue with reference ID if applicable..."
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-[#090a12] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl font-bold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Ticket...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>SUBMIT TICKET</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
