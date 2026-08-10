'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

type TimeRange = 'TODAY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

interface StatsData {
    totalBills: number;
    totalRevenue: number;
    avgOrderValue: number;
    cashRevenue: number;
    upiRevenue: number;
    cardRevenue: number;
    chartData: { label: string; count: number; revenue: number }[];
    recentBills: {
        id: string;
        tableCode: string;
        grandTotal: number;
        closedAt: string;
        paymentMethod: string;
    }[];
}

export default function BillingDashboard() {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [time, setTime] = useState('');
    const [timeRange, setTimeRange] = useState<TimeRange>('TODAY');

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const [tablesRes, ordersRes] = await Promise.all([
                fetch('/api/tables'),
                fetch('/api/orders?status=CLOSED&limit=200'),
            ]);
            const [tablesData, ordersData] = await Promise.all([
                tablesRes.json(),
                ordersRes.json(),
            ]);

            const orders = ordersData.orders || [];

            // Compute Date Cutoff based on timeRange
            const now = new Date();
            let startDate = new Date();

            if (timeRange === 'TODAY') {
                startDate.setHours(0, 0, 0, 0);
            } else if (timeRange === 'WEEKLY') {
                startDate.setDate(now.getDate() - 7);
                startDate.setHours(0, 0, 0, 0);
            } else if (timeRange === 'MONTHLY') {
                startDate.setDate(now.getDate() - 30);
                startDate.setHours(0, 0, 0, 0);
            } else if (timeRange === 'YEARLY') {
                startDate = new Date(now.getFullYear(), 0, 1);
            }

            // Filter orders in range
            const filteredOrders = orders.filter((o: any) => {
                const closedAt = o.closedAt ? new Date(o.closedAt) : new Date(o.updatedAt);
                return closedAt >= startDate;
            });

            const totalRev = filteredOrders.reduce((sum: number, o: any) => sum + Number(o.grandTotal || 0), 0);
            const count = filteredOrders.length;
            const aov = count > 0 ? Math.round(totalRev / count) : 0;

            let cashRev = 0;
            let upiRev = 0;
            let cardRev = 0;

            filteredOrders.forEach((o: any) => {
                const amt = Number(o.grandTotal || 0);
                if (o.paymentMethod === 'UPI') upiRev += amt;
                else if (o.paymentMethod === 'CARD') cardRev += amt;
                else cashRev += amt;
            });

            // Prepare Chart Data based on timeRange
            let chartArr: { label: string; count: number; revenue: number }[] = [];

            if (timeRange === 'TODAY') {
                const hoursMap: Record<string, { count: number; revenue: number }> = {};
                for (let h = 8; h <= 23; h++) {
                    const label = `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`;
                    hoursMap[label] = { count: 0, revenue: 0 };
                }

                filteredOrders.forEach((o: any) => {
                    const d = new Date(o.closedAt || o.updatedAt);
                    const h = d.getHours();
                    if (h >= 8 && h <= 23) {
                        const label = `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`;
                        hoursMap[label].count += 1;
                        hoursMap[label].revenue += Number(o.grandTotal || 0);
                    }
                });

                chartArr = Object.keys(hoursMap).map(label => ({
                    label,
                    count: hoursMap[label].count,
                    revenue: hoursMap[label].revenue,
                }));
            } else if (timeRange === 'WEEKLY') {
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const daysMap: Record<string, { count: number; revenue: number }> = {};
                
                // Last 7 days in order
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(now.getDate() - i);
                    const dayLabel = days[d.getDay()];
                    daysMap[dayLabel] = { count: 0, revenue: 0 };
                }

                filteredOrders.forEach((o: any) => {
                    const d = new Date(o.closedAt || o.updatedAt);
                    const dayLabel = days[d.getDay()];
                    if (daysMap[dayLabel]) {
                        daysMap[dayLabel].count += 1;
                        daysMap[dayLabel].revenue += Number(o.grandTotal || 0);
                    }
                });

                chartArr = Object.keys(daysMap).map(label => ({
                    label,
                    count: daysMap[label].count,
                    revenue: daysMap[label].revenue,
                }));
            } else if (timeRange === 'MONTHLY') {
                const weeksMap: Record<string, { count: number; revenue: number }> = {
                    'W1 (1-7)': { count: 0, revenue: 0 },
                    'W2 (8-14)': { count: 0, revenue: 0 },
                    'W3 (15-21)': { count: 0, revenue: 0 },
                    'W4 (22-31)': { count: 0, revenue: 0 },
                };

                filteredOrders.forEach((o: any) => {
                    const d = new Date(o.closedAt || o.updatedAt);
                    const dateNum = d.getDate();
                    let key = 'W4 (22-31)';
                    if (dateNum <= 7) key = 'W1 (1-7)';
                    else if (dateNum <= 14) key = 'W2 (8-14)';
                    else if (dateNum <= 21) key = 'W3 (15-21)';
                    
                    weeksMap[key].count += 1;
                    weeksMap[key].revenue += Number(o.grandTotal || 0);
                });

                chartArr = Object.keys(weeksMap).map(label => ({
                    label,
                    count: weeksMap[label].count,
                    revenue: weeksMap[label].revenue,
                }));
            } else if (timeRange === 'YEARLY') {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthsMap: Record<string, { count: number; revenue: number }> = {};
                months.forEach(m => monthsMap[m] = { count: 0, revenue: 0 });

                filteredOrders.forEach((o: any) => {
                    const d = new Date(o.closedAt || o.updatedAt);
                    const mLabel = months[d.getMonth()];
                    monthsMap[mLabel].count += 1;
                    monthsMap[mLabel].revenue += Number(o.grandTotal || 0);
                });

                chartArr = months.map(label => ({
                    label,
                    count: monthsMap[label].count,
                    revenue: monthsMap[label].revenue,
                }));
            }

            setStats({
                totalBills: count,
                totalRevenue: totalRev,
                avgOrderValue: aov,
                cashRevenue: cashRev,
                upiRevenue: upiRev,
                cardRevenue: cardRev,
                chartData: chartArr,
                recentBills: orders.slice(0, 6).map((o: any) => ({
                    id: o.id,
                    tableCode: o.tableCode || o.table?.tableCode || '—',
                    grandTotal: Number(o.grandTotal || 0),
                    closedAt: o.closedAt || o.updatedAt,
                    paymentMethod: o.paymentMethod || 'CASH',
                })),
            });
        } catch (err) {
            console.error('[BILLING_DASHBOARD]', err);
        } finally {
            setLoading(false);
        }
    }, [timeRange]);

    useEffect(() => {
        setMounted(true);
        fetchStats();
        const tick = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    }, [fetchStats]);

    if (!mounted) return null;

    const maxRevenueInChart = Math.max(...(stats?.chartData.map(h => h.revenue) || [1]));

    const timeRangeLabels: Record<TimeRange, string> = {
        TODAY: "Today's",
        WEEKLY: "This Week's",
        MONTHLY: "This Month's",
        YEARLY: "This Year's",
    };

    return (
        <div className="h-full bg-[#F8F9FA] flex flex-col overflow-y-auto font-sans text-zinc-800">

            {/* EXECUTIVE HEADER */}
            <header className="shrink-0 bg-white border-b border-zinc-200/80 px-6 md:px-8 py-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-zinc-900 tracking-tight">Executive Dashboard</h1>
                        <p className="text-xs text-zinc-500 font-medium mt-0.5">
                            Real-time Revenue Analytics & Billing Ledger
                        </p>
                    </div>

                    {/* TIME RANGE FILTER TABS */}
                    <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-xl border border-zinc-200/60">
                        {(['TODAY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as TimeRange[]).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    timeRange === range
                                        ? 'bg-white text-[#065F46] shadow-2xs'
                                        : 'text-zinc-500 hover:text-zinc-900'
                                }`}
                            >
                                {range === 'TODAY' ? 'Today' : range === 'WEEKLY' ? 'Weekly' : range === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* DASHBOARD CONTENT */}
            <main className="grow px-6 md:px-8 py-6 space-y-6 pb-28 md:pb-8">

                {/* 3 BUSINESS METRIC CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    
                    {/* Revenue Card */}
                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                {timeRangeLabels[timeRange]} Revenue
                            </span>
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-zinc-900 tracking-tight">
                            ₹{(stats?.totalRevenue ?? 0).toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs font-medium text-emerald-700 mt-1">
                            Settled Invoices
                        </p>
                    </div>

                    {/* Total Bills Card */}
                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                {timeRangeLabels[timeRange]} Total Bills
                            </span>
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-zinc-900 tracking-tight">
                            {stats?.totalBills ?? 0}
                        </p>
                        <p className="text-xs font-medium text-zinc-500 mt-1">
                            Closed Transactions
                        </p>
                    </div>

                    {/* Avg Order Value Card */}
                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                Avg Bill Value (AOV)
                            </span>
                            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-zinc-900 tracking-tight">
                            ₹{(stats?.avgOrderValue ?? 0).toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs font-medium text-zinc-500 mt-1">
                            Average Ticket Size
                        </p>
                    </div>

                </div>

                {/* BUSINESS ANALYTICS: SALES TREND & PAYMENT DISTRIBUTION */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* DYNAMIC SALES TREND BAR CHART */}
                    <div className="lg:col-span-2 bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-900">
                                        {timeRange === 'TODAY' ? 'Hourly Sales Trend' : timeRange === 'WEEKLY' ? 'Daily Sales Pattern' : timeRange === 'MONTHLY' ? 'Weekly Sales Breakdown' : 'Monthly Sales Trend'}
                                    </h3>
                                    <p className="text-xs text-zinc-500 font-normal mt-0.5">
                                        Revenue distribution for selected period ({timeRange.toLowerCase()})
                                    </p>
                                </div>
                                <span className="px-2.5 py-1 bg-emerald-50 text-[#065F46] rounded-md text-[11px] font-bold">
                                    {timeRange}
                                </span>
                            </div>

                            {/* BAR CHART GRAPH */}
                            <div className="h-48 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-zinc-100 overflow-x-auto no-scrollbar">
                                {loading ? (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-zinc-200 border-t-[#065F46] rounded-full animate-spin" />
                                    </div>
                                ) : (
                                    stats?.chartData.map((item, idx) => {
                                        const heightPct = maxRevenueInChart > 0 ? Math.max(8, (item.revenue / maxRevenueInChart) * 100) : 8;
                                        return (
                                            <div key={idx} className="flex-1 min-w-6 flex flex-col items-center gap-2 group relative">
                                                {/* Tooltip */}
                                                <div className="absolute -top-8 opacity-0 group-hover:opacity-100 bg-zinc-900 text-white text-[10px] font-bold py-1 px-2 rounded pointer-events-none transition-all z-20 whitespace-nowrap shadow-md">
                                                    ₹{item.revenue} ({item.count} bills)
                                                </div>

                                                <div className="w-full bg-zinc-100 rounded-t-md relative overflow-hidden flex items-end h-32">
                                                    <div
                                                        className="w-full bg-[#065F46] rounded-t-md transition-all duration-500 group-hover:bg-emerald-600"
                                                        style={{ height: `${heightPct}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-medium text-zinc-400 truncate max-w-full">{item.label}</span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className="pt-3 flex items-center justify-between text-xs text-zinc-500 font-medium">
                            <span>Interactive hover tooltips active</span>
                            <span className="font-bold text-zinc-800">Peak Collection: ₹{maxRevenueInChart.toLocaleString('en-IN')}</span>
                        </div>
                    </div>

                    {/* PAYMENT METHOD BREAKDOWN */}
                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-zinc-900 mb-1">Payment Method Split</h3>
                            <p className="text-xs text-zinc-500 font-normal mb-5">Collection breakdown by tender type</p>

                            <div className="space-y-4">
                                {/* CASH */}
                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1">
                                        <span className="text-zinc-700 flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                                            Cash Collection
                                        </span>
                                        <span className="text-zinc-900 font-bold">₹{(stats?.cashRevenue ?? 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-600 rounded-full"
                                            style={{ width: `${stats?.totalRevenue ? ((stats.cashRevenue / stats.totalRevenue) * 100) : 0}%` }}
                                        />
                                    </div>
                                </div>

                                {/* UPI */}
                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1">
                                        <span className="text-zinc-700 flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                                            UPI / QR Payment
                                        </span>
                                        <span className="text-zinc-900 font-bold">₹{(stats?.upiRevenue ?? 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-600 rounded-full"
                                            style={{ width: `${stats?.totalRevenue ? ((stats.upiRevenue / stats.totalRevenue) * 100) : 0}%` }}
                                        />
                                    </div>
                                </div>

                                {/* CARD */}
                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1">
                                        <span className="text-zinc-700 flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                                            Card / POS Swipe
                                        </span>
                                        <span className="text-zinc-900 font-bold">₹{(stats?.cardRevenue ?? 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-purple-600 rounded-full"
                                            style={{ width: `${stats?.totalRevenue ? ((stats.cardRevenue / stats.totalRevenue) * 100) : 0}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-100 mt-4 flex items-center justify-between text-xs">
                            <span className="text-zinc-500 font-medium">Digital vs Cash</span>
                            <span className="font-bold text-zinc-900">
                                {stats?.totalRevenue ? Math.round(((stats.upiRevenue + stats.cardRevenue) / stats.totalRevenue) * 100) : 0}% Digital
                            </span>
                        </div>
                    </div>

                </div>

                {/* NAVIGATION CARDS & RECENT BILLS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* NAVIGATION CARDS */}
                    <div className="space-y-3">
                        <Link
                            href="/billing/pos"
                            className="bg-zinc-900 text-white rounded-2xl p-5 flex items-center justify-between hover:bg-black transition-all shadow-2xs group"
                        >
                            <div>
                                <p className="text-sm font-bold tracking-wide">Start Quick Billing</p>
                                <p className="text-xs text-zinc-400 mt-0.5">Instant cashier table order terminal</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform text-sm font-bold">
                                →
                            </div>
                        </Link>

                        <Link
                            href="/billing/history"
                            className="bg-white border border-zinc-200/80 text-zinc-900 rounded-2xl p-5 flex items-center justify-between hover:border-zinc-300 transition-all shadow-2xs group"
                        >
                            <div>
                                <p className="text-sm font-bold tracking-wide">Sales Ledger & History</p>
                                <p className="text-xs text-zinc-500 mt-0.5">Audit past bills & reprint receipts</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center group-hover:translate-x-1 transition-transform text-sm font-bold">
                                →
                            </div>
                        </Link>
                    </div>

                    {/* RECENT BILLS */}
                    <div className="md:col-span-2 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
                        <div className="px-6 py-4 border-b border-zinc-200/80 flex items-center justify-between">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700">Recent Settled Invoices</h2>
                            <Link href="/billing/history" className="text-xs font-semibold text-[#065F46] hover:underline">
                                View Full Ledger →
                            </Link>
                        </div>

                        {loading ? (
                            <div className="py-12 flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-zinc-200 border-t-[#065F46] rounded-full animate-spin" />
                            </div>
                        ) : !stats?.recentBills.length ? (
                            <div className="py-12 text-center">
                                <p className="text-xs font-semibold text-zinc-400">No settled bills yet in this timeframe.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-100">
                                {stats.recentBills.map((bill) => (
                                    <div key={bill.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-zinc-50/80 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                bill.paymentMethod === 'CASH' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                                            }`}>
                                                {bill.paymentMethod}
                                            </span>
                                            <div>
                                                <p className="text-xs font-bold text-zinc-900">Table {bill.tableCode}</p>
                                                <p className="text-[10px] text-zinc-400 font-mono">
                                                    {new Date(bill.closedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-zinc-900">₹{bill.grandTotal.toLocaleString('en-IN')}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

            </main>
        </div>
    );
}
