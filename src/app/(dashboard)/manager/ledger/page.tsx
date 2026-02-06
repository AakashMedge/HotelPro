
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
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/manager/ledger')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setEntries(data.ledger);
                    setStats(data.stats);
                }
                setLoading(false);
            });
    }, []);

    if (loading) return (
        <div className="h-full flex flex-col items-center justify-center bg-[#FDFCF9] gap-4">
            <div className="w-12 h-12 border-2 border-zinc-100 border-t-[#D43425] rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-300">Syncing Ledger...</p>
        </div>
    );

    return (
        <div className="h-full overflow-y-auto p-4 md:p-8 lg:p-10 hide-scrollbar bg-[#FDFCF9]">
            <div className="max-w-7xl mx-auto space-y-12 pb-32">

                {/* HEADER & TOP STATS */}
                <div className="space-y-10">
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-4xl font-black tracking-tighter uppercase text-zinc-900">Financial Ledger</h2>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mt-1 italic font-playfair">Service Revenue Intelligence</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Live Sync Status</p>
                            <span className="text-[11px] font-black text-green-500 uppercase flex items-center gap-2 justify-end">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Optimal Connection
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="p-8 bg-zinc-950 text-white rounded-4xl shadow-xl border border-white/5 flex flex-col justify-between group hover:-translate-y-1 transition-all duration-500">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Revenue (INR)</span>
                            <div className="mt-4 flex flex-col">
                                <span className="text-4xl font-black font-playfair italic leading-none text-[#D43425]">
                                    ₹{stats?.totalRevenue?.toLocaleString() || 0}
                                </span>
                                <span className="text-[9px] font-bold text-green-400 uppercase mt-2">Net. 100% Settled</span>
                            </div>
                        </div>

                        <div className="p-8 bg-white border border-zinc-100 rounded-4xl shadow-sm flex flex-col justify-between hover:shadow-lg transition-all">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Avg Ticket Size</span>
                            <div className="mt-4">
                                <span className="text-3xl font-black text-zinc-900 tracking-tighter italic">
                                    ₹{Math.floor(stats?.avgTicket || 0).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="p-8 bg-white border border-zinc-100 rounded-4xl shadow-sm flex flex-col justify-between hover:shadow-lg transition-all">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Volumes</span>
                            <div className="mt-4">
                                <span className="text-3xl font-black text-zinc-900 tracking-tighter italic">
                                    {stats?.totalOrders || 0} <span className="text-xs text-zinc-300 not-italic uppercase ml-1">Served</span>
                                </span>
                            </div>
                        </div>

                        <div className="p-8 bg-white border border-zinc-100 rounded-4xl shadow-sm flex flex-col justify-between hover:shadow-lg transition-all outline-2 outline-amber-400/20">
                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Flagship Dish</span>
                            <div className="mt-4">
                                <span className="text-lg font-black text-zinc-900 uppercase tracking-tight line-clamp-1">
                                    {stats?.topItem || 'None'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TRANSACTION TABLE */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-300">Transaction Stream</span>
                        <div className="h-px grow bg-zinc-100" />
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
        </div>
    );
}
