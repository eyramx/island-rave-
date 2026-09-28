'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export default function RealTimeCountdown({ variant = 'hero' }: { variant?: 'hero' | 'compact' | 'card' | 'staff-gate' }) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  // Target: Saturday/Sunday 8:00 PM GMT
  const calculateTimeRemaining = (): CountdownTime => {
    const now = new Date();
    
    // Create today's 8:00 PM GMT target
    const target = new Date();
    target.setUTCHours(20, 0, 0, 0); // 8:00 PM GMT

    // If target has passed today, set to tomorrow 8:00 PM GMT
    if (target.getTime() <= now.getTime()) {
      target.setUTCDate(target.getUTCDate() + 1);
    }

    const diff = Math.max(0, target.getTime() - now.getTime());

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return { days, hours, minutes, seconds, totalMs: diff };
  };

  const [timeLeft, setTimeLeft] = useState<CountdownTime>(calculateTimeRemaining());
  const [activeViewers, setActiveViewers] = useState(38);

  useEffect(() => {
    // 1-second interval for real-time countdown
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeRemaining());
    }, 1000);

    // Natural viewer count pulse
    const viewerTimer = setInterval(() => {
      setActiveViewers((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
        return Math.min(52, Math.max(29, prev + delta));
      });
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(viewerTimer);
    };
  }, []);

  const padZero = (n: number) => n.toString().padStart(2, '0');

  // Compact Variant (e.g. Header Ticker)
  if (variant === 'compact') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-rave-orange/40 text-xs text-white font-mono shadow-[0_0_15px_rgba(249,115,22,0.25)] select-none">
        <span className="flex items-center gap-1.5 text-rave-orange font-bold uppercase tracking-wider text-[10px]">
          <span className="w-2 h-2 rounded-full bg-rave-orange animate-ping" />
          <span>8PM Live Countdown</span>
        </span>
        <span className="text-gray-500">|</span>
        <span suppressHydrationWarning className="font-black text-white tracking-widest text-[11px]">
          {mounted ? `${padZero(timeLeft.hours)}h : ${padZero(timeLeft.minutes)}m : ${padZero(timeLeft.seconds)}s` : '15h : 18m : 26s'}
        </span>
      </div>
    );
  }

  // Staff Gate Terminal Variant
  if (variant === 'staff-gate') {
    return (
      <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-rave-orange/30 bg-gradient-to-r from-orange-950/20 via-black to-purple-950/20 text-white relative overflow-hidden select-none shadow-[0_4px_25px_rgba(249,115,22,0.15)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rave-orange animate-ping shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-black uppercase tracking-widest text-rave-orange">
                  Gate Ingress Countdown
                </span>
                <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                  Target: 8:00 PM GMT
                </span>
              </div>
              <p className="text-xs text-gray-300 font-medium mt-0.5">
                All lanes operational • VIP, Cabana & General Admission check-in active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 font-mono self-start sm:self-auto">
            <div className="bg-black/80 px-2.5 py-1.5 rounded-xl border border-white/15 text-center min-w-[46px]">
              <span suppressHydrationWarning className="block text-lg font-black text-white">
                {mounted ? padZero(timeLeft.hours) : '15'}
              </span>
              <span className="text-[8px] text-gray-400 uppercase font-bold">Hours</span>
            </div>
            <span className="text-rave-orange font-bold text-base animate-pulse">:</span>
            <div className="bg-black/80 px-2.5 py-1.5 rounded-xl border border-white/15 text-center min-w-[46px]">
              <span suppressHydrationWarning className="block text-lg font-black text-white">
                {mounted ? padZero(timeLeft.minutes) : '18'}
              </span>
              <span className="text-[8px] text-gray-400 uppercase font-bold">Mins</span>
            </div>
            <span className="text-rave-orange font-bold text-base animate-pulse">:</span>
            <div className="bg-black/80 px-2.5 py-1.5 rounded-xl border border-rave-orange/40 text-center min-w-[46px] shadow-[0_0_12px_rgba(249,115,22,0.3)]">
              <span suppressHydrationWarning className="block text-lg font-black text-rave-orange">
                {mounted ? padZero(timeLeft.seconds) : '26'}
              </span>
              <span className="text-[8px] text-rave-orange font-bold uppercase">Secs</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Card Variant (e.g. Dashboard / Checkout / Admin Overview)
  if (variant === 'card') {
    return (
      <div className="glass-panel p-5 rounded-2xl border border-rave-orange/30 bg-gradient-to-r from-orange-500/10 via-pink-500/5 to-purple-500/10 text-white relative overflow-hidden select-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs uppercase tracking-widest font-black text-rave-orange">
                Live Event Countdown
              </span>
            </div>
            <h4 className="text-lg font-black text-white mt-0.5">Doors Open at 8:00 PM GMT</h4>
            <p className="text-xs text-gray-400 mt-0.5">Gate opening and wristband check-in starts 2 hours prior at 6:00 PM</p>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <div className="bg-black/60 px-3 py-2 rounded-xl border border-white/10 text-center min-w-[50px]">
              <span suppressHydrationWarning className="block text-xl font-black text-white">
                {mounted ? padZero(timeLeft.hours) : '15'}
              </span>
              <span className="text-[9px] text-gray-400 uppercase">Hours</span>
            </div>
            <span className="text-rave-orange font-bold text-lg animate-pulse">:</span>
            <div className="bg-black/60 px-3 py-2 rounded-xl border border-white/10 text-center min-w-[50px]">
              <span suppressHydrationWarning className="block text-xl font-black text-white">
                {mounted ? padZero(timeLeft.minutes) : '18'}
              </span>
              <span className="text-[9px] text-gray-400 uppercase">Mins</span>
            </div>
            <span className="text-rave-orange font-bold text-lg animate-pulse">:</span>
            <div className="bg-black/60 px-3 py-2 rounded-xl border border-rave-orange/40 text-center min-w-[50px] shadow-[0_0_12px_rgba(249,115,22,0.3)]">
              <span suppressHydrationWarning className="block text-xl font-black text-rave-orange">
                {mounted ? padZero(timeLeft.seconds) : '26'}
              </span>
              <span className="text-[9px] text-rave-orange font-bold uppercase">Secs</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Hero Main Showcase Variant
  return (
    <div className="w-full max-w-4xl mx-auto my-8 select-none">
      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/15 bg-black/60 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
        {/* Glow ambient effects */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-rave-orange/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-rave-pink/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="text-xs uppercase tracking-[0.25em] font-black text-white">
              Real-Time Event Countdown
            </span>
            <span className="hidden sm:inline-block text-gray-600">•</span>
            <span className="text-rave-orange text-xs font-semibold">Doors Open 8:00 PM GMT Sharp</span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
              <span>👀</span>
              <span><strong className="text-white font-bold">{activeViewers}</strong> browsing passes right now</span>
            </span>
          </div>
        </div>

        {/* Real-time Clock Counters */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 my-6">
          {/* Days */}
          <div className="glass-panel p-3 sm:p-5 rounded-2xl border border-white/10 bg-white/[0.02] text-center flex flex-col justify-center transition-transform hover:scale-[1.02]">
            <span suppressHydrationWarning className="text-2xl sm:text-4xl md:text-6xl font-black text-white tracking-tight font-mono">
              {mounted ? padZero(timeLeft.days) : '00'}
            </span>
            <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-semibold mt-1">
              Days
            </span>
          </div>

          {/* Hours */}
          <div className="glass-panel p-3 sm:p-5 rounded-2xl border border-white/10 bg-white/[0.02] text-center flex flex-col justify-center transition-transform hover:scale-[1.02]">
            <span suppressHydrationWarning className="text-2xl sm:text-4xl md:text-6xl font-black text-white tracking-tight font-mono">
              {mounted ? padZero(timeLeft.hours) : '15'}
            </span>
            <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-semibold mt-1">
              Hours
            </span>
          </div>

          {/* Minutes */}
          <div className="glass-panel p-3 sm:p-5 rounded-2xl border border-white/10 bg-white/[0.02] text-center flex flex-col justify-center transition-transform hover:scale-[1.02]">
            <span suppressHydrationWarning className="text-2xl sm:text-4xl md:text-6xl font-black text-white tracking-tight font-mono">
              {mounted ? padZero(timeLeft.minutes) : '18'}
            </span>
            <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-semibold mt-1">
              Minutes
            </span>
          </div>

          {/* Seconds */}
          <div className="glass-panel p-3 sm:p-5 rounded-2xl border border-rave-orange/40 bg-rave-orange/10 text-center flex flex-col justify-center shadow-[0_0_20px_rgba(249,115,22,0.2)] transition-transform hover:scale-[1.02]">
            <span suppressHydrationWarning className="text-2xl sm:text-4xl md:text-6xl font-black text-rave-orange tracking-tight font-mono animate-pulse">
              {mounted ? padZero(timeLeft.seconds) : '26'}
            </span>
            <span className="text-[10px] sm:text-xs text-rave-orange uppercase tracking-widest font-black mt-1">
              Seconds
            </span>
          </div>
        </div>

        {/* Live Venue Capacity & Scarcity Allocation Bar */}
        <div className="pt-4 border-t border-white/10 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-300 gap-1.5">
            <span className="flex items-center gap-1.5 font-bold text-white">
              <span>🌴 Venue Capacity:</span>
              <span className="text-rave-orange font-mono">4,310 / 5,000 Allocated</span>
              <span className="text-gray-500 font-normal">(86.2%)</span>
            </span>
            <span className="text-[11px] font-mono text-green-400 bg-green-500/10 px-2.5 py-0.5 rounded-full border border-green-500/20 self-start sm:self-auto font-semibold">
              ⚡ 690 Remaining Passes Across All Gates
            </span>
          </div>

          {/* Glowing Capacity Progress Bar */}
          <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden p-0.5">
            <div 
              className="bg-gradient-rave h-full rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(249,115,22,0.8)]"
              style={{ width: '86.2%' }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
            <span>Main Beach Stage • La Plage Club</span>
            <span suppressHydrationWarning className="text-rave-orange font-semibold">
              Early-Bird Phase Closes In: {mounted ? `${padZero(timeLeft.hours)}h : ${padZero(timeLeft.minutes)}m` : '15h : 18m'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
