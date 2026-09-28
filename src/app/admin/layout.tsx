'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import RealTimeCountdown from '@/components/RealTimeCountdown';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [time, setTime] = useState('');

  // Skip layout shell on login page
  const isLoginPage = pathname === '/admin/login';

  const [currentUser, setCurrentUser] = useState<{ email: string; firstName: string; lastName: string; role: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(isLoginPage);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    async function fetchMe() {
      if (isLoginPage) return;
      try {
        const res = await fetch('/api/admin/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            // Customer role blocked
            if (data.user.role === 'CUSTOMER') {
              router.replace('/dashboard');
              return;
            }
            // Gate staff restricted to scanner & orders
            if (data.user.role === 'CHECK_IN_STAFF' && pathname !== '/admin/checkin' && pathname !== '/admin/orders') {
              router.replace('/admin/checkin');
              return;
            }
            // Finance restricted to overview & orders
            if (data.user.role === 'FINANCE' && (pathname === '/admin/checkin' || pathname === '/admin/tickets')) {
              router.replace('/admin');
              return;
            }
            setCurrentUser(data.user);
            setAuthChecked(true);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not fetch user profile:', err);
      }
      router.replace('/staff/login?redirect=' + encodeURIComponent(pathname));
    }
    fetchMe();

    return () => clearInterval(interval);
  }, [isLoginPage, pathname, router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      router.push('/staff/login');
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white select-none">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-2 border-rave-orange border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400 font-mono tracking-wider">Verifying Staff Authorization...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    {
      name: 'Overview',
      shortName: 'Overview',
      href: '/admin',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      name: 'Orders & Guests',
      shortName: 'Orders',
      href: '/admin/orders',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      name: 'Gate Check-In',
      shortName: 'Scanner',
      href: '/admin/checkin',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
    },
    {
      name: 'Ticket Tiers',
      shortName: 'Tiers',
      href: '/admin/tickets',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
    },
  ];

  // Role-Based UI Gating:
  // - CHECK_IN_STAFF: Gate Scanner & Guest Orders list
  // - FINANCE: Revenue Overview & Financial Orders list
  // - EVENT_MANAGER & SUPER_ADMIN: Full management suite
  const role = currentUser?.role;
  const visibleNavItems = navItems.filter((item) => {
    if (role === 'CHECK_IN_STAFF') {
      return item.href === '/admin/checkin' || item.href === '/admin/orders';
    }
    if (role === 'FINANCE') {
      return item.href === '/admin' || item.href === '/admin/orders';
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-[#090909] border-r border-white/10 shrink-0 select-none">
        {/* Brand */}
        <div className="p-6 border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-widest text-gradient">ISLAND RAVE</span>
          </Link>
          <div className="mt-1 text-[11px] font-mono text-gray-500 uppercase tracking-wider">
            Management Portal
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5 flex-grow">
          {visibleNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-gradient-rave text-white shadow-lg shadow-rave-orange/20 font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 mb-3">
            <div className="overflow-hidden pr-2">
              <p className="text-xs font-bold text-white truncate">
                {currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : 'System Admin'}
              </p>
              <span className="text-[10px] bg-rave-orange/20 text-rave-orange font-mono font-bold px-1.5 py-0.5 rounded uppercase inline-block mt-0.5">
                {currentUser?.role || 'SUPER_ADMIN'}
              </span>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          </div>

          <button
            onClick={handleLogout}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Platform Switcher & Staff Header */}
        <header className="border-b border-white/10 bg-[#090909]/90 backdrop-blur-md sticky top-0 z-30 select-none">
          {/* Top Switcher Bar */}
          <div className="border-b border-white/5 bg-black/60 px-4 sm:px-6 py-1.5 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-rave-orange font-bold tracking-wide uppercase text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-rave-orange animate-pulse" />
                Staff & Administration Portal
              </span>
              <span className="text-gray-600 hidden sm:inline">•</span>
              <span className="text-gray-400 hidden sm:inline text-[11px] font-mono">
                {currentUser?.role || 'SUPER_ADMIN'} — {currentUser?.firstName || 'System'}
              </span>
            </div>

            <Link
              href="/"
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors text-[11px] font-semibold"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span>Switch to Customer Platform</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>

          {/* Sub Header Navbar */}
          <div className="h-16 px-4 sm:px-6 flex items-center justify-between">
            {/* Mobile Brand / Toggle */}
            <div className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"
                aria-label="Toggle menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <span className="text-lg font-black tracking-wider text-gradient">ISLAND RAVE</span>
            </div>

            <div className="hidden lg:flex items-center gap-4">
              <RealTimeCountdown variant="compact" />
              <div className="flex items-center gap-2 text-xs text-gray-400 font-mono pl-3 border-l border-white/10">
                <span className="w-2 h-2 rounded-full bg-rave-orange" />
                <span>LA PLAGE ACCRA</span>
                <span className="text-gray-600">•</span>
                <span>GMT {time}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/admin/checkin"
                className="bg-rave-orange/15 hover:bg-rave-orange/25 text-rave-orange border border-rave-orange/30 text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-rave-orange animate-ping" />
                <span>Gate Scanner</span>
              </Link>
              <button
                onClick={handleLogout}
                className="lg:hidden text-xs text-red-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-red-500/10"
              >
                Exit
              </button>
            </div>
          </div>

          {/* Staff Portal Tabs Bar (Desktop Top Tabs) */}
          <div className="hidden lg:block px-4 sm:px-6 pb-3 pt-1 border-t border-white/5 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/10 w-max sm:w-auto">
              {visibleNavItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      active
                        ? 'bg-gradient-rave text-white shadow-lg shadow-rave-orange/20 font-bold'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#090909] border-b border-white/10 p-4 space-y-2">
            <div className="pb-2 border-b border-white/10 flex justify-center">
              <RealTimeCountdown variant="compact" />
            </div>
            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider px-3 py-1">
              Staff Portals
            </div>
            {visibleNavItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold ${
                    active ? 'bg-gradient-rave text-white' : 'text-gray-400 hover:bg-white/5'
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <div className="pt-2 border-t border-white/10 mt-2">
              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/10 rounded-xl"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Page Content with Mobile Bottom Padding */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 pb-24 lg:pb-8 overflow-y-auto">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (Fixed at the bottom of the mobile screen) */}
        <nav 
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-2xl border-t border-white/10 px-3 py-2 select-none shadow-[0_-12px_35px_rgba(0,0,0,0.95)]"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
        >
          <div 
            className="grid gap-1 max-w-md mx-auto"
            style={{ gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))` }}
          >
            {visibleNavItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 active:scale-95 ${
                    active
                      ? 'text-white bg-white/10 shadow-sm border border-white/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className={`transition-transform duration-200 ${active ? 'scale-115 text-rave-orange' : 'text-gray-400'}`}>
                    {item.icon}
                  </div>
                  <span className={`text-[10px] tracking-tight mt-1 font-bold truncate max-w-full ${active ? 'text-white font-extrabold' : 'text-gray-400'}`}>
                    {item.shortName || item.name}
                  </span>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rave-orange mt-0.5 shadow-[0_0_8px_rgba(249,115,22,1)]" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
