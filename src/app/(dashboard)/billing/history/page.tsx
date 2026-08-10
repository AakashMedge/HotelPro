'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface OrderRecord {
    id: string;
    invoiceNo: string;
    tableId: string;
    tableCode: string;
    customerName: string;
    customerPhone: string | null;
    paymentMethod: string;
    closedAt: string;
    subtotal: number;
    discountAmount: number;
    gstAmount: number;
    grandTotal: number;
    itemsCount: number;
}

interface SummaryData {
    totalOrders: number;
    totalRevenue: number;
    cashRevenue: number;
    upiRevenue: number;
    cardRevenue: number;
}

export default function BillingHistoryPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<OrderRecord[]>([]);
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [mounted, setMounted] = useState(false);

    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/orders/history?search=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            if (data.success) {
                setOrders(data.orders || []);
                setSummary(data.summary || null);
            }
        } catch (err) {
            console.error('[HISTORY_PAGE]', err);
        } finally {
            setLoading(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        setMounted(true);
        fetchHistory();
    }, [fetchHistory]);

    if (!mounted) return null;

    return (
        <div className="h-full flex flex-col bg-[#F8F9FA] overflow-y-auto font-sans text-zinc-800 p-6 md:p-8 space-y-6">

            {/* HEADER & TITLE */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Sales Ledger & Bill History</h1>
                    <p className="text-xs text-zinc-500 mt-1 font-normal">
                        View past receipts, audit daily sales revenue, and reprint bills anytime.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/billing/pos')}
                        className="px-4 py-2 bg-[#065F46] hover:bg-[#044E39] text-white text-xs font-semibold rounded-xl shadow-2xs transition-all flex items-center gap-2"
                    >
                        <span>+ New Bill</span>
                    </button>
                </div>
            </div>

            {/* SUMMARY CARDS */}
            {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs">
                        <span className="text-xs font-medium text-zinc-500 block">Total Bills</span>
                        <span className="text-2xl font-bold text-zinc-900 mt-1 block">{summary.totalOrders}</span>
                    </div>

                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs">
                        <span className="text-xs font-medium text-zinc-500 block">Total Revenue</span>
                        <span className="text-2xl font-bold text-emerald-700 mt-1 block">₹{summary.totalRevenue.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs">
                        <span className="text-xs font-medium text-zinc-500 block">Cash Collection</span>
                        <span className="text-xl font-bold text-zinc-800 mt-1 block">₹{summary.cashRevenue.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs">
                        <span className="text-xs font-medium text-zinc-500 block">Digital (UPI/Card)</span>
                        <span className="text-xl font-bold text-zinc-800 mt-1 block">₹{(summary.upiRevenue + summary.cardRevenue).toLocaleString('en-IN')}</span>
                    </div>
                </div>
            )}

            {/* SEARCH & FILTERS */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                    <svg className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search Invoice No / Customer / Mobile..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 outline-none focus:bg-white focus:border-zinc-300 transition-all"
                    />
                </div>

                <div className="text-xs font-medium text-zinc-500">
                    Showing <span className="font-bold text-zinc-800">{orders.length}</span> recorded bills
                </div>
            </div>

            {/* HISTORY TABLE */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-2xs">
                {loading ? (
                    <div className="py-20 text-center">
                        <div className="w-6 h-6 border-2 border-zinc-200 border-t-[#065F46] rounded-full animate-spin mx-auto mb-2" />
                        <span className="text-xs font-medium text-zinc-500">Loading ledger records...</span>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="py-16 text-center">
                        <p className="text-xs font-semibold text-zinc-500">No bill records found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-zinc-50 border-b border-zinc-200/80 text-zinc-500 uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="py-3 px-4 text-left">Invoice No</th>
                                    <th className="py-3 px-4 text-left">Date & Time</th>
                                    <th className="py-3 px-4 text-center">Table</th>
                                    <th className="py-3 px-4 text-left">Customer</th>
                                    <th className="py-3 px-4 text-center">Payment</th>
                                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                                    <th className="py-3 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 bg-white">
                                {orders.map((record) => {
                                    const d = new Date(record.closedAt);
                                    const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                                    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

                                    return (
                                        <tr key={record.id} className="hover:bg-zinc-50/80 transition-colors">
                                            <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                                                {record.invoiceNo}
                                            </td>
                                            <td className="py-3.5 px-4 text-zinc-600">
                                                <span>{dateStr}</span>
                                                <span className="text-[10px] text-zinc-400 block font-mono">{timeStr}</span>
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className="px-2 py-0.5 bg-zinc-100 font-bold text-zinc-700 rounded text-[11px]">
                                                    {record.tableCode}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 font-semibold text-zinc-800">
                                                {record.customerName}
                                                {record.customerPhone && (
                                                    <span className="text-[10px] font-mono text-zinc-400 block font-normal">{record.customerPhone}</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                    record.paymentMethod === 'CASH' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                                }`}>
                                                    {record.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-bold text-zinc-900 text-sm">
                                                ₹{record.grandTotal.toFixed(2)}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => router.push(`/billing/pos/${record.tableId}/bill/${record.id}`)}
                                                        className="px-3 py-1.5 bg-[#065F46] hover:bg-[#044E39] text-white text-[11px] font-semibold rounded-lg shadow-2xs transition-all flex items-center gap-1.5"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                        </svg>
                                                        <span>Reprint</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
