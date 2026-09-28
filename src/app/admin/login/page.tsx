'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AdminLoginForm() {
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

      if (role === 'CHECK_IN_STAFF') {
        router.push('/admin/checkin');
      } else {
        router.push('/admin');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed');
      }
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
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-gray-300">
          <span className="w-2 h-2 rounded-full bg-rave-orange animate-pulse" />
          EXECUTIVE PORTAL
        </div>
      </div>

      {/* Admin Login Card */}
      <div className="glass-panel p-8 md:p-10 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl">
        <h1 className="text-2xl font-black text-white mb-2">Management Sign In</h1>
        <p className="text-xs text-gray-400 mb-6 leading-relaxed">
          Authorized console for Event Operations, Revenue Directors, and Executive Management.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-xs p-3.5 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase font-semibold text-gray-400 mb-1.5">
              Executive Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rave-orange focus:ring-1 focus:ring-rave-orange transition-all text-sm"
              placeholder="admin@islandrave.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-semibold text-gray-400 mb-1.5">
              Access Password
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
            {loading ? 'Verifying Credentials...' : 'Authenticate to Console'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/10 text-center">
          <Link href="/staff/login" className="text-xs text-rave-orange hover:text-white transition-colors font-medium">
            → Access Gate Scanner Terminal Login
          </Link>
        </div>
      </div>

      <div className="text-center mt-6">
        <Link href="/" className="text-xs text-gray-500 hover:text-white transition-colors">
          ← Return to Event Homepage
        </Link>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-rave-orange/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-rave-pink/15 rounded-full blur-[120px] pointer-events-none" />

      <Suspense fallback={
        <div className="text-center text-gray-400 font-mono text-xs">
          Loading Console...
        </div>
      }>
        <AdminLoginForm />
      </Suspense>
    </main>
  );
}
