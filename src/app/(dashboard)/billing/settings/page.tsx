'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function HotelSettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [form, setForm] = useState({
        businessName: '',
        gstin: '',
        gstRate: 5,
        serviceChargeRate: 5,
        currencySymbol: '₹',
        accessCode: '',
        allowManagerDiscounts: true,
        lockClosedBills: true,
        requireCustomerPhone: false,
    });

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.settings) {
                    const s = data.settings;
                    setForm({
                        businessName: s.businessName || '',
                        gstin: s.gstin || '',
                        gstRate: Number(s.gstRate ?? 5),
                        serviceChargeRate: Number(s.serviceChargeRate ?? 5),
                        currencySymbol: s.currencySymbol || '₹',
                        accessCode: s.accessCode || '',
                        allowManagerDiscounts: s.allowManagerDiscounts ?? true,
                        lockClosedBills: s.lockClosedBills ?? true,
                        requireCustomerPhone: s.requireCustomerPhone ?? false,
                    });
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    // Auto-hide Toast after 4 seconds
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setToast(null);

        try {
            const res = await fetch('/api/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();

            if (data.success) {
                setToast({ message: 'Settings saved! Redirecting to Dashboard...', type: 'success' });
                
                // Redirect directly to Dashboard after 1 second
                setTimeout(() => {
                    router.push('/billing');
                    router.refresh();
                }, 1000);
            } else {
                setToast({ message: data.error || 'Failed to update settings', type: 'error' });
                setSaving(false);
            }
        } catch (err: any) {
            setToast({ message: 'Network error. Please try again.', type: 'error' });
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-[#F8F9FA]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-7 h-7 border-2 border-zinc-200 border-t-[#065F46] rounded-full animate-spin" />
                    <span className="text-xs font-medium text-zinc-500">Loading Hotel Settings...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-[#F8F9FA] flex flex-col overflow-y-auto font-sans text-zinc-800 relative">
            
            {/* SLEEK FLOATING TOAST NOTIFICATION */}
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
                        Configure branding, tax calculations, and security restrictions for your hotel tenant.
                    </p>
                </div>
            </header>

            {/* CONTENT FORM */}
            <main className="grow px-6 md:px-8 py-6 max-w-4xl space-y-6 pb-28 md:pb-8">

                <form onSubmit={handleSave} className="space-y-6">

                    {/* SECTION 1: HOTEL BRANDING & INVOICE DETAILS */}
                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
                        <div className="border-b border-zinc-100 pb-3">
                            <h2 className="text-sm font-bold text-zinc-900">Hotel Branding & Tax Invoice Details</h2>
                            <p className="text-xs text-zinc-500 font-normal">This information appears on 80mm thermal receipts printed for customers.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-700 mb-1">Hotel / Restaurant Name</label>
                                <input
                                    type="text"
                                    value={form.businessName}
                                    onChange={e => setForm({ ...form, businessName: e.target.value })}
                                    placeholder="e.g. Shalu Dhaba"
                                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#065F46] focus:bg-white transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-700 mb-1">GSTIN Number (Tax ID)</label>
                                <input
                                    type="text"
                                    value={form.gstin}
                                    onChange={e => setForm({ ...form, gstin: e.target.value })}
                                    placeholder="e.g. 27AAACH0000A1Z5"
                                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#065F46] focus:bg-white transition-all uppercase"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-700 mb-1">Hotel Access Code (Digital Entry Key)</label>
                                <input
                                    type="text"
                                    value={form.accessCode}
                                    onChange={e => setForm({ ...form, accessCode: e.target.value.toUpperCase() })}
                                    placeholder="e.g. SHALU99"
                                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-[#065F46] tracking-wider uppercase focus:outline-none focus:border-[#065F46] focus:bg-white transition-all"
                                />
                                <p className="text-[10px] text-zinc-400 mt-1">Unique code used by staff to login to this restaurant terminal.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-700 mb-1">Currency Symbol</label>
                                <input
                                    type="text"
                                    value={form.currencySymbol}
                                    onChange={e => setForm({ ...form, currencySymbol: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#065F46] focus:bg-white transition-all"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: TAX & BILLING CALCULATIONS */}
                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
                        <div className="border-b border-zinc-100 pb-3">
                            <h2 className="text-sm font-bold text-zinc-900">Tax & Billing Calculation Controls</h2>
                            <p className="text-xs text-zinc-500 font-normal">Configure default GST rates and service charges applied at checkout.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-700 mb-1">Default GST Rate (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="28"
                                    value={form.gstRate}
                                    onChange={e => setForm({ ...form, gstRate: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#065F46] focus:bg-white transition-all"
                                />
                                <p className="text-[10px] text-zinc-400 mt-1">Split equally into CGST and SGST on thermal bills.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-700 mb-1">Service Charge Rate (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="20"
                                    value={form.serviceChargeRate}
                                    onChange={e => setForm({ ...form, serviceChargeRate: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#065F46] focus:bg-white transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: SECURITY & STAFF RESTRICTIONS */}
                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
                        <div className="border-b border-zinc-100 pb-3">
                            <h2 className="text-sm font-bold text-zinc-900">Security & Operational Controls</h2>
                            <p className="text-xs text-zinc-500 font-normal">Set permissions and restrictions for cashier & manager operations.</p>
                        </div>

                        <div className="space-y-3">
                            <label className="flex items-center justify-between p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-xl cursor-pointer hover:bg-zinc-100/60 transition-colors">
                                <div>
                                    <p className="text-xs font-bold text-zinc-800">Allow Custom Checkout Discounts</p>
                                    <p className="text-[11px] text-zinc-500">Enable applying flat or percentage discounts on POS checkout.</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={form.allowManagerDiscounts}
                                    onChange={e => setForm({ ...form, allowManagerDiscounts: e.target.checked })}
                                    className="w-4 h-4 accent-[#065F46] rounded cursor-pointer"
                                />
                            </label>

                            <label className="flex items-center justify-between p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-xl cursor-pointer hover:bg-zinc-100/60 transition-colors">
                                <div>
                                    <p className="text-xs font-bold text-zinc-800">Lock Closed Bills (Anti-Fraud Guard)</p>
                                    <p className="text-[11px] text-zinc-500">Prevent modifying bills once settled & finalized.</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={form.lockClosedBills}
                                    onChange={e => setForm({ ...form, lockClosedBills: e.target.checked })}
                                    className="w-4 h-4 accent-[#065F46] rounded cursor-pointer"
                                />
                            </label>

                            <label className="flex items-center justify-between p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-xl cursor-pointer hover:bg-zinc-100/60 transition-colors">
                                <div>
                                    <p className="text-xs font-bold text-zinc-800">Require Customer Mobile Number</p>
                                    <p className="text-[11px] text-zinc-500">Make mobile phone number mandatory during checkout.</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={form.requireCustomerPhone}
                                    onChange={e => setForm({ ...form, requireCustomerPhone: e.target.checked })}
                                    className="w-4 h-4 accent-[#065F46] rounded cursor-pointer"
                                />
                            </label>
                        </div>
                    </div>

                    {/* SAVE BUTTON */}
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-3 bg-[#065F46] hover:bg-[#044E39] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            {saving ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Saving Changes...</span>
                                </>
                            ) : (
                                <span>Save Settings</span>
                            )}
                        </button>
                    </div>

                </form>

            </main>
        </div>
    );
}
