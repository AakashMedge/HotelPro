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
    Edit3,
    KeyRound,
    Eye,
    EyeOff,
    ShieldCheck,
    X
} from 'lucide-react';
import { ClientPlan, ClientStatus } from '@prisma/client';
import { PLAN_PRICING } from '@/lib/types/hq.types';

interface HQClientActionsProps {
    clientId: string;
    clientName?: string;
    currentStatus: ClientStatus;
    currentPlan: ClientPlan;
}

export default function HQClientActions({ clientId, clientName = 'HOTEL', currentStatus, currentPlan }: HQClientActionsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showPermanentModal, setShowPermanentModal] = useState(false);
    const [confirmInput, setConfirmInput] = useState('');
    const [showCredsModal, setShowCredsModal] = useState(false);
    const [newAdminPassword, setNewAdminPassword] = useState('');
    const [newAdminPin, setNewAdminPin] = useState('');
    const [showPasswordEye, setShowPasswordEye] = useState(false);
    const [showPinEye, setShowPinEye] = useState(false);
    const [credsError, setCredsError] = useState<string | null>(null);
    const [credsSuccess, setCredsSuccess] = useState<string | null>(null);

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

    const handlePermanentDelete = async () => {
        if (confirmInput.trim().toUpperCase() !== clientName.trim().toUpperCase()) {
            alert(`Name mismatch! Please type exactly "${clientName.trim()}" to confirm.`);
            return;
        }

        setLoading('permanent-delete');
        try {
            const response = await fetch(`/api/hq/clients/${clientId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmDelete: true, permanent: true })
            });

            const result = await response.json();

            if (result.success) {
                alert('Hotel and all associated database records have been permanently purged.');
                router.push('/hq/clients');
                router.refresh();
            } else {
                alert(result.error || 'Permanent deletion failed');
            }
        } catch (error) {
            console.error('Permanent delete error:', error);
            alert('Something went wrong');
        } finally {
            setLoading(null);
            setShowPermanentModal(false);
        }
    };

    const handleResetCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        setCredsError(null);
        setCredsSuccess(null);

        if (!newAdminPassword && !newAdminPin) {
            setCredsError('Please provide at least a new password or a new PIN.');
            return;
        }

        if (newAdminPin && (newAdminPin.length < 4 || newAdminPin.length > 6)) {
            setCredsError('PIN must be 4 to 6 digits.');
            return;
        }

        setLoading('creds');
        try {
            const res = await fetch(`/api/hq/clients/${clientId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reset-credentials',
                    password: newAdminPassword || undefined,
                    pin: newAdminPin || undefined
                })
            });

            const result = await res.json();
            if (result.success) {
                setCredsSuccess('Credentials updated successfully!');
                setTimeout(() => {
                    setShowCredsModal(false);
                    setNewAdminPassword('');
                    setNewAdminPin('');
                    setCredsSuccess(null);
                    router.refresh();
                }, 1200);
            } else {
                setCredsError(result.error || 'Failed to update credentials.');
            }
        } catch (error) {
            console.error('Reset credentials error:', error);
            setCredsError('Failed to connect to server.');
        } finally {
            setLoading(null);
        }
    };

    const plans: ClientPlan[] = ['BILLING_ONLY', 'STARTER', 'GROWTH', 'ELITE'];

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

            {/* Update Admin Credentials Button */}
            <button
                onClick={() => {
                    setCredsError(null);
                    setCredsSuccess(null);
                    setShowCredsModal(true);
                }}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl font-medium transition-all"
            >
                <KeyRound className="w-4 h-4" />
                Update Admin Password & PIN
            </button>

            {/* Danger Zone */}
            <div className="pt-4 mt-4 border-t border-slate-200/80 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
                    Danger Zone
                </p>

                {currentStatus !== 'ARCHIVED' && (
                    <button
                        onClick={handleDelete}
                        disabled={!!loading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-all"
                    >
                        {loading === 'delete' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        Archive Hotel (Soft-Vault)
                    </button>
                )}

                <button
                    onClick={() => {
                        setConfirmInput('');
                        setShowPermanentModal(true);
                    }}
                    disabled={!!loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
                >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    Permanently Delete Hotel
                </button>
                <p className="text-[9px] text-center text-slate-400">
                    Hard purge permanently wipes all orders, tables & records.
                </p>
            </div>

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

            {/* Permanent Delete Modal */}
            {
                showPermanentModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-rose-100 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                    <Trash2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Permanently Delete Hotel?</h3>
                                    <p className="text-xs text-rose-600 font-semibold">Destructive Action • Cannot be undone</p>
                                </div>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                                This will completely wipe out <strong>{clientName}</strong>, including all orders, KOT items, sales payments, table topology, menu items, staff users, and settings from the database.
                            </p>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 block">
                                    Type <span className="text-rose-600 font-mono font-black">{clientName}</span> to confirm:
                                </label>
                                <input
                                    type="text"
                                    value={confirmInput}
                                    onChange={(e) => setConfirmInput(e.target.value)}
                                    placeholder={clientName}
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => setShowPermanentModal(false)}
                                    disabled={loading === 'permanent-delete'}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePermanentDelete}
                                    disabled={loading === 'permanent-delete' || confirmInput.trim().toUpperCase() !== clientName.trim().toUpperCase()}
                                    className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                                >
                                    {loading === 'permanent-delete' ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                    Purge Forever
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Admin Credentials Reset Modal */}
            {showCredsModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <KeyRound className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Update Hotel Admin Credentials</h3>
                                    <p className="text-[11px] text-slate-400 font-semibold">{clientName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCredsModal(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleResetCredentials} className="mt-5 space-y-4">
                            {credsError && (
                                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                                    {credsError}
                                </div>
                            )}
                            {credsSuccess && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-medium flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    {credsSuccess}
                                </div>
                            )}

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                                    New Admin Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPasswordEye ? 'text' : 'password'}
                                        value={newAdminPassword}
                                        onChange={(e) => setNewAdminPassword(e.target.value)}
                                        placeholder="Enter new password (optional)"
                                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono pr-10 text-slate-900 placeholder:text-slate-400 font-medium"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordEye(!showPasswordEye)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                                    >
                                        {showPasswordEye ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Leave empty to keep existing password.</p>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                    New Security PIN (4–6 Digits)
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPinEye ? 'text' : 'password'}
                                        maxLength={6}
                                        value={newAdminPin}
                                        onChange={(e) => setNewAdminPin(e.target.value.replace(/\D/g, ''))}
                                        placeholder="e.g. 1234"
                                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest pr-10 text-slate-900 placeholder:text-slate-400 font-medium"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPinEye(!showPinEye)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                                    >
                                        {showPinEye ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Used for self-service password recovery.</p>
                            </div>

                            <div className="flex gap-2.5 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCredsModal(false)}
                                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading === 'creds'}
                                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                >
                                    {loading === 'creds' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <ShieldCheck className="w-4 h-4" />
                                    )}
                                    Save Credentials
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div >
    );
}
