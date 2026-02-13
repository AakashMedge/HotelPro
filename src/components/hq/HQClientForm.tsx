
/**
 * HQ Client Form Component
 * 
 * Used for creating and editing client configurations.
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, X, Building2, Globe, CreditCard, LayoutTemplate } from 'lucide-react';
import { ClientPlan, ClientStatus } from '@prisma/client';

interface HQClientFormProps {
    mode: 'create' | 'edit';
    initialData?: {
        id?: string;
        name: string;
        slug: string;
        domain: string | null;
        plan: ClientPlan;
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

    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        slug: initialData?.slug || '',
        domain: initialData?.domain || '',
        plan: initialData?.plan || 'BASIC',
        status: initialData?.status || 'TRIAL',

        // Admin fields (create mode only)
        adminUsername: '',
        adminName: '',
        adminPassword: ''
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
                    <X className="w-5 h-5 flex-shrink-0" />
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
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
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
                                    className="w-full px-4 py-2 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-mono text-sm disabled:bg-slate-50 disabled:text-slate-500"
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
                                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
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
                            <div className="grid grid-cols-2 gap-3">
                                {['BASIC', 'ADVANCE', 'PREMIUM', 'BUSINESS'].map((plan) => (
                                    <button
                                        key={plan}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, plan: plan as ClientPlan })}
                                        className={`px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${formData.plan === plan
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                                : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
                                            }`}
                                    >
                                        {plan}
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
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium bg-white"
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

                {/* Admin Provisioning (Create Mode Only) */}
                {mode === 'create' && (
                    <div className="md:col-span-2 space-y-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <LayoutTemplate className="w-4 h-4" />
                            Initial Administrator Provisioning
                        </h2>

                        <div className="grid md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Admin Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.adminName}
                                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                                    placeholder="Manager Name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.adminUsername}
                                    onChange={(e) => setFormData({ ...formData, adminUsername: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                                    placeholder="admin_username"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Initial Password</label>
                                <input
                                    type="password"
                                    required
                                    value={formData.adminPassword}
                                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>
                )}
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
                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {mode === 'create' ? 'Provision Tenant' : 'Save Configuration'}
                </button>
            </div>
        </form>
    );
}
