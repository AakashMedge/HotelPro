'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

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
}

interface OrderData {
    id: string;
    status: string;
    updatedAt: string;
    customerName?: string;
    items: OrderItem[];
}

interface ApiResponse<T> {
    success: boolean;
    tables?: T;
    orders?: T;
    error?: string;
}

// ============================================
// Component
// ============================================

export default function WaiterDashboard() {
    const [tables, setTables] = useState<TableData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);
    const [updatingTableId, setUpdatingTableId] = useState<string | null>(null);

    // ============================================
    // Notification Watcher
    // ============================================

    const [outOfStockItems, setOutOfStockItems] = useState<string[]>([]);

    // ============================================
    // Notification Watcher
    // ============================================

    useEffect(() => {
        const readyTables = tables.filter(t => t.order?.status === 'READY').map(t => t.tableCode);
        if (readyTables.length > 0) {
            setNotification(`${readyTables.join(', ')} IS READY_FOR_PICKUP`);
            const timer = setTimeout(() => setNotification(null), 8000);
            return () => clearTimeout(timer);
        }
    }, [tables]);

    const [currentUser, setCurrentUser] = useState<any>(null);

    // ============================================
    // Fetch Data
    // ============================================

    const fetchData = useCallback(async () => {
        try {
            const [tablesRes, ordersRes, stockRes, userRes] = await Promise.all([
                fetch('/api/tables'),
                fetch('/api/orders?status=NEW,PREPARING,READY,SERVED,BILL_REQUESTED'),
                fetch('/api/kitchen/inventory'),
                fetch('/api/auth/me') // Assuming this endpoint exists to get current user
            ]);

            const tData = await tablesRes.json();
            const oData = await ordersRes.json();
            const sData = await stockRes.json();
            const uData = await userRes.json();

            if (uData.success) setCurrentUser(uData.user);

            if (tData.success && oData.success) {
                let mapped = tData.tables.map((t: any) => ({
                    ...t,
                    order: oData.orders?.find((o: any) => o.tableCode === t.tableCode)
                }));

                // FILTER: Only see tables assigned to this waiter
                if (uData.success && uData.user.role === 'WAITER') {
                    mapped = mapped.filter((t: any) => t.assignedWaiterId === uData.user.id);
                }

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

    const handleMarkServed = async (e: React.MouseEvent, table: TableData) => {
        e.preventDefault();
        e.stopPropagation();
        if (!table.order || updatingTableId) return;

        const orderId = table.order.id;
        setUpdatingTableId(table.id);
        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'SERVED', version: (table.order as any).version || 1 }),
            });
            if (res.ok) {
                setNotification(`Table ${table.tableCode} Served.`);
                fetchData();
            }
        } catch (err) {
            console.error('[WAITER_SERVE] Error:', err);
        } finally {
            setUpdatingTableId(null);
        }
    };

    const handleMarkCleaned = async (e: React.MouseEvent, tableId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setUpdatingTableId(tableId);
        try {
            const res = await fetch(`/api/tables/${tableId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'VACANT' }),
            });
            if (res.ok) {
                setNotification(`Table reset to VACANT.`);
                fetchData();
            }
        } catch (err) {
            console.error('[WAITER_CLEAN] Error:', err);
        } finally {
            setUpdatingTableId(null);
        }
    };

    const handleRequestBill = async (e: React.MouseEvent, table: TableData) => {
        e.preventDefault();
        e.stopPropagation();
        if (!table.order || updatingTableId) return;

        const orderId = table.order.id;
        setUpdatingTableId(table.id);
        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'BILL_REQUESTED', version: (table.order as any).version || 1 }),
            });
            if (res.ok) {
                setNotification(`Bill requested for Table ${table.tableCode}.`);
                fetchData();
            }
        } catch (err) {
            console.error('[WAITER_BILL_REQ] Error:', err);
        } finally {
            setUpdatingTableId(null);
        }
    };

    const getStatusTheme = (table: TableData) => {
        const orderStatus = table.order?.status;
        const tableStatus = table.status;

        let uiStatus = 'VACANT';
        if (tableStatus === 'DIRTY') uiStatus = 'DIRTY';
        else if (orderStatus === 'READY') uiStatus = 'READY';
        else if (orderStatus === 'SERVED') uiStatus = 'SERVED'; // Now distinct from BILL_REQUESTED
        else if (orderStatus === 'BILL_REQUESTED') uiStatus = 'BILL_REQ';
        else if (orderStatus === 'NEW' || orderStatus === 'PREPARING') uiStatus = 'ACTIVE';

        switch (uiStatus) {
            case 'DIRTY': return { accent: 'bg-zinc-400', bg: 'bg-zinc-100', border: 'border-zinc-300', label: 'DIRTY', pulse: false };
            case 'READY': return { accent: 'bg-green-500', bg: 'bg-white', border: 'border-green-500/20', label: 'READY', pulse: true };
            case 'SERVED': return { accent: 'bg-blue-500', bg: 'bg-white', border: 'border-blue-500/20', label: 'EATING', pulse: false };
            case 'BILL_REQ': return { accent: 'bg-[#D43425]', bg: 'bg-white', border: 'border-[#D43425]/20', label: 'BILL_REQ', pulse: true };
            case 'VACANT': return { accent: 'bg-zinc-200', bg: 'bg-zinc-50/50', border: 'border-zinc-200/50', label: 'VACANT', pulse: false };
            default: return { accent: 'bg-blue-500', bg: 'bg-white', border: 'border-blue-500/10', label: 'ACTIVE', pulse: false };
        }
    };

    const getTimeAgo = (dateStr?: string) => {
        if (!dateStr) return '--';
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
        return diff < 1 ? 'now' : `${diff}m`;
    };

    useEffect(() => {
        setMounted(true);
        fetchData();
        const interval = setInterval(fetchData, 8000); // 8s poll
        return () => clearInterval(interval);
    }, [fetchData]);

    if (!mounted) return null;

    if (loading && tables.length === 0) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-[#F8F9FA]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#D43425] rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Syncing_Floor_Matrix...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4 md:p-10 hide-scrollbar bg-[#F8F9FA]">
            <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-10">

                {/* 1. EMERGENCY NOTIFICATION & 86 BAR */}
                <div className="space-y-3">
                    {notification && (
                        <div className="bg-[#D43425] text-white p-4 rounded-xl flex items-center justify-between shadow-xl shadow-red-900/20 animate-in slide-in-from-top duration-500">
                            <div className="flex items-center gap-4">
                                <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-white">{notification}</span>
                            </div>
                            <button onClick={() => setNotification(null)} className="opacity-50 hover:opacity-100 uppercase text-[9px] font-black tracking-widest text-white">Acknowledge</button>
                        </div>
                    )}

                    {outOfStockItems.length > 0 && (
                        <div className="bg-zinc-950 text-white px-4 py-2 rounded-lg flex items-center gap-6 overflow-hidden">
                            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-red-500 shrink-0">86_ALERT:</span>
                            <div className="flex gap-4 animate-marquee whitespace-nowrap">
                                {outOfStockItems.map((item, i) => (
                                    <span key={i} className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">/{item}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.4em] italic">Main_Floor_Control</span>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-950">FLOOR_MATRIX</h1>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-500 text-xs font-bold uppercase tracking-widest">
                        Error: {error}
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
                    {tables.map((table) => {
                        const theme = getStatusTheme(table);
                        const itemCount = table.order?.items.length || 0;
                        const lastUpdate = getTimeAgo(table.order?.updatedAt || (table as any).updatedAt);
                        const isUpdating = updatingTableId === table.id;
                        const isDirty = table.status === 'DIRTY';

                        return (
                            <Link
                                key={table.id}
                                href={isDirty || (table.status === 'VACANT' && !table.order) ? '#' : `/waiter/table/${table.id}`}
                                className={`group relative flex flex-col p-4 md:p-6 rounded-xl md:rounded-2xl border ${theme.border} ${theme.bg} shadow-[0_2px_8px_rgba(0,0,0,0.02)] active:scale-[0.96] transition-all overflow-hidden ${(isDirty || (table.status === 'VACANT' && !table.order)) ? 'cursor-default' : 'cursor-pointer'} ${isUpdating ? 'opacity-50 scale-95' : ''}`}
                            >
                                {/* Status Top Bar */}
                                <div className={`absolute top-0 left-0 w-full h-1 md:h-1.5 ${theme.accent}`} />

                                <div className="flex justify-between items-start mb-4 md:mb-8">
                                    <div className="flex flex-col">
                                        <span className="text-2xl md:text-4xl font-black tabular-nums tracking-tighter text-[#1D1D1F]">
                                            {table.tableCode}
                                        </span>
                                        <span className="text-[7px] md:text-[9px] font-black text-zinc-300 uppercase tracking-widest mt-0.5 md:mt-1 italic truncate max-w-[120px]">
                                            {table.order?.customerName ? `GUEST: ${table.order.customerName}` : table.order ? `REF: ${table.order.id.slice(0, 8).toUpperCase()}` : `CAPACITY: ${table.capacity}`}
                                        </span>
                                    </div>
                                    <div className={`text-[8px] md:text-[10px] font-black px-1.5 md:px-3 py-0.5 md:py-1 rounded-full border border-black/5 flex items-center gap-1 md:gap-2 ${table.status === 'VACANT' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                        {table.order ? '?' : '0'}/{table.capacity}
                                    </div>
                                </div>

                                <div className="mt-auto space-y-2 md:space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[7px] md:text-[9px] font-black tracking-[0.2em] px-2 py-1 md:py-1.5 rounded-md ${theme.accent} text-white`}>
                                            {theme.label}
                                        </span>
                                        <span className="text-[8px] md:text-[10px] font-bold text-zinc-300 uppercase tabular-nums">{lastUpdate}</span>
                                    </div>

                                    {/* ACTION BUTTONS */}
                                    {isDirty ? (
                                        <button
                                            onClick={(e) => handleMarkCleaned(e, table.id)}
                                            disabled={isUpdating}
                                            className="w-full py-2 bg-zinc-900 hover:bg-black text-white text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-colors border border-black shadow-lg"
                                        >
                                            {isUpdating ? 'SYNC...' : 'MARK_CLEANED'}
                                        </button>
                                    ) : table.order?.status === 'READY' ? (
                                        <button
                                            onClick={(e) => handleMarkServed(e, table)}
                                            disabled={isUpdating}
                                            className="w-full py-2 bg-green-500 hover:bg-green-600 text-white text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-colors shadow-lg shadow-green-900/10"
                                        >
                                            {isUpdating ? 'SYNC...' : 'MARK SERVED'}
                                        </button>
                                    ) : table.order?.status === 'SERVED' ? (
                                        <button
                                            onClick={(e) => handleRequestBill(e, table)}
                                            disabled={isUpdating}
                                            className="w-full py-2 bg-[#D43425] hover:bg-red-700 text-white text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-colors shadow-lg shadow-red-900/10"
                                        >
                                            {isUpdating ? 'SYNC...' : 'REQUEST BILL'}
                                        </button>
                                    ) : null}

                                    {table.order && table.order.status !== 'READY' && (
                                        <div className="hidden md:flex items-center gap-4 pt-4 border-t border-zinc-50">
                                            <div className="flex -space-x-2">
                                                {table.order.items.slice(0, 3).map((item, i) => (
                                                    <div key={item.id} className="w-6 h-6 rounded-full bg-zinc-100 border-2 border-white flex items-center justify-center text-[8px] font-bold">
                                                        {i === 2 && itemCount > 3 ? `+${itemCount - 2}` : i + 1}
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                                {itemCount} ITEMS
                                            </span>
                                        </div>
                                    )}

                                    {/* Mobile Mobile Compact Items Info */}
                                    {table.order && (
                                        <div className="md:hidden flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-zinc-300">
                                            <span>{itemCount} ITEMS</span>
                                            {theme.pulse && <div className={`w-1.5 h-1.5 rounded-full ${theme.accent} animate-pulse`} />}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* REFINED LEGEND */}
                <div className="pt-6 md:pt-12 flex flex-wrap gap-4 md:gap-8 items-center border-t border-zinc-200/60 opacity-60">
                    <span className="text-[8px] md:text-[10px] font-black text-zinc-300 uppercase tracking-[0.4em]">Legend</span>
                    {[
                        { label: 'Active', color: 'bg-blue-500' },
                        { label: 'Ready', color: 'bg-green-500' },
                        { label: 'Bill', color: 'bg-[#D43425]' },
                        { label: 'Dirty', color: 'bg-zinc-400' },
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${item.color}`} />
                            <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx global>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
                .animate-marquee { display: inline-block; animation: marquee 20s linear infinite; }
            `}</style>
        </div>
    );
}
