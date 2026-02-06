
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

    const fetchFloor = useCallback(async () => {
        try {
            const res = await fetch('/api/manager');
            const data = await res.json();
            if (data.success) {
                // Map floorMonitor from API to local state
                // Note: API returns id as the number part, but we might want the real id.
                // Re-fetching tables specifically or adjusting API is better.
                // For now, let's assume floorMonitor has enough info or adjust API.
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
        const interval = setInterval(fetchFloor, 5000);
        return () => clearInterval(interval);
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
        VACANT: { color: 'bg-green-500', bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700', label: 'Vacant' },
        ACTIVE: { color: 'bg-red-500', bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700', label: 'Occupied' },
        READY: { color: 'bg-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', label: 'Service Ready' },
        BILL_REQUESTED: { color: 'bg-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-700', label: 'Payment Pending' },
        DIRTY: { color: 'bg-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', label: 'Needs Cleaning' }
    };

    return (
        <div className="h-full bg-[#FDFCF9] p-6 lg:p-10 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-10 pb-32">

                {/* Header & Legends */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-zinc-200/50 pb-8 gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-zinc-900 tracking-tighter uppercase mb-2">Floor Blueprint</h1>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest italic">Live Occupancy & Service Flow Indicator</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-zinc-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#D43425] transition-all shadow-lg shadow-zinc-200"
                        >
                            + Expand Floor
                        </button>
                        <div className="flex flex-wrap gap-4 border-l border-zinc-100 pl-6 ml-2">
                            {Object.entries(statusConfig).map(([key, cfg]: any) => (
                                <div key={key} className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${cfg.color}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{cfg.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {tables.map(table => {
                        const cfg = statusConfig[table.status] || statusConfig.VACANT;
                        return (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                key={table.code}
                                onClick={() => {
                                    setSelectedTable(table);
                                }}
                                className={`aspect-square rounded-4xl border-2 ${cfg.bg} ${cfg.border} flex flex-col items-center justify-center relative transition-all hover:shadow-xl group
                                    ${table.status === 'READY' && table.updatedAt && (Date.now() - new Date(table.updatedAt).getTime() > 600000) ? 'ring-4 ring-red-500 animate-pulse' : ''}
                                    ${table.status === 'READY' && table.updatedAt && (Date.now() - new Date(table.updatedAt).getTime() > 300000 && Date.now() - new Date(table.updatedAt).getTime() <= 600000) ? 'ring-4 ring-amber-500 animate-pulse' : ''}
                                `}
                            >
                                <div className={`absolute top-6 right-6 w-3 h-3 rounded-full ${cfg.color} ${table.status === 'READY' ? 'animate-ping' : ''}`} />
                                <span className={`text-4xl font-black ${cfg.text} tracking-tighter`}>{table.code}</span>
                                <div className="mt-2 text-center">
                                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${cfg.text} opacity-50`}>{cfg.label}</p>
                                    {table.waiter && table.status !== 'VACANT' && (
                                        <p className="text-[8px] font-bold text-zinc-400 uppercase mt-1">Staff: {table.waiter}</p>
                                    )}
                                    {table.status === 'READY' && table.updatedAt && (
                                        <p className="text-[10px] font-black text-red-600 mt-1">
                                            {Math.floor((Date.now() - new Date(table.updatedAt).getTime()) / 60000)}m WAITING
                                        </p>
                                    )}
                                </div>
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* SIDE DRAWER / MODAL FOR SELECTED TABLE */}
            <AnimatePresence>
                {selectedTable && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl border border-zinc-100"
                        >
                            <div className="text-center mb-8">
                                <div className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mb-1">Authorization Terminal</div>
                                <h3 className="text-4xl font-black text-zinc-900 uppercase tracking-tighter">Table {selectedTable.code}</h3>
                                <div className="mt-2 flex justify-center">
                                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusConfig[selectedTable.status]?.bg} ${statusConfig[selectedTable.status]?.text}`}>
                                        Currently {selectedTable.status}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center mb-4">Manual Override Status</p>

                                {selectedTable.status === 'DIRTY' && (
                                    <button
                                        onClick={() => handleUpdateStatus(selectedTable.id, 'VACANT')}
                                        className="w-full py-5 bg-green-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-green-600 transition-all shadow-lg shadow-green-100"
                                    >
                                        Mark as Cleaned
                                    </button>
                                )}

                                {selectedTable.status === 'VACANT' && (
                                    <button
                                        onClick={() => handleUpdateStatus(selectedTable.id, 'ACTIVE')}
                                        className="w-full py-5 bg-red-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-100"
                                    >
                                        Manually Occupy
                                    </button>
                                )}

                                {['ACTIVE', 'READY', 'BILL_REQUESTED'].includes(selectedTable.status) && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-zinc-50 rounded-2xl text-center space-y-2">
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Active Session Locked</p>
                                            <p className="text-xs font-medium text-zinc-500 italic">This table has an open order. Manual status change is restricted.</p>
                                        </div>

                                        <div className="pt-4 border-t border-zinc-100">
                                            <p className="text-[9px] font-black text-red-400 uppercase tracking-widest text-center mb-3">Manager Danger Zone</p>
                                            <button
                                                onClick={() => handleEmergencyReset(selectedTable.id)}
                                                className="w-full py-4 bg-white border-2 border-red-50 text-red-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-50 transition-all"
                                            >
                                                Emergency Force Reset
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={() => setSelectedTable(null)}
                                    className="w-full py-4 text-[10px] font-black text-zinc-300 uppercase tracking-widest hover:text-zinc-600"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ADD TABLE MODAL */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-md rounded-[3rem] p-12 shadow-2xl border border-zinc-100"
                        >
                            <div className="text-center mb-10">
                                <h3 className="text-3xl font-black text-zinc-900 uppercase tracking-tighter">Expand Operations</h3>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-2">Provisioning New Service Terminal</p>
                            </div>

                            <form onSubmit={handleAddTable} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-4">Table Designation (e.g. 10, T-05)</label>
                                    <input
                                        type="text"
                                        required
                                        value={newTableCode}
                                        onChange={(e) => setNewTableCode(e.target.value)}
                                        placeholder="Identification Code"
                                        className="w-full px-6 py-5 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold uppercase tracking-widest focus:ring-2 ring-[#D43425]/10 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-4">Capacity (Guests)</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max="20"
                                        value={newTableCapacity}
                                        onChange={(e) => setNewTableCapacity(parseInt(e.target.value))}
                                        className="w-full px-6 py-5 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold tracking-widest outline-none"
                                    />
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-zinc-600 transition-all"
                                    >
                                        Abort
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={adding}
                                        className="flex-2 py-5 bg-zinc-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#D43425] transition-all shadow-xl shadow-zinc-200 disabled:opacity-50"
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
