
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Receipt,
    X,
    Printer,
    FileDown,
    User,
    Calendar,
    ArrowUpRight,
    Filter,
    Clock,
    CreditCard,
    DollarSign,
    Percent,
    History,
    ShieldCheck
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

export default function LedgerPage() {
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [pagination, setPagination] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [dateRange, setDateRange] = useState('all'); // today, yesterday, week, all
    const [payMethod, setPayMethod] = useState(''); // CASH, UPI, CARD
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
                limit: '10'
            });
            const res = await fetch(`/api/manager/ledger?${query}`);
            const data = await res.json();
            if (data.success) {
                setEntries(data.ledger);
                setAnalytics(data.analytics);
                setPagination(data.pagination);
            } else {
                alert("Error loading ledger: " + (data.details || data.error));
            }
        } catch (e: any) {
            console.error(e);
            alert("Connection error: " + e.message);
        }
        finally { setLoading(false); }
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
        const headers = ["ID", "Date", "Table", "Customer", "Subtotal", "Discount", "GST", "Total", "Payment", "Status"];
        const rows = entries.map(e => [
            e.id,
            new Date(e.date).toLocaleString(),
            e.table,
            e.customer,
            e.subtotal,
            e.discount,
            e.gst,
            e.total,
            e.paymentMethod,
            e.status
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Ledger_Report_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="h-full overflow-y-auto bg-zinc-50/50 hide-scrollbar font-sans">
            <div className="max-w-[1440px] mx-auto p-6 lg:p-10 space-y-8 pb-32">

                {/* 1. ANALYTICS STRIP (Premium Cards) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        {
                            label: 'Period Revenue',
                            value: analytics?.totalRevenue || 0,
                            icon: <DollarSign size={16} />,
                            color: 'text-zinc-900',
                            sub: `${analytics?.transactionCount || 0} Transactions`
                        },
                        {
                            label: 'Tax Liability (GST)',
                            value: analytics?.totalGst || 0,
                            icon: <ShieldCheck size={16} />,
                            color: 'text-zinc-600',
                            sub: `Discounts: ₹${analytics?.totalDiscount || 0}`
                        },
                        {
                            label: 'Average Ticket',
                            value: analytics?.avgTicket || 0,
                            icon: <ArrowUpRight size={16} />,
                            color: 'text-zinc-900',
                            sub: 'Avg Spend / Session'
                        },
                        {
                            label: 'Sync Status',
                            value: 'Live',
                            icon: <Clock size={16} />,
                            color: 'text-emerald-600',
                            sub: 'Auto-refresh Active'
                        },
                    ].map((kpi, i) => (
                        <div key={i} className="bg-white border border-zinc-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{kpi.label}</span>
                                <div className={`w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center ${kpi.color} group-hover:scale-110 transition-transform`}>
                                    {kpi.icon}
                                </div>
                            </div>
                            <h3 className={`text-2xl font-semibold tracking-tight ${kpi.color}`}>
                                {typeof kpi.value === 'number' ? `₹${kpi.value.toLocaleString()}` : kpi.value}
                            </h3>
                            <p className="text-[11px] text-zinc-400 mt-2 font-medium">{kpi.sub}</p>
                        </div>
                    ))}
                </div>

                {/* 2. ADVANCED CONTROL BAR */}
                <header className="bg-white border border-zinc-200 p-4 rounded-4xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 lg:pb-0">
                        {['today', 'yesterday', 'week', 'all'].map(r => (
                            <button
                                key={r}
                                onClick={() => { setDateRange(r); setPage(1); }}
                                className={`px-5 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${dateRange === r
                                    ? 'bg-zinc-900 text-white shadow-lg'
                                    : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50'
                                    }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 lg:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search Reference, Customer..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 bg-zinc-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-zinc-900/5 transition-all"
                            />
                        </div>

                        <select
                            value={payMethod}
                            onChange={(e) => { setPayMethod(e.target.value); setPage(1); }}
                            className="bg-zinc-50 border-none px-4 py-2.5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-zinc-900/5 cursor-pointer"
                        >
                            <option value="">All Payments</option>
                            <option value="CASH">Cash</option>
                            <option value="UPI">UPI / Scan</option>
                            <option value="CARD">Card</option>
                        </select>

                        <button
                            onClick={handleExport}
                            className="p-2.5 bg-zinc-900 text-white rounded-2xl hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 group"
                            title="Export to CSV"
                        >
                            <FileDown size={18} className="group-active:scale-95" />
                        </button>
                    </div>
                </header>

                {/* 3. TRANSACTION GRID */}
                <div className="bg-white border border-zinc-200 rounded-4xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-zinc-50/50">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Entry Ref</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">POS Point</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Guest Context</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Payment</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Amount</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                                {entries.map(entry => (
                                    <tr
                                        key={entry.id}
                                        onClick={() => setSelectedBill(entry)}
                                        className="hover:bg-zinc-50/50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-zinc-400 font-mono">#{entry.id.slice(-6).toUpperCase()}</span>
                                                <span className="text-xs font-bold text-zinc-900 mt-0.5">{new Date(entry.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-[11px] font-bold text-zinc-600 bg-zinc-100 px-3 py-1.5 rounded-xl uppercase">Table {entry.table}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-zinc-900 uppercase italic tracking-tight">{entry.customer}</span>
                                                {entry.customerPhone && (
                                                    <span className="text-[10px] text-zinc-400 font-medium">{entry.customerPhone}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                <CreditCard size={12} className="text-zinc-300" />
                                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">{entry.paymentMethod}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-sm font-bold text-zinc-900 tabular-nums">₹{entry.total.toLocaleString()}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl ${entry.status === 'CLOSED'
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-amber-50 text-amber-700 animate-pulse'
                                                }`}>
                                                {entry.status === 'CLOSED' ? 'Settled' : 'Pending'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* PAGINATION */}
                {pagination && pagination.pages > 1 && (
                    <footer className="flex items-center justify-center gap-4">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="w-10 h-10 flex items-center justify-center bg-white border border-zinc-200 rounded-2xl text-zinc-400 hover:text-zinc-900 disabled:opacity-30 transition-all shadow-sm"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="flex gap-2">
                            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-8 h-8 rounded-xl text-[10px] font-bold transition-all ${p === page ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-400 hover:bg-zinc-100'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        <button
                            disabled={page === pagination.pages}
                            onClick={() => setPage(page + 1)}
                            className="w-10 h-10 flex items-center justify-center bg-white border border-zinc-200 rounded-2xl text-zinc-400 hover:text-zinc-900 disabled:opacity-30 transition-all shadow-sm"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </footer>
                )}
            </div>

            {/* 4. AUDIT & RECONCILIATION SIDE PANEL */}
            <AnimatePresence>
                {selectedBill && (
                    <div className="fixed inset-0 z-100 flex justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedBill(null)}
                            className="absolute inset-0 bg-zinc-900/10 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 200 }}
                            className="relative w-full max-w-lg bg-white/90 backdrop-blur-2xl h-full shadow-2xl flex flex-col border-l border-zinc-200 no-scrollbar overflow-y-auto"
                        >
                            <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-zinc-100 rounded-2xl">
                                        <History size={20} className="text-zinc-900" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-zinc-900 uppercase tracking-tighter">Audit Context</h2>
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Bill #{selectedBill.id.slice(-8).toUpperCase()}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedBill(null)}
                                    className="p-3 bg-zinc-50 rounded-full text-zinc-400 hover:bg-zinc-100 transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-8 bg-zinc-50/30 flex-1 overflow-y-auto no-scrollbar">
                                {/* FINANCES SECTION */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 px-2">
                                        <div className="w-1 h-3 bg-zinc-900 rounded-full" />
                                        <span className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest">Financial Summary</span>
                                    </div>

                                    <div className="bg-white border border-zinc-100 p-8 rounded-[2.5rem] shadow-sm space-y-6">
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-tight">
                                                <span>Gross Amount</span>
                                                <span className="text-zinc-900 font-mono">₹{selectedBill.subtotal.toLocaleString()}</span>
                                            </div>
                                            {selectedBill.discount > 0 && (
                                                <div className="flex justify-between text-xs font-bold text-emerald-600 uppercase tracking-tight">
                                                    <span>Discount Applied</span>
                                                    <span className="font-mono">- ₹{selectedBill.discount.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-tight">
                                                <span>Tax (GST + Svc)</span>
                                                <span className="text-zinc-900 font-mono">₹{(selectedBill.gst + selectedBill.serviceCharge).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <div className="h-px bg-zinc-100" />

                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Final Settlement</p>
                                                <div className="flex items-center gap-2">
                                                    <CreditCard size={14} className="text-zinc-400" />
                                                    <span className="text-[10px] font-bold text-zinc-900 uppercase">{selectedBill.paymentMethod}</span>
                                                </div>
                                            </div>
                                            <h3 className="text-5xl font-bold text-zinc-900 tracking-tighter tabular-nums">₹{selectedBill.total.toLocaleString()}</h3>
                                        </div>
                                    </div>
                                </section>

                                {/* ITEMIZED SECTION */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 px-2">
                                        <div className="w-1 h-3 bg-zinc-400 rounded-full" />
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Itemized Breakdown</span>
                                    </div>
                                    <div className="bg-white border border-zinc-100 p-8 rounded-[2.5rem] shadow-sm">
                                        <div className="space-y-5">
                                            {selectedBill.itemsList.map((item: any, i: number) => (
                                                <div key={i} className="flex justify-between group">
                                                    <div className="flex gap-5">
                                                        <span className="text-xs font-bold text-zinc-300 font-mono">0{item.quantity}</span>
                                                        <div>
                                                            <p className="text-xs font-bold text-zinc-900 uppercase tracking-tight">{item.itemName}</p>
                                                            {item.selectedVariant && (
                                                                <p className="text-[10px] font-bold text-zinc-400 uppercase mt-0.5">{item.selectedVariant.name}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-bold text-zinc-900 font-mono">₹{(Number(item.priceSnapshot) * item.quantity).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-8 pt-6 border-t border-dashed border-zinc-100 flex justify-between items-center opacity-50">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Items Total</span>
                                            <span className="text-xs font-bold text-zinc-900 font-mono">₹{selectedBill.subtotal.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </section>

                                {/* AUDIT TRAIL */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 px-2">
                                        <div className="w-1 h-3 bg-zinc-400 rounded-full" />
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Staff Activity log</span>
                                    </div>
                                    <div className="bg-zinc-100/50 border border-zinc-200/50 p-8 rounded-[2.5rem]">
                                        <div className="relative space-y-8 pl-8 border-l border-zinc-200 ml-2">
                                            {selectedBill.auditTrail?.map((log, i) => (
                                                <div key={i} className="relative">
                                                    <div className="absolute -left-[41px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-zinc-900" />
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-xs font-bold text-zinc-900 uppercase tracking-tight">{log.action.replace(/_/g, ' ')}</p>
                                                            <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-wider">{log.user}</p>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-zinc-300 font-mono">{new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            )) || (
                                                    <p className="text-[10px] font-bold text-zinc-300 uppercase italic">No audit events recorded</p>
                                                )}
                                        </div>
                                    </div>
                                </section>

                                {/* ACTIONS */}
                                <div className="grid grid-cols-2 gap-4 pt-8">
                                    <button
                                        onClick={() => window.print()}
                                        className="py-4 bg-zinc-50 text-zinc-900 rounded-3xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Printer size={16} /> Print Bill
                                    </button>
                                    <button
                                        onClick={handleExport}
                                        className="py-4 bg-zinc-900 text-white rounded-3xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-zinc-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <FileDown size={16} /> Export Data
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 5. EXECUTIVE DESIGNER RECEIPT (Perfect 80mm Thermal) */}
            <div className="hidden print:block print-only bg-white text-zinc-900 font-sans w-[80mm] mx-auto p-4 select-none">
                {/* Header: Defined Elegance */}
                <div className="text-center py-6 border-b-2 border-zinc-900">
                    <h1 className="text-xl font-bold tracking-[0.15em] uppercase font-playfair mb-1">
                        {hospitalitySettings?.businessName || 'HotelPro Royal'}
                    </h1>
                    <p className="text-[8px] font-medium tracking-[0.4em] uppercase text-zinc-400">Premium Dining</p>
                </div>

                {/* Metadata: Structured Logic */}
                <div className="grid grid-cols-2 gap-y-4 py-6 border-b border-zinc-100 text-[10px] font-semibold text-zinc-600">
                    <div className="space-y-1">
                        <p className="text-[7px] uppercase tracking-widest text-zinc-300">Point of Service</p>
                        <p className="text-zinc-900 uppercase">Table {selectedBill?.table || 'Gen'}</p>
                    </div>
                    <div className="text-right space-y-1">
                        <p className="text-[7px] uppercase tracking-widest text-zinc-300">Reference</p>
                        <p className="text-zinc-900 font-mono italic whitespace-nowrap">#{selectedBill?.id.slice(-8).toUpperCase()}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[7px] uppercase tracking-widest text-zinc-300">Arrival Context</p>
                        <p className="text-zinc-900">{selectedBill?.date ? new Date(selectedBill.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</p>
                    </div>
                    <div className="text-right space-y-1">
                        <p className="text-[7px] uppercase tracking-widest text-zinc-300">Timestamp</p>
                        <p className="text-zinc-900">{selectedBill?.date ? new Date(selectedBill.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                    </div>
                </div>

                {/* Items Selection: Vertical Rhythm */}
                <div className="py-6 space-y-5 border-b border-zinc-100">
                    <div className="flex justify-between items-center opacity-30 px-1">
                        <span className="text-[7px] font-bold uppercase tracking-[0.3em]">Selection Digest</span>
                        <div className="h-[0.5px] grow bg-zinc-900 ml-4" />
                    </div>
                    <div className="space-y-5">
                        {selectedBill?.itemsList.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-start">
                                <div className="flex-1 pr-4">
                                    <div className="flex items-start gap-3">
                                        <span className="text-[9px] font-bold text-zinc-300 font-mono mt-0.5">{item.quantity}x</span>
                                        <div>
                                            <p className="text-[11px] font-bold text-zinc-900 uppercase tracking-tight leading-tight">{item.itemName}</p>
                                            {item.selectedVariant && (
                                                <p className="text-[8px] font-medium text-zinc-400 mt-0.5">/ {item.selectedVariant.name}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[11px] font-bold tabular-nums text-zinc-900">₹{(Number(item.priceSnapshot) * item.quantity).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Conclusion: Financial Balance */}
                <div className="py-6 space-y-3 px-1">
                    <div className="flex justify-between text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                        <span>Base Amount</span>
                        <span className="text-zinc-900">₹{selectedBill?.subtotal.toLocaleString()}</span>
                    </div>
                    {selectedBill && selectedBill.discount > 0 && (
                        <div className="flex justify-between text-[9px] font-bold text-emerald-600 uppercase tracking-wider">
                            <span>Privilege Credit</span>
                            <span>- ₹{selectedBill.discount.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                        <span>Statutory Levies</span>
                        <span className="text-zinc-900">₹{((selectedBill?.gst || 0) + (selectedBill?.serviceCharge || 0)).toLocaleString()}</span>
                    </div>

                    <div className="pt-6 mt-2 flex justify-between items-baseline border-t border-zinc-100">
                        <div className="space-y-1">
                            <p className="text-[7px] font-bold text-zinc-300 uppercase tracking-[0.3em] leading-none">Net Payable</p>
                            <p className="text-[9px] font-bold text-zinc-800 uppercase italic tracking-tight">
                                Settle via {selectedBill?.paymentMethod || 'Cash'}
                            </p>
                        </div>
                        <div className="text-3xl font-medium text-zinc-900 tracking-tighter tabular-nums leading-none">
                            ₹{selectedBill?.total.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Footer Signature: Designer Mark */}
                <div className="text-center pt-8 border-t border-dashed border-zinc-200">
                    <p className="text-[9px] font-bold text-zinc-900 uppercase tracking-[0.3em] leading-none mb-2">Thank You</p>
                    <p className="text-[7px] font-medium text-zinc-400 uppercase tracking-widest mb-4">A Pleasure To Serve You</p>

                    <div className="flex justify-center items-center gap-2 mb-6">
                        <div className="h-[1.5px] w-4 bg-zinc-900 rounded-full" />
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                        <div className="h-[1.5px] w-4 bg-zinc-900 rounded-full" />
                    </div>

                    {hospitalitySettings?.gstin && (
                        <p className="text-[6px] font-medium text-zinc-300 uppercase tracking-[0.4em]">GST {hospitalitySettings.gstin}</p>
                    )}
                </div>
            </div>

            <style jsx global>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @media print {
                    @page { 
                        size: 80mm auto; 
                        margin: 0; 
                    }
                    body { 
                        margin: 0; 
                        padding: 0;
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                        font-family: var(--font-inter), sans-serif;
                    }
                    body * { visibility: hidden !important; height: 0 !important; margin: 0 !important; padding: 0 !important; border: none !important; }
                    .print-only, .print-only * { visibility: visible !important; height: auto !important; }
                    .print-only { 
                        position: absolute !important; 
                        left: 0 !important; 
                        top: 0 !important; 
                        width: 80mm !important; 
                        display: block !important; 
                        padding: 10mm 4mm !important;
                        margin: 0 !important;
                        visibility: visible !important;
                    }
                }
            `}</style>
        </div>
    );
}
