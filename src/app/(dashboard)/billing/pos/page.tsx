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
    section?: string;
    draftCount?: number;
    activeOrder?: {
        id: string;
        grandTotal: number;
        itemCount: number;
        createdAt: string;
    };
}

type FilterType = 'ALL' | 'VACANT' | 'ACTIVE';

const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

export default function BillingPOSPage() {
    const [tables, setTables] = useState<TableData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
    const [activeSection, setActiveSection] = useState<string>('ALL');
    const [notification, setNotification] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [cleaningId, setCleaningId] = useState<string | null>(null);

    const fetchTables = useCallback(async () => {
        try {
            const [tablesRes, ordersRes] = await Promise.all([
                fetch(`/api/tables?t=${Date.now()}`),
                fetch(`/api/orders?status=NEW,PREPARING,READY,SERVED,BILL_REQUESTED&t=${Date.now()}`),
            ]);
            const [tablesData, ordersData] = await Promise.all([tablesRes.json(), ordersRes.json()]);

            if (tablesData.success) {
                const orders = ordersData.orders || [];
                const mapped: TableData[] = tablesData.tables.map((t: Record<string, unknown>) => {
                    const order = orders.find((o: Record<string, unknown>) => o.tableId === t.id || o.tableCode === t.tableCode);
                    let draftCount = 0;
                    if (typeof window !== 'undefined') {
                        try {
                            const saved = localStorage.getItem(`hotelpro_draft_cart_${t.id}`);
                            if (saved) {
                                const parsed = JSON.parse(saved);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                    draftCount = parsed.reduce((sum: number, item: Record<string, unknown>) => sum + (Number(item.quantity) || 1), 0);
                                }
                            }
                        } catch {}
                    }
                    return {
                        id: t.id,
                        tableCode: t.tableCode,
                        capacity: t.capacity || 4,
                        status: t.status,
                        section: t.section || 'Main Floor',
                        draftCount,
                        activeOrder: order ? {
                            id: order.id,
                            grandTotal: Number(order.grandTotal || 0),
                            itemCount: order.items?.length || 0,
                            createdAt: order.createdAt,
                        } : undefined,
                    };
                });
                mapped.sort((a, b) => a.tableCode.localeCompare(b.tableCode, undefined, { numeric: true }));
                setTables(mapped);
            }
        } catch (err) {
            console.error('[BILLING_POS]', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchTables();
        const interval = setInterval(fetchTables, 8000);
        return () => clearInterval(interval);
    }, [fetchTables]);

    const handleClean = async (tableId: string) => {
        setCleaningId(tableId);
        try {
            await fetch(`/api/tables/${tableId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'VACANT' }),
            });
            setNotification('Table reset to vacant');
            fetchTables();
        } finally {
            setCleaningId(null);
        }
    };

    // Extract unique sections dynamically
    const sections = useMemo(() => {
        const set = new Set<string>();
        tables.forEach(t => {
            if (t.section) set.add(t.section);
        });
        const list = Array.from(set);
        list.sort();
        return ['ALL', ...list];
    }, [tables]);

    const counts = useMemo(() => ({
        VACANT: tables.filter(t => !t.activeOrder && t.status !== 'DIRTY').length,
        ACTIVE: tables.filter(t => !!t.activeOrder).length,
    }), [tables]);

    const filtered = useMemo(() => {
        return tables.filter(t => {
            const matchesStatus = activeFilter === 'ALL'
                ? true
                : activeFilter === 'VACANT'
                ? (!t.activeOrder && t.status !== 'DIRTY')
                : (!!t.activeOrder);

            const matchesSection = activeSection === 'ALL' || (t.section || 'Main Floor') === activeSection;

            return matchesStatus && matchesSection;
        });
    }, [tables, activeFilter, activeSection]);

    const getCleanTableCode = (code?: string) => {
        if (!code) return 'Table';
        return String(code).replace(/\s*\([^)]*\)/g, '').trim();
    };

    if (!mounted) return null;

    if (loading && tables.length === 0) return (
        <div className="h-full flex items-center justify-center bg-[#F8F9FA]">
            <div className="flex flex-col items-center gap-3">
                <div className="w-7 h-7 border-2 border-zinc-200 border-t-[#065F46] rounded-full animate-spin" />
                <span className="text-xs font-medium text-zinc-500">Loading tables...</span>
            </div>
        </div>
    );

    const filters: { key: FilterType; label: string; count: number }[] = [
        { key: 'ALL', label: 'All Tables', count: tables.length },
        { key: 'ACTIVE', label: 'Occupied', count: counts.ACTIVE },
        { key: 'VACANT', label: 'Available', count: counts.VACANT },
    ];

    return (
        <div className="h-full bg-[#F8F9FA] flex flex-col overflow-hidden font-sans text-zinc-800">

            {/* HEADER */}
            <header className="shrink-0 bg-white border-b border-zinc-200/80 px-6 md:px-8 py-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Billing POS</h1>
                        <p className="text-xs text-zinc-500 font-normal mt-0.5">
                            {tables.length} tables · Select a table to bill or view live order
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200/80">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <span className="w-2 h-2 bg-emerald-600 rounded-full" />{counts.ACTIVE} Occupied
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                            <span className="w-2 h-2 bg-zinc-300 rounded-full" />{counts.VACANT} Available
                        </span>
                    </div>
                </div>

                {/* Section / Floor Filter Pills & Status Filter Pills */}
                <div className="flex flex-col gap-2">
                    {sections.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1 shrink-0">Floor:</span>
                            {sections.map(sec => (
                                <button
                                    key={sec}
                                    onClick={() => setActiveSection(sec)}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                        activeSection === sec
                                            ? 'bg-zinc-900 text-white shadow-2xs'
                                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80'
                                    }`}
                                >
                                    {sec === 'ALL' ? 'All Floors' : sec}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1 shrink-0">Status:</span>
                        {filters.map(f => (
                            <button
                                key={f.key}
                                onClick={() => setActiveFilter(f.key)}
                                className={`px-3.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                    activeFilter === f.key
                                        ? 'bg-[#065F46] text-white font-semibold shadow-2xs'
                                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80'
                                }`}
                            >
                                {f.label} ({f.count})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Toast Notification */}
                <AnimatePresence>
                    {notification && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-3">
                            <div className="bg-zinc-900 text-white rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-medium">
                                <span>{notification}</span>
                                <button onClick={() => setNotification(null)} className="text-zinc-400 hover:text-white">Dismiss</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* TABLE GRID */}
            <main className="grow overflow-y-auto px-6 md:px-8 py-6 no-scrollbar pb-24 md:pb-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                    <AnimatePresence mode="popLayout">
                        {filtered.map((table) => {
                            const isOccupied = !!table.activeOrder;
                            const isDirty = table.status === 'DIRTY';
                            const hasDraft = !isOccupied && (table.draftCount || 0) > 0;

                            return (
                                <motion.div
                                    key={table.id}
                                    layout
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                >
                                    {isDirty ? (
                                        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col justify-between h-full shadow-2xs">
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xl font-bold text-zinc-900">{table.tableCode}</span>
                                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                                </div>
                                                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Needs Cleaning</p>
                                            </div>
                                            <button
                                                onClick={() => handleClean(table.id)}
                                                disabled={cleaningId === table.id}
                                                className="mt-3 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-all"
                                            >
                                                {cleaningId === table.id ? 'Cleaning...' : 'Mark Available'}
                                            </button>
                                        </div>
                                    ) : (
                                        <Link
                                            href={isOccupied && table.activeOrder ? `/billing/pos/${encodeURIComponent(table.tableCode)}/bill/${table.activeOrder.id}` : `/billing/pos/${encodeURIComponent(table.tableCode)}`}
                                            className={`p-4 rounded-xl border transition-all flex flex-col justify-between h-full shadow-2xs hover:border-zinc-300 ${
                                                isOccupied
                                                    ? 'border-emerald-200 bg-emerald-50/20'
                                                    : hasDraft
                                                    ? 'border-amber-300 bg-amber-50/30'
                                                    : 'border-zinc-200/80 bg-white'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xl font-bold text-zinc-900">{getCleanTableCode(table.tableCode)}</span>
                                                    <span className={`w-2 h-2 rounded-full ${isOccupied ? 'bg-emerald-600' : hasDraft ? 'bg-amber-500' : 'bg-zinc-300'}`} />
                                                </div>

                                                <p className={`text-[10px] font-bold uppercase tracking-wider ${isOccupied ? 'text-emerald-700' : hasDraft ? 'text-amber-700' : 'text-zinc-400'}`}>
                                                    {isOccupied ? 'Occupied' : hasDraft ? 'Draft Bill' : 'Available'}
                                                </p>

                                                {table.activeOrder && (
                                                    <div className="mt-2 space-y-0.5">
                                                        <p className="text-[11px] font-medium text-zinc-500">
                                                            {table.activeOrder.itemCount} items · {getTimeAgo(table.activeOrder.createdAt)}
                                                        </p>
                                                        {table.activeOrder.grandTotal > 0 && (
                                                            <p className="text-sm font-bold text-zinc-900 mt-0.5">₹{table.activeOrder.grandTotal.toLocaleString('en-IN')}</p>
                                                        )}
                                                    </div>
                                                )}

                                                {hasDraft && !table.activeOrder && (
                                                    <div className="mt-2 space-y-0.5">
                                                        <p className="text-[11px] font-semibold text-amber-800">
                                                            {table.draftCount} items in draft
                                                        </p>
                                                    </div>
                                                )}

                                                {!isOccupied && !hasDraft && (
                                                    <p className="text-[11px] font-medium text-zinc-400 mt-1 truncate">
                                                        {table.section || 'Main Floor'} · {table.capacity} Seats
                                                    </p>
                                                )}
                                            </div>

                                            <div className="mt-3">
                                                <div className={`w-full text-center text-xs font-semibold py-2 rounded-lg transition-all ${
                                                    isOccupied ? 'bg-[#065F46] text-white' : hasDraft ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                                                }`}>
                                                    {isOccupied ? 'View / Settle Bill' : hasDraft ? 'Resume Bill' : '+ New Bill'}
                                                </div>
                                            </div>
                                        </Link>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {filtered.length === 0 && (
                    <div className="bg-white border border-zinc-200/80 rounded-xl py-16 text-center">
                        <p className="text-xs font-medium text-zinc-500 mb-2">No tables found in this view.</p>
                        <button onClick={() => setActiveFilter('ALL')} className="text-xs font-semibold text-[#065F46] underline">
                            Show all tables
                        </button>
                    </div>
                )}
            </main>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
