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
    UserPlus
} from 'lucide-react';
import { getClientById } from '@/lib/hq/client-actions';
import { PLAN_PRICING } from '@/lib/types/hq.types';
import HQClientActions from './HQClientActions';

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

    const statusConfig = {
        ACTIVE: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        TRIAL: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
        SUSPENDED: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' }
    };

    const StatusIcon = statusConfig[client.status].icon;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Back Button */}
            <Link
                href="/hq/clients"
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Clients
            </Link>

            {/* Header Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        {/* Hotel Identity */}
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
                                <Hotel className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">{client.name}</h1>
                                <p className="text-slate-500 font-mono text-sm">{client.slug}.hotelpro.com</p>
                                {client.domain && (
                                    <p className="text-blue-600 text-sm mt-1">{client.domain}</p>
                                )}
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${statusConfig[client.status].bg} ${statusConfig[client.status].border} border`}>
                            <StatusIcon className={`w-5 h-5 ${statusConfig[client.status].color}`} />
                            <span className={`font-bold ${statusConfig[client.status].color}`}>
                                {client.status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 border-t border-slate-100">
                    <div className="p-6 border-b md:border-b-0 md:border-r border-slate-100">
                        <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-slate-400" />
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{client._count.users}</p>
                                <p className="text-xs text-slate-500 uppercase font-medium">Staff Users</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 border-b md:border-b-0 md:border-r border-slate-100">
                        <div className="flex items-center gap-3">
                            <ShoppingCart className="w-5 h-5 text-slate-400" />
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{client._count.orders}</p>
                                <p className="text-xs text-slate-500 uppercase font-medium">Total Orders</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 md:border-r border-slate-100">
                        <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-slate-400" />
                            <div>
                                <p className="text-xl font-bold text-slate-800">{client.plan}</p>
                                <p className="text-xs text-slate-500">{formatCurrency(PLAN_PRICING[client.plan])}/mo</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-slate-400" />
                            <div>
                                <p className="text-sm font-bold text-slate-800">
                                    {client.subscription?.isTrialActive ? 'Trial Ends' : 'Next Billing'}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {client.subscription ? formatDate(client.subscription.nextBillingDate) : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Cards Grid */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Quick Actions Card */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-6">
                        <Settings2 className="w-4 h-4" />
                        Quick Actions
                    </h2>

                    <HQClientActions
                        clientId={client.id}
                        currentStatus={client.status}
                        currentPlan={client.plan}
                    />
                </div>

                {/* Admin Users Card */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Admin Users
                        </h2>
                        <button className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
                            <UserPlus className="w-3 h-3" />
                            Add Admin
                        </button>
                    </div>

                    <div className="space-y-3">
                        {(client as any).users?.length > 0 ? (
                            (client as any).users.map((user: any) => (
                                <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <div>
                                        <p className="font-medium text-slate-800">{user.name}</p>
                                        <p className="text-xs text-slate-500 font-mono">@{user.username}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-md font-medium ${user.isActive
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-red-100 text-red-700'
                                        }`}>
                                        {user.isActive ? 'Active' : 'Disabled'}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-400 text-sm">
                                No admin users found
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Metadata */}
            <div className="text-xs text-slate-400 text-center">
                Client ID: <span className="font-mono">{client.id}</span> •
                Created: {formatDate(client.createdAt)}
            </div>
        </div>
    );
}
