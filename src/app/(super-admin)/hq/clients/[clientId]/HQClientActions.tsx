/**
 * HQ Client Actions Component
 * 
 * Client-side component for action buttons on client detail page
 * Handles suspend, activate, plan changes etc.
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Play,
    Pause,
    ArrowUpCircle,
    RefreshCw,
    Loader2,
    Check,
    Trash2,
    Edit3
} from 'lucide-react';
import { ClientPlan, ClientStatus } from '@prisma/client';
import { PLAN_PRICING } from '@/lib/types/hq.types';

interface HQClientActionsProps {
    clientId: string;
    currentStatus: ClientStatus;
    currentPlan: ClientPlan;
}

export default function HQClientActions({ clientId, currentStatus, currentPlan }: HQClientActionsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [showPlanModal, setShowPlanModal] = useState(false);

    const handleAction = async (action: 'suspend' | 'activate' | 'archive' | 'restore', reason?: string) => {
        setLoading(action);
        try {
            const response = await fetch(`/api/hq/clients/${clientId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, reason })
            });

            const result = await response.json();

            if (result.success) {
                router.refresh();
            } else {
                alert(result.error || 'Action failed');
            }
        } catch (error) {
            console.error('Action error:', error);
            alert('Something went wrong');
        } finally {
            setLoading(null);
        }
    };

    const handlePlanChange = async (newPlan: ClientPlan) => {
        if (newPlan === currentPlan) {
            setShowPlanModal(false);
            return;
        }

        setLoading('plan');
        try {
            const response = await fetch(`/api/hq/clients/${clientId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: newPlan })
            });

            const result = await response.json();

            if (result.success) {
                router.refresh();
                setShowPlanModal(false);
            } else {
                alert(result.error || 'Failed to change plan');
            }
        } catch (error) {
            console.error('Plan change error:', error);
            alert('Something went wrong');
        } finally {
            setLoading(null);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to ARCHIVE this client? This will revoke all access for staff and guests immediately.')) {
            return;
        }

        setLoading('delete');
        try {
            const response = await fetch(`/api/hq/clients/${clientId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmDelete: true })
            });

            const result = await response.json();

            if (result.success) {
                alert('Client successfully moved to archive.');
                router.push('/hq/clients');
                router.refresh();
            } else {
                alert(result.error || 'Deletion failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Something went wrong');
        } finally {
            setLoading(null);
        }
    };

    const plans: ClientPlan[] = ['BASIC', 'ADVANCE', 'PREMIUM', 'BUSINESS'];

    return (
        <div className="space-y-3">
            {/* Suspend / Activate Button */}
            {currentStatus === 'SUSPENDED' ? (
                <button
                    onClick={() => handleAction('activate')}
                    disabled={!!loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-medium transition-all"
                >
                    {loading === 'activate' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Play className="w-4 h-4" />
                    )}
                    Activate Client
                </button>
            ) : currentStatus === 'ARCHIVED' ? (
                <button
                    onClick={() => handleAction('restore')}
                    disabled={!!loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-xl font-medium transition-all"
                >
                    {loading === 'restore' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4" />
                    )}
                    Restore Archived Hotel
                </button>
            ) : (
                <button
                    onClick={() => {
                        const reason = prompt('Reason for suspension (optional):');
                        handleAction('suspend', reason || undefined);
                    }}
                    disabled={!!loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl font-medium transition-all"
                >
                    {loading === 'suspend' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Pause className="w-4 h-4" />
                    )}
                    Suspend Client
                </button>
            )}

            {/* Change Plan Button */}
            <button
                onClick={() => setShowPlanModal(true)}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl font-medium transition-all"
            >
                <ArrowUpCircle className="w-4 h-4" />
                Change Subscription Plan
            </button>

            {/* Edit Infrastructure Button */}
            <button
                onClick={() => router.push(`/hq/clients/${clientId}/edit`)}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-medium transition-all"
            >
                <Edit3 className="w-4 h-4" />
                Edit Topology & Brand
            </button>

            {/* Archive / Delete Button */}
            {
                currentStatus !== 'ARCHIVED' && (
                    <div className="pt-4 mt-4 border-t border-slate-100">
                        <button
                            onClick={handleDelete}
                            disabled={!!loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-400 hover:text-red-600 rounded-xl font-medium transition-all group"
                        >
                            {loading === 'delete' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4 text-slate-300 group-hover:text-red-500" />
                            )}
                            Archive Hotel
                        </button>
                        <p className="text-[10px] text-center text-slate-400 mt-2">
                            Revokes all access and moves to vault.
                        </p>
                    </div>
                )
            }

            {/* Plan Change Modal */}
            {
                showPlanModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Change Subscription Plan</h3>

                            <div className="space-y-2">
                                {plans.map((plan) => (
                                    <button
                                        key={plan}
                                        onClick={() => handlePlanChange(plan)}
                                        disabled={loading === 'plan'}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${currentPlan === plan
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className="text-left">
                                            <span className="font-bold text-slate-800">{plan}</span>
                                            <p className="text-sm text-slate-500">
                                                ₹{PLAN_PRICING[plan].toLocaleString()}/month
                                            </p>
                                        </div>
                                        {currentPlan === plan && (
                                            <Check className="w-5 h-5 text-blue-600" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setShowPlanModal(false)}
                                className="w-full mt-4 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
