'use client';

import { useState, useEffect } from 'react';

interface Settings {
    businessName: string;
    gstin: string;
    gstRate: number;
    serviceChargeRate: number;
    currency: string;
    currencySymbol: string;
}

export default function AdminSettingsPage() {
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
                setMessage({ type: 'success', text: 'Settings saved successfully' });
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred while saving' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-[#F2F2F2]">
                <div className="w-8 h-8 border-4 border-black border-t-[#D43425] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-8 font-mono bg-[#F2F2F2]">
            <div className="max-w-4xl mx-auto space-y-8 pb-32">
                <div className="border-b-2 border-black pb-4 flex justify-between items-end">
                    <h1 className="text-2xl font-black uppercase tracking-tighter">Organization Configuration</h1>
                    {message && (
                        <div className={`text-[10px] font-bold uppercase px-4 py-1 animate-bounce ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}
                </div>

                <div className="space-y-8">
                    {/* SECTION 1: ENTITY PROFILE */}
                    <div className="bg-white border-2 border-black p-8 space-y-6">
                        <h3 className="font-bold uppercase tracking-widest text-sm border-b border-zinc-200 pb-2">Entity Profile</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase font-bold text-zinc-500">Legal Business Name</label>
                                <input
                                    type="text"
                                    value={settings?.businessName || ''}
                                    onChange={(e) => setSettings(prev => prev ? { ...prev, businessName: e.target.value } : null)}
                                    className="h-12 bg-zinc-50 border border-zinc-300 px-4 font-bold outline-none focus:border-black"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase font-bold text-zinc-500">Tax ID / GSTIN</label>
                                <input
                                    type="text"
                                    value={settings?.gstin || ''}
                                    onChange={(e) => setSettings(prev => prev ? { ...prev, gstin: e.target.value } : null)}
                                    className="h-12 bg-zinc-50 border border-zinc-300 px-4 font-bold outline-none focus:border-black"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: FISCAL POLICY */}
                    <div className="bg-white border-2 border-black p-8 space-y-6">
                        <h3 className="font-bold uppercase tracking-widest text-sm border-b border-zinc-200 pb-2">Fiscal Policy</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase font-bold text-zinc-500">Base Currency</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Code (e.g. INR)"
                                        value={settings?.currency || ''}
                                        onChange={(e) => setSettings(prev => prev ? { ...prev, currency: e.target.value } : null)}
                                        className="w-24 h-12 bg-zinc-50 border border-zinc-300 px-4 font-bold outline-none focus:border-black"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Symbol (₹)"
                                        value={settings?.currencySymbol || ''}
                                        onChange={(e) => setSettings(prev => prev ? { ...prev, currencySymbol: e.target.value } : null)}
                                        className="w-16 h-12 bg-zinc-50 border border-zinc-300 px-4 font-bold outline-none focus:border-black text-center"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500">GST Rate (%)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={settings?.gstRate || 0}
                                        onChange={(e) => setSettings(prev => prev ? { ...prev, gstRate: Number(e.target.value) } : null)}
                                        className="h-12 bg-zinc-50 border border-zinc-300 px-4 font-bold outline-none focus:border-black"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500">Service Charge (%)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={settings?.serviceChargeRate || 0}
                                        onChange={(e) => setSettings(prev => prev ? { ...prev, serviceChargeRate: Number(e.target.value) } : null)}
                                        className="h-12 bg-zinc-50 border border-zinc-300 px-4 font-bold outline-none focus:border-black"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-[#D43425] text-white h-14 px-8 font-black uppercase tracking-widest text-xs hover:bg-black transition-colors shadow-lg disabled:opacity-50"
                        >
                            {saving ? 'Synchronizing...' : 'Save Configuration'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
