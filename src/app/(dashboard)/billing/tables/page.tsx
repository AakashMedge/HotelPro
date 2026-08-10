'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface TableItem {
    id: string;
    tableCode: string;
    capacity: number;
    status: 'VACANT' | 'OCCUPIED' | 'BILL_REQUESTED' | string;
    section?: string;
}

export default function BillingTablesPage() {
    const [tables, setTables] = useState<TableItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [tableCode, setTableCode] = useState('');
    const [capacity, setCapacity] = useState('4');
    const [section, setSection] = useState('Main Floor');
    const [saving, setSaving] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    const fetchTables = useCallback(async () => {
        try {
            const res = await fetch(`/api/tables?t=${Date.now()}`);
            const data = await res.json();
            if (data.success && data.tables) {
                setTables(data.tables);
            }
        } catch (err) {
            console.error('[BILLING_TABLES]', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchTables();
    }, [fetchTables]);

    const handleCreateTable = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tableCode) return;
        setSaving(true);
        setModalError(null);

        try {
            const res = await fetch('/api/tables', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tableCode: tableCode.trim(),
                    capacity: parseInt(capacity) || 4,
                    section: section.trim() || 'Main Floor',
                }),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setNotification(`Table ${tableCode} created successfully`);
                setShowModal(false);
                setTableCode('');
                setModalError(null);
                fetchTables();
            } else {
                setModalError(data.error || 'Failed to create table');
            }
        } catch {
            setModalError('Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTable = async (id: string, code: string) => {
        if (!confirm(`Are you sure you want to delete Table ${code}?`)) return;
        try {
            const res = await fetch(`/api/tables/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setNotification(`Table ${code} deleted`);
                setTables(prev => prev.filter(t => t.id !== id));
            } else {
                setNotification('Failed to delete table');
            }
        } catch {
            setNotification('Error deleting table');
        }
    };

    if (!mounted) return null;

    const vacantCount = tables.filter(t => t.status === 'VACANT').length;
    const occupiedCount = tables.filter(t => t.status !== 'VACANT').length;

    return (
        <div className="h-full bg-[#F8F9FA] flex flex-col overflow-hidden font-sans text-zinc-800">

            {/* TOP HEADER */}
            <header className="shrink-0 bg-white border-b border-zinc-200/80 px-6 md:px-8 py-5">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Tables</h1>
                        <p className="text-xs text-zinc-500 font-normal mt-0.5">
                            {tables.length} Total Tables ({vacantCount} Open · {occupiedCount} Occupied)
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Link
                            href="/billing/pos"
                            className="px-3.5 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-2xs flex items-center gap-1.5"
                        >
                            <span>Go to POS</span>
                        </Link>
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-4 py-2 bg-[#065F46] hover:bg-[#044E39] text-white rounded-lg text-xs font-semibold tracking-wide transition-all shadow-2xs flex items-center gap-1.5"
                        >
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Add Table</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* NOTIFICATION TOAST */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="mx-6 md:mx-8 mt-4 bg-zinc-900 text-white rounded-xl px-4 py-3 text-xs font-medium flex items-center justify-between shrink-0 shadow-lg"
                        onAnimationComplete={() => setTimeout(() => setNotification(null), 3000)}
                    >
                        <span>{notification}</span>
                        <button onClick={() => setNotification(null)} className="text-zinc-400 hover:text-white text-sm">✕</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MAIN CONTENT AREA */}
            <main className="grow overflow-y-auto px-6 md:px-8 py-6 no-scrollbar pb-24 md:pb-8">
                {loading ? (
                    <div className="py-20 flex items-center justify-center">
                        <div className="w-7 h-7 border-2 border-zinc-200 border-t-[#065F46] rounded-full animate-spin" />
                    </div>
                ) : tables.length === 0 ? (
                    <div className="bg-white border border-zinc-200/80 rounded-xl py-16 text-center">
                        <p className="text-xs font-medium text-zinc-500 mb-3">No tables created yet.</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-4 py-2 bg-[#065F46] text-white rounded-lg text-xs font-semibold"
                        >
                            + Create First Table
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                        {tables.map((table) => {
                            const isVacant = table.status === 'VACANT';
                            return (
                                <div
                                    key={table.id}
                                    className={`bg-white border rounded-xl p-4 flex flex-col justify-between transition-all hover:border-zinc-300 shadow-2xs ${
                                        isVacant ? 'border-zinc-200/80' : 'border-amber-200 bg-amber-50/20'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                                {table.section || 'Floor'}
                                            </span>
                                            <span className={`w-2 h-2 rounded-full ${isVacant ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        </div>

                                        <h3 className="text-xl font-bold text-zinc-900 tracking-tight leading-none mb-1">
                                            {table.tableCode}
                                        </h3>
                                        <p className="text-[11px] font-medium text-zinc-400">
                                            {table.capacity} Seats
                                        </p>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                                        <Link
                                            href={`/billing/pos/${table.id}`}
                                            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition-all ${
                                                isVacant
                                                    ? 'bg-zinc-100 hover:bg-zinc-900 hover:text-white text-zinc-700'
                                                    : 'bg-[#065F46] text-white hover:bg-[#044E39]'
                                            }`}
                                        >
                                            {isVacant ? 'Bill Table' : 'View Bill'}
                                        </Link>

                                        <button
                                            onClick={() => handleDeleteTable(table.id, table.tableCode)}
                                            className="w-6 h-6 rounded-md hover:bg-rose-50 flex items-center justify-center text-zinc-400 hover:text-rose-600 transition-colors"
                                            title="Delete Table"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* CREATE TABLE MODAL */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-zinc-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-base font-bold text-zinc-900 mb-1">Create New Table</h3>
                            <p className="text-xs text-zinc-500 mb-4">Add a table number to your POS terminal.</p>

                            <form onSubmit={handleCreateTable} className="space-y-3">
                                {modalError && (
                                    <div className="p-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-xs font-medium">
                                        {modalError}
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Table Name / Code</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. T-01, T-02, Table 5"
                                        value={tableCode}
                                        onChange={(e) => setTableCode(e.target.value)}
                                        className="w-full h-9 bg-zinc-50 border border-zinc-200 rounded-lg px-3 text-xs outline-none focus:border-zinc-400"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Capacity (Seating)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        required
                                        placeholder="4"
                                        value={capacity}
                                        onChange={(e) => setCapacity(e.target.value)}
                                        className="w-full h-9 bg-zinc-50 border border-zinc-200 rounded-lg px-3 text-xs outline-none focus:border-zinc-400"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Section / Area</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Main Hall, Garden, AC Section"
                                        value={section}
                                        onChange={(e) => setSection(e.target.value)}
                                        className="w-full h-9 bg-zinc-50 border border-zinc-200 rounded-lg px-3 text-xs outline-none focus:border-zinc-400"
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-semibold">
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 py-2.5 bg-[#065F46] hover:bg-[#044E39] text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                                    >
                                        {saving ? 'Creating...' : 'Save Table'}
                                    </button>
                                </div>
                            </form>
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
