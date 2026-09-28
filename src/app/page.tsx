import Link from 'next/link';
import { prisma, isDbReachable } from '@/lib/db';
import { formatDate, formatTime } from '@/lib/utils';

import { getSharedTiers } from '@/lib/tiers-store';

async function getFeaturedEvent() {
  if (await isDbReachable()) {
    try {
      const event = await prisma.event.findFirst({
        where: {
          slug: 'island-rave', // Based on seed data
          status: 'PUBLISHED'
        },
        include: {
          ticketTypes: {
            where: { status: 'ACTIVE' },
            orderBy: { sortOrder: 'asc' }
          }
        }
      });
      if (event) {
        return {
          ...event,
          startTime: (!event.startTime || event.startTime === 'Time Coming Soon') ? '8:00 PM GMT' : event.startTime,
        };
      }
    } catch (error) {
      console.warn('DB query failed, falling back to mock data:', error);
    }
  }

  // Fallback synced with admin ticket tiers
  const sharedTiers = getSharedTiers().filter(t => t.status === 'ACTIVE');

  return {
    id: 'mock-id',
    name: 'Island Rave',
    description: 'The ultimate tropical event experience. Event description will be provided by the organizer.',
    venueName: 'La Plage Beach Club, Accra',
    eventDate: new Date('2026-09-26T20:00:00Z'),
    startTime: '8:00 PM GMT',
    bannerUrl: 'https://images.unsplash.com/photo-1540039155732-68473682de40?auto=format&fit=crop&q=80&w=2000',
    contactEmail: 'contact@example.com',
    twitter: '#',
    instagram: '#',
    ticketTypes: sharedTiers
  };
}

import CustomerHeader from '@/components/CustomerHeader';
import RealTimeCountdown from '@/components/RealTimeCountdown';
import RealTimeTicketsSection from '@/components/RealTimeTicketsSection';

export default async function Home() {
  const event = await getFeaturedEvent();

  if (!event) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold text-gradient mb-4">ISLAND RAVE</h1>
        <p className="text-xl">Event information coming soon.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col pb-24 lg:pb-0">
      {/* Customer Platform Header with Tabs */}
      <CustomerHeader activeTab="experience" />

      {/* Hero Section */}
      <section className="relative w-full min-h-[85vh] flex items-center justify-center overflow-hidden py-12">
        {/* Background Image Placeholder */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black z-10" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={event.bannerUrl || "https://images.unsplash.com/photo-1540039155732-68473682de40?auto=format&fit=crop&q=80&w=2000"} 
            alt="Island Rave" 
            className="w-full h-full object-cover opacity-60"
          />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-4 mt-8 w-full max-w-5xl">
          <p className="text-rave-orange font-semibold tracking-[0.3em] uppercase mb-4 text-sm md:text-base">
            {formatDate(event.eventDate)}
          </p>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-rave drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]">
              Island Rave
            </span>
          </h1>
          
          <div className="glass-panel px-8 py-3.5 rounded-full flex flex-col md:flex-row items-center gap-2 md:gap-6 mb-4">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rave-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium text-lg">{event.venueName}</span>
            </div>
            <div className="hidden md:block w-px h-6 bg-white/20"></div>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rave-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-lg">{formatTime(event.startTime)}</span>
            </div>
          </div>

          {/* REAL-TIME LIVE EVENT & CAPACITY COUNTDOWN */}
          <RealTimeCountdown variant="hero" />

          <a href="#tickets" className="bg-gradient-rave text-white px-10 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-[0_0_25px_rgba(236,72,153,0.5)]">
            Get Tickets Now
          </a>
        </div>
      </section>

      {/* About Section */}
      <section className="w-full max-w-5xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-8">The Experience</h2>
        <p className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-3xl mx-auto">
          {event.description}
        </p>
      </section>

      {/* REAL-TIME TICKETS ALLOCATION & PASSES SECTION */}
      <RealTimeTicketsSection eventId={event.id} ticketTypes={event.ticketTypes} />

      {/* Footer */}
      <footer className="w-full border-t border-white/10 bg-black pt-16 pb-8 px-6 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
          <div>
            <h3 className="text-2xl font-black tracking-widest text-gradient mb-4">ISLAND RAVE</h3>
            <p className="text-gray-500 max-w-sm">
              The premier tropical event experience in Ghana.
            </p>
          </div>
          
          <div className="flex gap-12">
            <div>
              <h4 className="font-bold mb-4">Event</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Tickets</a></li>
                <li><a href="#" className="hover:text-white">Location</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Connect</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href={event.instagram || "#"} className="hover:text-white">Instagram</a></li>
                <li><a href={event.twitter || "#"} className="hover:text-white">Twitter</a></li>
                <li><a href={`mailto:${event.contactEmail || ""}`} className="hover:text-white">Contact</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-white/10 text-center text-gray-600 text-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} Island Rave. All rights reserved.</p>
          <div className="flex gap-4 items-center text-xs">
            <Link href="/login" className="text-gray-400 hover:text-white transition-colors">
              Find My Tickets
            </Link>
            <a href="#" className="text-gray-500 hover:text-white transition-colors">Terms</a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors">Privacy</a>
            <span className="text-gray-700">•</span>
            <Link href="/staff" className="text-gray-700 hover:text-gray-400 transition-colors flex items-center gap-1">
              <span>🔒 Staff Portal</span>
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
