'use client';

import React, { useEffect, useState } from 'react';
import {
    CreditCard,
    Edit3,
    Plus,
    Settings2,
    Check,
    Loader2,
    RefreshCw,
    Trash2,
    X,
    Save
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface PlanData {
    id: string;
    name: string;
    code: string;
    price: number;
    features: Record<string, boolean>;
    limits: Record<string, number>;
    isActive: boolean;
    activeSubscriptions: number;
    createdAt: string;
    updatedAt: string;
}

// Feature display labels
const FEATURE_LABELS: Record<string, string> = {
    qr_menu: 'QR Menu Access',
    basic_analytics: 'Basic Analytics',
    ai_assistant: 'AI Menu Assistant',
    inventory: 'Inventory Tracking',
    ai_analysis: 'AI Performance Analysis',
    custom_branding: 'Custom Branding',
    isolated_database: 'Isolated Database',
    multi_property: 'Multi-property Sync',
    ai_automation: 'AI Automation & Ops',
    dedicated_support: 'Dedicated Support',
};

// ============================================
// Component
// ============================================

export default function SubscriptionsPage() {
    const [plans, setPlans] = useState<PlanData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingPlan, setEditingPlan] = useState<PlanData | null>(null);
    const [saving, setSaving] = useState(false);

    // ─── Fetch Plans ───
    const fetchPlans = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/hq/plans');
            if (!res.ok) throw new Error('Failed to fetch plans');
            const data = await res.json();
            setPlans(data.plans || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPlans(); }, []);

    // ─── Save Plan Edit ───
    const handleSave = async () => {
        if (!editingPlan) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/hq/plans/${editingPlan.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editingPlan.name,
                    price: editingPlan.price,
                    features: editingPlan.features,
                    limits: editingPlan.limits,
                }),
            });
            if (!res.ok) throw new Error('Failed to save');
            setEditingPlan(null);
            fetchPlans();
        } catch (err: any) {
            alert('Save failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // ─── Create Plan ───
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPlan, setNewPlan] = useState<Partial<PlanData>>({
        name: '',
        code: 'STARTER',
        price: 0,
        features: Object.keys(FEATURE_LABELS).reduce((acc, key) => ({ ...acc, [key]: false }), {}),
        limits: { tables: 10, menuItems: 100 }
    });

    const handleCreate = async () => {
        if (!newPlan.name || !newPlan.code) return alert("Please fill in name and code");
        setSaving(true);
        try {
            const res = await fetch('/api/hq/plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPlan),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create');
            }
            setShowCreateModal(false);
            setNewPlan({
                name: '',
                code: 'STARTER',
                price: 0,
                features: Object.keys(FEATURE_LABELS).reduce((acc, key) => ({ ...acc, [key]: false }), {}),
                limits: { tables: 10, menuItems: 100 }
            });
            fetchPlans();
        } catch (err: any) {
            alert('Create failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // ─── Delete Plan ───
    const handleDelete = async (planId: string, planName: string) => {
        if (!confirm(`Deactivate plan "${planName}"? Active subscriptions will be preserved.`)) return;
        try {
            const res = await fetch(`/api/hq/plans/${planId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            fetchPlans();
        } catch (err: any) {
            alert('Delete failed: ' + err.message);
        }
    };

    // ─── Computed Metrics ───
    const totalSubscriptions = plans.reduce((sum, p) => sum + p.activeSubscriptions, 0);
    const totalRevenue = plans.reduce((sum, p) => sum + (p.price * p.activeSubscriptions), 0);
    const avgPlanValue = totalSubscriptions > 0 ? totalRevenue / totalSubscriptions : 0;

    // ─── Render ───
    return (
        <div className="max-w-7xl mx-auto space-y-10 py-6 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Subscription Plans</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage platform tiers, pricing, and feature availability.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchPlans}
                        className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all flex items-center gap-2">
                        <Settings2 className="w-4 h-4" />
                        Global Limits
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create New Plan
                    </button>
                </div>
            </div>

            {/* Quick Metrics Section — now computed from real data */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Monthly Revenue', value: `₹${totalRevenue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`, trend: 'Live' },
                    { label: 'Active Subscriptions', value: String(totalSubscriptions), trend: 'Real-time' },
                    { label: 'Average Plan Value', value: `₹${Math.round(avgPlanValue).toLocaleString()}`, trend: 'Computed' },
                    { label: 'Active Plans', value: String(plans.filter(p => p.isActive).length), trend: `${plans.length} total` }
                ].map((m, i) => (
                    <div key={i} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</p>
                        <div className="flex items-end justify-between mt-2">
                            <span className="text-2xl font-bold text-slate-950">{m.value}</span>
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{m.trend}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Loading / Error States */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <span className="ml-3 text-slate-500 font-medium">Loading plans from database...</span>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                    <p className="text-red-600 font-semibold">{error}</p>
                    <button onClick={fetchPlans} className="mt-2 text-red-500 text-sm underline">Try again</button>
                </div>
            )}

            {/* Plans List — from DB */}
            {!loading && !error && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`bg-white border rounded-2xl overflow-hidden flex flex-col group hover:shadow-lg hover:shadow-indigo-500/5 transition-all ${plan.isActive
                                ? 'border-slate-200 hover:border-indigo-200'
                                : 'border-red-200 opacity-60'
                                }`}
                        >
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                        {plan.code}
                                    </div>
                                    <span className="text-slate-400 text-[10px] font-bold uppercase">
                                        {plan.activeSubscriptions} Active
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                                    <div className="flex items-baseline gap-1 mt-1">
                                        <span className="text-2xl font-black text-slate-900">
                                            ₹{plan.price.toLocaleString()}
                                        </span>
                                        <span className="text-slate-400 text-[10px] font-bold uppercase">/ month</span>
                                    </div>
                                </div>

                                <div className="pt-4 space-y-3">
                                    <div className="flex items-center justify-between text-xs py-2 border-b border-slate-50 italic text-slate-500">
                                        <span>Tables</span>
                                        <span className="font-bold text-slate-700">
                                            {(plan.limits?.tables ?? 0) === 0 ? 'Unlimited' : plan.limits.tables}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs py-2 border-b border-slate-50 italic text-slate-500">
                                        <span>Menu Items</span>
                                        <span className="font-bold text-slate-700">
                                            {(plan.limits?.menuItems ?? 0) === 0 ? 'Unlimited' : plan.limits.menuItems}
                                        </span>
                                    </div>
                                </div>

                                <ul className="space-y-2 pt-2">
                                    {Object.entries(plan.features || {})
                                        .filter(([, enabled]) => enabled)
                                        .map(([key]) => (
                                            <li key={key} className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                                                <Check className="w-3 h-3 text-emerald-500" />
                                                {FEATURE_LABELS[key] || key}
                                            </li>
                                        ))}
                                </ul>

                                {!plan.isActive && (
                                    <div className="bg-red-50 text-red-600 text-[10px] font-bold uppercase text-center py-1.5 rounded-lg">
                                        Deactivated
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2 mt-auto">
                                <button
                                    onClick={() => setEditingPlan({ ...plan })}
                                    className="flex-1 bg-white border border-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(plan.id, plan.name)}
                                    className="w-10 h-10 bg-white border border-slate-200 text-slate-400 py-2 rounded-xl flex items-center justify-center hover:text-red-600 hover:border-red-100 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {editingPlan && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900">Edit Plan: {editingPlan.code}</h2>
                            <button onClick={() => setEditingPlan(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Plan Name</label>
                                <input
                                    type="text"
                                    value={editingPlan.name}
                                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            {/* Price */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Price (₹/month)</label>
                                <input
                                    type="number"
                                    value={editingPlan.price}
                                    onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            {/* Limits */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Table Limit</label>
                                    <input
                                        type="number"
                                        value={editingPlan.limits?.tables ?? 0}
                                        onChange={(e) => setEditingPlan({
                                            ...editingPlan,
                                            limits: { ...editingPlan.limits, tables: parseInt(e.target.value) || 0 }
                                        })}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">0 = Unlimited</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Menu Item Limit</label>
                                    <input
                                        type="number"
                                        value={editingPlan.limits?.menuItems ?? 0}
                                        onChange={(e) => setEditingPlan({
                                            ...editingPlan,
                                            limits: { ...editingPlan.limits, menuItems: parseInt(e.target.value) || 0 }
                                        })}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">0 = Unlimited</p>
                                </div>
                            </div>
                            {/* Features */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Feature Toggles</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                                        <label key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                                            <span className="text-xs font-medium text-slate-700">{label}</span>
                                            <input
                                                type="checkbox"
                                                checked={editingPlan.features?.[key] ?? false}
                                                onChange={(e) => setEditingPlan({
                                                    ...editingPlan,
                                                    features: { ...editingPlan.features, [key]: e.target.checked }
                                                })}
                                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-6 border-t border-slate-100">
                            <button
                                onClick={() => setEditingPlan(null)}
                                className="flex-1 bg-white border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900">Define New Plan</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Plan Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Starter Pro"
                                        value={newPlan.name}
                                        onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">System Code</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. CUSTOM_LITE"
                                        value={newPlan.code}
                                        onChange={(e) => setNewPlan({ ...newPlan, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Monthly Price (₹)</label>
                                <input
                                    type="number"
                                    value={newPlan.price}
                                    onChange={(e) => setNewPlan({ ...newPlan, price: parseFloat(e.target.value) || 0 })}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Table Limit</label>
                                    <input
                                        type="number"
                                        value={newPlan.limits?.tables ?? 0}
                                        onChange={(e) => setNewPlan({
                                            ...newPlan,
                                            limits: { ...newPlan.limits, tables: parseInt(e.target.value) || 0 }
                                        })}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Menu Limit</label>
                                    <input
                                        type="number"
                                        value={newPlan.limits?.menuItems ?? 0}
                                        onChange={(e) => setNewPlan({
                                            ...newPlan,
                                            limits: { ...newPlan.limits, menuItems: parseInt(e.target.value) || 0 }
                                        })}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Entitlements</label>
                                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2">
                                    {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                                        <label key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                                            <span className="text-xs font-medium text-slate-700">{label}</span>
                                            <input
                                                type="checkbox"
                                                checked={!!newPlan.features?.[key]}
                                                onChange={(e) => setNewPlan({
                                                    ...newPlan,
                                                    features: { ...newPlan.features, [key]: e.target.checked }
                                                })}
                                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-6 border-t border-slate-100">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 bg-white border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={saving}
                                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                {saving ? 'Creating...' : 'Launch Plan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer / Info */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                        <CreditCard className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-900">Billing Logic & Feature Gating</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Plan changes propagate to tenant databases via the entitlement sync engine. Feature gates are enforced server-side.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-wider">Audit Logs</button>
                    <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                    <button className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-wider">Sync Status</button>
                </div>
            </div>
        </div>
    );
}
