/**
 * HQ - View/Edit Single Client Page
 * 
 * Super Admin page for managing a specific client
 * Path: /hq/clients/[clientId]
 */

import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Hotel,
    Users,
    ShoppingCart,
    Calendar,
    CreditCard,
    AlertTriangle,
    CheckCircle,
    Clock,
    Shield,
    Settings2,
    UserPlus,
    Database,
    Zap,
    Archive,
    Loader2,
    XCircle
} from 'lucide-react';
import { getClientById } from '@/lib/hq/client-actions';
import HQClientActions from './HQClientActions';
import HQConciergeTrigger from './HQConciergeTrigger';
import { Suspense } from 'react';

interface PageProps {
    params: Promise<{ clientId: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
    const { clientId } = await params;
    const client = await getClientById(clientId);

    if (!client) {
        notFound();
    }

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const statusConfig: Record<string, { icon: any, color: string, bg: string, border: string, label: string }> = {
        ACTIVE: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', label: 'Healthy & Active' },
        TRIAL: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', label: 'Trial Period' },
        SUSPENDED: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', label: 'Access Barred' },
        ARCHIVED: { icon: Archive, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', label: 'Archived (Vaulted)' },
        PROVISIONING: { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', label: 'Deploying Cache/DB' },
        PROVISIONING_FAILED: { icon: XCircle, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', label: 'Deploy Failed' }
    };

    const config = statusConfig[client.status] || statusConfig.TRIAL;
    const StatusIcon = config.icon;

    // Pricing mapping
    const PLAN_PRICING: Record<string, number> = {
        STARTER: 1999,
        GROWTH: 4999,
        ELITE: 19999
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Back Button */}
            <Link
                href="/hq/clients"
                className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 text-xs font-bold uppercase tracking-widest transition-all group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Infrastructure Registry
            </Link>

            {/* Header Card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 md:p-10">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        {/* Hotel Identity */}
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded-4xl flex items-center justify-center shadow-2xl transition-all bg-indigo-600 text-white shadow-indigo-200">
                                <Hotel className="w-10 h-10" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{client.name}</h1>
                                <div className="flex items-center gap-3 mt-1.5 font-mono text-xs">
                                    <span className="text-slate-400">{client.slug}.hotelpro.io</span>
                                    <span className="text-slate-200">•</span>
                                    <span className="text-slate-400">{client.ownerEmail || 'no-owner-email'}</span>
                                    {client.domain && (
                                        <>
                                            <span className="text-slate-200">•</span>
                                            <span className="text-indigo-600 font-bold">{client.domain}</span>
                                        </>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-4">
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700`}>
                                        UNIFIED MESH
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Status Badge & Chat Trigger */}
                        <div className="flex flex-col lg:items-end gap-3 w-full lg:w-auto">
                            <div className={`inline-flex items-center lg:items-end gap-2 p-6 rounded-3xl ${config.bg} ${config.border} border w-full lg:w-auto`}>
                                <div className="flex items-center gap-3">
                                    <StatusIcon className={`w-6 h-6 ${config.color} ${client.status === 'PROVISIONING' ? 'animate-spin' : ''}`} />
                                    <span className={`text-xl font-black uppercase tracking-tighter ${config.color}`}>
                                        {client.status}
                                    </span>
                                </div>
                                <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${config.color} opacity-70`}>{config.label}</p>
                            </div>

                            <Suspense>
                                <HQConciergeTrigger
                                    clientId={client.id}
                                    hotelName={client.name}
                                />
                            </Suspense>
                        </div>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 border-t border-slate-100 bg-slate-50/30">
                    <div className="p-8 border-b md:border-b-0 md:border-r border-slate-100 group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors shadow-xs">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900 leading-none">{client._count.users}</p>
                                <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">Staff Density</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-8 border-b md:border-b-0 md:border-r border-slate-100 group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-amber-600 transition-colors shadow-xs">
                                <ShoppingCart className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900 leading-none">{client._count.orders}</p>
                                <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">Order Volume</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-8 md:border-r border-slate-100 group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 transition-colors shadow-xs">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xl font-black text-slate-900 leading-none">{client.plan}</p>
                                <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">
                                    {formatCurrency(PLAN_PRICING[client.plan] || 0)} / MO
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="p-8 group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors shadow-xs">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-900">
                                    {client.subscription?.isTrialActive ? 'TRIAL END' : 'NEXT BILLING'}
                                </p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                    {client.subscription ? formatDate(client.subscription.nextBillingDate) : 'MANUAL'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Cards Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
                {/* Quick Actions Card */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 lg:col-span-2">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 mb-8">
                        <Settings2 className="w-4 h-4" />
                        Management Console
                    </h2>

                    <HQClientActions
                        clientId={client.id}
                        currentStatus={client.status as any}
                        currentPlan={client.plan as any}
                    />
                </div>

                {/* Infrastructure Architecture Card */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 mb-8">
                        <Database className="w-4 h-4" />
                        Infrastructure
                    </h2>

                    <div className="space-y-6">
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group overflow-hidden relative">
                            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                                <Zap className="w-12 h-12" />
                            </div>
                            <div className="relative">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Topology</p>
                                <p className="font-black text-slate-800 text-lg">Shared Mesh</p>
                                <p className="text-[10px] text-slate-500 mt-2 font-medium leading-relaxed">
                                    Logical isolation via high-performance mesh hashing and secure clientId multi-tenancy.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Admin Access Panel */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                            <Shield className="w-4 h-4" />
                            Access Hierarchy
                        </h2>
                        <button className="flex items-center gap-2 text-[10px] font-black text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-lg active:scale-95">
                            <UserPlus className="w-3.5 h-3.5" />
                            Provision Admin
                        </button>
                    </div>

                    <div className="space-y-4">
                        {(client as any).users?.length > 0 ? (
                            (client as any).users.map((user: any) => (
                                <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-white hover:shadow-md hover:border-slate-100 border border-transparent rounded-2xl transition-all font-mono text-xs">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm uppercase font-black">
                                            {user.name.slice(0, 1)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{user.name}</p>
                                            <p className="text-[9px] text-slate-400 italic">@{user.username}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${user.isActive
                                        ? 'bg-emerald-100 text-emerald-700 font-black'
                                        : 'bg-red-100 text-red-700 font-black'
                                        }`}>
                                        {user.isActive ? 'Active' : 'Locked'}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-6 text-slate-300 font-medium italic text-xs">
                                No active access hierarchies found.
                            </div>
                        )}
                    </div>
                </div>

                {/* Stripe Payment Ledger */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 lg:col-span-2">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 mb-8">
                        <CreditCard className="w-4 h-4" />
                        Platform Revenue Ledger (Stripe)
                    </h2>

                    <div className="overflow-x-auto">
                        {client.saaSPayments && client.saaSPayments.length > 0 ? (
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-widest">
                                        <th className="px-4 py-3 font-black">Reference</th>
                                        <th className="px-4 py-3 font-black">Plan</th>
                                        <th className="px-4 py-3 font-black">Amount</th>
                                        <th className="px-4 py-3 font-black">Date</th>
                                        <th className="px-4 py-3 font-black text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {client.saaSPayments.map((payment: any) => (
                                        <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-4">
                                                <p className="font-mono text-[9px] text-slate-400 truncate w-24 uppercase font-black" title={payment.stripeSessionId}>
                                                    SID: {payment.stripeSessionId.slice(-8)}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black">
                                                    {payment.plan}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 font-black text-slate-900">
                                                ₹{payment.amount.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-4 text-slate-500 font-medium">
                                                {formatDate(payment.paidAt)}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black border border-emerald-100">
                                                    SETTLED
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <p className="text-slate-400 text-sm font-medium italic">No Stripe transaction logs found for this node.</p>
                                <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-2">Sync healthy • Test Mode active</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Platform Metadata */}
            <div className="py-10 border-t border-slate-100">
                <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-6 text-[9px] text-slate-400 font-black uppercase tracking-[0.4em]">
                        <span>Node Index: {client.id}</span>
                        <span className="text-slate-200">/</span>
                        <span>Provisioned: {formatDate(client.createdAt)}</span>
                        <span className="text-slate-200">/</span>
                        <span>Pulse: Stable</span>
                    </div>
                    <p className="text-[8px] text-slate-300 uppercase font-bold tracking-[0.5em]">HotelPro Central Command • v2.0.4</p>
                </div>
            </div>
        </div >
    );
}
