/**
 * HQ Client Card Component
 * 
 * Displays a single client in card format
 * Used in grid views
 */

'use client';

import React from 'react';
import Link from 'next/link';
import {
    Hotel,
    ExternalLink,
    Users,
    ShoppingCart,
    Settings2,
    MoreVertical,
    Calendar,
    Database,
    Shield
} from 'lucide-react';
import { ClientPlan, ClientStatus } from '@prisma/client';

interface ClientCardProps {
    client: {
        id: string;
        name: string;
        slug: string;
        domain: string | null;
        plan: ClientPlan | string;
        status: ClientStatus | string;
        createdAt: Date;
        _count: {
            users: number;
            orders: number;
        };
        subscription?: {
            nextBillingDate: Date;
            monthlyPrice: number;
            isTrialActive: boolean;
        };
    };
}

const PLAN_COLORS: Record<string, string> = {
    STARTER: 'bg-slate-100 text-slate-600',
    GROWTH: 'bg-emerald-100 text-emerald-700',
    ELITE: 'bg-indigo-100 text-indigo-700',
};

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    TRIAL: 'bg-amber-50 text-amber-600 border-amber-100',
    SUSPENDED: 'bg-red-50 text-red-600 border-red-100',
    ARCHIVED: 'bg-slate-50 text-slate-500 border-slate-200',
    PROVISIONING: 'bg-blue-50 text-blue-600 border-blue-100 animate-pulse',
    PROVISIONING_FAILED: 'bg-red-50 text-red-700 border-red-200',
};

export default function HQClientCard({ client }: ClientCardProps) {
    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-50">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                            <Hotel className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                                {client.name}
                                {client.domain && (
                                    <ExternalLink className="w-3 h-3 text-slate-300" />
                                )}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-mono">
                                {client.slug}.hotelpro.com
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${PLAN_COLORS[client.plan] || 'bg-slate-100'}`}>
                            {client.plan}
                        </span>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border ${STATUS_COLORS[client.status] || 'bg-slate-50'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${client.status === 'ACTIVE' ? 'bg-emerald-500' :
                            client.status === 'TRIAL' ? 'bg-amber-500' :
                                client.status === 'SUSPENDED' ? 'bg-red-500' : 'bg-slate-400'
                            }`} />
                        {client.status}
                    </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-semibold">{client._count.users} users</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                        <ShoppingCart className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-semibold">{client._count.orders} orders</span>
                    </div>
                </div>

                {/* Subscription Info */}
                {client.subscription && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg">
                        <Calendar className="w-3 h-3 text-slate-300" />
                        {client.subscription.isTrialActive ? (
                            <span>Trial ends: <b className="text-slate-600">{formatDate(client.subscription.nextBillingDate)}</b></span>
                        ) : (
                            <span>Next Billing: <b className="text-slate-600 font-bold">{formatDate(client.subscription.nextBillingDate)}</b></span>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50/20 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                    ID: {client.id.slice(0, 8)}...
                </span>
                <Link
                    href={`/hq/clients/${client.id}`}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider"
                >
                    <Settings2 className="w-3 h-3" />
                    Manage Client
                </Link>
            </div>
        </div>
    );
}
