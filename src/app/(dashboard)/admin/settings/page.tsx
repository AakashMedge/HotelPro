'use client';

import { useState, useEffect } from 'react';
import {
    Landmark, Key, Percent, Save, AlertTriangle,
    Copy, Loader2, Sparkles, Box, Trash2, X, AlertCircle, CheckCircle2
} from 'lucide-react';

interface Settings {
    businessName: string;
    gstin: string;
    gstRate: number;
    serviceChargeRate: number;
    currency: string;
    currencySymbol: string;
    accessCode: string;
}

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
        fetch('/api/settings').then(res => res.json()).then(data => {
            if (data.success) setSettings(data.settings);
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (res.ok) setMessage({ type: 'success', text: 'Settings updated successfully' });
        } catch (error) { setMessage({ type: 'error', text: 'Update failed' }); }
        finally { setSaving(false); setTimeout(() => setMessage(null), 3000); }
    };

    const handleFactoryReset = async () => {
        setResetting(true);
        try {
            const res = await fetch('/api/manager/reset', { method: 'POST' });
            if (res.ok) {
                window.location.href = '/login?message=SYSTEM_RESET_COMPLETE';
            } else {
                alert('Reset failed. Please try again.');
            }
        } catch (err) {
            console.error(err);
            alert('Network error during reset.');
        } finally {
            setResetting(false);
            setShowResetModal(false);
        }
    };

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
    );

    return (
        <div className="p-6 md:p-12 space-y-12 max-w-6xl mx-auto">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">Configure your property operations and fiscal compliance.</p>
                </div>
                {message && (
                    <div className={`px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        <CheckCircle2 className="w-4 h-4" />
                        {message.text}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* MAIN CONFIGURATION COLUMN */}
                <div className="lg:col-span-8 space-y-12">

                    {/* Business Identity */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 px-2">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Landmark className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 leading-none">Business Profile</h3>
                                <p className="text-xs font-medium text-slate-400 mt-1">Official identity for invoicing and tax filings.</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <InputField
                                label="Business Name"
                                value={settings?.businessName || ''}
                                onChange={(v: string) => setSettings(s => s ? { ...s, businessName: v } : null)}
                                placeholder="e.g. Ajay Dhaba"
                            />
                            <InputField
                                label="Tax ID / GSTIN"
                                value={settings?.gstin || ''}
                                onChange={(v: string) => setSettings(s => s ? { ...s, gstin: v } : null)}
                                placeholder="27XXXXX0000X1Z5"
                            />
                        </div>
                    </div>

                    {/* Fiscal Parameters */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 px-2">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Percent className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 leading-none">Fiscal Constants</h3>
                                <p className="text-xs font-medium text-slate-400 mt-1">Control global tax rates and service charges.</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 md:p-10 grid grid-cols-3 gap-6">
                            <InputField
                                label="Currency"
                                value={settings?.currency || ''}
                                onChange={(v: string) => setSettings(s => s ? { ...s, currency: v } : null)}
                            />
                            <InputField
                                label="Tax %"
                                type="number"
                                value={settings?.gstRate || 0}
                                onChange={(v: string) => setSettings(s => s ? { ...s, gstRate: Number(v) } : null)}
                            />
                            <InputField
                                label="Svc %"
                                type="number"
                                value={settings?.serviceChargeRate || 0}
                                onChange={(v: string) => setSettings(s => s ? { ...s, serviceChargeRate: Number(v) } : null)}
                            />
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="pt-10 border-t border-slate-100">
                        <div className="bg-rose-50/50 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-rose-100/50">
                            <div className="flex items-center gap-5 text-center md:text-left flex-col md:flex-row">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-sm shadow-rose-100 border border-rose-100">
                                    <Trash2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-rose-900">Advanced Purge Protocol</h4>
                                    <p className="text-xs font-medium text-rose-700/60 mt-0.5">Wipe all operational data and return to factory state.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowResetModal(true)}
                                className="bg-rose-600/10 text-rose-600 px-6 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95"
                            >
                                Initiate Factory Reset
                            </button>
                        </div>
                    </div>
                </div>

                {/* SIDEBAR COLUMN */}
                <div className="lg:col-span-4 space-y-8">

                    {/* Public Key Card - CLEAN & HIGH CONTRAST */}
                    <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl shadow-indigo-100/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Key className="w-24 h-24 text-indigo-600" />
                        </div>

                        <div className="relative z-10 space-y-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Public Access Gateway</span>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[9px] font-black uppercase tracking-widest text-indigo-600 block pl-1">Unique Access Code</label>
                                <div className="relative">
                                    <input
                                        className="w-full bg-slate-50 border-2 border-indigo-100 rounded-2xl py-6 px-8 text-4xl font-black uppercase tracking-widest text-slate-900 focus:bg-white focus:border-indigo-600 transition-all outline-none selection:bg-indigo-100"
                                        value={settings?.accessCode || ''}
                                        onChange={e => setSettings(s => s ? { ...s, accessCode: e.target.value.toUpperCase().replace(/\s/g, '') } : null)}
                                        placeholder="CODE"
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-2xl border border-indigo-100 group/link cursor-pointer hover:bg-indigo-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                                        <code className="text-xs font-bold text-indigo-600 tracking-tight">hotelpro.li/{settings?.accessCode || 'YOUR_CODE'}</code>
                                    </div>
                                    <Copy className="w-4 h-4 text-indigo-400 group-hover/link:text-indigo-600 transition-colors" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Protocol Note */}
                    <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100/50 flex gap-4">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] font-medium text-amber-800/80 leading-relaxed uppercase">
                            Changing fiscal parameters will instantly recalculate all active guest carts. use with caution.
                        </p>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-indigo-600 text-white p-5 rounded-4xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Synchronizing...' : 'Commit Changes'}
                    </button>
                </div>
            </div>

            {/* MODAL: FACTORY RESET */}
            {showResetModal && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] p-10 md:p-12 w-full max-w-lg shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-10">
                            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center border border-rose-100">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <button onClick={() => setShowResetModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">Are you sure?</h2>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                This action is permanent. All orders, sales history, staff accounts, and menu configurations will be wiped from the database.
                            </p>

                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4">You are about to delete:</span>
                                <ul className="space-y-3">
                                    {['Active and Archive Orders', 'Staff Identities & Roles', 'Custom Menu Items', 'Property Architecture'].map((item) => (
                                        <li key={item} className="flex items-center gap-3 text-xs font-bold text-slate-700">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 mt-10">
                            <button
                                onClick={handleFactoryReset}
                                disabled={resetting}
                                className="w-full bg-rose-600 text-white py-5 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                            >
                                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                {resetting ? 'Purging System...' : 'Yes, Confirm Purge'}
                            </button>
                            <button
                                onClick={() => setShowResetModal(false)}
                                className="w-full text-slate-400 py-3 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors"
                            >
                                Cancel and Return
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InputField({ label, value, onChange, placeholder, type = "text" }: { label: string, value: string | number, onChange: (v: string) => void, placeholder?: string, type?: string }) {
    return (
        <div className="space-y-2.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{label}</label>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 transition-all outline-none"
            />
        </div>
    );
}
