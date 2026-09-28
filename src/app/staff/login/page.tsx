'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import RealTimeCountdown from '@/components/RealTimeCountdown';

function StaffLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      const role = data.user?.role;

      // Handle redirect parameter with role enforcement
      if (redirectUrl && redirectUrl.startsWith('/admin')) {
        if (role === 'CHECK_IN_STAFF' && (redirectUrl.startsWith('/admin/checkin') || redirectUrl.startsWith('/admin/orders'))) {
          router.push(redirectUrl);
          return;
        }
        if (role === 'FINANCE' && (redirectUrl.startsWith('/admin/orders') || redirectUrl === '/admin')) {
          router.push(redirectUrl);
          return;
        }
        if (role === 'SUPER_ADMIN' || role === 'EVENT_MANAGER') {
          router.push(redirectUrl);
          return;
        }
      }

      // Default role landing destinations
      if (role === 'CHECK_IN_STAFF') {
        router.push('/admin/checkin');
      } else {
        router.push('/admin');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md relative z-10">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-block">
          <span className="text-3xl font-black tracking-widest text-gradient">ISLAND RAVE</span>
        </Link>
        <div className="mt-2 flex flex-col items-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-gray-300">
            <span className="w-2 h-2 rounded-full bg-rave-orange animate-pulse" />
            STAFF & GATE OPERATIONS
          </div>
          <RealTimeCountdown variant="compact" />
        </div>
      </div>

      {/* Staff Login Card */}
      <div className="glass-panel p-8 md:p-10 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🛡️</span>
          <h1 className="text-2xl font-black text-white">Staff Sign In</h1>
        </div>
        <p className="text-xs text-gray-400 mb-6 leading-relaxed">
          Restricted access for box office executives, gate turnstile scanners, and production staff.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-xs p-3.5 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase font-semibold text-gray-400 mb-1.5">
              Staff Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rave-orange focus:ring-1 focus:ring-rave-orange transition-all text-sm"
              placeholder="staff@islandrave.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-semibold text-gray-400 mb-1.5">
              Staff Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rave-orange focus:ring-1 focus:ring-rave-orange transition-all text-sm"
              placeholder="••••••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-rave text-white py-3.5 rounded-xl font-bold hover:scale-[1.01] transition-transform shadow-[0_0_20px_rgba(249,115,22,0.4)] disabled:opacity-50 text-sm mt-2"
          >
            {loading ? 'Authenticating Staff...' : 'Sign In to Staff Portal'}
          </button>
        </form>

        {/* Customer Separation Notice */}
        <div className="mt-6 pt-6 border-t border-white/10 text-center">
          <p className="text-xs text-gray-400 mb-2">
            Are you an attendee looking for your tickets or passes?
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-green-400 hover:text-green-300 transition-colors bg-green-500/10 px-3.5 py-2 rounded-xl border border-green-500/20"
          >
            <span>🎟️ Go to Customer Ticket Portal</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Back Link */}
      <div className="text-center mt-6">
        <Link href="/" className="text-xs text-gray-500 hover:text-white transition-colors">
          ← Return to Event Homepage
        </Link>
      </div>
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-4 relative overflow-hidden select-none pb-20">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-rave-orange/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-pink-600/15 rounded-full blur-[130px] pointer-events-none" />

      <Suspense fallback={
        <div className="text-center text-gray-400 font-mono text-xs">
          Loading Staff Terminal...
        </div>
      }>
        <StaffLoginForm />
      </Suspense>
    </main>
  );
}
