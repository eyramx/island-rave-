'use client';

import { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import CustomerHeader from '@/components/CustomerHeader';
import RealTimeCountdown from '@/components/RealTimeCountdown';

interface GuestSlot {
  id: string;
  name: string;
  email: string;
  phone?: string;
  assigned: boolean;
}

interface TicketDisplay {
  id: string;
  orderReference: string;
  ticketNumber: string;
  ticketToken: string;
  holderName: string;
  ticketTypeName: string;
  price: number;
  currency: string;
  eventName: string;
  venueName: string;
  eventDate: string;
  startTime: string;
  status: 'VALID' | 'USED' | 'CANCELLED';
  isGroupPass?: boolean;
  maxGuests?: number;
  guests?: GuestSlot[];
  paymentMethod?: string;
}

function DashboardContent({
  searchParams,
}: {
  searchParams?: Promise<{ ref?: string; tab?: string }>;
}) {
  const unwrappedParams = searchParams ? use(searchParams) : {};
  const queryParams = useSearchParams();
  const initialRef = unwrappedParams.ref || queryParams.get('ref') || '';
  const initialTab = (unwrappedParams.tab === 'lookup' || queryParams.get('tab') === 'lookup') ? 'lookup' : 'tickets';

  const [searchRef, setSearchRef] = useState(initialRef);
  const [activeTab, setActiveTab] = useState<'tickets' | 'lookup'>(initialTab);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedGuestLink, setCopiedGuestLink] = useState<string | null>(null);

  const paymentMethodQuery = queryParams.get('method') || 'mtn_momo';

  // Active tickets list initialized from query reference if present
  const [tickets, setTickets] = useState<TicketDisplay[]>(() => {
    if (!initialRef) return [];
    const isCabana = initialRef.toLowerCase().includes('cabana');
    return [
      {
        id: 't-initial-1',
        orderReference: initialRef,
        ticketNumber: 'IR-TKT-88421',
        ticketToken: 'tok-' + initialRef,
        holderName: 'Ticket Holder',
        ticketTypeName: isCabana ? 'Cabana Lounge Table Package' : 'VIP Tropical Pass',
        price: isCabana ? 1500.00 : 350.00,
        currency: 'GHS',
        eventName: 'Island Rave',
        venueName: 'La Plage Beach Club, Accra',
        eventDate: 'Saturday, 26 September 2026',
        startTime: '8:00 PM GMT',
        status: 'VALID',
        isGroupPass: true,
        maxGuests: isCabana ? 8 : 4,
        paymentMethod: paymentMethodQuery,
        guests: [
          { id: 'g-1', name: 'Primary Buyer', email: 'buyer@example.com', assigned: true },
          { id: 'g-2', name: '', email: '', assigned: false },
          { id: 'g-3', name: '', email: '', assigned: false },
          { id: 'g-4', name: '', email: '', assigned: false },
        ],
      }
    ];
  });

  // Dynamic QR Rotation (TOTP Security) - 30s countdown
  const [countdown, setCountdown] = useState(30);
  const [securitySalt, setSecuritySalt] = useState('7A9K');

  // Multi-guest assignment modal state
  const [selectedTicketForGuests, setSelectedTicketForGuests] = useState<TicketDisplay | null>(null);
  const [guestInputs, setGuestInputs] = useState<{ [key: string]: { name: string; email: string } }>({});
  const [guestSavedToast, setGuestSavedToast] = useState<string | null>(null);

  // Rotate security salt every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Generate new 4-char security salt
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          let salt = '';
          for (let i = 0; i < 4; i++) {
            salt += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          setSecuritySalt(salt);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatPaymentMethod = (m?: string) => {
    switch (m) {
      case 'mtn_momo': return { name: 'MTN MoMo (*170#)', icon: '📱' };
      case 'telecel_cash': return { name: 'Telecel Cash (*110#)', icon: '🔴' };
      case 'at_money': return { name: 'AT Money', icon: '🔵' };
      case 'card': return { name: 'Visa / Mastercard (3D Secure)', icon: '💳' };
      case 'bank_transfer': return { name: 'GHIPSS Instant Pay', icon: '🏦' };
      default: return { name: 'Direct Mobile Payment', icon: '⚡' };
    }
  };

  const handleCopy = (token: string) => {
    navigator.clipboard?.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchRef.trim()) return;
    const isCabana = searchRef.toLowerCase().includes('cabana');
    setTickets([
      {
        id: 't-' + Date.now(),
        orderReference: searchRef.trim(),
        ticketNumber: 'IR-TKT-' + Math.floor(10000 + Math.random() * 90000),
        ticketToken: 'tok-' + searchRef.trim(),
        holderName: 'Registered Guest',
        ticketTypeName: isCabana ? 'Cabana Lounge Table Package (8 Guests)' : 'VIP Island Experience (4 Passes)',
        price: isCabana ? 1500.00 : 350.00,
        currency: 'GHS',
        eventName: 'Island Rave',
        venueName: 'La Plage Beach Club, Accra',
        eventDate: 'Saturday, 26 September 2026',
        startTime: '8:00 PM GMT',
        status: 'VALID',
        isGroupPass: true,
        maxGuests: isCabana ? 8 : 4,
        guests: [
          { id: 'g-1', name: 'Primary Buyer', email: 'registered@example.com', assigned: true },
          { id: 'g-2', name: '', email: '', assigned: false },
          { id: 'g-3', name: '', email: '', assigned: false },
          { id: 'g-4', name: '', email: '', assigned: false },
        ],
      }
    ]);
    setActiveTab('tickets');
  };

  const openGuestModal = (ticket: TicketDisplay) => {
    setSelectedTicketForGuests(ticket);
    const initial: { [key: string]: { name: string; email: string } } = {};
    ticket.guests?.forEach((g) => {
      initial[g.id] = { name: g.name, email: g.email };
    });
    setGuestInputs(initial);
  };

  const saveGuests = () => {
    if (!selectedTicketForGuests) return;
    const updatedGuests = (selectedTicketForGuests.guests || []).map((g) => {
      const input = guestInputs[g.id];
      if (input && input.name.trim()) {
        return { ...g, name: input.name, email: input.email, assigned: true };
      }
      return g;
    });

    setTickets(prev =>
      prev.map(t => t.id === selectedTicketForGuests.id ? { ...t, guests: updatedGuests } : t)
    );

    setGuestSavedToast('Guest passes generated and ready to share!');
    setTimeout(() => setGuestSavedToast(null), 3000);
    setSelectedTicketForGuests(null);
  };

  const shareViaWhatsApp = (guestName: string, guestId: string) => {
    const passUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard?ref=${selectedTicketForGuests?.orderReference || 'IR-2026'}&guest=${guestId}`;
    const text = `Hey ${guestName || 'friend'}! 🌴 Here is your official entrance pass for Island Rave at La Plage: ${passUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const copyGuestPass = (guestId: string) => {
    const passUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard?ref=${selectedTicketForGuests?.orderReference || 'IR-2026'}&guest=${guestId}`;
    navigator.clipboard?.writeText(passUrl);
    setCopiedGuestLink(guestId);
    setTimeout(() => setCopiedGuestLink(null), 2000);
  };

  const shareMainPassViaWhatsApp = (ticket: TicketDisplay) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const passUrl = `${origin}/dashboard?ref=${ticket.orderReference}`;
    const message = `Hey! 🌴 Here is my official entrance pass for Island Rave 2026 at La Plage (${ticket.ticketTypeName}): ${passUrl}\n\nPresent this at the gate for fast-track entry!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  const downloadOfflinePass = (ticket: TicketDisplay) => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 800, 1100);

    // Neon glow gradients
    const grad1 = ctx.createRadialGradient(700, 100, 10, 700, 100, 400);
    grad1.addColorStop(0, 'rgba(249, 115, 22, 0.35)');
    grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, 800, 600);

    const grad2 = ctx.createRadialGradient(100, 1000, 10, 100, 1000, 400);
    grad2.addColorStop(0, 'rgba(217, 70, 239, 0.35)');
    grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 600, 800, 500);

    // Card border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, 740, 1040);

    // Header Tag
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('OFFICIAL DIGITAL ENTRANCE PASS', 60, 80);

    // Event Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px sans-serif';
    ctx.fillText('ISLAND RAVE 2026', 60, 140);

    // Venue & Date
    ctx.fillStyle = '#9ca3af';
    ctx.font = '22px sans-serif';
    ctx.fillText('La Plage Beach Club, Accra, Ghana', 60, 180);
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Saturday, 26 September 2026 • 8:00 PM GMT', 60, 215);

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 250);
    ctx.lineTo(740, 250);
    ctx.stroke();

    // Attendee Details
    ctx.fillStyle = '#9ca3af';
    ctx.font = '16px sans-serif';
    ctx.fillText('ATTENDEE NAME', 60, 290);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(ticket.holderName, 60, 330);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '16px sans-serif';
    ctx.fillText('TICKET TIER', 450, 290);
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(ticket.ticketTypeName, 450, 330);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '16px sans-serif';
    ctx.fillText('ORDER REFERENCE', 60, 390);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(ticket.orderReference, 60, 420);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '16px sans-serif';
    ctx.fillText('TICKET NUMBER', 450, 390);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(ticket.ticketNumber, 450, 420);

    // QR Box Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(200, 480, 400, 400);

    // Stylized QR Corners and markers
    ctx.fillStyle = '#000000';
    ctx.fillRect(220, 500, 100, 100);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(240, 520, 60, 60);
    ctx.fillStyle = '#000000';
    ctx.fillRect(255, 535, 30, 30);

    ctx.fillRect(480, 500, 100, 100);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(500, 520, 60, 60);
    ctx.fillStyle = '#000000';
    ctx.fillRect(515, 535, 30, 30);

    ctx.fillRect(220, 760, 100, 100);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(240, 780, 60, 60);
    ctx.fillStyle = '#000000';
    ctx.fillRect(255, 795, 30, 30);

    ctx.fillRect(350, 530, 25, 40);
    ctx.fillRect(400, 510, 40, 30);
    ctx.fillRect(350, 610, 100, 100);
    ctx.fillRect(480, 640, 40, 60);
    ctx.fillRect(360, 740, 30, 80);
    ctx.fillRect(430, 760, 80, 40);

    // QR Token text below
    ctx.fillStyle = '#9ca3af';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`TOKEN: ${ticket.ticketToken.toUpperCase()}`, 400, 920);

    // Footer Security Notice
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('VALID FOR SINGLE ADMITTANCE • OFFLINE VERIFIED', 400, 970);
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px sans-serif';
    ctx.fillText('Save this image to your phone gallery for entry without internet connection.', 400, 1005);
    ctx.textAlign = 'left';

    // Trigger download
    const link = document.createElement('a');
    link.download = `IslandRave-Pass-${ticket.ticketNumber}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    setGuestSavedToast('Offline pass image downloaded to your device!');
    setTimeout(() => setGuestSavedToast(null), 3500);
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col pb-24 lg:pb-0">
      {/* Customer Platform Header with Tabs */}
      <CustomerHeader activeTab={activeTab === 'lookup' ? 'lookup' : 'wallet'} />

      {/* Toast Notification */}
      {guestSavedToast && (
        <div className="fixed top-20 right-8 z-50 bg-green-500 text-black font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <span>✓ {guestSavedToast}</span>
        </div>
      )}

      {/* Hero / Header */}
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-6 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <span className="text-xs font-bold tracking-widest uppercase text-rave-orange mb-2 block">
              Digital Ticket Wallet
            </span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">
              My Tickets
            </h1>
            <p className="text-gray-400 mt-2 text-sm md:text-base">
              Present your live security pass at the gate. Protected against screenshots.
            </p>
          </div>

          {/* Quick tab switcher */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 self-start md:self-auto">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'tickets'
                  ? 'bg-gradient-rave text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Active Tickets ({tickets.length})
            </button>
            <button
              onClick={() => setActiveTab('lookup')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'lookup'
                  ? 'bg-gradient-rave text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Find Order
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="max-w-6xl mx-auto px-6 py-6 w-full flex-grow">
        {activeTab === 'lookup' && (
          <div className="glass-panel max-w-xl mx-auto p-8 rounded-3xl border border-white/10 shadow-2xl mb-12">
            <h2 className="text-2xl font-bold mb-2">Find Your Ticket</h2>
            <p className="text-gray-400 text-sm mb-6">
              Enter your Order Reference (e.g., <code className="text-rave-orange font-mono">IR-2026-...</code>) or buyer email to retrieve your passes.
            </p>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-semibold text-gray-400 mb-2">Order Reference or Email</label>
                <input
                  type="text"
                  value={searchRef}
                  onChange={(e) => setSearchRef(e.target.value)}
                  placeholder="Enter your order reference or buyer email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rave-orange focus:ring-1 focus:ring-rave-orange transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-rave text-white py-3 rounded-xl font-bold hover:scale-[1.01] transition-transform shadow-[0_0_15px_rgba(249,115,22,0.3)]"
              >
                Search Tickets
              </button>
            </form>
          </div>
        )}

        {/* Ticket List */}
        <div className="space-y-8">
          {tickets.length > 0 && (
            <div className="mb-2">
              <RealTimeCountdown variant="card" />
            </div>
          )}
          {tickets.length === 0 ? (
            <div className="glass-panel p-12 md:p-16 rounded-3xl border border-white/10 text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rave-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Active Passes Found</h3>
              <p className="text-gray-400 text-sm mb-6">
                You haven&apos;t booked any tickets yet. Complete a checkout or look up using your order reference.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/#tickets"
                  className="bg-gradient-rave text-white font-bold text-xs px-6 py-3 rounded-full hover:scale-105 transition-transform"
                >
                  Browse Available Tickets
                </Link>
                <button
                  onClick={() => setActiveTab('lookup')}
                  className="bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-6 py-3 rounded-full transition-colors"
                >
                  Look Up by Reference
                </button>
              </div>
            </div>
          ) : (
            tickets.map((ticket) => (
            <div 
              key={ticket.id}
              className="glass-panel rounded-3xl overflow-hidden border border-white/10 hover:border-rave-orange/40 transition-colors shadow-2xl relative"
            >
              {/* Glowing accent border */}
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-rave-orange/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-rave-pink/15 rounded-full blur-3xl pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-12 relative z-10">
                {/* Left Ticket Stub / Info */}
                <div className="lg:col-span-8 p-6 md:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10">
                  <div>
                    {/* Header line */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-black uppercase px-3 py-1 rounded-full flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          <span>{ticket.status}</span>
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          Ref: <strong className="text-white">{ticket.orderReference}</strong>
                        </span>
                        {ticket.paymentMethod && (
                          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
                            <span>{formatPaymentMethod(ticket.paymentMethod).icon}</span>
                            <span>Paid via {formatPaymentMethod(ticket.paymentMethod).name}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-rave-orange font-bold text-sm tracking-wide">
                        {ticket.ticketTypeName}
                      </span>
                    </div>

                    {/* Main Event Info */}
                    <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-4">
                      {ticket.eventName}
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Date & Time</p>
                        <p className="text-base font-bold text-gray-200">{ticket.eventDate}</p>
                        <p className="text-sm text-rave-orange font-medium">{ticket.startTime}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Location / Venue</p>
                        <p className="text-base font-bold text-gray-200">{ticket.venueName}</p>
                        <p className="text-sm text-gray-400">Gate opening starts 2 hours prior</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Primary Attendee</p>
                        <p className="text-base font-bold text-white">{ticket.holderName}</p>
                        <p className="text-xs text-gray-400 font-mono">ID: {ticket.ticketNumber}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Package Type</p>
                        <p className="text-xl font-black text-gradient">
                          {ticket.currency} {ticket.price.toFixed(2)}
                        </p>
                        {ticket.isGroupPass && (
                          <p className="text-xs text-rave-orange font-semibold">Includes up to {ticket.maxGuests} guests</p>
                        )}
                      </div>
                    </div>
                    {/* VIP Cabana Perks Banner if Cabana tier */}
                    {(ticket.ticketTypeName.toLowerCase().includes('cabana') || ticket.price >= 1500) && (
                      <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-pink-500/10 border border-amber-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">🍾</span>
                          <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                            Cabana Lounge VIP Inclusions
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300 font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className="text-green-400">✓</span>
                            <span>Dedicated Beach Cabana for up to 8 Guests</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-green-400">✓</span>
                            <span>Premium Bottle Service & Chilled Mixers</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-green-400">✓</span>
                            <span>8x VIP Backstage & Stage Access Wristbands</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-green-400">✓</span>
                            <span>Dedicated Table Host & Security Escort</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions & Sharing Controls */}
                  <div className="pt-6 border-t border-white/10 flex flex-wrap gap-2.5 items-center">
                    {/* Multi-Guest Trigger for Cabanas / Groups */}
                    {ticket.isGroupPass && (
                      <button
                        onClick={() => openGuestModal(ticket)}
                        className="bg-gradient-rave text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-rave-orange/20 hover:scale-105 transition-all flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span>Assign Guests ({ticket.guests?.filter(g => g.assigned).length || 1}/{ticket.maxGuests})</span>
                      </button>
                    )}

                    {/* FEATURE 3A: 1-Click WhatsApp Share */}
                    <button
                      onClick={() => shareMainPassViaWhatsApp(ticket)}
                      className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-green-600/20 hover:scale-105 transition-all flex items-center gap-2"
                      title="Share ticket pass directly to WhatsApp"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                      </svg>
                      <span>Share on WhatsApp</span>
                    </button>

                    {/* FEATURE 3B: Download Offline Digital Pass */}
                    <button
                      onClick={() => downloadOfflinePass(ticket)}
                      className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 border border-white/15"
                      title="Download high-resolution offline ticket pass image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-rave-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Download Offline Pass</span>
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold px-3 py-2 rounded-xl transition-colors hidden sm:flex items-center gap-1.5"
                    >
                      <span>🖨️ Print</span>
                    </button>

                    <button
                      onClick={() => handleCopy(`${ticket.ticketToken}-${securitySalt}`)}
                      className="bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-mono px-3 py-2 rounded-xl transition-colors"
                    >
                      {copiedToken ? '✓ Copied' : 'Token'}
                    </button>
                  </div>
                </div>

                {/* Right QR Code Section with Animated Sweep Line & Security Rotation */}
                <div className="lg:col-span-4 p-8 md:p-10 flex flex-col items-center justify-center bg-white/[0.02] text-center relative overflow-hidden">
                  {/* Security Badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rave-orange/15 border border-rave-orange/30 text-[10px] font-mono font-bold text-rave-orange uppercase mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-rave-orange animate-ping" />
                    <span>Dynamic Live Security Pass</span>
                  </div>

                  {/* QR Box with animated radar sweep line */}
                  <div className="relative p-4 bg-white rounded-2xl shadow-2xl border border-gray-200 inline-block mb-3 overflow-hidden group">
                    {/* Animated Laser Sweep Line across QR code */}
                    <div 
                      className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-rave-orange to-transparent shadow-[0_0_12px_rgba(249,115,22,1)] pointer-events-none z-20 animate-pulse"
                      style={{
                        animation: 'sweep 2.5s ease-in-out infinite alternate',
                        top: `${((30 - countdown) / 30) * 100}%`
                      }}
                    />

                    <svg viewBox="0 0 100 100" className="w-40 h-40 text-black">
                      <rect width="100" height="100" fill="white" />
                      {/* Corner 1 */}
                      <rect x="5" y="5" width="30" height="30" fill="black" />
                      <rect x="10" y="10" width="20" height="20" fill="white" />
                      <rect x="14" y="14" width="12" height="12" fill="black" />
                      {/* Corner 2 */}
                      <rect x="65" y="5" width="30" height="30" fill="black" />
                      <rect x="70" y="10" width="20" height="20" fill="white" />
                      <rect x="74" y="14" width="12" height="12" fill="black" />
                      {/* Corner 3 */}
                      <rect x="5" y="65" width="30" height="30" fill="black" />
                      <rect x="10" y="70" width="20" height="20" fill="white" />
                      <rect x="14" y="74" width="12" height="12" fill="black" />
                      {/* Pattern Modules */}
                      <rect x="42" y="10" width="6" height="6" fill="black" />
                      <rect x="52" y="10" width="6" height="12" fill="black" />
                      <rect x="42" y="24" width="12" height="6" fill="black" />
                      <rect x="10" y="42" width="6" height="6" fill="black" />
                      <rect x="24" y="42" width="12" height="12" fill="black" />
                      <rect x="42" y="42" width="16" height="16" fill="black" />
                      <rect x="65" y="42" width="6" height="16" fill="black" />
                      <rect x="80" y="42" width="12" height="6" fill="black" />
                      <rect x="75" y="55" width="18" height="6" fill="black" />
                      <rect x="42" y="65" width="8" height="12" fill="black" />
                      <rect x="55" y="68" width="12" height="8" fill="black" />
                      <rect x="75" y="68" width="18" height="18" fill="black" />
                      <rect x="42" y="85" width="22" height="6" fill="black" />
                    </svg>
                  </div>

                  {/* TOTP Security Rotation Progress Bar */}
                  <div className="w-48 space-y-1.5 mb-2">
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                      <span>Token: #{securitySalt}</span>
                      <span className="text-rave-orange font-bold">Rotates in {countdown}s</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-rave h-full transition-all duration-1000 ease-linear rounded-full"
                        style={{ width: `${(countdown / 30) * 100}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 max-w-[200px] leading-relaxed">
                    Anti-screenshot protected. Token rotates automatically for gate entry.
                  </p>
                </div>
              </div>
            </div>
          )))}
        </div>
      </section>

      {/* Multi-Guest Assignment Modal */}
      {selectedTicketForGuests && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-2xl w-full p-6 md:p-8 rounded-3xl border border-white/20 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-xs font-mono font-bold uppercase text-rave-orange block mb-1">
                  Group Pass Allocation
                </span>
                <h2 className="text-2xl font-black text-white">
                  Assign Guest Tickets ({selectedTicketForGuests.ticketTypeName})
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Assign seats to your friends so each person gets their personal QR entrance pass.
                </p>
              </div>
              <button
                onClick={() => setSelectedTicketForGuests(null)}
                className="text-gray-400 hover:text-white p-2 rounded-xl bg-white/5"
              >
                ✕
              </button>
            </div>

            {/* Guest Slots */}
            <div className="space-y-4 mb-6">
              {selectedTicketForGuests.guests?.map((guest, index) => {
                const isPrimary = index === 0;
                const inputVal = guestInputs[guest.id] || { name: guest.name, email: guest.email };

                return (
                  <div key={guest.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-rave-orange/20 text-rave-orange text-xs font-bold flex items-center justify-center font-mono">
                          {index + 1}
                        </span>
                        <span className="text-sm font-bold text-white">
                          {isPrimary ? 'Primary Ticket Holder (You)' : `Guest Seat ${index + 1}`}
                        </span>
                      </div>
                      {guest.assigned && (
                        <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                          ✓ Assigned
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        disabled={isPrimary}
                        value={inputVal.name}
                        onChange={(e) => setGuestInputs({
                          ...guestInputs,
                          [guest.id]: { ...inputVal, name: e.target.value }
                        })}
                        placeholder="Guest Full Name"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-rave-orange disabled:opacity-60"
                      />
                      <input
                        type="email"
                        disabled={isPrimary}
                        value={inputVal.email}
                        onChange={(e) => setGuestInputs({
                          ...guestInputs,
                          [guest.id]: { ...inputVal, email: e.target.value }
                        })}
                        placeholder="Guest Email (Optional)"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-rave-orange disabled:opacity-60"
                      />
                    </div>

                    {/* Instant Share Buttons */}
                    {!isPrimary && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => shareViaWhatsApp(inputVal.name, guest.id)}
                          className="px-3 py-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/30 border border-green-500/40 text-green-300 text-[11px] font-bold transition-all flex items-center gap-1.5"
                        >
                          <span>💬 Send on WhatsApp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => copyGuestPass(guest.id)}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-[11px] font-semibold transition-all"
                        >
                          {copiedGuestLink === guest.id ? '✓ Link Copied' : '🔗 Copy Pass Link'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={saveGuests}
                className="flex-1 bg-gradient-rave text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:scale-[1.01] transition-transform shadow-lg shadow-rave-orange/30"
              >
                Save & Update Guest Passes
              </button>
              <button
                type="button"
                onClick={() => setSelectedTicketForGuests(null)}
                className="px-6 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6 text-center text-xs text-gray-500 mt-auto">
        <p>&copy; {new Date().getFullYear()} Island Rave. Need help with your tickets? Contact support@islandrave.com</p>
      </footer>
    </main>
  );
}

export default function DashboardPage(props: { searchParams?: Promise<{ ref?: string; tab?: string }> }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="w-10 h-10 border-2 border-rave-orange border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DashboardContent {...props} />
    </Suspense>
  );
}
