
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Search,
    ChevronLeft,
    ChevronRight,
    X,
    Printer,
    FileDown,
    DollarSign,
    ShieldCheck,
    History,
    Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type AuditLog = {
    action: string;
    time: string;
    user: string;
    role: string;
};

type LedgerEntry = {
    id: string;
    table: string;
    customer: string;
    customerPhone: string | null;
    subtotal: number;
    discount: number;
    gst: number;
    serviceCharge: number;
    total: number;
    date: string;
    status: string;
    paymentMethod: string;
    itemsList: any[];
    auditTrail: AuditLog[];
};

type Analytics = {
    totalRevenue: number;
    totalGst: number;
    totalDiscount: number;
    avgTicket: number;
    transactionCount: number;
};

export default function AdminLedgerPage() {
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [pagination, setPagination] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [dateRange, setDateRange] = useState('all');
    const [payMethod, setPayMethod] = useState('');
    const [page, setPage] = useState(1);
    const [hospitalitySettings, setHospitalitySettings] = useState<any>(null);

    const [selectedBill, setSelectedBill] = useState<LedgerEntry | null>(null);

    const fetchLedger = useCallback(async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                page: page.toString(),
                search,
                range: dateRange,
                paymentMethod: payMethod,
                limit: '15'
            });
            const res = await fetch(`/api/manager/ledger?${query}`);
            const data = await res.json();
            if (data.success) {
                setEntries(data.ledger);
                setAnalytics(data.analytics);
                setPagination(data.pagination);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [page, search, dateRange, payMethod]);

    useEffect(() => { fetchLedger(); }, [fetchLedger]);

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data.success) setHospitalitySettings(data.settings);
            })
            .catch(console.error);
    }, []);

    const handleExport = () => {
        if (entries.length === 0) return;
        const headers = ["ID", "Date", "Table", "Guest", "Total", "Payment"];
        const rows = entries.map(e => [
            e.id,
            new Date(e.date).toLocaleString(),
            e.table,
            e.customer,
            e.total,
            e.paymentMethod
        ]);
        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ledger-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div className="h-full bg-slate-50/50 p-6 lg:p-10 hide-scrollbar overflow-y-auto font-sans">
            <div className="max-w-[1440px] mx-auto space-y-8 pb-32">

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Ledger</h1>
                        <p className="text-sm text-slate-500 font-medium">Administrator's financial reconciliation & audit window</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
                        >
                            <FileDown size={16} /> Export Master Ledger
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                        { label: 'Revenue', val: analytics?.totalRevenue || 0, icon: DollarSign, color: 'text-indigo-600' },
                        { label: 'GST', val: analytics?.totalGst || 0, icon: ShieldCheck, color: 'text-emerald-600' },
                        { label: 'Discounts', val: analytics?.totalDiscount || 0, icon: History, color: 'text-rose-600' },
                        { label: 'Sync Success', val: analytics?.transactionCount || 0, icon: Clock, color: 'text-slate-600' },
                    ].map((kpi, i) => (
                        <div key={i} className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</span>
                                <kpi.icon size={16} className={kpi.color} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">
                                {kpi.label === 'Sync Success' ? kpi.val : `₹${kpi.val.toLocaleString()}`}
                            </h3>
                        </div>
                    ))}
                </div>

                <div className="bg-white border border-slate-200/60 p-4 rounded-3xl shadow-sm flex flex-col lg:flex-row gap-4">
                    <div className="flex items-center gap-2 bg-slate-50 rounded-2xl p-1">
                        {['today', 'yesterday', 'week', 'all'].map(r => (
                            <button
                                key={r}
                                onClick={() => { setDateRange(r); setPage(1); }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${dateRange === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>

                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search POS Point or ID..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-indigo-500/10 transition-all"
                        />
                    </div>
                </div>

                <div className="bg-white border border-slate-200/60 rounded-3xl shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entry Ref</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">POS Station</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guest Context</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Settlement</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {entries.map(e => (
                                <tr
                                    key={e.id}
                                    onClick={() => setSelectedBill(e)}
                                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                >
                                    <td className="px-8 py-5">
                                        <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">#{e.id.toUpperCase()}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl uppercase tracking-widest">Table {e.table}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-900 uppercase italic tracking-tight">{e.customer}</span>
                                            <span className="text-[10px] text-slate-400 font-medium">{new Date(e.date).toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-sm font-black text-slate-900 tabular-nums">₹{e.total.toLocaleString()}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {pagination && pagination.pages > 1 && (
                    <div className="flex items-center justify-center gap-4">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all shadow-sm"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-xs font-bold text-slate-400 tracking-widest">PAGE {page} / {pagination.pages}</span>
                        <button
                            disabled={page === pagination.pages}
                            onClick={() => setPage(page + 1)}
                            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all shadow-sm"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {selectedBill && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedBill(null)}
                            className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-100"
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30 }}
                            className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-110 flex flex-col no-scrollbar"
                        >
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200">
                                        <History size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">POS Audit</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entry Ref #{selectedBill.id.slice(-8).toUpperCase()}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedBill(null)} className="p-4 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100 transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 space-y-12 no-scrollbar bg-slate-50/20">

                                <section>
                                    <div className="bg-white border-2 border-slate-900 p-8 rounded-[2.5rem] shadow-sm font-sans relative overflow-hidden">
                                        <div className="text-center pb-8 mb-8 border-b-2 border-slate-900 border-dashed">
                                            <h3 className="text-3xl font-black tracking-tighter uppercase leading-none mb-2">
                                                {hospitalitySettings?.businessName || 'HotelPro Royal'}
                                            </h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fine Dining & Bar</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-y-4 text-[11px] font-bold uppercase mb-8">
                                            <div className="space-y-1">
                                                <p className="text-slate-400 text-[8px] tracking-widest">Bill For</p>
                                                <p className="text-slate-900 text-lg">Table {selectedBill.table}</p>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <p className="text-slate-400 text-[8px] tracking-widest">{new Date(selectedBill.date).toLocaleDateString()}</p>
                                                <p className="text-slate-900">{new Date(selectedBill.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6 mb-8">
                                            {selectedBill.itemsList.map((item: any, i: number) => (
                                                <div key={i} className="flex justify-between items-start">
                                                    <div className="flex-1 pr-4">
                                                        <p className="text-xs font-black text-slate-900 uppercase leading-none mb-1">{item.itemName}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">₹{Number(item.priceSnapshot).toLocaleString()} × {item.quantity}</p>
                                                    </div>
                                                    <span className="text-xs font-black text-slate-900 tabular-nums">₹{(Number(item.priceSnapshot) * item.quantity).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-8 border-t-2 border-slate-900 border-dashed space-y-4">
                                            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                <span>Subtotal</span>
                                                <span className="text-slate-900">₹{selectedBill.subtotal.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                <span>GST (5%)</span>
                                                <span className="text-slate-900">₹{selectedBill.gst.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                <span>Service Charge (5%)</span>
                                                <span className="text-slate-900">₹{selectedBill.serviceCharge.toLocaleString()}</span>
                                            </div>

                                            <div className="pt-6 border-t border-slate-100 flex justify-between items-baseline">
                                                <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Total Amount</span>
                                                <span className="text-4xl font-black text-slate-900 tracking-tighter">₹{selectedBill.total.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <div className="text-center pt-10 border-t-2 border-slate-100 border-dashed">
                                            <p className="text-[11px] font-black uppercase tracking-widest italic mb-2">Thank you for visiting!</p>
                                            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.3em]">HotelPro Royal · Powered by HotelPro</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4 italic opacity-50">
                                    <div className="flex items-center gap-2 px-2">
                                        <div className="w-1 h-3 bg-slate-900 rounded-full" />
                                        <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Staff Activity History</span>
                                    </div>
                                    <div className="pl-6 border-l-2 border-slate-200 ml-3 space-y-8">
                                        {selectedBill.auditTrail.map((log, i) => (
                                            <div key={i} className="relative">
                                                <div className="absolute -left-8 top-1.5 w-3 h-3 rounded-full bg-white border-2 border-slate-900 shadow-sm" />
                                                <p className="text-xs font-black text-slate-900 uppercase leading-none">{log.action.replace(/_/g, ' ')}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5">{log.user}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            <div className="p-8 border-t border-slate-100 grid grid-cols-2 gap-4 shrink-0 bg-white">
                                <button onClick={() => window.print()} className="py-4 bg-slate-50 text-slate-900 rounded-3xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100 transition-all">
                                    <Printer size={16} /> Print Master
                                </button>
                                <button className="py-4 bg-slate-900 text-white rounded-3xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all">
                                    <ShieldCheck size={16} /> Verify Entry
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
