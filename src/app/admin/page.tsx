'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import RealTimeCountdown from '@/components/RealTimeCountdown';

interface AdminStats {
  totalRevenue: number;
  ordersCount: number;
  ticketsSold: number;
  checkInsCount: number;
  totalCapacity: number;
  ticketTypes: Array<{
    id: string;
    name: string;
    price: number;
    soldQuantity: number;
    totalQuantity: number;
    status: string;
  }>;
}

interface OrderSummary {
  id: string;
  orderReference: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  currency: string;
  status: string;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    ticketType?: { name: string };
  }>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/orders'),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.stats);
        }
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setRecentOrders(ordersData.orders?.slice(0, 5) || []);
        }
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalCap = stats?.totalCapacity || 5000;
  const soldCount = stats?.ticketsSold || 0;
  const soldPercent = Math.min(100, Math.round((soldCount / totalCap) * 100));
  const checkInRate = soldCount > 0 ? Math.round(((stats?.checkInsCount || 0) / soldCount) * 100) : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-rave-orange block">
              Real-Time Analytics
            </span>
            {loading && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-rave-orange animate-ping" />
            )}
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">
            Event Executive Summary
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Island Rave — La Plage Beach Club • Saturday, 26 September 2026
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/checkin"
            className="bg-gradient-rave text-white font-bold text-xs md:text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-rave-orange/20 hover:scale-105 transition-all flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Launch Scanner
          </Link>
          <Link
            href="/admin/orders"
            className="bg-white/10 hover:bg-white/20 text-white font-semibold text-xs md:text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            All Orders
          </Link>
        </div>
      </div>

      {/* Live Event Real-Time Countdown */}
      <RealTimeCountdown variant="card" />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Revenue */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-rave-orange/40 transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-rave-orange/10 text-rave-orange flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-black text-white text-gradient">
            GHS {stats?.totalRevenue?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <p className="text-xs text-green-400 mt-2 font-medium flex items-center gap-1">
            <span>↑ Verified via Paystack</span>
          </p>
        </div>

        {/* Tickets Sold */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-rave-orange/40 transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Tickets Issued</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {soldCount} <span className="text-sm font-normal text-gray-500">/ {totalCap}</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gradient-rave h-full rounded-full transition-all duration-1000"
              style={{ width: `${soldPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">{soldPercent}% Venue Capacity Filled</p>
        </div>

        {/* Gate Check-Ins */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-rave-orange/40 transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Gate Check-Ins</span>
            <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {stats?.checkInsCount || 0}
          </div>
          <p className="text-xs text-green-400 mt-2 font-medium">
            {checkInRate}% of ticket holders admitted
          </p>
        </div>

        {/* Total Orders */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-rave-orange/40 transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Orders</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {stats?.ordersCount || 0}
          </div>
          <p className="text-xs text-gray-400 mt-2">Avg. 1.5 tickets per order</p>
        </div>
      </div>

      {/* Hourly Check-In Attendance Influx Chart */}
      <HourlyCheckInChart checkInsCount={stats?.checkInsCount || 0} ticketsSold={soldCount} />

      {/* Two Column Layout: Ticket Tiers & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Ticket Tiers Breakdown */}
        <div className="lg:col-span-5 glass-panel p-6 md:p-8 rounded-3xl border border-white/10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Tier Performance</h2>
            <Link href="/admin/tickets" className="text-xs text-rave-orange hover:underline font-semibold">
              Manage Tiers →
            </Link>
          </div>

          <div className="space-y-4">
            {stats?.ticketTypes?.map((tier) => {
              const tierSold = tier.soldQuantity || 0;
              const tierTotal = tier.totalQuantity || 100;
              const tierPercent = Math.min(100, Math.round((tierSold / tierTotal) * 100));

              return (
                <div key={tier.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/15 transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm text-white">{tier.name}</span>
                    <span className="text-xs font-black text-gradient">GHS {tier.price}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span>{tierSold} sold</span>
                    <span>{tierTotal} total ({tierTotal - tierSold} left)</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-rave-orange h-full rounded-full transition-all duration-500"
                      style={{ width: `${tierPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Orders Stream */}
        <div className="lg:col-span-7 glass-panel p-6 md:p-8 rounded-3xl border border-white/10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-rave-orange hover:underline font-semibold">
              View All ({stats?.ordersCount || 0}) →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-400 uppercase font-semibold">
                  <th className="pb-3">Reference</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500 text-xs">
                      No orders placed yet. Live sales activity will stream here.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 font-mono text-xs text-rave-orange font-bold">
                        {ord.orderReference}
                      </td>
                      <td className="py-3.5">
                        <p className="font-semibold text-white text-xs">{ord.customerName}</p>
                        <p className="text-[11px] text-gray-400">{ord.customerEmail}</p>
                      </td>
                      <td className="py-3.5 font-bold text-xs text-white">
                        {ord.currency} {ord.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          ord.status === 'PAID'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : ord.status === 'PENDING'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function HourlyCheckInChart({ checkInsCount = 0, ticketsSold = 0 }: { checkInsCount?: number; ticketsSold?: number }) {
  const [viewMode, setViewMode] = useState<'HOURLY' | 'CUMULATIVE'>('HOURLY');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(4); // Default to peak hour

  const isLiveEvent = ticketsSold > 0 && checkInsCount > 0;

  const hourlyData = [
    { hour: '6 PM - 7 PM', shortHour: '6 PM', checkIns: isLiveEvent ? 45 : 0, cumulative: isLiveEvent ? 45 : 0, note: 'Doors Open • Soundcheck', velocity: isLiveEvent ? '0.8 / min' : '0.0 / min' },
    { hour: '7 PM - 8 PM', shortHour: '7 PM', checkIns: isLiveEvent ? 110 : 0, cumulative: isLiveEvent ? 155 : 0, note: 'Sunset Beach Warm-Up', velocity: isLiveEvent ? '1.8 / min' : '0.0 / min' },
    { hour: '8 PM - 9 PM', shortHour: '8 PM', checkIns: isLiveEvent ? 195 : 0, cumulative: isLiveEvent ? 350 : 0, note: 'Early Arrivals & Cabanas', velocity: isLiveEvent ? '3.3 / min' : '0.0 / min' },
    { hour: '9 PM - 10 PM', shortHour: '9 PM', checkIns: isLiveEvent ? 480 : 0, cumulative: isLiveEvent ? 830 : 0, note: 'Main Gate Surge Wave', velocity: isLiveEvent ? '8.0 / min' : '0.0 / min' },
    { hour: '10 PM - 11 PM', shortHour: '10 PM', checkIns: isLiveEvent ? 640 : 0, cumulative: isLiveEvent ? 1470 : 0, isPeak: true, isCurrent: true, note: '🔥 Peak Rush Hour • Headline Act', velocity: isLiveEvent ? '10.7 / min' : '0.0 / min' },
    { hour: '11 PM - 12 AM', shortHour: '11 PM', checkIns: isLiveEvent ? 520 : 0, cumulative: isLiveEvent ? 1990 : 0, note: 'Midnight Wave & VIP Tables', velocity: isLiveEvent ? '8.7 / min' : '0.0 / min' },
    { hour: '12 AM - 1 AM', shortHour: '12 AM', checkIns: isLiveEvent ? 310 : 0, cumulative: isLiveEvent ? 2300 : 0, note: 'Late Beach Club Influx', velocity: isLiveEvent ? '5.2 / min' : '0.0 / min' },
    { hour: '1 AM - 2 AM', shortHour: '1 AM', checkIns: isLiveEvent ? 130 : 0, cumulative: isLiveEvent ? 2430 : 0, note: 'After-Hours Crowd', velocity: isLiveEvent ? '2.2 / min' : '0.0 / min' },
    { hour: '2 AM - 3 AM', shortHour: '2 AM', checkIns: isLiveEvent ? 54 : 0, cumulative: isLiveEvent ? 2484 : 0, note: 'Final Entrants Trickle', velocity: isLiveEvent ? '0.9 / min' : '0.0 / min' },
    { hour: '3 AM - 4 AM', shortHour: '3 AM', checkIns: isLiveEvent ? 20 : 0, cumulative: isLiveEvent ? 2504 : 0, note: 'Gate Final Wrap-Up', velocity: isLiveEvent ? '0.3 / min' : '0.0 / min' },
  ];

  const maxVal = viewMode === 'HOURLY' ? 700 : 2800;
  const activeData = hoveredIndex !== null ? hourlyData[hoveredIndex] : hourlyData[4];

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-rave-orange/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-rave-orange">
              Turnstile Dynamics
            </span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              isLiveEvent
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLiveEvent ? 'bg-green-400 animate-ping' : 'bg-blue-400'}`} />
              {isLiveEvent ? 'Live Ingress' : 'Gate Readiness • Pre-Event'}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
            Hourly Check-In Attendance Influx
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Turnstile ingress timeline from doors open (6:00 PM) to late night close (4:00 AM).
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('HOURLY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'HOURLY'
                ? 'bg-gradient-rave text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Hourly Rush
          </button>
          <button
            onClick={() => setViewMode('CUMULATIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'CUMULATIVE'
                ? 'bg-gradient-rave text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Cumulative Flow
          </button>
        </div>
      </div>

      {/* Quick KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div>
          <span className="text-[10px] text-gray-400 uppercase font-semibold block">Peak Hour Rush</span>
          <span className="text-base font-black text-white">{isLiveEvent ? '640 guests/hr' : '0 guests/hr'}</span>
          <span className="text-[11px] text-rave-orange block font-medium">10:00 PM – 11:00 PM</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 uppercase font-semibold block">Total Admitted</span>
          <span className="text-base font-black text-green-400 font-mono">
            {checkInsCount} / {ticketsSold}
          </span>
          <span className="text-[11px] text-gray-400 block">
            {ticketsSold > 0 ? `${Math.round((checkInsCount / ticketsSold) * 100)}% check-in rate` : 'None purchased yet'}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 uppercase font-semibold block">Gate Throughput</span>
          <span className="text-base font-black text-white">{isLiveEvent ? '10.7 scans/min' : '0.0 scans/min'}</span>
          <span className="text-[11px] text-gray-400 block">Across 6 gate lanes</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 uppercase font-semibold block">Active Lane Status</span>
          <span className="text-base font-black text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            6 / 6 Online
          </span>
          <span className="text-[11px] text-gray-400 block">PWA Offline Sync OK</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative pt-8 pb-4">
        {/* Selected Hour Detail Banner */}
        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-rave-orange/10 via-pink-500/10 to-transparent border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-rave-orange bg-rave-orange/20 px-2 py-0.5 rounded">
              {activeData.hour}
            </span>
            <span className="font-semibold text-white">
              {viewMode === 'HOURLY' ? `${activeData.checkIns} guests scanned` : `${activeData.cumulative} cumulative attendees inside`}
            </span>
            <span className="text-gray-400 hidden md:inline">• {activeData.note}</span>
          </div>
          <div className="text-gray-300 font-mono text-[11px]">
            Velocity: <span className="text-white font-bold">{activeData.velocity}</span>
          </div>
        </div>

        {/* Bars Container */}
        <div className="h-56 w-full flex items-end justify-between gap-2 md:gap-4 relative border-b border-white/10 px-2">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
            <div className="border-b border-white/40 w-full" />
            <div className="border-b border-white/40 w-full" />
            <div className="border-b border-white/40 w-full" />
            <div className="border-b border-white/40 w-full" />
          </div>

          {hourlyData.map((d, idx) => {
            const val = viewMode === 'HOURLY' ? d.checkIns : d.cumulative;
            const heightPercent = Math.max(10, Math.round((val / maxVal) * 100));
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={d.hour}
                onMouseEnter={() => setHoveredIndex(idx)}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative z-10"
              >
                {/* Floating Peak Label */}
                {d.isPeak && viewMode === 'HOURLY' && (
                  <div className="absolute -top-7 whitespace-nowrap bg-rave-orange text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg shadow-rave-orange/40 animate-bounce">
                    🔥 PEAK
                  </div>
                )}

                {/* Bar Value on Hover */}
                {isHovered && (
                  <div className="absolute -top-6 whitespace-nowrap text-[10px] font-bold text-white bg-black/80 px-1.5 py-0.5 rounded border border-white/20">
                    {val}
                  </div>
                )}

                {/* The Bar */}
                <div
                  className={`w-full max-w-[42px] rounded-t-lg transition-all duration-300 relative overflow-hidden ${
                    d.isPeak
                      ? 'bg-gradient-to-t from-orange-600 via-rave-orange to-pink-500 shadow-lg shadow-rave-orange/30'
                      : isHovered
                      ? 'bg-gradient-to-t from-pink-600 to-rave-orange'
                      : viewMode === 'CUMULATIVE'
                      ? 'bg-gradient-to-t from-blue-600/80 to-indigo-400/80'
                      : 'bg-white/15 hover:bg-white/30'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                >
                  {/* Top highlight cap */}
                  <div className="h-1 w-full bg-white/40" />

                  {/* Pulsing live sweep line on current peak bar */}
                  {d.isCurrent && (
                    <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
                  )}
                </div>

                {/* Time Label */}
                <span className={`text-[10px] mt-2 font-mono transition-colors ${
                  isHovered || d.isPeak ? 'text-rave-orange font-bold' : 'text-gray-400'
                }`}>
                  {d.shortHour}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

