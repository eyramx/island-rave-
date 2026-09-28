'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref') || '';
  
  const initialError = !reference ? 'Missing payment transaction reference.' : null;
  const [statusText, setStatusText] = useState('Verifying your payment with Paystack...');
  const [error, setError] = useState<string | null>(initialError);

  useEffect(() => {
    if (!reference) return;

    let isMounted = true;
    async function verifyTransaction() {
      try {
        setStatusText('Confirming authorization with Paystack & banking network...');
        const res = await fetch(`/api/payment/verify?reference=${encodeURIComponent(reference)}`);
        const data = await res.json();
        if (!isMounted) return;

        if (res.ok && data.success && data.status === 'PAID') {
          setStatusText('Payment verified! Securing your digital tickets...');
          setTimeout(() => {
            const orderRef = data.orderReference || reference;
            router.push(`/checkout/success?ref=${encodeURIComponent(orderRef)}`);
          }, 1000);
        } else {
          setError(data.error || 'Payment authorization was unsuccessful or declined.');
          setTimeout(() => {
            router.push(`/checkout/failed?ref=${encodeURIComponent(reference)}`);
          }, 2500);
        }
      } catch (err) {
        console.error('Callback verification failed:', err);
        if (isMounted) setError('Connection interrupted while verifying transaction.');
      }
    }

    verifyTransaction();
    return () => {
      isMounted = false;
    };
  }, [reference, router]);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-rave-orange/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-md w-full glass-panel p-8 md:p-10 rounded-3xl border border-white/10 text-center relative z-10 shadow-2xl backdrop-blur-xl">
        {!error ? (
          <div className="space-y-6">
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 border-4 border-white/10 border-t-rave-orange rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-xl">
                ⚡
              </div>
            </div>

            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-white mb-2">
                Processing Authorization
              </h1>
              <p className="text-xs text-gray-400 font-mono">
                {statusText}
              </p>
            </div>

            {reference && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-gray-400 font-mono">
                Transaction Reference: <span className="text-rave-orange font-bold">{reference}</span>
              </div>
            )}

            <p className="text-[11px] text-gray-500">
              Please do not close or refresh this window while we finalize your order.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-2xl mx-auto">
              ✕
            </div>

            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-white mb-2">
                Verification Issue
              </h1>
              <p className="text-xs text-red-400">
                {error}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Link
                href={`/checkout/failed?ref=${encodeURIComponent(reference)}`}
                className="w-full bg-white text-black py-3 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors"
              >
                Proceed to Payment Summary
              </Link>
              <Link
                href="/checkout"
                className="w-full bg-white/10 text-white py-3 rounded-xl font-semibold text-xs hover:bg-white/20 transition-colors"
              >
                Try Another Payment Method
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-rave-orange border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <PaymentCallbackContent />
    </Suspense>
  );
}
