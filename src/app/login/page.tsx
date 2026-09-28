'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CustomerLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError('Please enter your email, phone number, or Order Reference.');
      return;
    }

    setLoading(true);
    setError('');

    // If it looks like an order reference (e.g. IR-...), redirect by ref
    if (cleanId.toUpperCase().startsWith('IR-')) {
      router.push(`/dashboard?ref=${encodeURIComponent(cleanId.toUpperCase())}`);
    } else {
      // Email or phone lookup
      router.push(`/dashboard?ref=${encodeURIComponent(cleanId)}`);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-4 relative overflow-hidden select-none pb-20">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rave-orange/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-black tracking-widest text-gradient">ISLAND RAVE</span>
          </Link>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-gray-300">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            CUSTOMER TICKET & PASS WALLET
          </div>
        </div>

        {/* Customer Access Card */}
        <div className="glass-panel p-8 md:p-10 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🎟️</span>
            <h1 className="text-2xl font-black text-white">Find My Passes</h1>
          </div>
          <p className="text-xs text-gray-400 mb-6 leading-relaxed">
            Enter the details used during checkout to retrieve your dynamic QR passes, cabana guest passes, and receipts.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-xs p-3.5 rounded-xl mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-semibold text-gray-400 mb-1.5">
                Order Reference / Email / Phone
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-rave-orange focus:ring-1 focus:ring-rave-orange transition-all text-sm font-mono placeholder:font-sans"
                placeholder="Enter your email, phone, or order reference"
                autoFocus
              />
              <p className="text-[11px] text-gray-500 mt-1.5">
                Tip: Enter the email or Mobile Money phone number you provided during checkout.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-rave text-white py-3.5 rounded-xl font-bold hover:scale-[1.01] transition-transform shadow-[0_0_25px_rgba(249,115,22,0.4)] disabled:opacity-50 text-sm mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Locating Your Passes...</span>
                </>
              ) : (
                <>
                  <span>Retrieve Digital Passes</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Privacy & Ticket Security Guarantee */}
          <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-2 text-xs text-gray-400">
            <span className="text-green-400 text-sm">🔒</span>
            <span>Private & Encrypted: Only holders with their own purchase email or phone can access their QR passes.</span>
          </div>
        </div>

        {/* Strict Separation Notice */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-xs text-gray-500">
            Are you an event organizer, box office manager, or gate scanner?
          </p>
          <Link
            href="/staff"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-rave-orange transition-colors"
          >
            <span>🔒 Staff & Operations Portal</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        </div>

        {/* Back Link */}
        <div className="text-center mt-4">
          <Link href="/" className="text-xs text-gray-500 hover:text-white transition-colors">
            ← Return to Event Experience
          </Link>
        </div>
      </div>
    </main>
  );
}
