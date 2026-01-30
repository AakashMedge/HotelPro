
'use client';

import { useState, useEffect } from 'react';

type LedgerEntry = {
    id: string;
    table: string;
    customer: string;
    items: number;
    total: number;
    date: string;
    paymentMethod: string;
};

export default function LedgerPage() {
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/manager/ledger')
            .then(res => res.json())
            .then(data => {
                if (data.success) setEntries(data.ledger);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-10 text-center animate-pulse">Loading Ledger...</div>;

    return (
        <div className="h-full overflow-y-auto p-4 md:p-8 lg:p-10 hide-scrollbar bg-[#FDFCF9]">
            <div className="max-w-7xl mx-auto space-y-8 pb-32">

                <div className="flex justify-between items-end border-b border-zinc-100 pb-6">
                    <div>
                        <h2 className="text-3xl font-black tracking-tighter uppercase text-zinc-900">Financial Ledger</h2>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Transaction History</p>
                    </div>
                </div>

                <div className="bg-white border border-zinc-100 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-50 border-b border-zinc-100">
                            <tr>
                                <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Date & Time</th>
                                <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Table / Guest</th>
                                <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Items</th>
                                <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Total Amount</th>
                                <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {entries.map(entry => (
                                <tr key={entry.id} className="group hover:bg-zinc-50/50 transition-colors cursor-pointer">
                                    <td className="p-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-zinc-900">{new Date(entry.date).toLocaleDateString()}</span>
                                            <span className="text-[10px] font-medium text-zinc-400 uppercase">{new Date(entry.date).toLocaleTimeString()}</span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-zinc-900">{entry.table}</span>
                                            <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">Guests: {entry.customer}</span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-right font-bold text-zinc-600">{entry.items}</td>
                                    <td className="p-6 text-right font-black text-zinc-900 text-lg">₹{Number(entry.total || 0).toLocaleString()}</td>
                                    <td className="p-6 text-right">
                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                            PAID
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {entries.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-zinc-400 italic">No transactions recorded yet</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
}
