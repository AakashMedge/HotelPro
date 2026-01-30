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

    // ============================================
    // Fetch Data
    // ============================================

    const fetchData = useCallback(async () => {
        try {
            // Fetch tables and active orders in parallel
            const [tablesRes, ordersRes] = await Promise.all([
                fetch('/api/tables'),
                fetch('/api/orders?status=NEW,PREPARING,READY,SERVED')
            ]);

            const tablesData: ApiResponse<any[]> = await tablesRes.json();
            const ordersData: ApiResponse<any[]> = await ordersRes.json();

            if (!tablesData.success || !tablesData.tables) {
                throw new Error(tablesData.error || 'Failed to fetch tables');
            }

            if (!ordersData.success || !ordersData.orders) {
                throw new Error(ordersData.error || 'Failed to fetch orders');
            }

            // Map orders to tables
            const mappedTables: TableData[] = tablesData.tables.map(table => {
                // Find matching order for this table
                const activeOrder = ordersData.orders?.find(o => o.tableCode === table.tableCode);
                return {
                    ...table,
                    order: activeOrder
                };
            });

            setTables(mappedTables);
            setError(null);
        } catch (err) {
            console.error('[WAITER DASHBOARD] Error:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchData();

        // Poll every 10 seconds
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // ============================================
    // UI Helpers
    // ============================================

    const getStatusTheme = (table: TableData) => {
        const orderStatus = table.order?.status;

        // Final Status mapping for UI
        let uiStatus = 'VACANT';
        if (orderStatus === 'READY' || table.status === 'READY') uiStatus = 'READY';
        else if (orderStatus === 'SERVED') uiStatus = 'ATTENTION';
        else if (orderStatus === 'NEW' || orderStatus === 'PREPARING' || table.status === 'ACTIVE') uiStatus = 'ACTIVE';

        switch (uiStatus) {
            case 'READY': return {
                accent: 'bg-green-500',
                bg: 'bg-white',
                border: 'border-green-500/20',
                label: 'READY',
                pulse: true
            };
            case 'ATTENTION': return {
                accent: 'bg-[#D43425]',
                bg: 'bg-white',
                border: 'border-[#D43425]/20',
                label: 'BILL',
                pulse: true
            };
            case 'VACANT': return {
                accent: 'bg-zinc-200',
                bg: 'bg-zinc-50/50',
                border: 'border-zinc-200/50',
                label: 'VACANT',
                pulse: false
            };
            default: return {
                accent: 'bg-blue-500',
                bg: 'bg-white',
                border: 'border-blue-500/10',
                label: 'ACTIVE',
                pulse: false
            };
        }
    };

    const getTimeAgo = (dateStr?: string) => {
        if (!dateStr) return '--';
        const date = new Date(dateStr);
        const diff = Math.floor((Date.now() - date.getTime()) / 60000);
        if (diff < 1) return 'now';
        return `${diff}m`;
    };

    if (!mounted) return null;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-[#F8F9FA]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Loading Floor Plan...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4 md:p-10 hide-scrollbar bg-[#F8F9FA]">
            <div className="max-w-7xl mx-auto space-y-6 md:space-y-10">
                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <h1 className="text-2xl md:text-4xl font-black tracking-tight flex items-baseline gap-2 md:gap-3 text-[#1D1D1F]">
                            FLOOR_OVERVIEW <span className="text-[10px] md:text-sm font-bold text-zinc-300">LIVE</span>
                        </h1>
                        <p className="text-[8px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-[0.4em]">Section: Main Hall</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-500 text-xs font-bold uppercase tracking-widest">
                        Error: {error}
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                    {tables.map((table) => {
                        const theme = getStatusTheme(table);
                        const itemCount = table.order?.items.length || 0;
                        const lastUpdate = getTimeAgo(table.order?.updatedAt);

                        return (
                            <Link
                                key={table.id}
                                href={table.status === 'VACANT' && !table.order ? '#' : `/waiter/table/${table.id}`}
                                className={`group relative flex flex-col p-4 md:p-6 rounded-xl md:rounded-2xl border ${theme.border} ${theme.bg} shadow-[0_2px_8px_rgba(0,0,0,0.02)] active:scale-[0.96] transition-all overflow-hidden ${table.status === 'VACANT' && !table.order ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                                {/* Status Top Bar */}
                                <div className={`absolute top-0 left-0 w-full h-1 md:h-1.5 ${theme.accent}`} />

                                <div className="flex justify-between items-start mb-4 md:mb-8">
                                    <div className="flex flex-col">
                                        <span className="text-2xl md:text-4xl font-black tabular-nums tracking-tighter text-[#1D1D1F]">
                                            {table.tableCode}
                                        </span>
                                        <span className="text-[7px] md:text-[9px] font-black text-zinc-300 uppercase tracking-widest mt-0.5 md:mt-1 italic">
                                            {table.order ? `REF: ${table.order.id.slice(0, 8).toUpperCase()}` : `CAPACITY: ${table.capacity}`}
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

                                    {table.order && (
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
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${item.color}`} />
                            <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
