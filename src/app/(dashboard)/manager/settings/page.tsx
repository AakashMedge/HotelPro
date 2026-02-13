
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Settings {
    businessName: string;
    gstin: string;
    gstRate: number;
    serviceChargeRate: number;
    currency: string;
    currencySymbol: string;
    accessCode: string;
}

export default function ManagerSettingsPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data.success) {
                setSettings(data.settings);
            }
        } catch (error) {
            console.error("Failed to fetch settings", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'Operational protocols updated successfully' });
                if (data.settings.accessCode !== undefined) {
                    setSettings(prev => prev ? { ...prev, accessCode: data.settings.accessCode } : null);
                }
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to sync settings' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'System link failure during synchronization' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-[#FDFCF9]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-zinc-200 border-t-[#D43425] rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Accessing Control Vault...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-[#FDFCF9] p-6 lg:p-10 font-sans">
            <div className="max-w-4xl mx-auto space-y-10 pb-32">

                {/* HEADER AREA */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-zinc-200/50 pb-8 gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-zinc-900 tracking-tighter uppercase mb-2">Director's Settings</h1>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest italic">Operational Constants & Security Protocols</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <a href="/manager/staff" className="bg-zinc-100 hover:bg-zinc-200 text-zinc-900 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            Manage Team
                        </a>

                        {message && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`text-[9px] font-black uppercase px-6 py-2 rounded-full shadow-sm ${message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}
                            >
                                {message.text}
                            </motion.div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">

                    {/* SECTION 1: CORE IDENTITY */}
                    <section className="bg-white rounded-[2.5rem] border border-zinc-100 p-10 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-10 h-10 rounded-2xl bg-[#D43425]/10 flex items-center justify-center">
                                <svg className="w-5 h-5 text-[#D43425]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Hotel Identity</h3>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic leading-none">Global branding parameters</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Business Name</label>
                                <input
                                    type="text"
                                    value={settings?.businessName || ''}
                                    onChange={(e) => setSettings(prev => prev ? { ...prev, businessName: e.target.value } : null)}
                                    className="w-full h-14 bg-zinc-50 border border-zinc-100 rounded-2xl px-6 font-bold text-zinc-900 outline-none focus:ring-2 ring-[#D43425]/10 focus:border-[#D43425]/30 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Tax Registration (GSTIN)</label>
                                <input
                                    type="text"
                                    value={settings?.gstin || ''}
                                    onChange={(e) => setSettings(prev => prev ? { ...prev, gstin: e.target.value } : null)}
                                    className="w-full h-14 bg-zinc-50 border border-zinc-100 rounded-2xl px-6 font-bold text-zinc-900 outline-none focus:ring-2 ring-[#D43425]/10 focus:border-[#D43425]/30 transition-all"
                                />
                            </div>
                        </div>
                    </section>

                    {/* SECTION 2: ACCESS KEY (THE DIGITAL KEY) */}
                    <section className="bg-white rounded-[2.5rem] border-2 border-dashed border-zinc-200 p-10 shadow-sm hover:border-[#D43425]/20 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                            <svg className="w-32 h-32 text-zinc-900" fill="currentColor" viewBox="0 0 24 24"><path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" /></svg>
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Customer Access Key</h3>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic leading-none">Digital Ledger Entry Protocol</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Active Digital Key</label>
                                    <input
                                        type="text"
                                        placeholder="E.G. JADUI"
                                        value={settings?.accessCode || ''}
                                        onChange={(e) => setSettings(prev => prev ? { ...prev, accessCode: e.target.value.toUpperCase() } : null)}
                                        className="w-full h-16 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl px-8 font-black text-2xl tracking-[0.3em] text-[#D43425] outline-none focus:border-[#D43425]/50 focus:bg-white transition-all uppercase placeholder:opacity-20"
                                    />
                                    <p className="px-2 text-[10px] font-medium text-zinc-400 leading-relaxed italic uppercase">
                                        This code enables high-level synchronization for guest terminals.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-zinc-50/50 rounded-3xl p-8 border border-zinc-100 flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Entry Shortcut</span>
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                </div>
                                <div className="bg-white border border-zinc-100 rounded-2xl p-4 flex items-center justify-between gap-4">
                                    <div className="truncate flex-1">
                                        <p className="text-[10px] font-bold text-zinc-500 font-mono">hotelpro.li/{settings?.accessCode || '...'}</p>
                                    </div>
                                    <button className="text-[9px] font-black text-[#D43425] uppercase tracking-widest hover:underline shrink-0">Copy</button>
                                </div>
                                <p className="text-[9px] font-bold text-zinc-400 uppercase italic leading-tight">
                                    Print this link on table QR's for direct ledger access.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 3: FISCAL & CURRENCY */}
                    <section className="bg-white rounded-[2.5rem] border border-zinc-100 p-10 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-10 h-10 rounded-2xl bg-zinc-900/5 flex items-center justify-center">
                                <svg className="w-5 h-5 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 1.343-3 3.333 0 2.333 3.667 2.667 3.667 4.667 0 1.933-1.343 3.333-3.067 3.333-1.724 0-3.066-1.4-3.066-1.4m9-9L15 4h-4a2 2 0 00-2 2v1m-2 11h11m-11 0a2 2 0 01-2-2v-1" /></svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Fiscal Logic</h3>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic leading-none">Taxation & currency standard</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Currency</label>
                                    <input
                                        type="text"
                                        value={settings?.currency || ''}
                                        onChange={(e) => setSettings(prev => prev ? { ...prev, currency: e.target.value } : null)}
                                        className="w-full h-14 bg-zinc-50 border border-zinc-100 rounded-2xl px-6 font-bold text-zinc-900 outline-none focus:ring-2 ring-zinc-900/5 transition-all text-center"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Symbol</label>
                                    <input
                                        type="text"
                                        value={settings?.currencySymbol || ''}
                                        onChange={(e) => setSettings(prev => prev ? { ...prev, currencySymbol: e.target.value } : null)}
                                        className="w-full h-14 bg-zinc-50 border border-zinc-100 rounded-2xl px-6 font-bold text-zinc-900 outline-none focus:ring-2 ring-zinc-900/5 transition-all text-center"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">GST (%)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={settings?.gstRate || 0}
                                        onChange={(e) => setSettings(prev => prev ? { ...prev, gstRate: Number(e.target.value) } : null)}
                                        className="w-full h-14 bg-zinc-50 border border-zinc-100 rounded-2xl px-6 font-bold text-zinc-900 outline-none focus:ring-2 ring-zinc-900/5 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Service (%)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={settings?.serviceChargeRate || 0}
                                        onChange={(e) => setSettings(prev => prev ? { ...prev, serviceChargeRate: Number(e.target.value) } : null)}
                                        className="w-full h-14 bg-zinc-50 border border-zinc-100 rounded-2xl px-6 font-bold text-zinc-900 outline-none focus:ring-2 ring-zinc-900/5 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* SAVE ACTION */}
                <div className="flex justify-end pt-10 border-t border-zinc-100">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-zinc-900 text-white min-w-[240px] h-16 rounded-3xl font-black uppercase tracking-[0.2em] text-xs hover:bg-[#D43425] transition-all shadow-xl shadow-zinc-200 disabled:opacity-50 active:scale-95"
                    >
                        {saving ? 'Synchronizing Protocols...' : 'Commit Configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
}
