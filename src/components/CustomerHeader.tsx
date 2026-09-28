'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import RealTimeCountdown from '@/components/RealTimeCountdown';

interface CustomerHeaderProps {
  activeTab?: 'experience' | 'tickets' | 'wallet' | 'lookup' | 'checkout';
}

function CustomerHeaderContent({ activeTab }: CustomerHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Determine current active tab if not passed explicitly
  const tabParam = searchParams?.get('tab');
  const currentTab = activeTab || (
    pathname === '/dashboard'
      ? (tabParam === 'lookup' ? 'lookup' : 'wallet')
      : pathname.startsWith('/checkout')
      ? 'checkout'
      : 'experience'
  );

  const tabs = [
    {
      id: 'experience',
      label: 'Event Experience',
      shortLabel: 'Experience',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      href: '/',
    },
    {
      id: 'tickets',
      label: 'Buy Tickets',
      shortLabel: 'Tickets',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
      href: '/#tickets',
    },
    {
      id: 'wallet',
      label: 'My Passes (Wallet)',
      shortLabel: 'Passes',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
      href: '/dashboard',
    },
    {
      id: 'lookup',
      label: 'Order Lookup',
      shortLabel: 'Lookup',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      href: '/dashboard?tab=lookup',
    },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="w-full sticky top-0 z-40 bg-[#060606]/90 backdrop-blur-xl border-b border-white/10 select-none">
        {/* Top Platform Customer Bar */}
        <div className="border-b border-white/5 bg-black/70 px-4 sm:px-6 py-1.5 flex justify-between items-center text-xs gap-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-green-400 font-bold tracking-wide uppercase text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Customer Platform
            </span>
            <span className="text-gray-600 hidden md:inline">•</span>
            <span className="text-gray-400 hidden md:inline text-[11px]">Island Rave — La Plage Beach Club</span>
          </div>

          <div className="flex items-center gap-3">
            <RealTimeCountdown variant="compact" />
            <Link
              href="/dashboard?tab=lookup"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors text-[11px] font-semibold"
            >
              <span>🎟️ Find My Passes</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-rave-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Main Nav Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="text-xl sm:text-2xl font-black tracking-widest text-gradient">ISLAND RAVE</span>
            <span className="hidden md:inline-block text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rave-orange/15 text-rave-orange border border-rave-orange/30 font-bold">
              Live
            </span>
          </Link>

          {/* Customer Platform Tabs (Desktop Only) */}
          <nav className="hidden lg:flex items-center gap-1 p-1 bg-white/5 rounded-2xl border border-white/10">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-rave text-white shadow-lg shadow-rave-orange/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-3">
            <Link
              href="/#tickets"
              className="bg-gradient-rave text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md hover:scale-105 transition-transform"
            >
              Get Tickets
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile & Tablet Fixed Bottom Navigation Bar (Docked at the bottom of the screen) */}
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#070707]/95 backdrop-blur-2xl border-t border-white/10 px-3 py-2 select-none shadow-[0_-12px_35px_rgba(0,0,0,0.95)]"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
      >
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'text-white bg-white/10 shadow-sm border border-white/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className={`transition-transform duration-200 ${isActive ? 'scale-115 text-rave-orange' : 'text-gray-400'}`}>
                  {tab.icon}
                </div>
                <span className={`text-[10px] tracking-tight mt-1 font-bold truncate max-w-full ${isActive ? 'text-white font-extrabold' : 'text-gray-400'}`}>
                  {tab.shortLabel || tab.label}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rave-orange mt-0.5 shadow-[0_0_8px_rgba(249,115,22,1)]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export default function CustomerHeader(props: CustomerHeaderProps) {
  return (
    <Suspense fallback={
      <header className="w-full h-20 bg-[#060606]/90 border-b border-white/10" />
    }>
      <CustomerHeaderContent {...props} />
    </Suspense>
  );
}
