'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface OrderRecord {
    id: string;
    billNo?: string;
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
    version?: number;
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
    const [mounted, setMounted] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState<'all' | 'today' | 'yesterday' | 'week'>('all');
    const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'CASH' | 'UPI' | 'CARD'>('ALL');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (searchQuery.trim()) params.set('search', searchQuery.trim());
            if (dateRange !== 'all') params.set('range', dateRange);
            if (paymentFilter !== 'ALL') params.set('paymentMethod', paymentFilter);

            const res = await fetch(`/api/orders/history?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setOrders(data.orders || []);
                setSummary(data.summary || null);
                setCurrentPage(1); // Reset to page 1 on filter change
            }
        } catch (err) {
            console.error('[HISTORY_PAGE]', err);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, dateRange, paymentFilter]);

    useEffect(() => {
        setMounted(true);
        fetchHistory();
    }, [fetchHistory]);

    // Paginated Slicing
    const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));
    const paginatedOrders = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return orders.slice(start, start + pageSize);
    }, [orders, currentPage, pageSize]);

    if (!mounted) return null;

    return (
        <div className="h-full flex flex-col bg-[#F8F9FA] overflow-y-auto font-sans text-zinc-800 p-6 md:p-8 space-y-6">

            {/* HEADER & TITLE */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Sales Ledger & Bill History</h1>
                    <p className="text-xs text-zinc-500 mt-1 font-normal">
                        Audit bills, filter by payment tenders, reprint receipts, or re-open bills for edits anytime.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/billing/pos')}
                        className="px-4 py-2 bg-[#065F46] hover:bg-[#044E39] text-white text-xs font-semibold rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
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

            {/* SEARCH & MULTI-FILTERS BAR */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                
                {/* SEARCH INPUT */}
                <div className="relative flex-1 max-w-md">
                    <svg className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search Bill #, Invoice, Customer, Table..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 outline-none focus:bg-white focus:border-zinc-300 transition-all"
                    />
                </div>

                {/* FILTER PILLS */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* DATE FILTER */}
                    <div className="flex items-center bg-zinc-100 p-0.5 rounded-xl text-[11px] font-semibold text-zinc-600">
                        {(['all', 'today', 'yesterday', 'week'] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setDateRange(r)}
                                className={`px-2.5 py-1 rounded-lg transition-all capitalize cursor-pointer ${
                                    dateRange === r ? 'bg-white text-zinc-900 shadow-2xs font-bold' : 'hover:text-zinc-900'
                                }`}
                            >
                                {r === 'all' ? 'All Dates' : r === 'week' ? 'This Week' : r}
                            </button>
                        ))}
                    </div>

                    {/* PAYMENT METHOD FILTER */}
                    <div className="flex items-center bg-zinc-100 p-0.5 rounded-xl text-[11px] font-semibold text-zinc-600">
                        {(['ALL', 'CASH', 'UPI', 'CARD'] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => setPaymentFilter(m)}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    paymentFilter === m ? 'bg-[#065F46] text-white shadow-2xs font-bold' : 'hover:text-zinc-900'
                                }`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* LEDGER BILLS TABLE */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between">
                {loading ? (
                    <div className="py-20 text-center">
                        <div className="w-6 h-6 border-2 border-zinc-200 border-t-[#065F46] rounded-full animate-spin mx-auto mb-2" />
                        <span className="text-xs font-medium text-zinc-500">Loading ledger records...</span>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="py-16 text-center space-y-2">
                        <p className="text-xs font-semibold text-zinc-600">No matching bills found.</p>
                        <p className="text-[11px] text-zinc-400">Try adjusting your search or date filters above.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-zinc-50 border-b border-zinc-200/80 text-zinc-500 uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="py-3 px-4 text-left">Bill No / Inv</th>
                                    <th className="py-3 px-4 text-left">Date & Time</th>
                                    <th className="py-3 px-4 text-center">Table</th>
                                    <th className="py-3 px-4 text-left">Customer</th>
                                    <th className="py-3 px-4 text-center">Payment</th>
                                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                                    <th className="py-3 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 bg-white">
                                {paginatedOrders.map((record) => {
                                    const d = new Date(record.closedAt);
                                    const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                                    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

                                    return (
                                        <tr key={record.id} className="hover:bg-zinc-50/80 transition-colors">
                                            
                                            {/* PROMINENT BILL NO & INVOICE */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200 font-mono">
                                                        {record.billNo || record.invoiceNo}
                                                    </span>
                                                    {record.version && record.version > 1 && (
                                                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[9px] font-bold border border-amber-200">
                                                            v{record.version}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
                                                        {record.invoiceNo}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="py-3 px-4 text-zinc-600">
                                                <span>{dateStr}</span>
                                                <span className="text-[10px] text-zinc-400 block font-mono">{timeStr}</span>
                                            </td>

                                            <td className="py-3 px-4 text-center">
                                                <span className="px-2 py-0.5 bg-zinc-100 font-bold text-zinc-700 rounded text-[11px]">
                                                    {record.tableCode}
                                                </span>
                                            </td>

                                            <td className="py-3 px-4 font-semibold text-zinc-800">
                                                {record.customerName}
                                                {record.customerPhone && (
                                                    <span className="text-[10px] font-mono text-zinc-400 block font-normal">{record.customerPhone}</span>
                                                )}
                                            </td>

                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                    record.paymentMethod === 'CASH'
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                                        : record.paymentMethod === 'CARD'
                                                        ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                                                        : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                                }`}>
                                                    {record.paymentMethod}
                                                </span>
                                            </td>

                                            <td className="py-3 px-4 text-right font-bold text-zinc-900 text-sm">
                                                ₹{record.grandTotal.toFixed(2)}
                                            </td>

                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {/* EDIT BILL */}
                                                    <button
                                                        onClick={() => router.push(`/billing/pos/${record.tableId}?orderId=${record.id}`)}
                                                        className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                                        title="Modify items on this bill"
                                                    >
                                                        <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                        <span>Edit</span>
                                                    </button>

                                                    {/* REPRINT BILL */}
                                                    <button
                                                        onClick={() => router.push(`/billing/pos/${record.tableId}/bill/${record.id}`)}
                                                        className="px-2.5 py-1 bg-[#065F46] hover:bg-[#044E39] text-white text-[11px] font-semibold rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                                                        title="Reprint thermal receipt"
                                                    >
                                                        <svg className="w-3 h-3 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                {/* PAGINATION FOOTER */}
                {orders.length > 0 && (
                    <div className="p-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
                        <div className="flex items-center gap-2">
                            <span>
                                Showing <span className="font-bold text-zinc-800">{((currentPage - 1) * pageSize) + 1}</span>–
                                <span className="font-bold text-zinc-800">{Math.min(currentPage * pageSize, orders.length)}</span> of{' '}
                                <span className="font-bold text-zinc-800">{orders.length}</span> bills
                            </span>
                            <span className="text-zinc-300">|</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-0.5 text-xs text-zinc-700 outline-none"
                            >
                                <option value={15}>15 per page</option>
                                <option value={25}>25 per page</option>
                                <option value={50}>50 per page</option>
                            </select>
                        </div>

                        {/* PAGE CONTROLS */}
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-40 disabled:pointer-events-none font-medium transition-all cursor-pointer"
                            >
                                Previous
                            </button>

                            <div className="flex items-center gap-1 px-1">
                                {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                                    let pageNum = idx + 1;
                                    if (totalPages > 5 && currentPage > 3) {
                                        pageNum = currentPage - 2 + idx;
                                        if (pageNum > totalPages) pageNum = totalPages - (4 - idx);
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                                                currentPage === pageNum
                                                    ? 'bg-[#065F46] text-white shadow-2xs'
                                                    : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-40 disabled:pointer-events-none font-medium transition-all cursor-pointer"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
