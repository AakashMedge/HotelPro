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
    Calendar
} from 'lucide-react';
import { ClientPlan, ClientStatus } from '@prisma/client';

interface ClientCardProps {
    client: {
        id: string;
        name: string;
        slug: string;
        domain: string | null;
        plan: ClientPlan;
        status: ClientStatus;
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

const PLAN_COLORS: Record<ClientPlan, string> = {
    BASIC: 'bg-slate-100 text-slate-600',
    ADVANCE: 'bg-blue-100 text-blue-700',
    PREMIUM: 'bg-indigo-100 text-indigo-700',
    BUSINESS: 'bg-emerald-100 text-emerald-700',
};

const STATUS_COLORS: Record<ClientStatus, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    TRIAL: 'bg-amber-50 text-amber-600 border-amber-100',
    SUSPENDED: 'bg-red-50 text-red-600 border-red-100',
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
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                {client.name}
                                {client.domain && (
                                    <ExternalLink className="w-3 h-3 text-slate-300" />
                                )}
                            </h3>
                            <p className="text-xs text-slate-400 font-mono">
                                {client.slug}.hotelpro.com
                            </p>
                        </div>
                    </div>
                    <Link
                        href={`/hq/clients/${client.id}`}
                        className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
                {/* Plan & Status */}
                <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${PLAN_COLORS[client.plan]}`}>
                        {client.plan}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${STATUS_COLORS[client.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${client.status === 'ACTIVE' ? 'bg-emerald-500' :
                            client.status === 'TRIAL' ? 'bg-amber-500' : 'bg-red-500'
                            }`} />
                        {client.status}
                    </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Users className="w-4 h-4" />
                        <span className="text-sm font-medium">{client._count.users} users</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                        <ShoppingCart className="w-4 h-4" />
                        <span className="text-sm font-medium">{client._count.orders} orders</span>
                    </div>
                </div>

                {/* Subscription Info */}
                {client.subscription && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {client.subscription.isTrialActive ? (
                            <span>Trial ends: {formatDate(client.subscription.nextBillingDate)}</span>
                        ) : (
                            <span>Renews: {formatDate(client.subscription.nextBillingDate)}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                    Created {formatDate(client.createdAt)}
                </span>
                <Link
                    href={`/hq/clients/${client.id}`}
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                    <Settings2 className="w-3 h-3" />
                    Manage
                </Link>
            </div>
        </div>
    );
}
