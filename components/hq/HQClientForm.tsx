/**
 * HQ Client Form Component
 * 
 * Used for creating and editing clients (hotels)
 * Clear naming: This is specifically for Super Admin HQ
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Hotel,
    User,
    Key,
    Globe,
    CreditCard,
    Loader2,
    ArrowLeft,
    Check,
    AlertCircle,
    Database,
    Shield,
    Zap,
    Server,
    Link as LinkIcon
} from 'lucide-react';
import { ClientPlan } from '@prisma/client';
import { PLAN_PRICING } from '@/lib/types/hq.types';

interface ClientFormProps {
    mode: 'create' | 'edit';
    initialData?: {
        id: string;
        name: string;
        slug: string;
        domain: string | null;
        plan: ClientPlan;
    };
}

const PLAN_OPTIONS: { value: ClientPlan; label: string; description: string }[] = [
    { value: 'BASIC', label: 'Starter', description: '30 tables, 300 menu items. Perfect for Cafes.' },
    { value: 'ADVANCE', label: 'Growth', description: '100 tables, Inventory, AI Menu Assistant.' },
    { value: 'PREMIUM', label: 'Enterprise', description: 'Unlimited tables, Full AI Analysis.' },
    { value: 'BUSINESS', label: 'Platform Elite', description: 'Multi-property, Full AI Automation & Ops.' },
];

export default function HQClientForm({ mode, initialData }: ClientFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        // Hotel Details
        name: initialData?.name || '',
        slug: initialData?.slug || '',
        domain: initialData?.domain || '',
        plan: initialData?.plan || 'BASIC' as ClientPlan,

        // Admin User (only for create mode)
        adminName: '',
        adminUsername: '',
        adminPassword: '',
        adminPasswordConfirm: ''
    });

    // Auto-generate slug from name
    useEffect(() => {
        if (mode === 'create' && !initialData) {
            const generatedSlug = formData.name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .substring(0, 30);
            setFormData(prev => ({ ...prev, slug: generatedSlug }));
        }
    }, [formData.name, mode, initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            // Validation
            if (!formData.name.trim()) {
                throw new Error('Hotel name is required');
            }
            if (!formData.slug.trim()) {
                throw new Error('Slug is required');
            }

            if (mode === 'create') {
                // Additional validation for create
                if (!formData.adminName.trim()) {
                    throw new Error('Admin name is required');
                }
                if (!formData.adminUsername.trim()) {
                    throw new Error('Admin username is required');
                }
                if (formData.adminPassword.length < 8) {
                    throw new Error('Password must be at least 8 characters');
                }
                if (formData.adminPassword !== formData.adminPasswordConfirm) {
                    throw new Error('Passwords do not match');
                }

                // Create new client
                const response = await fetch('/api/hq/clients', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: formData.name,
                        slug: formData.slug,
                        domain: formData.domain || undefined,
                        plan: formData.plan,
                        adminName: formData.adminName,
                        adminUsername: formData.adminUsername,
                        adminPassword: formData.adminPassword
                    })
                });

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || 'Failed to create client');
                }

                setSuccess(true);
                setTimeout(() => {
                    router.push('/hq/clients');
                    router.refresh();
                }, 1500);

            } else {
                // Update existing client
                const response = await fetch(`/api/hq/clients/${initialData?.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: formData.name,
                        domain: formData.domain || undefined,
                        plan: formData.plan,
                    })
                });

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || 'Failed to update client');
                }

                setSuccess(true);
                setTimeout(() => {
                    router.push('/hq/clients');
                    router.refresh();
                }, 1500);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] mb-10 transition-all group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Registry Index
            </button>

            {/* Form Card */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
                {/* Header */}
                <div className="px-10 py-10 border-b border-slate-50 bg-slate-50/30">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-100 transition-transform hover:scale-105">
                            <Hotel className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                {mode === 'create' ? 'Node Provision' : 'Registry Update'}
                            </h1>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                                {mode === 'create'
                                    ? 'Deploying new hotel infrastructure'
                                    : 'Recalibrating hotel parameters'
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-10 space-y-12">
                    {/* Error/Success Messages */}
                    {error && (
                        <div className="p-5 bg-red-50 border border-red-100 rounded-3xl flex items-center gap-4 text-red-700 animate-in shake duration-500">
                            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-black uppercase tracking-wider">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-4 text-emerald-700 animate-in zoom-in-95 duration-500">
                            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                                <Check className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-black uppercase tracking-wider">
                                {mode === 'create' ? 'Node successfully provisioned!' : 'Registry records synchronized!'}
                            </p>
                        </div>
                    )}

                    {/* Section: Hotel Identity */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-slate-400">
                            <Shield className="w-4 h-4" />
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em]">Identity Core</h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    Hotel Designation
                                </label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="e.g. Royal Emperor Palace"
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all group-hover:bg-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    Network Slug
                                </label>
                                <div className="flex items-center group">
                                    <input
                                        type="text"
                                        name="slug"
                                        value={formData.slug}
                                        onChange={handleChange}
                                        placeholder="royal-emperor"
                                        disabled={mode === 'edit'}
                                        className="flex-1 px-5 py-4 bg-slate-50 border border-slate-100 rounded-l-2xl text-slate-900 font-bold placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all disabled:opacity-50 group-hover:bg-white disabled:hover:bg-slate-50"
                                    />
                                    <div className="px-5 py-4 bg-slate-100 border border-l-0 border-slate-100 rounded-r-2xl text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                        .hotelpro.co
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-full space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    Enterprise Domain (CNAME)
                                </label>
                                <div className="relative group">
                                    <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="text"
                                        name="domain"
                                        value={formData.domain}
                                        onChange={handleChange}
                                        placeholder="pos.yourhotel.com"
                                        className="w-full pl-13 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all group-hover:bg-white"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Section: Subscription Plan */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-slate-400">
                            <CreditCard className="w-4 h-4" />
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em]">Subscription Blueprint</h2>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {PLAN_OPTIONS.map((plan) => (
                                <label
                                    key={plan.value}
                                    className={`relative p-5 rounded-3xl border-2 cursor-pointer transition-all group overflow-hidden ${formData.plan === plan.value
                                        ? 'border-indigo-600 bg-white ring-8 ring-indigo-50 leading-none'
                                        : 'border-slate-100 hover:border-slate-200 bg-slate-50/30'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="plan"
                                        value={plan.value}
                                        checked={formData.plan === plan.value}
                                        onChange={handleChange}
                                        className="sr-only"
                                    />
                                    <div className="flex flex-col h-full justify-between">
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${formData.plan === plan.value ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                    {plan.label}
                                                </span>
                                            </div>
                                            <p className="text-[9px] text-slate-500 font-bold leading-tight mb-4">{plan.description}</p>
                                        </div>
                                        <p className={`text-lg font-black tracking-tight ${formData.plan === plan.value ? 'text-slate-900' : 'text-slate-400'}`}>
                                            ₹{PLAN_PRICING[plan.value].toLocaleString()}
                                            <span className="text-[9px] uppercase tracking-widest ml-1 text-slate-300">/mo</span>
                                        </p>
                                    </div>
                                    {formData.plan === plan.value && (
                                        <div className="absolute -right-1 -bottom-1 w-8 h-8 bg-indigo-600 flex items-center justify-center rounded-tl-xl text-white">
                                            <Check className="w-4 h-4" />
                                        </div>
                                    )}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Section: Admin User (Create mode only) */}
                    {mode === 'create' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 text-slate-400">
                                <User className="w-4 h-4" />
                                <h2 className="text-[10px] font-black uppercase tracking-[0.3em]">Administrative Root</h2>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6 bg-slate-50/50 p-8 rounded-4xl border border-slate-100">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        Legal Full Name
                                    </label>
                                    <input
                                        type="text"
                                        name="adminName"
                                        value={formData.adminName}
                                        onChange={handleChange}
                                        placeholder="Admin Full Name"
                                        className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-2xl text-slate-800 font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        Account Alias (Username)
                                    </label>
                                    <input
                                        type="text"
                                        name="adminUsername"
                                        value={formData.adminUsername}
                                        onChange={handleChange}
                                        placeholder="admin_alias"
                                        className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-2xl text-slate-800 font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        Security Phrase (Password)
                                    </label>
                                    <div className="relative">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                        <input
                                            type="password"
                                            name="adminPassword"
                                            value={formData.adminPassword}
                                            onChange={handleChange}
                                            placeholder="••••••••"
                                            className="w-full pl-11 pr-5 py-3.5 bg-white border border-slate-100 rounded-2xl text-slate-800 font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        Confirm Security Phrase
                                    </label>
                                    <input
                                        type="password"
                                        name="adminPasswordConfirm"
                                        value={formData.adminPasswordConfirm}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-2xl text-slate-800 font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-8">
                        <button
                            type="submit"
                            disabled={isSubmitting || success}
                            className={`w-full h-20 rounded-[1.75rem] font-black text-lg uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 text-white disabled:opacity-70 disabled:grayscale`}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    Synchronizing Hub...
                                </>
                            ) : success ? (
                                <>
                                    <Check className="w-6 h-6" />
                                    Node Registered
                                </>
                            ) : (
                                <>
                                    {mode === 'create' ? (
                                        <><Server className="w-6 h-6" /> Deploy Infrastructure</>
                                    ) : (
                                        <><LinkIcon className="w-6 h-6" /> Commit Updates</>
                                    )}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
