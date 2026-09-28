'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function DemoPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const referenceParam = searchParams.get('reference');
  const [reference] = useState(() => referenceParam || 'IR-DEMO-' + Math.floor(100000 + Math.random() * 900000));
  const amount = searchParams.get('amount') || '15000';
  const currency = searchParams.get('currency') || 'GHS';
  const initialMethod = searchParams.get('paymentMethod') || 'mtn_momo';
  const phone = searchParams.get('phone') || '+233 24 555 0192';
  
  const [activeMethod, setActiveMethod] = useState<string>(initialMethod);
  const [loading, setLoading] = useState(false);
  const [simulatedPin] = useState('••••');

  const formattedAmount = (Number(amount) / 100).toFixed(2);

  const handleSimulate = async (success: boolean) => {
    setLoading(true);
    
    if (success) {
      try {
        await fetch('/api/webhooks/paystack', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-paystack-signature': 'demo_signature_ignores_verification',
          },
          body: JSON.stringify({
            event: 'charge.success',
            data: {
              reference,
              status: 'success',
              id: Date.now(),
              channel: activeMethod,
            }
          })
        });
        
        setTimeout(() => {
          router.push(`/checkout/success?ref=${reference}&method=${activeMethod}`);
        }, 1200);
      } catch (error) {
        console.error(error);
        alert('Simulation failed');
        setLoading(false);
      }
    } else {
      setTimeout(() => {
        router.push(`/checkout/failed?ref=${reference}&method=${activeMethod}`);
      }, 800);
    }
  };

  const getMethodDetails = () => {
    switch (activeMethod) {
      case 'mtn_momo':
        return {
          title: 'MTN Mobile Money Gateway',
          network: 'MTN Ghana (*170#)',
          accentColor: 'border-yellow-500 text-yellow-400 bg-yellow-500/10',
          btnColor: 'bg-yellow-500 hover:bg-yellow-400 text-black',
          brandIcon: '📱',
          instruction: `An automatic payment authorization prompt has been pushed to ${phone}. Enter your 4-digit MoMo PIN to complete the transaction.`,
        };
      case 'telecel_cash':
        return {
          title: 'Telecel Cash Gateway',
          network: 'Telecel Ghana (*110#)',
          accentColor: 'border-red-500 text-red-400 bg-red-500/10',
          btnColor: 'bg-red-500 hover:bg-red-400 text-white',
          brandIcon: '🔴',
          instruction: `A Telecel Cash debit request is queued for ${phone}. Approve via dialling *110# or entering generated voucher code.`,
        };
      case 'at_money':
        return {
          title: 'AT Money Express Gateway',
          network: 'AirtelTigo Ghana',
          accentColor: 'border-blue-500 text-blue-400 bg-blue-500/10',
          btnColor: 'bg-blue-500 hover:bg-blue-400 text-white',
          brandIcon: '🔵',
          instruction: `Direct wallet push initiated to ${phone}. Please approve from your AirtelTigo SIM.`,
        };
      case 'card':
        return {
          title: '3D Secure Card Processing',
          network: 'Visa / Mastercard / Verve',
          accentColor: 'border-purple-500 text-purple-400 bg-purple-500/10',
          btnColor: 'bg-purple-600 hover:bg-purple-500 text-white',
          brandIcon: '💳',
          instruction: 'Verified by Visa & Mastercard Identity Check. One-Time Password (OTP) verification has been sent to your registered bank mobile.',
        };
      case 'bank_transfer':
        return {
          title: 'GHIPSS Instant Pay Bank Transfer',
          network: 'All Ghana Commercial Banks',
          accentColor: 'border-emerald-500 text-emerald-400 bg-emerald-500/10',
          btnColor: 'bg-emerald-500 hover:bg-emerald-400 text-white',
          brandIcon: '🏦',
          instruction: 'A dedicated virtual bank account number has been allocated. Transfer directly from your mobile banking app.',
        };
      default:
        return {
          title: 'Secure Payment Gateway',
          network: 'Ghana Interbank Network',
          accentColor: 'border-orange-500 text-orange-400 bg-orange-500/10',
          btnColor: 'bg-gradient-rave text-white',
          brandIcon: '⚡',
          instruction: 'Authorize payment for Island Rave tickets.',
        };
    }
  };

  const details = getMethodDetails();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 selection:bg-rave-orange selection:text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-rave-orange/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-lg w-full relative z-10">
        {/* Sandbox Dev Badge */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1.5">
            <span>← Back to Island Rave</span>
          </Link>
          <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 flex items-center gap-1.5 font-bold animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            PAYMENT SANDBOX SIMULATOR
          </span>
        </div>

        {/* Main Card */}
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Header */}
          <div className="text-center pb-6 border-b border-white/10">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg">
              {details.brandIcon}
            </div>
            <h1 className="text-xl font-black tracking-tight">{details.title}</h1>
            <p className="text-xs text-gray-400 mt-1">
              Order Ref: <span className="font-mono text-gray-200 font-semibold">{reference}</span>
            </p>
            <div className="text-3xl md:text-4xl font-black mt-4 text-white tracking-tight">
              {currency} {formattedAmount}
            </div>
          </div>

          {/* Quick Method Selector Tabs */}
          <div className="pt-4 pb-2">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block mb-2 text-center">
              Switch Payment Channel Simulator:
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-center">
              {[
                { id: 'mtn_momo', label: 'MTN', icon: '📱' },
                { id: 'telecel_cash', label: 'Telecel', icon: '🔴' },
                { id: 'at_money', label: 'AT', icon: '🔵' },
                { id: 'card', label: 'Card', icon: '💳' },
                { id: 'bank_transfer', label: 'GHIPSS', icon: '🏦' },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveMethod(m.id)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${
                    activeMethod === m.id
                      ? 'border-white/40 bg-white/15 text-white shadow-sm'
                      : 'border-white/5 bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="block text-sm">{m.icon}</span>
                  <span className="text-[10px] mt-0.5 block">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Simulation Body */}
          <div className="my-5 p-4 rounded-2xl bg-black/60 border border-white/10 space-y-4">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
              <span className="text-gray-400">Recipient:</span>
              <span className="font-bold text-white">Island Rave Admissions GH</span>
            </div>

            {/* Mobile Money USSD Prompt Simulator */}
            {['mtn_momo', 'telecel_cash', 'at_money'].includes(activeMethod) && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Target Phone:</span>
                  <span className="font-mono text-white font-bold">{phone}</span>
                </div>

                <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 text-center space-y-2">
                  <span className="text-[11px] text-yellow-300 font-mono block">
                    ⚡ Live USSD Prompt Emulation
                  </span>
                  <p className="text-xs text-gray-300">
                    Authorize debit of <strong>{currency} {formattedAmount}</strong> from your wallet?
                  </p>
                  <div className="inline-block font-mono bg-black/70 px-4 py-1.5 rounded-lg border border-white/20 text-yellow-400 text-sm tracking-widest font-black">
                    PIN: {simulatedPin}
                  </div>
                </div>
              </div>
            )}

            {/* Card 3D Secure Simulator */}
            {activeMethod === 'card' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-center space-y-1">
                  <span className="text-[11px] text-purple-300 font-mono block">
                    🔒 Verified by Visa / Mastercard ID Check
                  </span>
                  <p className="text-xs text-gray-300">
                    Enter one-time SMS verification code:
                  </p>
                  <div className="font-mono bg-black/70 px-4 py-1.5 rounded-lg border border-white/20 text-white text-sm tracking-widest font-black inline-block">
                    5 4 8 2 1 9
                  </div>
                </div>
              </div>
            )}

            {/* Bank Transfer GHIPSS Simulator */}
            {activeMethod === 'bank_transfer' && (
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
                  <span className="text-[11px] text-emerald-300 font-mono block font-bold">
                    🏦 Instant GHIPSS Virtual Account
                  </span>
                  <div className="flex justify-between text-gray-300">
                    <span>Bank:</span>
                    <span className="font-bold text-white">GCB Bank / GHIPSS Instant</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Virtual Account:</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">9028 1049 8219</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Beneficiary:</span>
                    <span className="text-white font-medium">Island Rave Entertainment</span>
                  </div>
                </div>
              </div>
            )}

            <p className="text-[11px] text-gray-400 leading-relaxed text-center">
              {details.instruction}
            </p>
          </div>

          {/* Action Simulation Buttons */}
          <div className="space-y-3">
            <button 
              onClick={() => handleSimulate(true)}
              disabled={loading}
              className={`w-full py-4 rounded-full font-black text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${details.btnColor} disabled:opacity-50`}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Processing Authorization...</span>
                </>
              ) : (
                <>
                  <span>✓ Simulate SUCCESSFUL Payment</span>
                </>
              )}
            </button>
            
            <button 
              onClick={() => handleSimulate(false)}
              disabled={loading}
              className="w-full bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-500/40 py-3 rounded-full text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              Simulate Payment Failure / Decline
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <span className="text-[10px] text-gray-500">
              Island Rave Ghana • Encrypted Sandbox Environment
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DemoPaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="w-10 h-10 border-2 border-rave-orange border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DemoPaymentContent />
    </Suspense>
  );
}
