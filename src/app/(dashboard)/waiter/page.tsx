
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
}

interface OrderData {
    id: string;
    status: string;
    updatedAt: string;
    customerName?: string;
    items: OrderItem[];
    version?: number;
}

// ============================================
// Component
// ============================================

export default function WaiterDashboard() {
    const [tables, setTables] = useState<TableData[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);
    const [updatingTableId, setUpdatingTableId] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'READY' | 'ACTIVE' | 'DIRTY'>('ALL');
    const [outOfStockItems, setOutOfStockItems] = useState<string[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);

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
                let mapped = tData.tables.map((t: any) => ({
                    ...t,
                    order: oData.orders?.find((o: any) => o.tableCode === t.tableCode)
                }));
                // Sort by table code
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

    const handleMarkServed = async (e: React.MouseEvent, table: TableData) => {
        e.preventDefault(); e.stopPropagation();
        if (!table.order || updatingTableId) return;
        setUpdatingTableId(table.id);
        try {
            const res = await fetch(`/api/orders/${table.order.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'SERVED', version: table.order.version || 1 }),
            });
            if (res.ok) {
                setNotification(`Table ${table.tableCode} served.`);
                fetchData();
            }
        } finally { setUpdatingTableId(null); }
    };

    const handleMarkCleaned = async (e: React.MouseEvent, tableId: string) => {
        e.preventDefault(); e.stopPropagation();
        setUpdatingTableId(tableId);
        try {
            const res = await fetch(`/api/tables/${tableId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'VACANT' }),
            });
            if (res.ok) {
                setNotification(`Table reset.`);
                fetchData();
            }
        } finally { setUpdatingTableId(null); }
    };

    const getStatusTheme = (table: TableData) => {
        const orderStatus = table.order?.status;
        const tableStatus = table.status;

        if (tableStatus === 'DIRTY') return { id: 'DIRTY', label: 'Needs Cleaning', accent: '#F59E0B', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' };
        if (orderStatus === 'READY') return { id: 'READY', label: 'Order Ready', accent: '#22C55E', text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200 shadow-lg shadow-green-100' };
        if (orderStatus === 'BILL_REQUESTED') return { id: 'BILL_REQ', label: 'Bill Requested', accent: '#D43425', text: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' };
        if (orderStatus === 'SERVED') return { id: 'SERVED', label: 'Guest Dining', accent: '#3D2329', text: 'text-zinc-600', bg: 'bg-zinc-50', border: 'border-zinc-100' };
        if (orderStatus === 'NEW' || orderStatus === 'PREPARING') return { id: 'ACTIVE', label: 'Chef Preparing', accent: '#3B82F6', text: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' };

        return { id: 'VACANT', label: 'Vacant', accent: '#E4E4E7', text: 'text-zinc-300', bg: 'bg-white', border: 'border-zinc-100' };
    };

    const filteredTables = useMemo(() => {
        if (activeFilter === 'ALL') return tables;
        return tables.filter(t => {
            const theme = getStatusTheme(t);
            if (activeFilter === 'READY') return theme.id === 'READY' || theme.id === 'BILL_REQ';
            if (activeFilter === 'ACTIVE') return theme.id === 'ACTIVE' || theme.id === 'SERVED';
            if (activeFilter === 'DIRTY') return theme.id === 'DIRTY';
            return true;
        });
    }, [tables, activeFilter]);

    useEffect(() => {
        setMounted(true);
        fetchData();
        const interval = setInterval(fetchData, 8000);
        return () => clearInterval(interval);
    }, [fetchData]);

    if (!mounted) return null;

    if (loading && tables.length === 0) return <div className="p-20 text-center font-black uppercase text-zinc-300 animate-pulse">Syncing Waiter Terminal...</div>;

    return (
        <div className="h-full bg-[#FDFCF9] flex flex-col overflow-hidden font-sans">

            {/* HEADER */}
            <header className="px-8 py-8 border-b border-zinc-100 shrink-0 bg-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-zinc-900 tracking-tighter uppercase">Service Deck</h1>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1">
                            Authorized: {currentUser?.name || 'Staff'} &bull; Station Alpha
                        </p>
                    </div>

                    <div className="flex bg-zinc-100 p-1 rounded-xl">
                        {(['ALL', 'READY', 'ACTIVE', 'DIRTY'] as const).map(filter => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === filter ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                <AnimatePresence>
                    {(notification || outOfStockItems.length > 0) && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-6 bg-zinc-950 text-white rounded-2xl p-4 flex items-center justify-between border border-white/10"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-2 h-2 rounded-full ${outOfStockItems.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
                                <span className="text-[10px] font-black uppercase tracking-wider">
                                    {notification || `Stock Warning: ${outOfStockItems.join(', ')}`}
                                </span>
                            </div>
                            <button onClick={() => setNotification(null)} className="text-[9px] font-black text-zinc-500 hover:text-white uppercase tracking-widest">Acknowledge</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* TABLE GRID */}
            <main className="grow overflow-y-auto px-8 py-10 no-scrollbar pb-32">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredTables.map((table) => {
                            const theme = getStatusTheme(table);
                            const isUpdating = updatingTableId === table.id;

                            return (
                                <motion.div
                                    key={table.id}
                                    layout
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="relative"
                                >
                                    <div className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col h-full ${isUpdating ? 'opacity-50' : ''} ${theme.bg} ${theme.border}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <span className={`text-4xl font-black tracking-tighter ${theme.id === 'VACANT' ? 'text-zinc-200' : 'text-zinc-900'}`}>{table.tableCode.replace('T-', '')}</span>
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.accent }} />
                                        </div>

                                        <div className="mb-8">
                                            <p className={`text-[10px] font-black uppercase tracking-widest ${theme.text}`}>{theme.label}</p>
                                            <p className="text-[8px] font-bold text-zinc-400 uppercase mt-1">Capacity: {table.capacity}</p>
                                        </div>

                                        {/* ACTIONS */}
                                        <div className="mt-auto space-y-2">
                                            {theme.id === 'VACANT' ? (
                                                <Link
                                                    href={`/menu?tableId=${table.id}&staffMode=true`}
                                                    className="block w-full text-center text-[10px] font-black text-white bg-zinc-900 uppercase tracking-widest py-4 rounded-2xl hover:bg-[#D43425] transition-colors"
                                                >
                                                    Take Order
                                                </Link>
                                            ) : theme.id === 'DIRTY' ? (
                                                <button onClick={(e) => handleMarkCleaned(e, table.id)} className="w-full text-center text-[10px] font-black text-white bg-amber-500 uppercase tracking-widest py-4 rounded-2xl">Mark Clean</button>
                                            ) : theme.id === 'READY' ? (
                                                <button onClick={(e) => handleMarkServed(e, table)} className="w-full text-center text-[10px] font-black text-white bg-green-500 uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-green-100">Serve Plate</button>
                                            ) : (
                                                <Link
                                                    href={`/waiter/table/${table.id}`}
                                                    className="block w-full text-center text-[10px] font-black text-zinc-500 bg-white border border-zinc-100 uppercase tracking-widest py-4 rounded-2xl hover:bg-zinc-50"
                                                >
                                                    View Details
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </main>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
