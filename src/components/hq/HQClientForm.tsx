
/**
 * HQ Client Form Component
 * 
 * Used for creating and editing client configurations.
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, X, Building2, Globe, CreditCard, LayoutTemplate, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { ClientPlan, ClientStatus } from '@prisma/client';

interface HQClientFormProps {
    mode: 'create' | 'edit';
    initialData?: {
        id?: string;
        name: string;
        slug: string;
        domain: string | null;
        plan: ClientPlan;
        billingCycle?: 'MONTHLY' | 'ANNUAL';
        status?: ClientStatus;
        adminUsername?: string;
        adminName?: string;
        adminPassword?: string;
    };
}

export default function HQClientForm({ mode, initialData }: HQClientFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showPassword, setShowPassword] = useState(false);
    const [showPin, setShowPin] = useState(false);

    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        slug: initialData?.slug || '',
        domain: initialData?.domain || '',
        plan: initialData?.plan || 'STARTER',
        billingCycle: initialData?.billingCycle || 'MONTHLY',
        status: initialData?.status || 'TRIAL',

        // Admin fields
        adminUsername: initialData?.adminUsername || '',
        adminName: initialData?.adminName || '',
        adminPassword: '',
        adminPin: mode === 'create' ? '1234' : ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const url = mode === 'create'
                ? '/api/hq/clients'
                : `/api/hq/clients/${initialData?.id}`;

            const method = mode === 'create' ? 'POST' : 'PATCH';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                router.push(mode === 'create' ? '/hq/clients' : `/hq/clients/${initialData?.id}`);
                router.refresh();
            } else {
                setError(result.error || 'Operation failed');
            }
        } catch (err) {
            console.error('Form error:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    {mode === 'create' ? 'Provision New Tenant' : 'Modify Configuration'}
                </h1>
                <p className="text-slate-500 font-medium mt-1">
                    {mode === 'create'
                        ? 'Deploy a new hotel instance to the unified mesh.'
                        : `Update settings for ${initialData?.name}`}
                </p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-3">
                    <X className="w-5 h-5 shrink-0" />
                    <p className="font-medium">{error}</p>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
                {/* Core Identity */}
                <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Core Identity
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Business Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-900 bg-white"
                                placeholder="e.g. The Grand Hotel"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Mesh Slug (Unique ID)</label>
                            <div className="flex items-center">
                                <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-3 py-2 text-slate-500 font-mono text-sm">
                                    https://
                                </span>
                                <input
                                    type="text"
                                    required
                                    disabled={mode === 'edit'} // Slugs are immutable
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                    className="w-full px-4 py-2 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-mono text-sm text-slate-900 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                                    placeholder="hotel-slug"
                                />
                                <span className="bg-slate-100 border border-l-0 border-slate-200 rounded-r-xl px-3 py-2 text-slate-500 font-mono text-sm">
                                    .hotelpro.com
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Custom Domain (Optional)</label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.domain}
                                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-900 bg-white"
                                    placeholder="app.grandhotel.com"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subscription & Billing */}
                <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Subscription & Billing
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Service Plan</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {['BILLING_ONLY', 'STARTER', 'GROWTH', 'ELITE'].map((plan) => (
                                    <button
                                        key={plan}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, plan: plan as ClientPlan })}
                                        className={`px-3 py-3 rounded-xl border-2 text-[9px] font-black tracking-wider transition-all ${formData.plan === plan
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                            : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
                                            }`}
                                    >
                                        {plan.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Billing Frequency</label>
                            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                                {['MONTHLY', 'ANNUAL'].map((cycle) => (
                                    <button
                                        key={cycle}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, billingCycle: cycle as any })}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${formData.billingCycle === cycle
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        {cycle}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {mode === 'edit' && (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Operational Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ClientStatus })}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-900 bg-white"
                                >
                                    <option value="ACTIVE">Active (Live)</option>
                                    <option value="TRIAL">Trial Period</option>
                                    <option value="SUSPENDED">Suspended (Billing)</option>
                                    <option value="ARCHIVED">Archived (ReadOnly)</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Admin Provisioning & Credentials */}
                <div className="md:col-span-2 space-y-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <LayoutTemplate className="w-4 h-4" />
                            {mode === 'create' ? 'Initial Administrator Provisioning' : 'Administrator Credentials & Security'}
                        </h2>
                        {mode === 'edit' && (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md">
                                Leave blank to keep existing credentials
                            </span>
                        )}
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Admin Full Name</label>
                            <input
                                type="text"
                                required={mode === 'create'}
                                value={formData.adminName}
                                onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-900 bg-white"
                                placeholder="Manager Name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Username</label>
                            <input
                                type="text"
                                required={mode === 'create'}
                                disabled={mode === 'edit'}
                                value={formData.adminUsername}
                                onChange={(e) => setFormData({ ...formData, adminUsername: e.target.value })}
                                className={`w-full px-4 py-2 rounded-xl border border-slate-200 outline-none font-medium text-slate-900 ${mode === 'edit' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'}`}
                                placeholder="admin_username"
                            />
                            {mode === 'edit' && (
                                <p className="text-[10px] text-slate-400 mt-1">Tenant username cannot be changed.</p>
                            )}
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-bold text-slate-700">
                                    {mode === 'create' ? 'Initial Password' : 'New Password'}
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold"
                                >
                                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required={mode === 'create'}
                                    value={formData.adminPassword}
                                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-mono text-slate-900 placeholder:text-slate-400 bg-white"
                                    placeholder={mode === 'create' ? '••••••••' : 'Leave blank to keep unchanged'}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-bold text-slate-700">
                                    {mode === 'create' ? 'Security PIN' : 'New Security PIN'}
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowPin(!showPin)}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold"
                                >
                                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    {showPin ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPin ? 'text' : 'password'}
                                    required={mode === 'create'}
                                    maxLength={6}
                                    value={formData.adminPin}
                                    onChange={(e) => setFormData({ ...formData, adminPin: e.target.value.replace(/\D/g, '') })}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-slate-900 placeholder:text-slate-400 bg-white font-mono tracking-widest"
                                    placeholder={mode === 'create' ? '1234' : 'Leave blank to keep unchanged'}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center gap-2 px-8 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-bold shadow-lg shadow-slate-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed uppercase text-[11px] tracking-widest"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {mode === 'create' ? 'Provision Tenant' : 'Save Configuration'}
                </button>
            </div>
        </form>
    );
}
