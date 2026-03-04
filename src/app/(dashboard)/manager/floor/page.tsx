
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode } from 'lucide-react';

type TableData = {
    id: string;
    code: string;
    status: 'VACANT' | 'ACTIVE' | 'READY' | 'WAITING_FOR_PAYMENT' | 'DIRTY' | string;
    items: number;
    waiter: string;
    updatedAt?: string | null;
    qrProtected?: boolean;
    qrCode?: any;
    itemSummary?: { id: string; name: string; qty: number; status: string }[];
    orderId?: string | null;
};

export default function FloorIntelligence() {
    const [tables, setTables] = useState<TableData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [accessCode, setAccessCode] = useState<string>('');

    const fetchFloor = useCallback(async () => {
        try {
            const res = await fetch('/api/manager');
            const data = await res.json();
            if (data.success) {
                setAccessCode(data.accessCode || '');
                setTables(data.floorMonitor.map((t: any) => ({
                    id: t.realId || t.id,
                    code: t.code,
                    status: t.status,
                    items: t.items,
                    waiter: t.waiter,
                    updatedAt: t.updatedAt,
                    qrProtected: t.qrProtected,
                    qrCode: t.qrCode,
                    itemSummary: t.itemSummary,
                    orderId: t.orderId
                })));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    // Derived selected table
    const selectedTable = tables.find(t => t.id === selectedTableId) || null;

    useEffect(() => {
        fetchFloor();

        // ─── REAL-TIME SSE CONNECTION ───
        const eventSource = new EventSource('/api/events');

        eventSource.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                // Refresh floor if any order or status update occurs
                if (data.event === 'ORDER_CREATED' || data.event === 'ORDER_UPDATED' || data.event === 'TABLE_UPDATED') {
                    fetchFloor();
                }
            } catch (err) {
                console.error("SSE Manager Error:", err);
            }
        };

        const interval = setInterval(fetchFloor, 45000); // 45s safety fallback
        return () => {
            eventSource.close();
            clearInterval(interval);
        };
    }, [fetchFloor]);

    const handleUpdateStatus = async (tableId: string, newStatus: string) => {
        try {
            const res = await fetch('/api/manager/tables', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: tableId, status: newStatus })
            });
            if (res.ok) {
                fetchFloor();
                setSelectedTableId(null);
            }
        } catch (e) { console.error(e); }
    };

    const handleUpdateItemStatus = async (orderId: string, itemId: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                fetchFloor();
                // We don't close the modal here so the manager can update multiple items
            }
        } catch (e) { console.error(e); }
    };


    const handleEmergencyReset = async (tableId: string) => {
        if (!confirm("CRITICAL ACTION: This will cancel all active orders for this table and force it to VACANT. Proceed?")) return;

        try {
            const res = await fetch('/api/manager/tables', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: tableId })
            });
            if (res.ok) {
                fetchFloor();
                setSelectedTableId(null);
            } else {
                const json = await res.json();
                alert(`Reset Failed: ${json.error}`);
            }
        } catch (e) {
            console.error(e);
            alert("Emergency uplink failed.");
        }
    };

    if (loading && tables.length === 0) return <div className="p-20 text-center font-black uppercase text-zinc-300 animate-pulse">Scanning Floor Grids...</div>;

    const statusConfig: any = {
        VACANT: {
            color: 'bg-emerald-500',
            bg: 'bg-emerald-50/30',
            border: 'border-emerald-100/50',
            text: 'text-emerald-700',
            label: 'Available',
            icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
        },
        ACTIVE: {
            color: 'bg-zinc-900',
            bg: 'bg-zinc-50',
            border: 'border-zinc-200',
            text: 'text-zinc-900',
            label: 'In Service',
            icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        },
        READY: {
            color: 'bg-amber-500',
            bg: 'bg-amber-50/50',
            border: 'border-amber-200',
            text: 'text-amber-700',
            label: 'Ready to Serve',
            icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
        },
        BILL_REQUESTED: {
            color: 'bg-indigo-600',
            bg: 'bg-indigo-50/50',
            border: 'border-indigo-100',
            text: 'text-indigo-700',
            label: 'Checkout',
            icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
        },
        DIRTY: {
            color: 'bg-rose-500',
            bg: 'bg-rose-50/30',
            border: 'border-rose-100',
            text: 'text-rose-700',
            label: 'Cleanup Req.',
            icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        }
    };

    return (
        <div className="h-full bg-[#f8f8f7] p-6 lg:p-10 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-12 pb-32">

                {/* Header Section */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8 border-b border-zinc-200/60 pb-10">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-zinc-200 shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">Live Operations Link</span>
                        </div>
                        <div>
                            <h1 className="text-5xl font-bold text-zinc-900 tracking-tight leading-none">Floor Intelligence</h1>
                            <p className="text-sm font-medium text-zinc-400 mt-3 max-w-md italic leading-relaxed">Sophisticated real-time occupancy monitoring and service flow architecture.</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full xl:w-auto">
                        <div className="flex flex-wrap gap-3 bg-white/50 backdrop-blur-sm p-2 rounded-2xl border border-zinc-200/50">
                            {Object.entries(statusConfig).map(([key, cfg]: any) => (
                                <div key={key} className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white transition-colors cursor-default border border-transparent hover:border-zinc-100">
                                    <div className={`w-2 h-2 rounded-full ${cfg.color}`} />
                                    <span className="text-[10px] font-bold uppercase tracking-tight text-zinc-500">{cfg.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Grid Architecture */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                    {tables.map(table => {
                        const cfg = statusConfig[table.status] || statusConfig.VACANT;
                        const waitingTime = table.updatedAt ? Math.floor((Date.now() - new Date(table.updatedAt).getTime()) / 60000) : 0;
                        const isOverdue = table.status === 'READY' && waitingTime > 5;
                        const isCritical = table.status === 'READY' && waitingTime > 10;

                        return (
                            <motion.div
                                key={table.code}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -4 }}
                                className="relative group"
                            >
                                <button
                                    onClick={() => setSelectedTableId(table.id)}
                                    className={`w-full aspect-square rounded-4xl border-2 transition-all duration-500 flex flex-col items-center justify-center relative p-8 shadow-sm ${cfg.bg} ${cfg.border} ${isCritical ? 'ring-4 ring-rose-500/10 border-rose-200 animate-[pulse_2s_infinite]' : isOverdue ? 'ring-4 ring-amber-500/10 border-amber-200' : 'group-hover:shadow-xl group-hover:border-zinc-300'}`}
                                >
                                    {/* Table Index */}
                                    <div className="absolute top-6 left-6 flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${cfg.bg} ${cfg.text} border border-current opacity-20`}>
                                            {cfg.icon}
                                        </div>
                                        {table.qrProtected && (
                                            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-500 border border-indigo-100 flex items-center gap-1 shadow-sm">
                                                <QrCode size={12} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Capacity Indicator (Simulated) */}
                                    <div className="absolute top-6 right-6 flex gap-1">
                                        {[1, 2, 3, 4].map(idx => (
                                            <div key={idx} className={`w-1 h-1 rounded-full ${table.status !== 'VACANT' && idx <= (table.items || 0) ? cfg.color : 'bg-zinc-200'}`} />
                                        ))}
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <span className={`text-6xl font-black ${cfg.text} tracking-tighter leading-none mb-4`}>{table.code}</span>
                                        <div className="px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-zinc-200/50 shadow-sm">
                                            <p className={`text-[9px] font-bold uppercase tracking-[0.15em] ${cfg.text}`}>{cfg.label}</p>
                                        </div>
                                    </div>

                                    {/* Metadata Footer */}
                                    <div className="absolute bottom-6 inset-x-6 px-4">
                                        {table.waiter && table.status !== 'VACANT' ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-4 h-4 rounded-full bg-zinc-100 flex items-center justify-center text-[8px] border border-zinc-200 text-zinc-500 font-bold">
                                                    {table.waiter.charAt(0)}
                                                </div>
                                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight truncate">{table.waiter}</p>
                                            </div>
                                        ) : (
                                            <div className="h-4" />
                                        )}

                                        {table.status === 'READY' && (
                                            <div className={`mt-2 py-1 rounded-lg text-center ${isCritical ? 'bg-rose-100' : 'bg-amber-100'}`}>
                                                <p className={`text-[9px] font-black uppercase tracking-tighter ${isCritical ? 'text-rose-600' : 'text-amber-600'}`}>
                                                    {waitingTime}m Latency
                                                </p>
                                            </div>
                                        )}

                                        {/* Ghost Session Warning */}
                                        {table.status === 'ACTIVE' && table.items === 0 && waitingTime >= 3 && (
                                            <div className="mt-2 py-1 rounded-lg text-center bg-orange-100 border border-orange-200/50">
                                                <p className="text-[9px] font-black uppercase tracking-tighter text-orange-600">
                                                    No orders · {waitingTime}m idle
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </button>

                                {/* Quick Action Tooltip Overlay */}
                                <div className="absolute -inset-2 rounded-[2.5rem] bg-zinc-900/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 border border-zinc-900/10" />
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* OPERATIONAL OVERRIDE TERMINAL */}
            <AnimatePresence mode="wait">
                {selectedTable && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md">
                        <motion.div
                            initial={{ y: 20, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 20, opacity: 0, scale: 0.95 }}
                            className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-zinc-200"
                        >
                            <div className="relative p-8 lg:p-10">
                                {/* Close Button */}
                                <button
                                    onClick={() => setSelectedTableId(null)}
                                    className="absolute top-8 right-8 w-10 h-10 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-all z-10"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                </button>

                                <div className="mb-8">
                                    <h3 className="text-3xl font-black text-zinc-900 tracking-tight">Table {selectedTable.code}</h3>
                                    <p className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-widest">Active Session Detail</p>
                                </div>

                                {/* Flow Steps (Visual Only for now) */}
                                <div className="flex justify-between items-center px-2 mb-10 py-6 border-y border-zinc-50">
                                    {[
                                        { key: 'ORDERED', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
                                        { key: 'IN KITCHEN', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 21a9 9 0 100-18 9 9 0 000 18z" /><path d="M12 8l4 4-4 4" /></svg> },
                                        { key: 'READY', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                                        { key: 'SERVED', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg> },
                                        { key: 'BILLING', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 1v22m5-18H8.5a3.5 3.5 0 000 7h7a3.5 3.5 0 010 7H6" /></svg> }
                                    ].map((step, idx) => (
                                        <div key={idx} className="flex flex-col items-center gap-2">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${idx === 0 ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-100 text-zinc-300'}`}>
                                                {step.icon}
                                            </div>
                                            <span className="text-[8px] font-black tracking-widest uppercase text-zinc-400">{step.key}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-8 mb-8">
                                    <div>
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Assigned Staff</p>
                                        <p className="text-sm font-bold text-zinc-900">{selectedTable.waiter || 'Unassigned'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Active Tableware</p>
                                        <p className="text-sm font-bold text-zinc-900">{selectedTable.itemSummary?.reduce((acc, i) => acc + i.qty, 0) || 0} Items</p>
                                    </div>
                                </div>

                                {/* Items List (Session Payload) */}
                                <div className="mb-10">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Session Payload</p>
                                    <div className="space-y-3 bg-zinc-50/50 rounded-3xl p-4 border border-zinc-100">
                                        {selectedTable.itemSummary && selectedTable.itemSummary.length > 0 ? (
                                            selectedTable.itemSummary.map((item) => (
                                                <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-zinc-200/50 shadow-xs">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-6 h-6 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-900">
                                                            {item.qty}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-zinc-900">{item.name}</p>
                                                            <p className={`text-[8px] font-black uppercase tracking-widest ${item.status === 'SERVED' ? 'text-emerald-500' : item.status === 'READY' ? 'text-amber-500' : 'text-zinc-400'}`}>
                                                                {item.status}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {item.status !== 'SERVED' && selectedTable.orderId && (
                                                        <button
                                                            onClick={() => handleUpdateItemStatus(selectedTable.orderId!, item.id, 'SERVED')}
                                                            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-emerald-500 hover:text-white transition-all border border-emerald-100"
                                                        >
                                                            Mark Served
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs font-medium text-zinc-400 italic py-4 text-center">No items ordered yet.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Danger Zone / Emergency Actions */}
                                {['ACTIVE', 'READY', 'BILL_REQUESTED'].includes(selectedTable.status) && (
                                    <div className="mb-6">
                                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3 text-center">Operational Intervention</p>
                                        <button
                                            onClick={() => handleEmergencyReset(selectedTable.id)}
                                            className="w-full py-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18.36 6.64a9 9 0 11-12.73 0M12 2v10" /></svg>
                                            Emergency Table Reset
                                        </button>
                                    </div>
                                )}

                                {selectedTable.status === 'DIRTY' && (
                                    <button
                                        onClick={() => handleUpdateStatus(selectedTable.id, 'VACANT')}
                                        className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
                                    >
                                        Mark as Clean & Vacant
                                    </button>
                                )}

                                {selectedTable.status === 'VACANT' && (
                                    <button
                                        onClick={() => handleUpdateStatus(selectedTable.id, 'ACTIVE')}
                                        className="w-full py-5 bg-zinc-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200"
                                    >
                                        Initialize Manual Session
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>


        </div>
    );
}
