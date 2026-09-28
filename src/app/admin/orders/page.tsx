'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  ticketType?: { name: string };
}

interface OrderRecord {
  id: string;
  orderReference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: number;
  currency: string;
  status: string;
  createdAt: string;
  isComplimentary?: boolean;
  category?: string;
  notes?: string;
  items: OrderItem[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  const [userRole, setUserRole] = useState<string | null>(null);

  // Complimentary Pass Modal State
  const [showCompModal, setShowCompModal] = useState(false);
  const [compSubmitting, setCompSubmitting] = useState(false);
  const [compSuccessOrder, setCompSuccessOrder] = useState<OrderRecord | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [compForm, setCompForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    category: 'Artist & Performer Entourage',
    ticketTypeName: 'VIP Pass',
    quantity: 1,
    notes: '',
    sendNotification: true,
  });

  useEffect(() => {
    async function loadRole() {
      try {
        const res = await fetch('/api/admin/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user?.role) setUserRole(data.user.role);
        }
      } catch {}
    }
    loadRole();
  }, []);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (statusFilter !== 'ALL') query.set('status', statusFilter);
        if (search.trim()) query.set('search', search.trim());

        const res = await fetch(`/api/admin/orders?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        setLoading(false);
      }
    }

    const debounce = setTimeout(fetchOrders, 300);
    return () => clearTimeout(debounce);
  }, [search, statusFilter]);

  const handleExportCSV = () => {
    if (!orders.length) return;
    const headers = ['Order Reference', 'Customer Name', 'Email', 'Phone', 'Total (GHS)', 'Status', 'Type', 'Date'];
    const rows = orders.map(o => [
      o.orderReference,
      `"${o.customerName}"`,
      o.customerEmail,
      o.customerPhone,
      o.totalAmount.toFixed(2),
      o.status,
      o.totalAmount === 0 || o.orderReference.startsWith('IR-COMP') ? 'COMPLIMENTARY' : 'PAID_TICKET',
      new Date(o.createdAt).toLocaleString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `island-rave-orders-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleIssueComplimentary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compForm.customerName.trim() || !compForm.customerEmail.trim()) {
      alert('Please fill in recipient name and email.');
      return;
    }

    setCompSubmitting(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(compForm),
      });

      const data = await res.json();
      if (res.ok && data.success && data.order) {
        setOrders(prev => [data.order, ...prev]);
        setCompSuccessOrder(data.order);
      } else {
        alert(data.error || 'Failed to issue complimentary pass.');
      }
    } catch (err) {
      console.error('Error issuing complimentary pass:', err);
      alert('Network error while issuing pass.');
    } finally {
      setCompSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-rave-orange block mb-1">
            Sales & Attendee Registry
          </span>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">
            Orders Management
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Search orders, review transaction details, and track attendee status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {(userRole === 'SUPER_ADMIN' || userRole === 'EVENT_MANAGER' || !userRole) && (
            <button
              onClick={() => {
                setCompSuccessOrder(null);
                setShowCompModal(true);
              }}
              className="bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 hover:opacity-95 text-white font-bold text-xs md:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              Issue Complimentary Pass
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border border-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 md:p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="w-full md:w-96 relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or order reference..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs md:text-sm focus:outline-none focus:border-rave-orange focus:ring-1 focus:ring-rave-orange transition-all"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-1.5 self-start md:self-auto">
          {['ALL', 'PAID', 'PENDING', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-gradient-rave text-white shadow-md'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.02] border-b border-white/10 text-xs text-gray-400 uppercase font-semibold">
              <tr>
                <th className="py-4 px-6">Reference</th>
                <th className="py-4 px-6">Customer / Guest</th>
                <th className="py-4 px-6">Phone</th>
                <th className="py-4 px-6">Tickets</th>
                <th className="py-4 px-6">Amount</th>
                <th className="py-4 px-6">Status & Type</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <div className="w-8 h-8 border-2 border-rave-orange border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  const isComp = ord.totalAmount === 0 || ord.orderReference.startsWith('IR-COMP') || ord.isComplimentary;
                  return (
                    <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-6 font-mono text-xs font-bold">
                        <span className={isComp ? 'text-amber-400' : 'text-rave-orange'}>
                          {ord.orderReference}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-bold text-white text-sm flex items-center gap-1.5">
                          {ord.customerName}
                          {isComp && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                              VIP COMP
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">{ord.customerEmail}</p>
                      </td>
                      <td className="py-4 px-6 text-xs text-gray-300 font-mono">
                        {ord.customerPhone}
                      </td>
                      <td className="py-4 px-6 text-xs text-gray-300">
                        {ord.items?.map(it => `${it.quantity}x ${it.ticketType?.name || 'Pass'}`).join(', ') || '1x Pass'}
                      </td>
                      <td className="py-4 px-6 font-black text-sm text-white">
                        {isComp ? (
                          <span className="text-green-400 font-mono">GHS 0.00</span>
                        ) : (
                          `${ord.currency} ${ord.totalAmount.toFixed(2)}`
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            ord.status === 'PAID'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : ord.status === 'PENDING'
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {ord.status}
                          </span>
                          {isComp && (
                            <span className="text-[9px] font-medium text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                              {ord.category || 'Complimentary'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="text-xs font-semibold text-rave-orange hover:text-white px-3 py-1.5 rounded-lg border border-rave-orange/30 hover:bg-rave-orange/20 transition-all"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complimentary Pass Modal */}
      {showCompModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel max-w-xl w-full p-6 md:p-8 rounded-3xl border border-amber-500/30 shadow-2xl shadow-amber-500/10 relative my-8 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCompModal(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"
            >
              ✕
            </button>

            {!compSuccessOrder ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🎁</span>
                  <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Official Pass Dispenser</span>
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                  Issue Complimentary Pass
                </h2>
                <p className="text-xs text-gray-400 mt-1 mb-6">
                  Issue zero-cost official VIP & guest passes for performers, partners, sponsors, and media.
                </p>

                <form onSubmit={handleIssueComplimentary} className="space-y-4">
                  {/* Recipient Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Recipient Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Stonebwoy (Headline Artist)"
                      value={compForm.customerName}
                      onChange={(e) => setCompForm({ ...compForm, customerName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  {/* Email & Phone */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Recipient Email *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="artist@islandrave.com"
                        value={compForm.customerEmail}
                        onChange={(e) => setCompForm({ ...compForm, customerEmail: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Phone / WhatsApp
                      </label>
                      <input
                        type="text"
                        placeholder="+233 24 000 0000"
                        value={compForm.customerPhone}
                        onChange={(e) => setCompForm({ ...compForm, customerPhone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  {/* Pass Category & Tier */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Pass Category
                      </label>
                      <select
                        value={compForm.category}
                        onChange={(e) => setCompForm({ ...compForm, category: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400"
                      >
                        <option value="Artist & Performer Entourage">🎧 Artist & Entourage</option>
                        <option value="VIP Headline Sponsor">💎 VIP Headline Sponsor</option>
                        <option value="Media & Press Crew">📸 Media & Press Crew</option>
                        <option value="Partner & Influencer">🤝 Partner & Influencer</option>
                        <option value="Organizer Executive">⚡ Organizer Executive</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Ticket Tier
                      </label>
                      <select
                        value={compForm.ticketTypeName}
                        onChange={(e) => setCompForm({ ...compForm, ticketTypeName: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400"
                      >
                        <option value="VIP Pass">VIP Single Pass (GHS 0.00)</option>
                        <option value="Backstage All-Access">Backstage All-Access (GHS 0.00)</option>
                        <option value="Cabana Lounge Package (8 Guests)">Cabana Lounge Package (8 Guests)</option>
                        <option value="General Admission">General Admission (GHS 0.00)</option>
                      </select>
                    </div>
                  </div>

                  {/* Pass Quantity & Reason */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Quantity of Passes
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        value={compForm.quantity}
                        onChange={(e) => setCompForm({ ...compForm, quantity: parseInt(e.target.value, 10) || 1 })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Allocation Reason / Notes
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Festival headliner guest list"
                        value={compForm.notes}
                        onChange={(e) => setCompForm({ ...compForm, notes: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {/* Notification Toggle */}
                  <label className="flex items-center gap-2 pt-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={compForm.sendNotification}
                      onChange={(e) => setCompForm({ ...compForm, sendNotification: e.target.checked })}
                      className="accent-amber-400 rounded"
                    />
                    <span>Automatically email official digital pass link with dynamic QR to recipient</span>
                  </label>

                  {/* Submit Button */}
                  <div className="pt-4 flex gap-3">
                    <button
                      type="submit"
                      disabled={compSubmitting}
                      className="flex-1 bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 hover:opacity-90 disabled:opacity-50 text-white py-3 rounded-xl font-black text-sm tracking-wide transition-all shadow-lg shadow-orange-500/20"
                    >
                      {compSubmitting ? 'Generating Official Pass...' : '✨ Generate & Issue Pass'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCompModal(false)}
                      className="px-5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* Success Screen */
              <div className="text-center py-4 space-y-5 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 text-green-400 border border-green-500/40 flex items-center justify-center text-3xl">
                  ✓
                </div>
                <div>
                  <span className="text-xs uppercase font-bold text-green-400 tracking-wider">Success</span>
                  <h3 className="text-2xl font-black text-white mt-1">Official Pass Dispatched!</h3>
                  <p className="text-xs text-gray-300 mt-1">
                    Pass registered for <strong className="text-white">{compSuccessOrder.customerName}</strong> ({compSuccessOrder.category || 'Complimentary'}).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Order Reference:</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">{compSuccessOrder.orderReference}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Amount Charged:</span>
                    <span className="font-bold text-green-400 font-mono">GHS 0.00 (Zero Fee)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Allocated Passes:</span>
                    <span className="font-bold text-white">
                      {compSuccessOrder.items?.map(i => `${i.quantity}x ${i.ticketType?.name}`).join(', ') || '1x Pass'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(`${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard?ref=${compSuccessOrder.orderReference}`)}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2.5 px-4 rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      {copiedLink ? '✓ Copied Pass Link!' : '📋 Copy Digital Pass Link'}
                    </button>
                    <Link
                      href={`/dashboard?ref=${compSuccessOrder.orderReference}`}
                      target="_blank"
                      className="bg-rave-orange hover:bg-rave-orange/90 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Open Pass</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  </div>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Hey ${compSuccessOrder.customerName}! Here is your official complimentary Island Rave pass: ${
                        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
                      }/dashboard?ref=${compSuccessOrder.orderReference}\nPresent this QR code at the VIP gate for entry.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <span>💬 Share Pass via WhatsApp</span>
                  </a>

                  <button
                    onClick={() => {
                      setShowCompModal(false);
                      setCompSuccessOrder(null);
                    }}
                    className="w-full bg-white/5 hover:bg-white/10 text-gray-300 text-xs py-2 rounded-xl transition-colors mt-2"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full p-6 md:p-8 rounded-3xl border border-white/20 shadow-2xl relative animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10"
            >
              ✕
            </button>

            <span className="text-xs uppercase font-bold text-rave-orange block mb-2">Order Details</span>
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-2xl font-black text-white font-mono">
                {selectedOrder.orderReference}
              </h2>
              {(selectedOrder.totalAmount === 0 || selectedOrder.orderReference.startsWith('IR-COMP') || selectedOrder.isComplimentary) && (
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                  COMPLIMENTARY
                </span>
              )}
            </div>

            <div className="space-y-4 text-xs md:text-sm">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Customer Name:</span>
                  <span className="font-bold text-white">{selectedOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="font-bold text-white">{selectedOrder.customerEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Phone:</span>
                  <span className="font-bold text-white font-mono">{selectedOrder.customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment Status:</span>
                  <span className="font-bold text-green-400 uppercase">{selectedOrder.status}</span>
                </div>
                {selectedOrder.category && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Category:</span>
                    <span className="font-bold text-amber-300">{selectedOrder.category}</span>
                  </div>
                )}
                {selectedOrder.notes && (
                  <div className="flex justify-between pt-1 border-t border-white/5">
                    <span className="text-gray-400">Notes:</span>
                    <span className="text-gray-300 italic">{selectedOrder.notes}</span>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <span className="text-gray-400 block mb-2 font-semibold">Purchased Items:</span>
                {selectedOrder.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-white/5 last:border-none">
                    <span>{it.quantity}x {it.ticketType?.name || 'Admission'}</span>
                    <span className="font-bold text-white">
                      {selectedOrder.totalAmount === 0 ? 'FREE' : `${selectedOrder.currency} ${(it.quantity * it.unitPrice).toFixed(2)}`}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-3 font-bold text-base text-rave-orange">
                  <span>Total Amount:</span>
                  <span>
                    {selectedOrder.totalAmount === 0 ? 'GHS 0.00 (Comp)' : `${selectedOrder.currency} ${selectedOrder.totalAmount.toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href={`/dashboard?ref=${selectedOrder.orderReference}`}
                target="_blank"
                className="flex-1 bg-gradient-rave text-white text-center py-3 rounded-xl font-bold hover:scale-[1.01] transition-transform text-xs flex items-center justify-center gap-1.5"
              >
                <span>Open Digital Pass</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

