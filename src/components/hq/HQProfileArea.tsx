'use client';

import React, { useState } from 'react';
import { LogOut, KeyRound, Eye, EyeOff, Loader2, ShieldCheck, X } from 'lucide-react';

interface HQProfileAreaProps {
    email: string;
}

export function HQProfileArea({ email }: HQProfileAreaProps) {
    const [showModal, setShowModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (newPassword.length < 6) {
            setError('New password must be at least 6 characters.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New password and confirmation do not match.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/hq/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                setError(data.error || 'Failed to update password.');
            } else {
                setSuccessMessage('Super Admin password successfully updated!');
                setTimeout(() => {
                    setShowModal(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setSuccessMessage(null);
                }, 1500);
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="p-8 border-t border-zinc-100/50 bg-white/50">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[12px] font-black text-white shadow-lg shadow-indigo-500/20 uppercase shrink-0">
                        {email.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-zinc-900 truncate uppercase tracking-widest">{email.split('@')[0]}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1 h-1 rounded-full bg-emerald-500" />
                            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Master Identity</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setError(null);
                            setSuccessMessage(null);
                            setShowModal(true);
                        }}
                        title="Change Super Admin Password"
                        className="text-zinc-400 hover:text-indigo-600 transition-colors bg-zinc-50 hover:bg-indigo-50 p-2 rounded-lg border border-zinc-100"
                    >
                        <KeyRound className="w-3.5 h-3.5" />
                    </button>
                    <a
                        href="/api/hq/logout"
                        title="Sign Out"
                        className="text-zinc-300 hover:text-red-500 transition-colors bg-zinc-50 hover:bg-red-50 p-2 rounded-lg border border-zinc-100"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                    </a>
                </div>
            </div>

            {/* Change Password Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <KeyRound className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Change Master Password</h3>
                                    <p className="text-[11px] text-slate-400">Super Admin credentials</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                            {error && (
                                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                                    {error}
                                </div>
                            )}
                            {successMessage && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-medium flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    {successMessage}
                                </div>
                            )}

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        required
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Enter current password"
                                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono pr-10 text-slate-900 placeholder:text-slate-400 font-medium"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                                    >
                                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        required
                                        minLength={6}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="At least 6 characters"
                                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono pr-10 text-slate-900 placeholder:text-slate-400 font-medium"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                                    >
                                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                    Confirm New Password
                                </label>
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    required
                                    minLength={6}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter new password"
                                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 placeholder:text-slate-400 font-medium"
                                />
                            </div>

                            <div className="flex gap-2.5 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                >
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <ShieldCheck className="w-4 h-4" />
                                    )}
                                    Update Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
