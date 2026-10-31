'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

export interface TicketTypeItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  isEarlyBird?: boolean;
  totalQuantity?: number;
  soldQuantity?: number;
}

interface RealTimeTicketsSectionProps {
  eventId: string;
  ticketTypes: TicketTypeItem[];
}

export default function RealTimeTicketsSection({ eventId, ticketTypes }: RealTimeTicketsSectionProps) {
  // Live simulation state for customer engagement
  const [liveDemand, setLiveDemand] = useState<{ [id: string]: number }>(() => {
    const initial: { [id: string]: number } = {};
    ticketTypes.forEach((t, i) => {
      initial[t.id] = 10 + ((i * 3) % 9);
    });
    return initial;
  });
  const [recentPurchase, setRecentPurchase] = useState<string | null>(null);

  useEffect(() => {
    // Fluctuate demand naturally
    const demandInterval = setInterval(() => {
      setLiveDemand(prev => {
        const next = { ...prev };
        ticketTypes.forEach(t => {
          const delta = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
          next[t.id] = Math.max(4, Math.min(25, (next[t.id] || 10) + delta));
        });
        return next;
      });
    }, 4500);

    // Periodic recent purchase pulse
    const purchaseInterval = setInterval(() => {
      const names = ['Kofi from East Legon', 'Ama from Osu', 'Jessica from Cantonments', 'Kwame from Airport City', 'Yaw from Tema'];
      const tiers = ['VIP Tropical Pass', 'General Admission', 'Cabana Lounge Table'];
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomTier = tiers[Math.floor(Math.random() * tiers.length)];
      setRecentPurchase(`${randomName} just secured 2x ${randomTier} via MTN MoMo`);

      setTimeout(() => {
        setRecentPurchase(null);
      }, 5000);
    }, 15000);

    return () => {
      clearInterval(demandInterval);
      clearInterval(purchaseInterval);
    };
  }, [ticketTypes]);

  return (
    <section id="tickets" className="w-full bg-[#0a0a0a] py-24 px-6 relative">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-rave-orange to-transparent opacity-30"></div>
      
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rave-orange/10 border border-rave-orange/30 text-rave-orange text-xs font-bold font-mono uppercase mb-4 tracking-wider">
            <span className="w-2 h-2 rounded-full bg-rave-orange animate-ping" />
            <span>Live Admissions Allocation</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider text-white">Select Tickets</h2>
          <p className="text-gray-400 text-sm mt-3 max-w-xl mx-auto">
            Choose your festival pass. Real-time ticket allocation updates automatically with zero convenience surcharges on Mobile Money.
          </p>
        </div>

        {/* Live Recent Purchase Toast */}
        {recentPurchase && (
          <div className="mb-8 max-w-md mx-auto p-3 rounded-2xl bg-black/80 border border-rave-orange/40 text-xs text-white flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(249,115,22,0.3)] animate-bounce">
            <div className="flex items-center gap-2">
              <span className="text-base">🎉</span>
              <span className="text-gray-200">{recentPurchase}</span>
            </div>
            <span className="text-[10px] font-mono text-rave-orange shrink-0 font-bold">Just now</span>
          </div>
        )}
        
        {/* Tickets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
          {ticketTypes.map((ticket) => {
            const sold = ticket.soldQuantity || 0;
            const total = ticket.totalQuantity || (ticket.isEarlyBird ? 300 : 150);
            const claimedPercent = total > 0 ? Math.round((sold / total) * 100) : 0;
            const remaining = Math.max(0, total - sold);
            const viewers = liveDemand[ticket.id] || 12;

            return (
              <div 
                key={ticket.id} 
                className="glass-panel p-8 rounded-3xl flex flex-col items-center text-center relative overflow-hidden group hover:border-rave-orange/60 transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(249,115,22,0.2)]"
              >
                {ticket.isEarlyBird && (
                  <div className="absolute top-4 right-4 bg-gradient-rave text-white text-xs font-black px-3 py-1 rounded-full shadow-md">
                    Early Bird
                  </div>
                )}
                
                {/* Live Browsing Tag */}
                <div className="self-start mb-2">
                  <span className="text-[10px] font-mono font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                    <span>{viewers} active shoppers viewing</span>
                  </span>
                </div>

                <h3 className="text-2xl font-bold mb-2 text-white">{ticket.name}</h3>
                <p className="text-gray-400 text-sm mb-6 flex-grow leading-relaxed">
                  {ticket.description || 'General festival admission with complete stage access.'}
                </p>
                
                {/* Live Ticket Availability Bar */}
                <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 mb-6 text-left space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1.5 text-rave-orange font-bold">
                      <span className="w-2 h-2 rounded-full bg-rave-orange animate-ping" />
                      <span>
                        {sold === 0
                          ? (ticket.isEarlyBird ? '✨ Early-Bird Live' : '⚡ Tier Available')
                          : (remaining <= 25 ? `🔥 Only ${remaining} passes left` : '⚡ Selling Fast')}
                      </span>
                    </span>
                    <span className="text-gray-300 font-mono text-xs font-bold">
                      {claimedPercent}% Claimed
                    </span>
                  </div>

                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-rave h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(249,115,22,0.8)]"
                      style={{ width: `${claimedPercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-gray-400 pt-0.5 font-mono">
                    <span>{sold} claimed</span>
                    <span className="text-green-400 font-semibold">{remaining} available</span>
                  </div>
                </div>

                {/* Price */}
                <div className="text-4xl font-black mb-6 text-gradient tracking-tight">
                  {formatCurrency(ticket.price, ticket.currency)}
                </div>
                
                {/* CTA Button */}
                <Link 
                  href={`/checkout/${eventId}?ticket=${ticket.id}`} 
                  className="w-full bg-white text-black py-4 rounded-full font-bold hover:bg-gradient-rave hover:text-white transition-all shadow-lg hover:shadow-rave-orange/30 block text-center uppercase tracking-wider text-sm cursor-pointer"
                >
                  Buy Ticket Now
                </Link>

                {/* Payment Method Badges */}
                <div className="flex items-center justify-center gap-2 mt-4 text-[11px] text-gray-400 font-medium flex-wrap">
                  <span className="text-yellow-400 font-semibold">MTN MoMo</span>
                  <span>•</span>
                  <span className="text-red-400 font-semibold">Telecel</span>
                  <span>•</span>
                  <span className="text-blue-400 font-semibold">AT Money</span>
                  <span>•</span>
                  <span className="text-purple-400 font-semibold">Card</span>
                </div>
              </div>
            );
          })}
          
          {ticketTypes.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-12">
              No tickets are currently available.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
