'use client';

import { useState, useEffect, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import CustomerHeader from '@/components/CustomerHeader';

type TicketType = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  maxPerCustomer: number;
};

type EventWithTickets = {
  id: string;
  name: string;
  venueName: string;
  posterUrl: string | null;
  ticketTypes: TicketType[];
};

type PaymentMethodType = 'mtn_momo' | 'telecel_cash' | 'at_money' | 'card' | 'bank_transfer';

const PAYMENT_METHODS: {
  id: PaymentMethodType;
  name: string;
  badge: string;
  badgeColor: string;
  tagline: string;
  icon: string;
  instructions: string;
  accentBorder: string;
  accentBg: string;
  glowClass: string;
  ctaText: string;
}[] = [
  {
    id: 'mtn_momo',
    name: 'MTN MoMo',
    badge: '⚡ Preferred in Ghana',
    badgeColor: 'bg-yellow-500 text-black font-black',
    tagline: '*170# Direct Prompt',
    icon: '📱',
    instructions: 'An approval request will be pushed directly to your MTN handset. Confirm the transaction by entering your 4-digit MoMo PIN.',
    accentBorder: 'border-yellow-500',
    accentBg: 'bg-yellow-500/10 text-yellow-300',
    glowClass: 'shadow-[0_0_25px_rgba(234,179,8,0.25)]',
    ctaText: 'Pay with MTN MoMo',
  },
  {
    id: 'telecel_cash',
    name: 'Telecel Cash',
    badge: 'Instant Voucher',
    badgeColor: 'bg-red-500 text-white font-bold',
    tagline: 'Vodafone Cash / *110#',
    icon: '🔴',
    instructions: 'Approve via prompt on your Telecel/Vodafone SIM or generate an approval voucher code by dialling *110#.',
    accentBorder: 'border-red-500',
    accentBg: 'bg-red-500/10 text-red-300',
    glowClass: 'shadow-[0_0_25px_rgba(239,68,68,0.25)]',
    ctaText: 'Pay with Telecel Cash',
  },
  {
    id: 'at_money',
    name: 'AT Money',
    badge: 'AirtelTigo',
    badgeColor: 'bg-blue-500 text-white font-bold',
    tagline: 'Direct Wallet Push',
    icon: '🔵',
    instructions: 'An automated payment request is pushed directly to your AirtelTigo wallet. Enter your secret PIN to authorize.',
    accentBorder: 'border-blue-500',
    accentBg: 'bg-blue-500/10 text-blue-300',
    glowClass: 'shadow-[0_0_25px_rgba(59,130,246,0.25)]',
    ctaText: 'Pay with AT Money',
  },
  {
    id: 'card',
    name: 'Bank Card',
    badge: 'Global 3D-Secure',
    badgeColor: 'bg-purple-500 text-white font-bold',
    tagline: 'Visa / Mastercard / Verve',
    icon: '💳',
    instructions: 'Protected by 256-bit bank encryption & 3D Secure OTP verification. Works with all Ghanaian and international cards.',
    accentBorder: 'border-purple-500',
    accentBg: 'bg-purple-500/10 text-purple-300',
    glowClass: 'shadow-[0_0_25px_rgba(168,85,247,0.25)]',
    ctaText: 'Pay with Credit / Debit Card',
  },
  {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    badge: 'GHIPSS Instant',
    badgeColor: 'bg-emerald-500 text-white font-bold',
    tagline: 'All Ghana Banks',
    icon: '🏦',
    instructions: 'Instant dynamic virtual account number will be generated for direct transfer via your Ghana mobile banking app.',
    accentBorder: 'border-emerald-500',
    accentBg: 'bg-emerald-500/10 text-emerald-300',
    glowClass: 'shadow-[0_0_25px_rgba(16,185,129,0.25)]',
    ctaText: 'Pay via Instant Bank Transfer',
  },
];

function CheckoutContent({ params }: { params: Promise<{ eventId: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.eventId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTicketId = searchParams.get('ticket');
  
  const [event, setEvent] = useState<EventWithTickets | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Preferred Payment Method State
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('mtn_momo');
  const [useContactPhoneForMomo, setUseContactPhoneForMomo] = useState(true);
  const [customMomoPhone, setCustomMomoPhone] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    ticketTypeId: selectedTicketId || '',
    quantity: 1,
  });

  // Carrier auto-detection helper
  const detectCarrier = (phone: string) => {
    const clean = phone.replace(/[^0-9]/g, '');
    const num = clean.startsWith('233') ? '0' + clean.slice(3) : clean;
    if (/^0(24|54|55|59|53)/.test(num)) return { name: 'MTN Ghana', color: 'text-yellow-400', border: 'border-yellow-500/40 bg-yellow-500/10' };
    if (/^0(20|50)/.test(num)) return { name: 'Telecel Ghana', color: 'text-red-400', border: 'border-red-500/40 bg-red-500/10' };
    if (/^0(26|27|57)/.test(num)) return { name: 'AT Ghana', color: 'text-blue-400', border: 'border-blue-500/40 bg-blue-500/10' };
    return null;
  };

  useEffect(() => {
    if (!eventId) return;
    // Fetch event and ticket types
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (!res.ok) throw new Error('Failed to load event details');
        const data = await res.json();
        setEvent(data.data);
        
        // If no ticket is selected, select the first available one
        if (!selectedTicketId && data.data.ticketTypes.length > 0) {
          setFormData(prev => ({ ...prev, ticketTypeId: data.data.ticketTypes[0].id }));
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvent();
  }, [eventId, selectedTicketId]);

  const getSelectedTicket = () => {
    if (!event) return null;
    return event.ticketTypes.find((t) => t.id === formData.ticketTypeId);
  };

  const selectedTicket = getSelectedTicket();
  const subtotal = selectedTicket ? selectedTicket.price * formData.quantity : 0;
  const serviceFee = subtotal * 0; // Configured to 0 for now
  const total = subtotal + serviceFee;

  const currentPm = PAYMENT_METHODS.find(pm => pm.id === selectedMethod) || PAYMENT_METHODS[0];
  const activeMomoPhone = useContactPhoneForMomo ? formData.customerPhone : (customMomoPhone.trim() || formData.customerPhone);
  const activeCarrier = detectCarrier(activeMomoPhone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: eventId,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone,
          paymentMethod: selectedMethod,
          momoPhoneNumber: activeMomoPhone,
          items: [{
            ticketTypeId: formData.ticketTypeId,
            quantity: formData.quantity,
          }]
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Checkout failed');
      }

      // Redirect to payment gateway
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        router.push(`/checkout/success?ref=${data.orderReference}&method=${selectedMethod}`);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Checkout failed');
      }
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-16 h-16 border-4 border-rave-orange border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black p-6">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full text-center border-red-500/50">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <Link href="/" className="bg-white text-black px-6 py-2 rounded-full font-bold">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <CustomerHeader activeTab="checkout" />
      <main className="flex-1 pt-8 pb-12 px-4 md:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column - Checkout Form */}
        <div className="lg:col-span-7 xl:col-span-8">
          <Link href="/" className="inline-flex items-center text-rave-orange mb-8 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Event
          </Link>

          {/* Cart Holding Reservation Banner */}
          <div className="mb-6 p-4 rounded-2xl bg-rave-orange/10 border border-rave-orange/30 flex items-center justify-between text-xs text-rave-orange font-bold">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rave-orange animate-ping" />
              <span>Tickets Reserved In Your Cart</span>
            </div>
            <span className="font-mono bg-black/40 px-2.5 py-1 rounded-lg border border-rave-orange/20">
              ⏱️ 10:00 Window
            </span>
          </div>

          <h1 className="text-4xl font-black mb-8">CHECKOUT</h1>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg mb-8">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="glass-panel p-6 md:p-8 rounded-2xl">
              <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.customerName}
                    onChange={e => setFormData({...formData, customerName: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-rave-orange focus:ring-1 focus:ring-rave-orange transition-all"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={formData.customerEmail}
                    onChange={e => setFormData({...formData, customerEmail: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-rave-orange focus:ring-1 focus:ring-rave-orange transition-all"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Phone Number</label>
                  <input 
                    type="tel" 
                    required
                    value={formData.customerPhone}
                    onChange={e => setFormData({...formData, customerPhone: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-rave-orange focus:ring-1 focus:ring-rave-orange transition-all"
                    placeholder="+233..."
                  />
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 md:p-8 rounded-2xl">
              <h2 className="text-2xl font-bold mb-6">Ticket Selection</h2>
              
              <div className="space-y-4 mb-6">
                {event?.ticketTypes.map((ticket) => (
                  <label 
                    key={ticket.id} 
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      formData.ticketTypeId === ticket.id 
                        ? 'border-rave-orange bg-rave-orange/10' 
                        : 'border-white/10 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center">
                      <input 
                        type="radio" 
                        name="ticketType" 
                        value={ticket.id}
                        checked={formData.ticketTypeId === ticket.id}
                        onChange={e => setFormData({...formData, ticketTypeId: e.target.value})}
                        className="w-5 h-5 text-rave-orange focus:ring-rave-orange bg-black border-gray-600"
                      />
                      <div className="ml-4">
                        <span className="block font-bold text-lg">{ticket.name}</span>
                        <span className="block text-sm text-gray-400">{ticket.description}</span>
                      </div>
                    </div>
                    <div className="font-bold text-xl">
                      {formatCurrency(ticket.price, ticket.currency)}
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Quantity</label>
                <div className="flex items-center">
                  <button 
                    type="button"
                    onClick={() => setFormData(prev => ({...prev, quantity: Math.max(1, prev.quantity - 1)}))}
                    className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-l-lg hover:bg-white/20 transition-colors"
                  >
                    -
                  </button>
                  <input 
                    type="number" 
                    min="1" 
                    max={selectedTicket?.maxPerCustomer || 10}
                    value={formData.quantity}
                    readOnly
                    className="w-20 h-12 bg-white/5 border-y border-white/10 text-center text-white focus:outline-none"
                  />
                  <button 
                    type="button"
                    onClick={() => setFormData(prev => ({...prev, quantity: Math.min(selectedTicket?.maxPerCustomer || 10, prev.quantity + 1)}))}
                    className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-r-lg hover:bg-white/20 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
              {/* FEATURE 4A: Scarcity Countdown & Tier Escalation Banner */}
              {selectedTicket?.name.toLowerCase().includes('early') && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/20 via-pink-500/15 to-purple-500/15 border border-rave-orange/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔥</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-sm">Tier Escalation Alert</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rave-orange text-white font-bold">
                          86% ALLOCATED
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 mt-0.5">
                        Early-Bird passes are almost depleted. Pricing automatically increases to <strong className="text-rave-orange font-bold">GHS 200.00</strong> next phase.
                      </p>
                    </div>
                  </div>
                  <div className="bg-black/60 px-3 py-1.5 rounded-xl border border-white/10 text-right font-mono shrink-0 self-start sm:self-auto">
                    <span className="text-[10px] text-gray-400 block uppercase">Phase Closes In</span>
                    <span className="text-rave-orange font-bold text-xs tracking-wider">18h : 34m : 12s</span>
                  </div>
                </div>
              )}

              {/* Preferred Payment Method Section */}
              <div className="pt-2">
                <div className="p-5 md:p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
                    <div>
                      <label className="block text-base font-bold text-white">Preferred Payment Method</label>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Select your preferred channel to authorize this payment securely.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-[11px] font-semibold text-green-400 bg-green-500/10 border border-green-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <span>✓ Zero Convenience Fee</span>
                      </span>
                      <span className="text-[11px] font-semibold text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <span>🔒 256-Bit SSL</span>
                      </span>
                    </div>
                  </div>

                  {/* 5 Selectable Payment Options */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    {PAYMENT_METHODS.map((pm) => {
                      const isSelected = selectedMethod === pm.id;
                      return (
                        <div
                          key={pm.id}
                          onClick={() => setSelectedMethod(pm.id)}
                          className={`relative p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer select-none ${
                            isSelected
                              ? `${pm.accentBorder} ${pm.accentBg} ${pm.glowClass} scale-[1.02] ring-2 ring-white/20`
                              : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10 text-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between w-full mb-2">
                            <span className="text-xl">{pm.icon}</span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md ${pm.badgeColor}`}>
                              {pm.badge}
                            </span>
                          </div>
                          <div>
                            <span className="block font-black text-xs md:text-sm text-white tracking-tight">{pm.name}</span>
                            <span className="block text-[10px] text-gray-400 mt-0.5 truncate">{pm.tagline}</span>
                          </div>
                          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                            <span className="text-gray-400 font-mono">Select</span>
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                              isSelected ? `${pm.accentBorder} bg-white text-black` : 'border-gray-600 bg-black/40'
                            }`}>
                              {isSelected && <span className="w-2 h-2 rounded-full bg-black" />}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dynamic Instructions & Additional Fields Panel */}
                  <div className="rounded-xl border border-white/10 bg-black/50 p-4 space-y-4">
                    {/* Method Overview Banner */}
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5">{currentPm?.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-white">{currentPm?.name} Selected</h3>
                          <span className="text-[10px] font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                            Instant Authorization
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                          {currentPm?.instructions}
                        </p>
                      </div>
                    </div>

                    {/* Mobile Money specific fields */}
                    {['mtn_momo', 'telecel_cash', 'at_money'].includes(selectedMethod) && (
                      <div className="pt-3 border-t border-white/10 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                            <span>Wallet Phone Number for Approval</span>
                            {activeCarrier && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-md border font-mono ${activeCarrier.border} ${activeCarrier.color}`}>
                                {activeCarrier.name}
                              </span>
                            )}
                          </label>
                          <button
                            type="button"
                            onClick={() => setUseContactPhoneForMomo(!useContactPhoneForMomo)}
                            className="text-[11px] text-rave-orange hover:underline text-left"
                          >
                            {useContactPhoneForMomo ? 'Change approval number' : 'Use contact phone number'}
                          </button>
                        </div>

                        {useContactPhoneForMomo ? (
                          <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                            <span className="text-gray-400">Prompt will pop up on:</span>
                            <span className="font-mono font-bold text-white text-sm">
                              {formData.customerPhone || 'Enter contact phone above'}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <input
                              type="tel"
                              value={customMomoPhone}
                              onChange={(e) => setCustomMomoPhone(e.target.value)}
                              placeholder="024XXXXXXX or +233..."
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rave-orange focus:ring-1 focus:ring-rave-orange font-mono"
                            />
                            <span className="text-[10px] text-gray-400 mt-1 block">
                              Enter the registered mobile money SIM number you will approve the prompt from.
                            </span>
                          </div>
                        )}

                        {/* Step-by-step indicator */}
                        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                            <span className="block text-[10px] font-bold text-gray-400 uppercase">Step 1</span>
                            <span className="text-[11px] text-gray-200 mt-0.5 block">Click Pay Below</span>
                          </div>
                          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                            <span className="block text-[10px] font-bold text-gray-400 uppercase">Step 2</span>
                            <span className="text-[11px] text-gray-200 mt-0.5 block">Enter MoMo PIN</span>
                          </div>
                          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                            <span className="block text-[10px] font-bold text-gray-400 uppercase">Step 3</span>
                            <span className="text-[11px] text-gray-200 mt-0.5 block">Receive Tickets</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Card specific information */}
                    {selectedMethod === 'card' && (
                      <div className="pt-3 border-t border-white/10 space-y-2 text-xs text-gray-400">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-1 rounded bg-white/10 text-white font-mono text-[10px]">VISA</span>
                          <span className="px-2 py-1 rounded bg-white/10 text-white font-mono text-[10px]">MASTERCARD</span>
                          <span className="px-2 py-1 rounded bg-white/10 text-white font-mono text-[10px]">VERVE</span>
                          <span className="px-2 py-1 rounded bg-white/10 text-white font-mono text-[10px]">APPLE PAY</span>
                        </div>
                        <p className="text-[11px] text-gray-300">
                          All local and international debit & credit cards accepted. Secure 3D-Secure authentication required by your bank.
                        </p>
                      </div>
                    )}

                    {/* Bank transfer specific information */}
                    {selectedMethod === 'bank_transfer' && (
                      <div className="pt-3 border-t border-white/10 text-xs text-gray-300 space-y-1">
                        <p className="text-[11px]">
                          Supported Ghana Banks: <strong>GCB, Ecobank, Stanbic, CalBank, GTBank, Fidelity, Zenith, Absa, Access, CBG</strong> and all GHIPSS members.
                        </p>
                        <p className="text-[10px] text-gray-400">
                          You will receive instant virtual account details to transfer directly with zero waiting time.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={submitting || !formData.ticketTypeId}
              className={`w-full py-4 rounded-full font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                submitting || !formData.ticketTypeId
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-rave text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:scale-[1.02]'
              }`}
            >
              {submitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Connecting to {currentPm?.name}...</span>
                </>
              ) : (
                <>
                  <span>Pay {formatCurrency(total, selectedTicket?.currency)} with {currentPm?.name}</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-5 xl:col-span-4 mt-8 lg:mt-16">
          <div className="glass-panel p-6 md:p-8 rounded-2xl sticky top-24">
            <h2 className="text-2xl font-bold mb-6">Order Summary</h2>
            
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/10">
              {event?.posterUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={event.posterUrl} alt={event.name} className="w-20 h-20 object-cover rounded-lg" />
              )}
              <div>
                <h3 className="font-bold text-lg">{event?.name}</h3>
                <p className="text-sm text-gray-400">{event?.venueName}</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-gray-300">
                <span>{selectedTicket?.name} x {formData.quantity}</span>
                <span>{formatCurrency(subtotal, selectedTicket?.currency)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Preferred Method</span>
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <span>{currentPm?.icon}</span>
                  <span>{currentPm?.name}</span>
                </span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Convenience Fee</span>
                <span className="text-green-400 font-semibold">GHS 0.00 (Waived)</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Ticket Delivery</span>
                <span className="text-gray-200 text-xs">Instant Digital Pass</span>
              </div>
            </div>

            <div className="flex justify-between items-end border-t border-white/10 pt-6">
              <span className="text-gray-400">Total</span>
              <span className="text-3xl font-black text-gradient">
                {formatCurrency(total, selectedTicket?.currency)}
              </span>
            </div>
            
            <div className="mt-8 text-xs text-gray-500 flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secure encrypted payment
            </div>
          </div>
        </div>
        
      </div>
    </main>
    </div>
  );
}

export default function CheckoutPage(props: { params: Promise<{ eventId: string }> }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="w-10 h-10 border-2 border-rave-orange border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CheckoutContent {...props} />
    </Suspense>
  );
}
