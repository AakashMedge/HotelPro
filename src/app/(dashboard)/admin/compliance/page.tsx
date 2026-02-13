'use client';

import { useState, useEffect } from 'react';
import {
    ShieldCheck, Scale, FileText, Landmark, Save, AlertCircle,
    Info, ChevronRight, CheckCircle2, Loader2, Coins
} from 'lucide-react';

export default function AdminCompliancePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        setTimeout(() => setLoading(false), 500);
    }, []);

    const handleSave = () => {
        setSaving(true);
        setTimeout(() => {
            setSaving(false);
            setMessage({ type: 'success', text: 'Legal framework updated' });
            setTimeout(() => setMessage(null), 3000);
        }, 800);
    };

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="p-6 md:p-10 space-y-10 max-w-5xl mx-auto">

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Compliance & Policy</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Manage taxation slabs, rounding logic, and legal invoicing prefixes.</p>
                </div>
                {message && (
                    <div className={`px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                        <CheckCircle2 className="w-4 h-4" />
                        {message.text}
                    </div>
                )}
            </div>

            {/* Taxation Grid */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <Scale className="w-4 h-4 text-slate-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Multi-Slab Taxation</h3>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 md:p-10 space-y-6">
                        <div className="grid grid-cols-12 gap-4 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            <div className="col-span-6">Category</div>
                            <div className="col-span-3 text-center">SGST (%)</div>
                            <div className="col-span-3 text-center">CGST (%)</div>
                        </div>

                        <div className="space-y-3">
                            <TaxSlabRow label="Foods & Beverages" sgst={2.5} cgst={2.5} />
                            <TaxSlabRow label="Liquor & Spirits" sgst={9.0} cgst={9.0} />
                            <TaxSlabRow label="Tobacco & Luxury" sgst={14.0} cgst={14.0} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Secondary Configs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Round Off */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 md:p-10 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Coins className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 tracking-tight">Round-off Logic</h4>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Rounding Method</label>
                        <select className="w-full bg-slate-50 border-none rounded-2xl py-3.5 px-6 text-sm font-semibold focus:ring-4 focus:ring-indigo-50 outline-none appearance-none">
                            <option>Nearest Whole (₹1.00)</option>
                            <option>Upper Bound (₹1.00)</option>
                            <option>Nearest Five (₹5.00)</option>
                            <option>No Rounding</option>
                        </select>
                    </div>
                </div>

                {/* Prefixes */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 md:p-10 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 tracking-tight">System Prefixes</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">BILL</label>
                            <input className="w-full bg-slate-50 border-none rounded-2xl py-3.5 px-6 text-sm font-semibold focus:ring-4 focus:ring-indigo-50 outline-none uppercase" defaultValue="INV-" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">KOT</label>
                            <input className="w-full bg-slate-50 border-none rounded-2xl py-3.5 px-6 text-sm font-semibold focus:ring-4 focus:ring-indigo-50 outline-none uppercase" defaultValue="KOT-" />
                        </div>
                    </div>
                </div>

            </div>

            {/* Fiscal Footer */}
            <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100/50 max-w-lg">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-[11px] font-semibold text-amber-800 uppercase leading-relaxed tracking-wider">
                        tax slab adjustments retroactively affect all pending guest carts. ensure gstin is verified before commit.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="shrink-0 bg-slate-900 text-white px-10 py-4 rounded-4xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95 flex items-center gap-2"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Synchronizing...' : 'Save Framework'}
                </button>
            </div>

        </div>
    );
}

function TaxSlabRow({ label, sgst, cgst }: any) {
    return (
        <div className="grid grid-cols-12 gap-4 items-center bg-slate-50/50 p-3 rounded-2xl border border-transparent hover:bg-white hover:border-slate-100 transition-all group">
            <div className="col-span-6 font-semibold text-sm text-slate-700 pl-4">{label}</div>
            <div className="col-span-3">
                <input className="w-full py-2 bg-white border border-slate-100 rounded-xl text-center font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all" defaultValue={sgst.toFixed(2)} />
            </div>
            <div className="col-span-3">
                <input className="w-full py-2 bg-white border border-slate-100 rounded-xl text-center font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all" defaultValue={cgst.toFixed(2)} />
            </div>
        </div>
    );
}
