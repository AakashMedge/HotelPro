'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ============================================
// Types
// ============================================

interface OrderItem {
    id: string;
    name: string;
    qty: number;
    note?: string;
    status: string;
    origin: string;
    time: string;
}

interface TableDetailsData {
    id: string;
    fullId: string;
    tableCode: string;
    status: string;
    version: number;
    guest: string;
    time: string;
    items: OrderItem[];
}

interface ApiResponse {
    success: boolean;
    order?: any;
    error?: string;
}

// ============================================
// Component
// ============================================

export default function TableDetails() {
    const { id } = useParams();
    const router = useRouter();

    const [data, setData] = useState<TableDetailsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);

    // ============================================
    // Fetch Data
    // ============================================

    const fetchTableDetails = useCallback(async () => {
        try {
            // First, get the table to know its tableCode
            const tablesRes = await fetch(`/api/tables`);
            const tablesData = await tablesRes.json();
            const table = tablesData.tables?.find((t: any) => t.id === id);

            if (!table) throw new Error('Table not found');

            // Then, get active orders for this table
            const ordersRes = await fetch(`/api/orders?status=NEW,PREPARING,READY,SERVED`);
            const ordersData = await ordersRes.json();
            const activeOrder = ordersData.orders?.find((o: any) => o.tableId === id);

            if (!activeOrder) {
                // If no active order, just show table info
                setData({
                    id: id as string,
                    fullId: '',
                    tableCode: table.tableCode,
                    status: 'VACANT',
                    version: 0,
                    guest: 'NO ACTIVE GUEST',
                    time: '--:--',
                    items: []
                });
            } else {
                // Format order data
                setData({
                    id: activeOrder.id.slice(0, 8).toUpperCase(),
                    fullId: activeOrder.id,
                    tableCode: table.tableCode,
                    status: activeOrder.status,
                    version: activeOrder.version,
                    guest: `GUEST @ ${table.tableCode}`,
                    time: new Date(activeOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    items: activeOrder.items.map((item: any) => ({
                        id: item.id,
                        name: item.itemName,
                        qty: item.quantity,
                        note: item.note, // Note might be null
                        status: item.status,
                        origin: 'GUEST_QR',
                        time: new Date(activeOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }))
                });
            }
            setError(null);
        } catch (err) {
            console.error('[TABLE DETAILS] Error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load table details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchTableDetails();
        // Poll every 5 seconds for updates
        const interval = setInterval(fetchTableDetails, 5000);
        return () => clearInterval(interval);
    }, [fetchTableDetails]);

    // ============================================
    // Actions
    // ============================================

    const markAsServed = async () => {
        if (!data || data.status !== 'READY' || updating) return;

        setUpdating(true);
        try {
            const res = await fetch(`/api/orders/${data.fullId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'SERVED',
                    version: data.version
                })
            });

            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'Failed to update status');

            await fetchTableDetails();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error updating status');
        } finally {
            setUpdating(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'READY': return 'text-green-600 bg-green-50 border-green-100';
            case 'PREPARING': return 'text-amber-600 bg-amber-50 border-amber-100';
            case 'SERVED': return 'text-zinc-400 bg-zinc-50 border-zinc-100';
            case 'PENDING': return 'text-blue-600 bg-blue-50 border-blue-100 text-pulse';
            case 'NEW': return 'text-blue-600 bg-blue-50 border-blue-100';
            default: return 'text-zinc-500 bg-zinc-50 border-zinc-100';
        }
    };

    if (loading) return (
        <div className="h-full flex flex-col bg-white items-center justify-center">
            <div className="w-8 h-8 border-4 border-zinc-100 border-t-black rounded-full animate-spin" />
        </div>
    );

    if (error || !data) return (
        <div className="h-full flex flex-col bg-white items-center justify-center p-6 text-center">
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-4">{error || 'Table not found'}</p>
            <button onClick={() => router.push('/waiter')} className="px-6 py-2 bg-black text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Back to Floor</button>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">
            {/* TICKET HEADER */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-zinc-200 shrink-0 bg-white shadow-sm z-30">
                <div className="flex items-center gap-3 md:gap-6">
                    <button
                        onClick={() => router.push('/waiter')}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-black hover:border-black active:scale-90 transition-all"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-2 md:gap-3">
                            <h1 className="text-xl md:text-3xl font-black tracking-tighter uppercase leading-none">{data.tableCode}</h1>
                            <span className="text-[8px] md:text-[10px] font-black text-zinc-300 uppercase tabular-nums">REF-{data.id}</span>
                        </div>
                        <div className="flex gap-2 md:gap-4 mt-0.5 md:mt-1">
                            <span className="text-[7px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">{data.guest}</span>
                            <span className="text-[7px] md:text-[10px] font-bold text-zinc-300 uppercase tracking-widest tabular-nums">{data.time}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1 md:gap-2">
                    <div className={`px-2 md:px-4 py-1 md:py-1.5 rounded md:rounded-lg text-[7px] md:text-[10px] font-black uppercase tracking-[0.2em] leading-none ${data.status === 'READY' ? 'bg-green-600 text-white' : 'bg-black text-white'}`}>
                        {data.status}
                    </div>
                </div>
            </div>

            {/* LIVE LEDGER */}
            <div className="grow overflow-y-auto px-3 md:px-6 py-4 md:py-8 space-y-4 bg-[#F9F9F9]">
                <div className="bg-white rounded-xl md:rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                    <div className="divide-y divide-zinc-100">
                        {data.items.length === 0 ? (
                            <div className="p-12 text-center text-zinc-300 text-[10px] font-black uppercase tracking-widest">
                                No active entries
                            </div>
                        ) : data.items.map((item) => (
                            <div key={item.id} className="p-4 md:p-6 hover:bg-zinc-50/50 transition-colors">
                                <div className="flex md:grid md:grid-cols-12 gap-4 md:gap-0 items-start md:items-center">
                                    <div className="md:col-span-1 shrink-0">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg border-2 border-zinc-100 flex items-center justify-center font-black text-sm md:text-lg tabular-nums">
                                            {item.qty}
                                        </div>
                                    </div>

                                    <div className="md:col-span-7 grow md:pl-6 space-y-1">
                                        <div className="flex md:block justify-between items-start gap-2">
                                            <h3 className="font-bold text-sm md:text-lg text-[#1D1D1F] leading-tight grow">{item.name}</h3>
                                            <span className={`md:hidden px-2 py-0.5 rounded text-[7px] font-black tracking-widest border uppercase shrink-0 ${getStatusColor(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <span className="text-[7px] md:text-[9px] font-bold text-zinc-300 uppercase tracking-widest whitespace-nowrap">{item.origin}</span>
                                            <span className="text-zinc-100">|</span>
                                            <span className="text-[7px] md:text-[9px] font-bold text-zinc-300 uppercase tracking-widest tabular-nums">{item.time}</span>
                                        </div>
                                    </div>

                                    <div className="hidden md:col-span-4 md:flex justify-end">
                                        <span className={`px-4 py-2 rounded-xl border font-black text-[10px] tracking-widest uppercase ${getStatusColor(item.status)}`}>
                                            {item.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ACTION TRAY */}
            <div className="p-4 md:p-8 border-t border-zinc-200 bg-white grid grid-cols-2 gap-3 md:gap-6 pb-6 md:pb-12 shrink-0">
                <Link
                    href={`/waiter/table/${id}/add`}
                    className="h-14 md:h-20 bg-black text-white rounded-xl md:rounded-[1.5rem] flex items-center justify-center gap-2 md:gap-4 active:scale-95 transition-all shadow-lg"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest md:tracking-[0.3em]">ADD_ENTRY</span>
                </Link>

                <button
                    onClick={markAsServed}
                    disabled={data.status !== 'READY' || updating}
                    className={`h-14 md:h-20 rounded-xl md:rounded-[1.5rem] flex items-center justify-center gap-2 md:gap-4 transition-all active:scale-95 shadow-lg border-2 ${data.status === 'READY' ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-zinc-100 text-zinc-300 cursor-not-allowed'}`}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"></path></svg>
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest md:tracking-[0.3em]">
                        {updating ? 'updating...' : data.status === 'READY' ? 'MARK_SERVED' : 'WAITING_PREP'}
                    </span>
                </button>
            </div>
        </div>
    );
}
