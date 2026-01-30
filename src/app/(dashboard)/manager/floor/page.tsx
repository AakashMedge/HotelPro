
'use client';

import { useState, useEffect } from 'react';

type TableData = {
    id: string;
    tableCode: string; // T-01
    status: string;
    assignedWaiterId: string | null;
    capacity: number;
};

type StaffMember = {
    id: string;
    name: string;
    role: string;
};

export default function FloorManagerPage() {
    const [tables, setTables] = useState<TableData[]>([]);
    const [waiters, setWaiters] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    // Action State
    const [assigning, setAssigning] = useState(false);

    // New Table Form
    const [newTable, setNewTable] = useState({ code: '', capacity: '4' });

    const fetchData = async () => {
        try {
            const [tablesRes, staffRes] = await Promise.all([
                fetch('/api/tables'),
                fetch('/api/staff')
            ]);

            const tablesData = await tablesRes.json();
            const staffData = await staffRes.json();

            if (tablesData.success) setTables(tablesData.tables);
            if (staffData.success) {
                setWaiters(staffData.staff.filter((s: any) => s.role === 'WAITER' || s.role === 'ADMIN'));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAssign = async (waiterId: string | null) => {
        if (!selectedTable) return;
        setAssigning(true);
        try {
            await fetch(`/api/tables/${selectedTable.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignedWaiterId: waiterId })
            });
            fetchData();
            setSelectedTable(null);
        } catch (err) {
            console.error("Assignment failed", err);
        } finally {
            setAssigning(false);
        }
    };

    const handleCreateTable = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/tables', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tableCode: newTable.code.startsWith('T-') ? newTable.code : `T-${newTable.code}`,
                    capacity: newTable.capacity
                })
            });
            if (res.ok) {
                setShowAddModal(false);
                setNewTable({ code: '', capacity: '4' });
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="p-10 text-center animate-pulse">Loading Floor Plan...</div>;

    return (
        <div className="h-full overflow-y-auto p-4 md:p-8 lg:p-10 hide-scrollbar bg-[#FDFCF9]">
            <div className="max-w-7xl mx-auto space-y-8 pb-32">

                <div className="flex justify-between items-end border-b border-zinc-100 pb-6">
                    <div>
                        <h2 className="text-3xl font-black tracking-tighter uppercase text-zinc-900">Floor Layout</h2>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Configure & Assign</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-[#D43425] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-zinc-900 transition-colors shadow-lg shadow-red-500/20"
                    >
                        + New Table
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {tables.map(table => {
                        const assignedWaiter = waiters.find(w => w.id === table.assignedWaiterId);

                        return (
                            <button
                                key={table.id}
                                onClick={() => setSelectedTable(table)}
                                className={`
                                    relative p-6 rounded-2xl border-2 flex flex-col items-center text-center gap-2 transition-all active:scale-95 group
                                    ${table.assignedWaiterId
                                        ? 'bg-zinc-900 border-zinc-900 text-white shadow-xl'
                                        : 'bg-white border-dashed border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:text-zinc-600'}
                                `}
                            >
                                <span className="text-3xl font-black tracking-tighter">{table.tableCode}</span>

                                <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${table.assignedWaiterId ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-400'
                                    }`}>
                                    {assignedWaiter ? assignedWaiter.name : 'UNASSIGNED'}
                                </div>

                                <span className="absolute top-4 right-4 text-[8px] font-bold opacity-50">{table.capacity} SEATS</span>
                            </button>
                        );
                    })}
                </div>

            </div>

            {/* ASSIGNMENT / EDIT MODAL */}
            {selectedTable && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 space-y-8">
                        <div className="text-center">
                            <h3 className="text-4xl font-black text-zinc-900 uppercase tracking-tighter">Table {selectedTable.tableCode}</h3>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-2">{selectedTable.capacity} Seat Capacity</p>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-2">Assign Waiter</h4>
                            <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto hide-scrollbar">
                                <button
                                    onClick={() => handleAssign(null)}
                                    disabled={assigning}
                                    className={`p-3 rounded-xl border-2 border-dashed border-zinc-200 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 ${!selectedTable.assignedWaiterId ? 'bg-zinc-100 border-zinc-300' : ''}`}
                                >
                                    No Assignment
                                </button>
                                {waiters.map(w => (
                                    <button
                                        key={w.id}
                                        onClick={() => handleAssign(w.id)}
                                        disabled={assigning}
                                        className={`p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedTable.assignedWaiterId === w.id
                                            ? 'bg-zinc-900 text-white ring-2 ring-zinc-900 ring-offset-2'
                                            : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-200'
                                            }`}
                                    >
                                        {w.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-zinc-100 flex justify-between items-center">
                            <button
                                onClick={() => setSelectedTable(null)}
                                className="text-[10px] font-black text-zinc-400 hover:text-black uppercase tracking-widest"
                            >
                                Close
                            </button>
                            {/* Future: Add Delete Table Button Here */}
                        </div>
                    </div>
                </div>
            )}

            {/* ADD TABLE MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter mb-6">Add Table</h3>
                        <form onSubmit={handleCreateTable} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Table Code</label>
                                <input
                                    className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-xl font-bold text-zinc-900"
                                    placeholder="e.g. 15"
                                    value={newTable.code}
                                    onChange={e => setNewTable({ ...newTable, code: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Capacity</label>
                                <input
                                    type="number"
                                    className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-xl font-bold text-zinc-900"
                                    value={newTable.capacity}
                                    onChange={e => setNewTable({ ...newTable, capacity: e.target.value })}
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-3 text-[10px] font-black text-zinc-400 hover:text-zinc-900 uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-2 bg-[#D43425] text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-colors"
                                >
                                    Create Table
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
