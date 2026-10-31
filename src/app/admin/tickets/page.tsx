'use client';

import { useState, useEffect } from 'react';

interface TierItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  totalQuantity: number;
  soldQuantity: number;
  maxPerCustomer: number;
  isEarlyBird: boolean;
  status: 'ACTIVE' | 'SOLD_OUT' | 'INACTIVE';
  autoEscalate?: boolean;
  escalatesToName?: string;
  escalatesToPrice?: number;
}

export default function AdminTicketsPage() {
  const [tiers, setTiers] = useState<TierItem[]>([
    {
      id: 'tier-1',
      name: 'General Admission',
      description: 'Standard access to main stage, food court, and beach areas.',
      price: 250.00,
      currency: 'GHS',
      totalQuantity: 300,
      soldQuantity: 0,
      maxPerCustomer: 5,
      isEarlyBird: false,
      status: 'ACTIVE',
      autoEscalate: true,
      escalatesToName: 'Phase 2 General Admission',
      escalatesToPrice: 200.00,
    },
    {
      id: 'tier-2',
      name: 'VIP Tropical Pass',
      description: 'Express lane entrance, dedicated bar lounge, VIP restrooms, and elevated viewing platform.',
      price: 400.00,
      currency: 'GHS',
      totalQuantity: 150,
      soldQuantity: 0,
      maxPerCustomer: 4,
      isEarlyBird: false,
      status: 'ACTIVE',
    },
    {
      id: 'tier-3',
      name: 'Cabana Lounge Table Package',
      description: 'Exclusive private beach cabana for up to 8 guests with bottle service and dedicated host.',
      price: 1500.00,
      currency: 'GHS',
      totalQuantity: 20,
      soldQuantity: 0,
      maxPerCustomer: 2,
      isEarlyBird: false,
      status: 'ACTIVE',
    },
  ]);

  const [editingTier, setEditingTier] = useState<TierItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    async function loadTiers() {
      try {
        const res = await fetch('/api/admin/tickets');
        if (res.ok) {
          const data = await res.json();
          if (data.tiers && data.tiers.length > 0) {
            setTiers(data.tiers);
          }
        }
      } catch (err) {
        console.warn('Could not load tiers from API:', err);
      }
    }
    loadTiers();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;
    setSaving(true);

    const isNew = !tiers.some(t => t.id === editingTier.id);
    const updatedTiers = isNew
      ? [...tiers, editingTier]
      : tiers.map(t => t.id === editingTier.id ? editingTier : t);

    setTiers(updatedTiers);
    setNotification(isNew ? `Tier "${editingTier.name}" created!` : `Tier "${editingTier.name}" updated!`);
    setTimeout(() => setNotification(null), 3000);

    try {
      await fetch('/api/admin/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTier),
      });
    } catch (err) {
      console.warn('API save skipped:', err);
    } finally {
      setSaving(false);
      setEditingTier(null);
    }
  };

  const handleDelete = async (tierId: string, tierName: string) => {
    if (!confirm(`Are you sure you want to delete tier "${tierName}"?`)) return;
    setTiers(tiers.filter(t => t.id !== tierId));
    setNotification(`Tier "${tierName}" removed.`);
    setTimeout(() => setNotification(null), 3000);

    try {
      await fetch(`/api/admin/tickets?id=${tierId}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('API delete skipped:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-8 z-50 bg-green-500 text-black font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-rave-orange block mb-1">
            Ticketing Configuration
          </span>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">
            Ticket Tiers & Pricing
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Configure ticket categories, prices, allocations, and early-bird deadlines.
          </p>
        </div>

        <button
          onClick={() => setEditingTier({
            id: 'tier-' + Date.now(),
            name: '',
            description: '',
            price: 250,
            currency: 'GHS',
            totalQuantity: 100,
            soldQuantity: 0,
            maxPerCustomer: 5,
            isEarlyBird: false,
            status: 'ACTIVE',
          })}
          className="self-start sm:self-auto bg-gradient-rave text-white font-bold text-xs px-5 py-3 rounded-xl shadow-lg shadow-rave-orange/20 hover:scale-105 transition-all flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create New Tier</span>
        </button>
      </div>

      {/* Tier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const remaining = Math.max(0, tier.totalQuantity - tier.soldQuantity);
          const percent = tier.totalQuantity > 0 ? Math.min(100, Math.round((tier.soldQuantity / tier.totalQuantity) * 100)) : 0;

          return (
            <div
              key={tier.id}
              className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col justify-between hover:border-rave-orange/40 transition-all group relative overflow-hidden"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                    tier.status === 'ACTIVE'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {tier.status}
                  </span>
                  {tier.isEarlyBird && (
                    <span className="bg-rave-orange/20 text-rave-orange text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      Early Bird
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                <p className="text-xs text-gray-400 mb-6 leading-relaxed min-h-[48px]">
                  {tier.description || 'Access to event features and stages.'}
                </p>

                <div className="text-3xl font-black text-gradient mb-6">
                  {tier.currency} {tier.price.toFixed(2)}
                </div>

                <div className="space-y-2 mb-6 text-xs text-gray-300">
                  <div className="flex justify-between">
                    <span>Sold / Allocated:</span>
                    <span className="font-bold text-white">{tier.soldQuantity} / {tier.totalQuantity}</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-rave-orange h-full rounded-full" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="flex justify-between text-gray-500 text-[11px]">
                    <span>{remaining} remaining</span>
                    <span>Max {tier.maxPerCustomer} per buyer</span>
                  </div>

                  {tier.autoEscalate && (
                    <div className="mt-2.5 p-2 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center gap-1.5 text-[10px] text-orange-300">
                      <span>🔥</span>
                      <span>Auto-escalates to <strong>{tier.escalatesToName || 'Next Tier'}</strong> ({tier.currency} {tier.escalatesToPrice?.toFixed(2) || '200.00'}) on sell-out</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex gap-2">
                <button
                  onClick={() => setEditingTier(tier)}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl text-xs font-bold transition-colors"
                >
                  Edit Tier
                </button>
                <button
                  onClick={() => handleDelete(tier.id, tier.name)}
                  title="Delete Tier"
                  className="p-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Create Tier Modal */}
      {editingTier && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full p-8 rounded-3xl border border-white/20 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-black text-white mb-6">
              {tiers.some(t => t.id === editingTier.id) ? 'Edit Ticket Tier' : 'Create Ticket Tier'}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-semibold text-gray-400 mb-1">Tier Name</label>
                <input
                  type="text"
                  required
                  value={editingTier.name}
                  onChange={e => setEditingTier({ ...editingTier, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rave-orange focus:ring-1 focus:ring-rave-orange"
                  placeholder="e.g. VIP Tropical Pass"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-semibold text-gray-400 mb-1">Price (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editingTier.price}
                    onChange={e => setEditingTier({ ...editingTier, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rave-orange focus:ring-1 focus:ring-rave-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-semibold text-gray-400 mb-1">Total Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingTier.totalQuantity}
                    onChange={e => setEditingTier({ ...editingTier, totalQuantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rave-orange focus:ring-1 focus:ring-rave-orange"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-semibold text-gray-400 mb-1">Status</label>
                  <select
                    value={editingTier.status}
                    onChange={e => setEditingTier({ ...editingTier, status: e.target.value as TierItem['status'] })}
                    className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rave-orange"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SOLD_OUT">SOLD_OUT</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase font-semibold text-gray-400 mb-1">Max Per Order</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={editingTier.maxPerCustomer}
                    onChange={e => setEditingTier({ ...editingTier, maxPerCustomer: parseInt(e.target.value) || 5 })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rave-orange"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-gray-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editingTier.description}
                  onChange={e => setEditingTier({ ...editingTier, description: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rave-orange"
                  placeholder="Tier perks, stage access, inclusions..."
                />
              </div>

              <div className="pt-2 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={editingTier.isEarlyBird}
                    onChange={e => setEditingTier({ ...editingTier, isEarlyBird: e.target.checked })}
                    className="w-4 h-4 rounded text-rave-orange focus:ring-rave-orange bg-black border-gray-600"
                  />
                  <span>Mark as Early-Bird Discount Tier</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={editingTier.autoEscalate || false}
                    onChange={e => setEditingTier({ ...editingTier, autoEscalate: e.target.checked })}
                    className="w-4 h-4 rounded text-rave-orange focus:ring-rave-orange bg-black border-gray-600"
                  />
                  <span>Enable Auto-Tier Price Escalation on Sell-Out</span>
                </label>

                {editingTier.autoEscalate && (
                  <div className="grid grid-cols-2 gap-3 pl-6 animate-in fade-in-50 duration-200">
                    <div>
                      <label className="block text-[11px] uppercase font-semibold text-gray-400 mb-1">Escalate To Tier</label>
                      <input
                        type="text"
                        value={editingTier.escalatesToName || ''}
                        onChange={e => setEditingTier({ ...editingTier, escalatesToName: e.target.value })}
                        placeholder="e.g. Phase 2 General"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-rave-orange"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase font-semibold text-gray-400 mb-1">New Price (GHS)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingTier.escalatesToPrice || 0}
                        onChange={e => setEditingTier({ ...editingTier, escalatesToPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-rave-orange"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving || !editingTier.name.trim()}
                  className="flex-1 bg-gradient-rave text-white py-3 rounded-xl font-bold text-xs hover:scale-[1.01] transition-transform shadow-[0_0_15px_rgba(249,115,22,0.3)] disabled:opacity-50"
                >
                  {saving ? 'Saving Tier...' : 'Save & Add Tier'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTier(null)}
                  className="px-6 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
