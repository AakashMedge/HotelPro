'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Store,
    Receipt,
    ShieldCheck,
    KeyRound,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Save,
    Phone,
    MapPin,
    FileText,
    Percent,
    CreditCard,
    QrCode,
    Banknote
} from 'lucide-react';

export default function BillingSettingsPage() {
    const router = useRouter();

    // Hotel Branding & Tax state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [form, setForm] = useState({
        businessName: '',
        address: '',
        phone: '',
        gstin: '',
        fssai: '',
        gstEnabled: true,
        gstRate: 5.0,
        defaultPaymentMethod: 'CASH',
        currencySymbol: '₹',
        accessCode: ''
    });

    // Security Credentials state
    const [terminalUser, setTerminalUser] = useState<{ username: string; name: string } | null>(null);
    const [currentPin, setCurrentPin] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPin, setNewPin] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showNewPin, setShowNewPin] = useState(false);
    const [secSaving, setSecSaving] = useState(false);
    const [secMessage, setSecMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Load initial settings and security profile
    useEffect(() => {
        Promise.all([
            fetch('/api/settings').then(r => r.json()),
            fetch('/api/admin/security').then(r => r.json())
        ])
            .then(([settingsData, secData]) => {
                if (settingsData.success && settingsData.settings) {
                    const s = settingsData.settings;
                    setForm({
                        businessName: s.businessName || '',
                        address: s.address || '',
                        phone: s.phone || '',
                        gstin: s.gstin || '',
                        fssai: s.fssai || '',
                        gstEnabled: s.gstEnabled ?? true,
                        gstRate: Number(s.gstRate ?? 5.0),
                        defaultPaymentMethod: s.defaultPaymentMethod || 'CASH',
                        currencySymbol: s.currencySymbol || '₹',
                        accessCode: s.accessCode || ''
                    });
                }

                if (secData.success && secData.user) {
                    setTerminalUser({
                        username: secData.user.username,
                        name: secData.user.name
                    });
                }
            })
            .catch(err => {
                console.error('[LOAD_SETTINGS_ERROR]', err);
            })
            .finally(() => setLoading(false));
    }, []);

    // Auto-hide Toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Save Hotel Branding & Tax preferences
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setToast(null);

        try {
            const res = await fetch('/api/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json();

            if (data.success) {
                setToast({ message: 'Settings saved! Bill print details updated.', type: 'success' });
                setTimeout(() => {
                    router.push('/billing');
                    router.refresh();
                }, 1200);
            } else {
                setToast({ message: data.error || 'Failed to update settings', type: 'error' });
                setSaving(false);
            }
        } catch {
            setToast({ message: 'Network error. Please try again.', type: 'error' });
            setSaving(false);
        }
    };

    // Update Terminal Credentials (Password & PIN)
    const handleUpdateCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        setSecMessage(null);

        if (!currentPin) {
            setSecMessage({ text: 'Please enter your Current PIN to authorize changes.', type: 'error' });
            return;
        }

        if (!newPassword && !newPin) {
            setSecMessage({ text: 'Please provide at least a new Password or new PIN.', type: 'error' });
            return;
        }

        if (newPassword && newPassword.length < 6) {
            setSecMessage({ text: 'New password must be at least 6 characters.', type: 'error' });
            return;
        }

        if (newPin && (newPin.length < 4 || newPin.length > 6)) {
            setSecMessage({ text: 'Security PIN must be 4 to 6 digits.', type: 'error' });
            return;
        }

        setSecSaving(true);
        try {
            const res = await fetch('/api/admin/security', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPin: currentPin.trim(),
                    newPassword: newPassword ? newPassword : undefined,
                    newPin: newPin ? newPin.trim() : undefined
                })
            });

            const data = await res.json();
            if (data.success) {
                setSecMessage({ text: 'Credentials updated successfully!', type: 'success' });
                setCurrentPin('');
                setNewPassword('');
                setNewPin('');
                setTimeout(() => setSecMessage(null), 4000);
            } else {
                setSecMessage({ text: data.error || 'Failed to update credentials.', type: 'error' });
            }
        } catch {
            setSecMessage({ text: 'Network error while updating credentials.', type: 'error' });
        } finally {
            setSecSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-[#F8F9FA]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-7 h-7 border-2 border-zinc-200 border-t-[#065F46] rounded-full animate-spin" />
                    <span className="text-xs font-medium text-zinc-500">Loading Terminal Settings...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-[#F8F9FA] flex flex-col overflow-y-auto font-sans text-zinc-800 relative">

            {/* FLOATING TOAST NOTIFICATION */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-zinc-900 text-white rounded-2xl shadow-xl border border-zinc-800 max-w-md"
                    >
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                        <span className="text-xs font-semibold tracking-tight">{toast.message}</span>
                        <button
                            onClick={() => setToast(null)}
                            className="ml-2 text-zinc-400 hover:text-white text-xs font-bold px-1"
                        >
                            ✕
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* HEADER */}
            <header className="shrink-0 bg-white border-b border-zinc-200/80 px-6 md:px-8 py-5">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-zinc-900 tracking-tight">Hotel Settings & Controls</h1>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">
                        Configure receipt header branding, tax rules, payment defaults, and terminal credentials.
                    </p>
                </div>
            </header>

            {/* CONTENT FORM */}
            <main className="grow px-6 md:px-8 py-6 max-w-4xl space-y-6 pb-28 md:pb-12">

                {/* FORM 1: BRANDING & BILL HEADER */}
                <form onSubmit={handleSave} className="space-y-6">

                    {/* CARD 1: HOTEL BRANDING & INVOICE DETAILS */}
                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
                        <div className="border-b border-zinc-100 pb-3 flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 text-[#065F46] rounded-xl">
                                <Store className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-zinc-900">Hotel Branding & Bill Header</h2>
                                <p className="text-xs text-zinc-500 font-normal">This information prints at the top of 80mm thermal receipts.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-700 mb-1">
                                    Hotel / Restaurant Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={form.businessName}
                                    onChange={e => setForm({ ...form, businessName: e.target.value })}
                                    placeholder="e.g. Morya Misal & Pure Veg"
                                    className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-[#065F46] transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-700 mb-1">
                                    Contact Phone Number
                                </label>
                                <div className="relative">
                                    <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                    <input
                                        type="text"
                                        value={form.phone}
                                        onChange={e => setForm({ ...form, phone: e.target.value })}
                                        placeholder="e.g. +91 9876543210"
                                        className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-[#065F46] transition-all"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-zinc-700 mb-1">
                                    Physical Address (Printed on Bill)
                                </label>
                                <div className="relative">
                                    <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-400" />
                                    <input
                                        type="text"
                                        value={form.address}
                                        onChange={e => setForm({ ...form, address: e.target.value })}
                                        placeholder="e.g. Shop No 4, Mumbai-Pune Expressway, Lonavala"
                                        className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-[#065F46] transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-700 mb-1">
                                    GSTIN Number (Tax ID)
                                </label>
                                <input
                                    type="text"
                                    value={form.gstin}
                                    onChange={e => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                                    placeholder="e.g. 27AAACH0000A1Z5"
                                    className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs font-mono font-semibold text-slate-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-[#065F46] transition-all uppercase"
                                />
                                <p className="text-[10px] text-zinc-400 mt-1">Leave empty if not GST registered.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-700 mb-1">
                                    FSSAI License Number
                                </label>
                                <div className="relative">
                                    <FileText className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                    <input
                                        type="text"
                                        value={form.fssai}
                                        onChange={e => setForm({ ...form, fssai: e.target.value })}
                                        placeholder="e.g. 11521034000123"
                                        className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs font-mono font-semibold text-slate-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-[#065F46] transition-all"
                                    />
                                </div>
                                <p className="text-[10px] text-zinc-400 mt-1">Prints on receipt for food compliance.</p>
                            </div>
                        </div>
                    </div>

                    {/* CARD 2: TAX & DEFAULT PAYMENT METHOD */}
                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
                        <div className="border-b border-zinc-100 pb-3 flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                <Receipt className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-zinc-900">Tax & Default Payment Method</h2>
                                <p className="text-xs text-zinc-500 font-normal">Control GST application and speed up counter billing.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* GST Toggle & Rate */}
                            <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-zinc-800">GST Billing Calculation</p>
                                        <p className="text-[11px] text-zinc-500">Apply GST on customer receipts</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={form.gstEnabled}
                                        onChange={e => setForm({ ...form, gstEnabled: e.target.checked })}
                                        className="w-4 h-4 accent-[#065F46] rounded cursor-pointer"
                                    />
                                </div>

                                {form.gstEnabled ? (
                                    <div className="pt-2 border-t border-zinc-200/60">
                                        <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                                            Default GST Rate (%)
                                        </label>
                                        <div className="relative">
                                            <Percent className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="28"
                                                value={form.gstRate}
                                                onChange={e => setForm({ ...form, gstRate: parseFloat(e.target.value) || 0 })}
                                                className="w-full pl-9 pr-3.5 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-[#065F46]"
                                            />
                                        </div>
                                        <p className="text-[10px] text-zinc-400 mt-1">Split equally into CGST & SGST on thermal bills.</p>
                                    </div>
                                ) : (
                                    <div className="p-2.5 bg-amber-50 border border-amber-200/60 rounded-xl text-[10px] font-medium text-amber-800">
                                        GST is disabled. Clean bills with 0% tax will be generated for customers.
                                    </div>
                                )}
                            </div>

                            {/* Default Payment Method Selector */}
                            <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl space-y-3">
                                <div>
                                    <p className="text-xs font-bold text-zinc-800">Default Counter Payment Method</p>
                                    <p className="text-[11px] text-zinc-500">Pre-selected at POS checkout to save time</p>
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, defaultPaymentMethod: 'CASH' })}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                                            form.defaultPaymentMethod === 'CASH'
                                                ? 'bg-[#065F46] text-white border-[#065F46] shadow-sm'
                                                : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
                                        }`}
                                    >
                                        <Banknote className="w-4 h-4 mb-1" />
                                        Cash
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, defaultPaymentMethod: 'UPI' })}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                                            form.defaultPaymentMethod === 'UPI'
                                                ? 'bg-[#065F46] text-white border-[#065F46] shadow-sm'
                                                : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
                                        }`}
                                    >
                                        <QrCode className="w-4 h-4 mb-1" />
                                        UPI / QR
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, defaultPaymentMethod: 'CARD' })}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                                            form.defaultPaymentMethod === 'CARD'
                                                ? 'bg-[#065F46] text-white border-[#065F46] shadow-sm'
                                                : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
                                        }`}
                                    >
                                        <CreditCard className="w-4 h-4 mb-1" />
                                        Card
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SAVE BUTTON FOR HOTEL DETAILS */}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-3 bg-[#065F46] hover:bg-[#044E39] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Saving Settings...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Save Hotel Settings</span>
                                </>
                            )}
                        </button>
                    </div>

                </form>

                {/* CARD 3: SECURITY & TERMINAL CREDENTIALS (PASSWORD & PIN) */}
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
                    <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <KeyRound className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-zinc-900">Security & Credentials</h2>
                                <p className="text-xs text-zinc-500 font-normal">Update your login password and 4–6 digit security recovery PIN.</p>
                            </div>
                        </div>

                        {terminalUser && (
                            <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                @{terminalUser.username}
                            </span>
                        )}
                    </div>

                    <form onSubmit={handleUpdateCredentials} className="space-y-4">
                        {secMessage && (
                            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                                secMessage.type === 'success'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                                {secMessage.type === 'success' ? (
                                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                                )}
                                <span>{secMessage.text}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                                    Current Security PIN <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    required
                                    maxLength={6}
                                    value={currentPin}
                                    onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Enter current PIN"
                                    className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs font-mono font-medium text-slate-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-indigo-500 tracking-widest"
                                />
                                <p className="text-[10px] text-zinc-400 mt-1">Required to authorize changes</p>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[11px] font-bold text-zinc-700">New Password</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                    >
                                        {showNewPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                        {showNewPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    minLength={6}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Min 6 characters"
                                    className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs font-mono font-medium text-slate-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-indigo-500"
                                />
                                <p className="text-[10px] text-zinc-400 mt-1">Leave empty to keep unchanged</p>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[11px] font-bold text-zinc-700">New Security PIN</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPin(!showNewPin)}
                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                    >
                                        {showNewPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                        {showNewPin ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                                <input
                                    type={showNewPin ? 'text' : 'password'}
                                    maxLength={6}
                                    value={newPin}
                                    onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                                    placeholder="4–6 digit PIN"
                                    className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs font-mono font-medium text-slate-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-indigo-500 tracking-widest"
                                />
                                <p className="text-[10px] text-zinc-400 mt-1">Used for self-service password reset</p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={secSaving || !currentPin}
                                className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-40 cursor-pointer"
                            >
                                {secSaving ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Updating Credentials...</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        <span>Update Password & PIN</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

            </main>
        </div>
    );
}
