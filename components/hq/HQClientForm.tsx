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
    AlertCircle
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
    { value: 'BASIC', label: 'Basic', description: '10 tables, 50 menu items' },
    { value: 'ADVANCE', label: 'Advance', description: '40 tables, 150 items, Inventory' },
    { value: 'PREMIUM', label: 'Premium', description: '100 tables, AI Concierge, Analytics' },
    { value: 'BUSINESS', label: 'Business', description: 'Unlimited, Custom domain, API' },
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
                        plan: formData.plan
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
        <div className="max-w-2xl mx-auto">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Clients
            </button>

            {/* Form Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 bg-linear-to-r from-blue-50 to-indigo-50">
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                            <Hotel className="w-5 h-5 text-white" />
                        </div>
                        {mode === 'create' ? 'Onboard New Hotel' : 'Edit Hotel Details'}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 ml-13">
                        {mode === 'create'
                            ? 'Register a new hotel on the HotelPro platform'
                            : 'Update hotel configuration and subscription'
                        }
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {/* Error/Success Messages */}
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-700">
                            <Check className="w-5 h-5 shrink-0" />
                            <p className="text-sm font-medium">
                                {mode === 'create' ? 'Hotel created successfully!' : 'Hotel updated successfully!'}
                            </p>
                        </div>
                    )}

                    {/* Section: Hotel Identity */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Hotel className="w-4 h-4" />
                            Hotel Identity
                        </h2>

                        <div className="grid gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Hotel Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Taj Palace Mumbai"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Unique Slug *
                                </label>
                                <div className="flex items-center">
                                    <input
                                        type="text"
                                        name="slug"
                                        value={formData.slug}
                                        onChange={handleChange}
                                        placeholder="taj-palace"
                                        disabled={mode === 'edit'}
                                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-l-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-slate-100 disabled:text-slate-500"
                                    />
                                    <span className="px-4 py-3 bg-slate-100 border border-l-0 border-slate-200 rounded-r-xl text-slate-500 text-sm font-mono">
                                        .hotelpro.com
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1.5">
                                    Only lowercase letters, numbers, and hyphens
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Custom Domain (Optional)
                                </label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        name="domain"
                                        value={formData.domain}
                                        onChange={handleChange}
                                        placeholder="pos.tajhotels.com"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Subscription Plan */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Subscription Plan
                        </h2>

                        <div className="grid grid-cols-2 gap-3">
                            {PLAN_OPTIONS.map((plan) => (
                                <label
                                    key={plan.value}
                                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.plan === plan.value
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
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
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`font-bold ${formData.plan === plan.value ? 'text-blue-700' : 'text-slate-700'
                                            }`}>
                                            {plan.label}
                                        </span>
                                        {formData.plan === plan.value && (
                                            <Check className="w-4 h-4 text-blue-600" />
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500">{plan.description}</p>
                                    <p className="text-sm font-bold text-slate-800 mt-2">
                                        ₹{PLAN_PRICING[plan.value].toLocaleString()}/mo
                                    </p>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Section: Admin User (Create mode only) */}
                    {mode === 'create' && (
                        <div className="space-y-4">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Primary Admin Account
                            </h2>
                            <p className="text-xs text-slate-500 -mt-2">
                                This will be the hotel owner&apos;s login credentials
                            </p>

                            <div className="grid gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Admin Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="adminName"
                                            value={formData.adminName}
                                            onChange={handleChange}
                                            placeholder="John Doe"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Username *
                                        </label>
                                        <input
                                            type="text"
                                            name="adminUsername"
                                            value={formData.adminUsername}
                                            onChange={handleChange}
                                            placeholder="john.taj"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            <Key className="w-3 h-3 inline mr-1" />
                                            Password *
                                        </label>
                                        <input
                                            type="password"
                                            name="adminPassword"
                                            value={formData.adminPassword}
                                            onChange={handleChange}
                                            placeholder="Min 8 characters"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Confirm Password *
                                        </label>
                                        <input
                                            type="password"
                                            name="adminPasswordConfirm"
                                            value={formData.adminPasswordConfirm}
                                            onChange={handleChange}
                                            placeholder="Repeat password"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-4 border-t border-slate-100">
                        <button
                            type="submit"
                            disabled={isSubmitting || success}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-200 active:scale-[0.98]"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {mode === 'create' ? 'Creating Hotel...' : 'Updating...'}
                                </>
                            ) : success ? (
                                <>
                                    <Check className="w-5 h-5" />
                                    Success!
                                </>
                            ) : (
                                <>
                                    {mode === 'create' ? 'Create Hotel & Admin Account' : 'Update Hotel'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
