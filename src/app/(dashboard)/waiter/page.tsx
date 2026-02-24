
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// Types
// ============================================

interface TableData {
    id: string;
    tableCode: string;
    capacity: number;
    status: string;
    order?: OrderData;
}

interface OrderItem {
    id: string;
    itemName: string;
    quantity: number;
    status?: string;
}

interface OrderData {
    id: string;
    status: string;
    updatedAt: string;
    createdAt: string;
    customerName?: string;
    items: OrderItem[];
    version?: number;
    grandTotal?: number;
}

type FilterType = 'ALL' | 'VACANT' | 'ACTIVE' | 'READY' | 'SERVED' | 'NEEDS_ACTION';

// ============================================
// Status Theme
// ============================================

const getStatusTheme = (table: TableData) => {
    const orderStatus = table.order?.status;
    const tableStatus = table.status;

    if (tableStatus === 'DIRTY') return {
        id: 'DIRTY', label: 'Needs Cleaning', emoji: '🧹',
        accent: '#F59E0B', cardBg: 'bg-amber-50', cardBorder: 'border-amber-200',
        dotColor: 'bg-amber-400', textColor: 'text-amber-700', labelColor: 'text-amber-500',
    };
    if (orderStatus === 'READY') return {
        id: 'READY', label: 'Food Ready', emoji: '✅',
        accent: '#22C55E', cardBg: 'bg-green-50', cardBorder: 'border-green-300 shadow-lg shadow-green-100',
        dotColor: 'bg-green-500 animate-pulse', textColor: 'text-green-700', labelColor: 'text-green-500',
    };
    if (orderStatus === 'BILL_REQUESTED') return {
        id: 'BILL_REQ', label: 'Bill Requested', emoji: '🧾',
        accent: '#EF4444', cardBg: 'bg-red-50', cardBorder: 'border-red-200',
        dotColor: 'bg-red-500 animate-pulse', textColor: 'text-red-700', labelColor: 'text-red-500',
    };
    if (orderStatus === 'SERVED') return {
        id: 'SERVED', label: 'Dining', emoji: '🍽️',
        accent: '#71717A', cardBg: 'bg-zinc-50', cardBorder: 'border-zinc-200',
        dotColor: 'bg-zinc-400', textColor: 'text-zinc-700', labelColor: 'text-zinc-400',
    };
    if (orderStatus === 'NEW' || orderStatus === 'PREPARING') return {
        id: 'ACTIVE', label: 'In Kitchen', emoji: '🔥',
        accent: '#3B82F6', cardBg: 'bg-blue-50', cardBorder: 'border-blue-200',
        dotColor: 'bg-blue-500', textColor: 'text-blue-700', labelColor: 'text-blue-500',
    };

    return {
        id: 'VACANT', label: 'Available', emoji: '🪑',
        accent: '#D4D4D8', cardBg: 'bg-white', cardBorder: 'border-zinc-100',
        dotColor: 'bg-zinc-200', textColor: 'text-zinc-300', labelColor: 'text-zinc-300',
    };
};

// ============================================
// Time helper
// ============================================

const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
};

// ============================================
// Component
// ============================================

export default function WaiterDashboard() {
    const [tables, setTables] = useState<TableData[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);
    const [updatingTableId, setUpdatingTableId] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
    const [outOfStockItems, setOutOfStockItems] = useState<string[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Serve confirmation modal
    const [serveConfirmTable, setServeConfirmTable] = useState<TableData | null>(null);

    // Complaint alerts
    const [complaintAlerts, setComplaintAlerts] = useState<{ id: string; tableCode: string; type: string; guestName: string; timestamp: number }[]>([]);

    // ============================================
    // Data
    // ============================================

    const fetchData = useCallback(async () => {
        try {
            const [tablesRes, ordersRes, stockRes, userRes] = await Promise.all([
                fetch('/api/tables'),
                fetch('/api/orders?status=NEW,PREPARING,READY,SERVED,BILL_REQUESTED'),
                fetch('/api/kitchen/inventory'),
                fetch('/api/auth/me')
            ]);

            const [tData, oData, sData, uData] = await Promise.all([
                tablesRes.json(),
                ordersRes.json(),
                stockRes.json(),
                userRes.json()
            ]);

            if (uData.success) setCurrentUser(uData.user);

            if (tData.success && oData.success) {
                const mapped = tData.tables.map((t: any) => ({
                    ...t,
                    order: oData.orders?.find((o: any) => o.tableCode === t.tableCode)
                }));
                mapped.sort((a: any, b: any) => a.tableCode.localeCompare(b.tableCode, undefined, { numeric: true }));
                setTables(mapped);
            }

            if (sData.success) {
                const oos = sData.items.filter((i: any) => !i.isAvailable).map((i: any) => i.name);
                setOutOfStockItems(oos);
            }
        } catch (err) {
            console.error('[WAITER_FETCH] Error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchData();
        const interval = setInterval(fetchData, 8000);

        // SSE for real-time complaint alerts
        const es = new EventSource('/api/events');
        es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.event === 'COMPLAINT_RAISED') {
                    const p = data.payload;
                    setComplaintAlerts(prev => [{
                        id: p.complaintId || Date.now().toString(),
                        tableCode: p.tableCode,
                        type: p.type,
                        guestName: p.guestName || 'Guest',
                        timestamp: Date.now(),
                    }, ...prev].slice(0, 5)); // Keep last 5
                    setNotification(`🚨 Customer complaint at Table ${p.tableCode}: ${p.type.replace('_', ' ')}`);
                }
                if (data.event === 'ORDER_UPDATED') {
                    fetchData();
                }
            } catch { /* ignore */ }
        };

        return () => {
            clearInterval(interval);
            es.close();
        };
    }, [fetchData]);

    // ============================================
    // Actions
    // ============================================

    // Step 1: Show confirmation modal instead of directly marking served
    const handleMarkServedClick = (e: React.MouseEvent, table: TableData) => {
        e.preventDefault(); e.stopPropagation();
        if (!table.order || updatingTableId) return;
        setServeConfirmTable(table);
    };

    // Step 2: Actually mark served after confirmation
    const handleConfirmServed = async () => {
        const table = serveConfirmTable;
        if (!table?.order) return;
        setUpdatingTableId(table.id);
        setServeConfirmTable(null);
        try {
            const res = await fetch(`/api/orders/${table.order.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'SERVED', version: table.order.version || 1 }),
            });
            if (res.ok) {
                setNotification(`✓ Table ${table.tableCode} marked as served — customer will be asked to confirm`);
                fetchData();
            }
        } finally { setUpdatingTableId(null); }
    };

    const dismissComplaintAlert = (id: string) => {
        setComplaintAlerts(prev => prev.filter(a => a.id !== id));
    };

    const handleMarkCleaned = async (e: React.MouseEvent | null, tableId: string) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        setUpdatingTableId(tableId);
        try {
            const res = await fetch(`/api/tables/${tableId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'VACANT' }),
            });
            if (res.ok) {
                setNotification(`✓ Table reset to vacant`);
                fetchData();
            } else {
                const data = await res.json().catch(() => ({}));
                if (res.status === 401) {
                    setNotification('⚠ Session expired. Please log in again.');
                    setTimeout(() => window.location.href = '/auth/login', 1500);
                } else {
                    setNotification(`✗ Failed: ${data.error || 'Unknown error'}`);
                    console.error('[CLEAN TABLE] Error:', data);
                }
            }
        } catch (err) {
            console.error('[CLEAN TABLE] Network error:', err);
            setNotification('✗ Network error. Please try again.');
        } finally { setUpdatingTableId(null); }
    };

    // ============================================
    // Counts & Filters
    // ============================================

    const statusCounts = useMemo(() => {
        const counts = { VACANT: 0, ACTIVE: 0, READY: 0, SERVED: 0, BILL_REQ: 0, DIRTY: 0 };
        tables.forEach(t => {
            const theme = getStatusTheme(t);
            if (theme.id in counts) counts[theme.id as keyof typeof counts]++;
        });
        return counts;
    }, [tables]);

    const needsActionCount = statusCounts.READY + statusCounts.BILL_REQ + statusCounts.DIRTY;

    const filteredTables = useMemo(() => {
        if (activeFilter === 'ALL') return tables;
        return tables.filter(t => {
            const theme = getStatusTheme(t);
            if (activeFilter === 'VACANT') return theme.id === 'VACANT';
            if (activeFilter === 'ACTIVE') return theme.id === 'ACTIVE';
            if (activeFilter === 'READY') return theme.id === 'READY';
            if (activeFilter === 'SERVED') return theme.id === 'SERVED' || theme.id === 'BILL_REQ';
            if (activeFilter === 'NEEDS_ACTION') return theme.id === 'READY' || theme.id === 'BILL_REQ' || theme.id === 'DIRTY';
            return true;
        });
    }, [tables, activeFilter]);

    // ============================================
    // Render Guards
    // ============================================

    if (!mounted) return null;

    if (loading && tables.length === 0) return (
        <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-zinc-200 border-t-[#111] rounded-full animate-spin" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Loading tables...</span>
            </div>
        </div>
    );

    // ============================================
    // Filter config
    // ============================================

    const filters: { key: FilterType; label: string; count: number; color?: string }[] = [
        { key: 'ALL', label: 'All', count: tables.length },
        { key: 'NEEDS_ACTION', label: '⚡ Action', count: needsActionCount, color: needsActionCount > 0 ? 'text-red-500' : undefined },
        { key: 'ACTIVE', label: 'Cooking', count: statusCounts.ACTIVE },
        { key: 'SERVED', label: 'Dining', count: statusCounts.SERVED + statusCounts.BILL_REQ },
        { key: 'VACANT', label: 'Open', count: statusCounts.VACANT },
    ];

    return (
        <div className="h-full bg-[#FDFCF9] flex flex-col overflow-hidden font-sans">

            {/* ============================================ */}
            {/* HEADER */}
            {/* ============================================ */}
            <header className="shrink-0 bg-white border-b border-zinc-100">
                {/* Top Row */}
                <div className="px-4 md:px-8 pt-4 md:pt-6 pb-3 md:pb-4">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-zinc-900 tracking-tight">Floor View</h1>
                            <p className="text-[9px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                                {currentUser?.name || 'Staff'} · {tables.length} tables
                            </p>
                        </div>

                        {/* Live Status Chips — Desktop */}
                        <div className="hidden md:flex items-center gap-2">
                            {needsActionCount > 0 && (
                                <button
                                    onClick={() => setActiveFilter('NEEDS_ACTION')}
                                    className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold animate-pulse"
                                >
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                    {needsActionCount} Need Attention
                                </button>
                            )}
                            <div className="flex items-center gap-3 bg-zinc-50 px-3 py-1.5 rounded-lg">
                                <span className="flex items-center gap-1 text-[10px] font-bold text-blue-500">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />{statusCounts.ACTIVE}
                                </span>
                                <span className="flex items-center gap-1 text-[10px] font-bold text-green-500">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />{statusCounts.READY}
                                </span>
                                <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                                    <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full" />{statusCounts.SERVED}
                                </span>
                                <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-300">
                                    <span className="w-1.5 h-1.5 bg-zinc-200 rounded-full" />{statusCounts.VACANT}
                                </span>
                            </div>
                        </div>

                        {/* Mobile: Action Badge */}
                        <div className="md:hidden">
                            {needsActionCount > 0 && (
                                <button
                                    onClick={() => setActiveFilter('NEEDS_ACTION')}
                                    className="flex items-center gap-1.5 bg-red-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider"
                                >
                                    ⚡ {needsActionCount}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex overflow-x-auto no-scrollbar gap-1 -mx-1 px-1">
                        {filters.map(f => (
                            <button
                                key={f.key}
                                onClick={() => setActiveFilter(f.key)}
                                className={`shrink-0 flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeFilter === f.key
                                    ? 'bg-[#111] text-white shadow-sm'
                                    : `bg-zinc-100 hover:bg-zinc-200 ${f.color || 'text-zinc-500'}`
                                    }`}
                            >
                                {f.label}
                                <span className={`text-[9px] ${activeFilter === f.key ? 'text-white/50' : 'text-zinc-300'}`}>
                                    {f.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notifications */}
                <AnimatePresence>
                    {notification && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="mx-4 md:mx-8 mb-3 bg-emerald-500 text-white rounded-xl px-4 py-2.5 flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider">{notification}</span>
                                <button onClick={() => setNotification(null)} className="text-[9px] font-bold uppercase tracking-widest text-white/60 hover:text-white">Dismiss</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {outOfStockItems.length > 0 && !notification && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="mx-4 md:mx-8 mb-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-2.5 flex items-center gap-3">
                                <span className="text-xs">⚠️</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider flex-1 truncate">
                                    Stock: {outOfStockItems.join(', ')} — Unavailable
                                </span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* ============================================ */}
            {/* TABLE GRID */}
            {/* ============================================ */}
            <main className="grow overflow-y-auto px-4 md:px-8 py-4 md:py-6 no-scrollbar pb-28 md:pb-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                    <AnimatePresence mode="popLayout">
                        {filteredTables.map((table) => {
                            const theme = getStatusTheme(table);
                            const isUpdating = updatingTableId === table.id;
                            const order = table.order;
                            const itemCount = order?.items?.reduce((a, b) => a + b.quantity, 0) || 0;
                            const elapsed = order?.createdAt ? getTimeAgo(order.createdAt) : '';

                            return (
                                <motion.div
                                    key={table.id}
                                    layout
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="relative"
                                >
                                    {theme.id === 'DIRTY' ? (
                                        /* DIRTY tables: no Link wrapper — Clean button is the primary action */
                                        <div
                                            className={`block p-4 md:p-5 rounded-2xl border-2 transition-all h-full ${isUpdating ? 'opacity-50 pointer-events-none' : ''} ${theme.cardBg} ${theme.cardBorder}`}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <span className="text-2xl md:text-3xl font-black tracking-tighter text-zinc-900">
                                                    {table.tableCode.replace('T-', '')}
                                                </span>
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${theme.dotColor}`} />
                                                </div>
                                            </div>
                                            <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${theme.labelColor}`}>
                                                {theme.label}
                                            </p>
                                            <div className="mt-3">
                                                <button
                                                    onClick={() => handleMarkCleaned(null, table.id)}
                                                    disabled={isUpdating}
                                                    className="w-full text-center text-[9px] font-black text-white bg-amber-500 uppercase tracking-widest py-2.5 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
                                                >
                                                    {isUpdating ? '⏳ Cleaning...' : '🧹 Clean'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Link
                                            href={
                                                theme.id === 'VACANT'
                                                    ? `/waiter/table/${table.id}/menu`
                                                    : theme.id === 'BILL_REQ'
                                                        ? (currentUser?.plan === 'STARTER'
                                                            ? `/waiter/table/${table.id}/bill`
                                                            : `/waiter/table/${table.id}`)
                                                        : `/waiter/table/${table.id}`
                                            }
                                            className={`block p-4 md:p-5 rounded-2xl border-2 transition-all h-full ${isUpdating ? 'opacity-50 pointer-events-none' : 'active:scale-[0.97]'} ${theme.cardBg} ${theme.cardBorder}`}
                                        >
                                            {/* Top Row: Table Number + Status Dot */}
                                            <div className="flex items-start justify-between mb-2">
                                                <span className={`text-2xl md:text-3xl font-black tracking-tighter ${theme.id === 'VACANT' ? 'text-zinc-200' : 'text-zinc-900'}`}>
                                                    {table.tableCode.replace('T-', '')}
                                                </span>
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${theme.dotColor}`} />
                                                    {elapsed && (
                                                        <span className="text-[8px] font-bold text-zinc-400 tabular-nums">{elapsed}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Status Label */}
                                            <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${theme.labelColor}`}>
                                                {theme.label}
                                            </p>

                                            {/* Order Info */}
                                            {order && (
                                                <div className="mt-2 space-y-1">
                                                    {order.customerName && (
                                                        <p className="text-[10px] font-bold text-zinc-600 truncate">
                                                            👤 {order.customerName}
                                                        </p>
                                                    )}
                                                    <p className="text-[9px] font-medium text-zinc-400">
                                                        {itemCount} item{itemCount !== 1 ? 's' : ''}
                                                        {order.grandTotal ? ` · ₹${order.grandTotal.toLocaleString()}` : ''}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Capacity (vacant only) */}
                                            {theme.id === 'VACANT' && (
                                                <p className="text-[9px] font-medium text-zinc-300 mt-2">
                                                    👥 {table.capacity} seats
                                                </p>
                                            )}

                                            {/* Quick Action */}
                                            <div className="mt-3">
                                                {theme.id === 'VACANT' ? (
                                                    <div className="w-full text-center text-[9px] font-black text-white bg-[#111] uppercase tracking-widest py-2.5 rounded-xl">
                                                        + New Order
                                                    </div>
                                                ) : theme.id === 'READY' ? (
                                                    <button
                                                        onClick={(e) => handleMarkServedClick(e, table)}
                                                        className="w-full text-center text-[9px] font-black text-white bg-green-500 uppercase tracking-widest py-2.5 rounded-xl shadow-md shadow-green-200 active:scale-95 transition-transform"
                                                    >
                                                        ✓ Serve Now
                                                    </button>
                                                ) : theme.id === 'BILL_REQ' ? (
                                                    currentUser?.plan === 'STARTER'
                                                        ? <div className="w-full text-center text-[9px] font-black text-white bg-red-500 uppercase tracking-widest py-2.5 rounded-xl animate-pulse">💳 Collect Payment</div>
                                                        : <div className="w-full text-center text-[9px] font-black text-amber-700 bg-amber-100 border border-amber-200 uppercase tracking-widest py-2.5 rounded-xl">⏳ With Cashier</div>
                                                ) : (
                                                    <div className="w-full text-center text-[9px] font-bold text-zinc-400 bg-white border border-zinc-100 uppercase tracking-widest py-2.5 rounded-xl">
                                                        View →
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* Empty state */}
                {filteredTables.length === 0 && (
                    <div className="py-20 text-center">
                        <span className="text-4xl block mb-3 opacity-20">🍽️</span>
                        <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">No tables in this view</p>
                        <button
                            onClick={() => setActiveFilter('ALL')}
                            className="text-[10px] font-bold text-emerald-500 underline underline-offset-4"
                        >Show all tables</button>
                    </div>
                )}
            </main>

            {/* ============================================ */}
            {/* MOBILE: STATUS BAR (above nav) */}
            {/* ============================================ */}
            <div className="md:hidden fixed bottom-20 left-0 right-0 z-30">
                <div className="mx-4 bg-white/90 backdrop-blur-lg border border-zinc-100 rounded-xl px-3 py-2 flex items-center justify-around shadow-sm">
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-blue-500 tabular-nums">{statusCounts.ACTIVE}</span>
                        <span className="text-[7px] font-bold text-zinc-400 uppercase tracking-wider">Kitchen</span>
                    </div>
                    <div className="w-px h-5 bg-zinc-100" />
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-green-500 tabular-nums">{statusCounts.READY}</span>
                        <span className="text-[7px] font-bold text-zinc-400 uppercase tracking-wider">Ready</span>
                    </div>
                    <div className="w-px h-5 bg-zinc-100" />
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-zinc-400 tabular-nums">{statusCounts.SERVED}</span>
                        <span className="text-[7px] font-bold text-zinc-400 uppercase tracking-wider">Dining</span>
                    </div>
                    <div className="w-px h-5 bg-zinc-100" />
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-zinc-300 tabular-nums">{statusCounts.VACANT}</span>
                        <span className="text-[7px] font-bold text-zinc-400 uppercase tracking-wider">Open</span>
                    </div>
                </div>
            </div>

            {/* ============================================ */}
            {/* COMPLAINT ALERTS BANNER */}
            {/* ============================================ */}
            <AnimatePresence>
                {complaintAlerts.length > 0 && (
                    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-xs">
                        {complaintAlerts.map(alert => (
                            <motion.div
                                key={alert.id}
                                initial={{ opacity: 0, x: 100, scale: 0.8 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 100, scale: 0.8 }}
                                className="bg-red-50 border border-red-200 rounded-2xl p-3 shadow-xl shadow-red-100/50 flex items-start gap-2"
                            >
                                <span className="text-lg">🚨</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-red-700 uppercase tracking-wider">Table {alert.tableCode}</p>
                                    <p className="text-[9px] text-red-500 mt-0.5">{alert.guestName} — {alert.type.replace('_', ' ')}</p>
                                </div>
                                <button
                                    onClick={() => dismissComplaintAlert(alert.id)}
                                    className="text-red-300 hover:text-red-500 text-xs"
                                >
                                    ✕
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* ============================================ */}
            {/* SERVE CONFIRMATION MODAL */}
            {/* ============================================ */}
            <AnimatePresence>
                {serveConfirmTable && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setServeConfirmTable(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center mb-5">
                                <span className="text-4xl">🍽️</span>
                                <h3 className="text-lg font-black text-zinc-900 mt-2">Confirm Serve</h3>
                                <p className="text-[11px] text-zinc-400 mt-1">
                                    Mark Table {serveConfirmTable!.tableCode} as served?
                                </p>
                            </div>

                            {/* Items checklist */}
                            <div className="bg-zinc-50 rounded-2xl p-4 mb-5 space-y-2">
                                {serveConfirmTable!.order?.items.map(item => (
                                    <div key={item.id} className="flex items-center gap-2">
                                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] ${item.status === 'READY' || item.status === 'SERVED'
                                            ? 'bg-green-500 text-white' : 'bg-zinc-200 text-zinc-400'
                                            }`}>
                                            ✓
                                        </span>
                                        <span className="text-[11px] font-bold text-zinc-700 flex-1">
                                            {item.quantity}× {item.itemName}
                                        </span>
                                        <span className={`text-[8px] font-black uppercase tracking-wider ${item.status === 'READY' ? 'text-green-500' :
                                            item.status === 'SERVED' ? 'text-blue-500' :
                                                item.status === 'PREPARING' ? 'text-orange-500' : 'text-zinc-300'
                                            }`}>
                                            {item.status || 'PENDING'}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <p className="text-[9px] text-zinc-400 text-center mb-4 italic">
                                The customer will be asked to confirm receipt on their device.
                            </p>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setServeConfirmTable(null)}
                                    className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-transform"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmServed}
                                    disabled={!!updatingTableId}
                                    className="flex-1 py-3 bg-green-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-green-200 active:scale-95 transition-transform disabled:opacity-50"
                                >
                                    ✓ Confirm & Serve
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
