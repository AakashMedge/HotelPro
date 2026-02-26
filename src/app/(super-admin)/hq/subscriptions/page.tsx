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
    Save,
    Users
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

interface SubscriptionData {
    id: string;
    clientId: string;
    client: { name: string; slug: string; status: string; ownerEmail?: string };
    plan: { name: string; code: string; price: number };
    status: string;
    billingCycle: string;
    currentPeriodEnd: string;
    startDate?: string;
    updatedAt?: string;
    createdAt?: string;
}

interface PaymentData {
    id: string;
    amount: number;
    currency: string;
    plan: string;
    status: string;
    paidAt: string;
    stripeSessionId: string;
    stripePaymentIntentId?: string;
    client: { name: string; slug: string; ownerEmail?: string };
}

// Feature display labels
const FEATURE_LABELS: Record<string, string> = {
    qr_menu: 'QR Digital Menu',
    order_management: 'Order Management',
    basic_kot: 'Basic KOT System',
    basic_billing: 'Basic Billing',
    inventory: 'Inventory Management',
    ai_assistant: 'AI Menu Assistant',
    customer_flow: 'Customer Order Flow',
    standard_branding: 'Standard Branding',
    ai_automation: 'Full AI Automation',
    ai_analysis: 'AI Performance Analysis',
    multi_property: 'Multi-Property Sync',
    isolated_database: 'Isolated Data Node',
    custom_branding: 'Custom Branding',
    dedicated_support: 'Priority Support',
    basic_analytics: 'Basic Analytics',
};

// ============================================
// Component
// ============================================

export default function SubscriptionsPage() {
    const [plans, setPlans] = useState<PlanData[]>([]);
    const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
    const [payments, setPayments] = useState<PaymentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingPlan, setEditingPlan] = useState<PlanData | null>(null);
    const [saving, setSaving] = useState(false);

    // ─── Fetch All Data ───
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [plansRes, subsRes] = await Promise.all([
                fetch('/api/hq/plans'),
                fetch('/api/hq/subscriptions')
            ]);

            if (!plansRes.ok || !subsRes.ok) throw new Error('Failed to fetch platform data');

            const plansData = await plansRes.json();
            const subsData = await subsRes.json();

            setPlans(plansData.plans || []);
            setSubscriptions(subsData.subscriptions || []);
            setPayments(subsData.payments || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

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
            fetchData();
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
            fetchData();
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
            fetchData();
        } catch (err: any) {
            alert('Delete failed: ' + err.message);
        }
    };

    // ─── Computed Metrics ───
    const totalActiveSubscriptions = subscriptions.filter(s => s.status === 'ACTIVE').length;
    const totalPaymentsRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const mrr = subscriptions.filter(s => s.status === 'ACTIVE').reduce((sum, s) => sum + (s.plan?.price || 0), 0);

    // ─── Render ───
    return (
        <div className="max-w-7xl mx-auto space-y-10 py-6 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Revenue Console</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage platform tiers, pricing, and global subscription revenue.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Tier
                    </button>
                </div>
            </div>

            {/* Quick Metrics Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Estimated MRR', value: `₹${mrr.toLocaleString()}`, trend: 'Active Subs' },
                    { label: 'Total Net Revenue', value: `₹${totalPaymentsRevenue.toLocaleString()}`, trend: 'Stripe' },
                    { label: 'Active Subs', value: String(totalActiveSubscriptions), trend: 'Real-time' },
                    { label: 'Total Tiers', value: String(plans.length), trend: 'Configuration' }
                ].map((m, i) => (
                    <div key={i} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</p>
                        <div className="flex items-end justify-between mt-2">
                            <span className="text-2xl font-bold text-slate-950">{m.value}</span>
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{m.trend}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Loading / Error States */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <span className="ml-3 text-slate-500 font-medium">Loading platform data...</span>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                    <p className="text-red-600 font-semibold">{error}</p>
                    <button onClick={fetchData} className="mt-2 text-red-500 text-sm underline">Try again</button>
                </div>
            )}

            {/* Platform Revenue Stream — Stripe Sync */}
            {!loading && !error && (
                <div className="space-y-6">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                        <CreditCard className="w-4 h-4" />
                        Global Transaction Pulse
                    </h2>
                    <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                        {payments.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-widest">
                                            <th className="px-8 py-5 font-black">Property & Owner</th>
                                            <th className="px-8 py-5 font-black">Plan & Cycle</th>
                                            <th className="px-8 py-5 font-black">Amount (INR)</th>
                                            <th className="px-8 py-5 font-black">Stripe Reference</th>
                                            <th className="px-8 py-5 font-black text-right">Settled At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {payments.map((p) => (
                                            <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-8 py-5 border-none text-xs">
                                                    <div>
                                                        <p className="text-slate-900 font-bold">{p.client.name}</p>
                                                        <p className="text-[10px] text-slate-500">{p.client.ownerEmail || 'no-email@hotelpro.io'}</p>
                                                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">slug: {p.client.slug}</p>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 border-none">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="w-fit px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                                                            {p.plan}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">PREMIUM MONTHLY</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 border-none">
                                                    <p className="text-sm font-black text-slate-900">₹{p.amount.toLocaleString()}</p>
                                                </td>
                                                <td className="px-8 py-5 border-none">
                                                    <div className="flex flex-col gap-0.5">
                                                        <p className="text-[9px] font-mono text-slate-400 truncate w-32" title={p.stripeSessionId}>SID: {p.stripeSessionId.slice(0, 12)}...</p>
                                                        {p.stripePaymentIntentId && (
                                                            <p className="text-[9px] font-mono text-slate-400 truncate w-32" title={p.stripePaymentIntentId}>PID: {p.stripePaymentIntentId.slice(0, 12)}...</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right border-none">
                                                    <p className="text-slate-900 font-bold">
                                                        {new Date(p.paidAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 font-medium">
                                                        {new Date(p.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-20 text-center space-y-4">
                                <p className="text-slate-300 font-bold text-sm tracking-tight italic">Waiting for initial revenue streams...</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Sync healthy with Stripe Test Mode</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Live Subscriptions — Tenant Status */}
            {!loading && !error && (
                <div className="space-y-6 pt-10 border-t border-slate-50">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 mb-6">
                        <Users className="w-4 h-4" />
                        Live Subscription Fleet
                    </h2>
                    <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                        {subscriptions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-widest">
                                            <th className="px-8 py-5 font-black">Client & Owner</th>
                                            <th className="px-8 py-5 font-black">Plan Tier</th>
                                            <th className="px-8 py-5 font-black">Status</th>
                                            <th className="px-8 py-5 font-black">Billing Cycle</th>
                                            <th className="px-8 py-5 font-black">Period End</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {subscriptions.map((s) => (
                                            <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-8 py-5 border-none">
                                                    <div>
                                                        <p className="text-slate-900 font-bold">{s.client.name}</p>
                                                        <p className="text-[10px] text-slate-500 font-medium">{s.client.ownerEmail || 'no-email@hotelpro.io'}</p>
                                                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">slug: {s.client.slug}</p>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 border-none">
                                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-tighter">
                                                        {s.plan?.name || 'PRO'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 border-none">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${s.status === 'ACTIVE'
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                            : 'bg-amber-50 text-amber-600 border-amber-100'
                                                        }`}>
                                                        {s.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 border-none">
                                                    <p className="text-slate-500 font-black uppercase text-[10px] tracking-tight">{s.billingCycle}</p>
                                                </td>
                                                <td className="px-8 py-5 border-none">
                                                    <div className="flex flex-col">
                                                        <p className="text-slate-900 font-bold text-sm">
                                                            {new Date(s.currentPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 font-medium italic">Standard Renewal</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-16 text-center">
                                <p className="text-slate-400 text-sm font-medium italic">No active hotel clusters found in fleet.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Plans List — from DB */}
            {!loading && !error && (
                <div className="space-y-6 pt-10 border-t border-slate-50">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 mb-6">
                        <Settings2 className="w-4 h-4" />
                        Infrastructure Tiers
                    </h2>
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
