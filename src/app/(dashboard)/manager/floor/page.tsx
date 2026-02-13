
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type TableData = {
    id: string;
    code: string;
    status: 'VACANT' | 'ACTIVE' | 'READY' | 'WAITING_FOR_PAYMENT' | 'DIRTY' | string;
    items: number;
    waiter: string;
    updatedAt?: string | null;
};

export default function FloorIntelligence() {
    const [tables, setTables] = useState<TableData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
    const [accessCode, setAccessCode] = useState<string>('');

    const fetchFloor = useCallback(async () => {
        try {
            const res = await fetch('/api/manager');
            const data = await res.json();
            if (data.success) {
                setAccessCode(data.accessCode || '');
                // Map floorMonitor from API to local state
                setTables(data.floorMonitor.map((t: any) => ({
                    id: t.realId || t.id,
                    code: t.id,
                    status: t.status,
                    items: t.items,
                    waiter: t.waiter,
                    updatedAt: t.updatedAt
                })));
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

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
                setSelectedTable(null);
            }
        } catch (e) { console.error(e); }
    };

    const [showAddModal, setShowAddModal] = useState(false);
    const [newTableCode, setNewTableCode] = useState('');
    const [newTableCapacity, setNewTableCapacity] = useState(4);
    const [adding, setAdding] = useState(false);

    const handleAddTable = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTableCode) return;
        setAdding(true);
        try {
            const res = await fetch('/api/tables', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableCode: newTableCode, capacity: newTableCapacity })
            });
            const result = await res.json();
            if (result.success) {
                setShowAddModal(false);
                setNewTableCode('');
                setNewTableCapacity(4);
                fetchFloor();
            } else {
                alert(result.message || result.error || "Failed to add table");
            }
        } catch (e) {
            console.error(e);
            alert("System link failure.");
        } finally {
            setAdding(false);
        }
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
                setSelectedTable(null);
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

                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-zinc-900 text-white px-8 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200/50 active:scale-95 whitespace-nowrap"
                        >
                            + Provision Table
                        </button>
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
                                    onClick={() => setSelectedTable(table)}
                                    className={`w-full aspect-square rounded-4xl border-2 transition-all duration-500 flex flex-col items-center justify-center relative p-8 shadow-sm ${cfg.bg} ${cfg.border} ${isCritical ? 'ring-4 ring-rose-500/10 border-rose-200 animate-[pulse_2s_infinite]' : isOverdue ? 'ring-4 ring-amber-500/10 border-amber-200' : 'group-hover:shadow-xl group-hover:border-zinc-300'}`}
                                >
                                    {/* Table Index */}
                                    <div className="absolute top-6 left-6 flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${cfg.bg} ${cfg.text} border border-current opacity-20`}>
                                            {cfg.icon}
                                        </div>
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
            <AnimatePresence>
                {selectedTable && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-zinc-900/40 backdrop-blur-md">
                        <motion.div
                            initial={{ y: 20, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 20, opacity: 0, scale: 0.95 }}
                            className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl border border-zinc-200"
                        >
                            <div className="p-10">
                                <div className="text-center mb-10">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-50 rounded-full border border-zinc-100 mb-4">
                                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Override Terminal</span>
                                    </div>
                                    <h3 className="text-4xl font-bold text-zinc-900 tracking-tight">Table {selectedTable.code}</h3>
                                    <p className="text-xs font-medium text-zinc-400 mt-2 uppercase tracking-widest">Active Floor Node</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-[#f8f8f7] rounded-2xl border border-zinc-100">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2.5 h-2.5 rounded-full ${statusConfig[selectedTable.status]?.color}`} />
                                            <span className="text-xs font-bold text-zinc-900 uppercase">{statusConfig[selectedTable.status]?.label}</span>
                                        </div>
                                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Current Status</div>
                                    </div>

                                    <div className="space-y-3 pt-6">
                                        {selectedTable.status === 'DIRTY' && (
                                            <button
                                                onClick={() => handleUpdateStatus(selectedTable.id, 'VACANT')}
                                                className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
                                            >
                                                Authorize Service Readiness
                                            </button>
                                        )}

                                        {selectedTable.status === 'VACANT' && (
                                            <button
                                                onClick={() => handleUpdateStatus(selectedTable.id, 'ACTIVE')}
                                                className="w-full py-5 bg-zinc-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200"
                                            >
                                                Initialize Manual Occupancy
                                            </button>
                                        )}

                                        {['ACTIVE', 'READY', 'BILL_REQUESTED'].includes(selectedTable.status) && (
                                            <div className="space-y-6">
                                                <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 text-center">
                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Session Lock Active</p>
                                                    <p className="text-xs font-medium text-zinc-500 italic leading-relaxed">This node has an active transaction sequence. Manual override is restricted to prevent state desync.</p>
                                                </div>

                                                <div className="pt-6 border-t border-zinc-100 bg-rose-50/30 -mx-10 px-10 pb-10">
                                                    <div className="flex items-center gap-2 mb-4 justify-center">
                                                        <div className="w-10 h-px bg-rose-200" />
                                                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Danger Zone</p>
                                                        <div className="w-10 h-px bg-rose-200" />
                                                    </div>
                                                    <button
                                                        onClick={() => handleEmergencyReset(selectedTable.id)}
                                                        className="w-full py-4 bg-white border-2 border-rose-100 text-rose-500 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                                    >
                                                        Emergency Force Reset
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {!['ACTIVE', 'READY', 'BILL_REQUESTED'].includes(selectedTable.status) && (
                                            <button
                                                onClick={() => setSelectedTable(null)}
                                                className="w-full py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-600 transition-colors"
                                            >
                                                Discard Changes
                                            </button>
                                        )}

                                        {['ACTIVE', 'READY', 'BILL_REQUESTED'].includes(selectedTable.status) && (
                                            <button
                                                onClick={() => setSelectedTable(null)}
                                                className="w-full py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-600 transition-colors pt-4"
                                            >
                                                Return to Dashboard
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* EXPAND OPERATIONS MODAL */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-zinc-900/60 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-md rounded-[3rem] p-12 shadow-2xl border border-zinc-100"
                        >
                            <div className="text-center mb-10">
                                <h3 className="text-3xl font-bold text-zinc-900 tracking-tight">Expand Operations</h3>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-3">Provisioning New Service Terminal</p>
                            </div>

                            <form onSubmit={handleAddTable} className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-4">Table Designation</label>
                                    <input
                                        type="text"
                                        required
                                        value={newTableCode}
                                        onChange={(e) => setNewTableCode(e.target.value)}
                                        placeholder="Identification Code (e.g. T-01)"
                                        className="w-full px-8 py-5 bg-[#f8f8f7] border border-zinc-200 rounded-2xl text-sm font-bold placeholder:text-zinc-300 focus:ring-4 ring-zinc-900/5 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-4">Guest Capacity</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            max="20"
                                            value={newTableCapacity}
                                            onChange={(e) => setNewTableCapacity(parseInt(e.target.value))}
                                            className="w-full px-8 py-5 bg-[#f8f8f7] border border-zinc-200 rounded-2xl text-sm font-bold outline-none appearance-none"
                                        />
                                        <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400 uppercase">Seats</div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-600 transition-all"
                                    >
                                        Abort
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={adding}
                                        className="flex-2 py-5 bg-zinc-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 disabled:opacity-50 active:scale-95"
                                    >
                                        {adding ? 'Provisioning...' : 'Confirm Grid Entry'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
