'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// Mock Data for MVP Table
const tableData = {
    id: '12',
    status: 'ACTIVE',
    guest: 'Mr. Singhania',
    time: '18:42',
    items: [
        { id: 1, name: 'Wagyu Beef Tenderloin', qty: 2, note: 'Medium Rare', status: 'PREPARING', origin: 'GUEST_QR', time: '18:45' },
        { id: 2, name: 'Truffle Mac & Cheese', qty: 1, note: 'Extra cheese', status: 'READY', origin: 'GUEST_QR', time: '18:45' },
        { id: 3, name: 'Imperial Masala Chai', qty: 1, note: null, status: 'SERVED', origin: 'STAFF_POS', time: '19:10' },
        { id: 4, name: 'Vintage Reserve Red', qty: 1, note: 'Room temp', status: 'PENDING', origin: 'STAFF_POS', time: '19:15' },
    ]
};

export default function TableDetails() {
    const { id } = useParams();
    const router = useRouter();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'READY': return 'text-green-600 bg-green-50 border-green-100';
            case 'PREPARING': return 'text-amber-600 bg-amber-50 border-amber-100';
            case 'SERVED': return 'text-zinc-400 bg-zinc-50 border-zinc-100';
            case 'PENDING': return 'text-blue-600 bg-blue-50 border-blue-100 text-pulse';
            default: return 'text-zinc-500 bg-zinc-50 border-zinc-100';
        }
    };

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">
            {/* PROFESSIONAL TICKET HEADER (Mobile Optimized) */}
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
                            <h1 className="text-xl md:text-3xl font-black tracking-tighter uppercase leading-none">T_{id}</h1>
                            <span className="text-[8px] md:text-[10px] font-black text-zinc-300 uppercase tabular-nums">ID-4421</span>
                        </div>
                        <div className="flex gap-2 md:gap-4 mt-0.5 md:mt-1">
                            <span className="text-[7px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">{tableData.guest}</span>
                            <span className="text-[7px] md:text-[10px] font-bold text-zinc-300 uppercase tracking-widest tabular-nums">{tableData.time}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1 md:gap-2">
                    <div className="px-2 md:px-4 py-1 md:py-1.5 bg-black text-white rounded md:rounded-lg text-[7px] md:text-[10px] font-black uppercase tracking-[0.2em] leading-none">
                        {tableData.status}
                    </div>
                </div>
            </div>

            {/* THE LIVE LEDGER (High Precision List) */}
            <div className="grow overflow-y-auto px-3 md:px-6 py-4 md:py-8 space-y-4 bg-[#F9F9F9]">
                <div className="bg-white rounded-xl md:rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                    {/* Ledger Header (Desktop Only) */}
                    <div className="hidden md:grid grid-cols-12 px-6 py-3 border-b border-zinc-100 bg-zinc-50/50">
                        <div className="col-span-1 text-[9px] font-black text-zinc-400 uppercase">Qty</div>
                        <div className="col-span-7 text-[9px] font-black text-zinc-400 uppercase">Description / Notes</div>
                        <div className="col-span-4 text-[9px] font-black text-zinc-400 uppercase text-right">Status</div>
                    </div>

                    <div className="divide-y divide-zinc-100">
                        {tableData.items.map((item) => (
                            <div key={item.id} className="p-4 md:p-6 hover:bg-zinc-50/50 transition-colors">
                                <div className="flex md:grid md:grid-cols-12 gap-4 md:gap-0 items-start md:items-center">

                                    {/* QTY (Mobile Left) */}
                                    <div className="md:col-span-1 border-r border-zinc-50 pr-4 md:border-0 md:pr-0 shrink-0">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg border-2 border-zinc-100 flex items-center justify-center font-black text-sm md:text-lg tabular-nums">
                                            {item.qty}
                                        </div>
                                    </div>

                                    {/* DESC (Mobile Center) */}
                                    <div className="md:col-span-7 grow md:pl-6 space-y-1">
                                        <div className="flex md:block justify-between items-start gap-2">
                                            <h3 className="font-bold text-sm md:text-lg text-[#1D1D1F] leading-tight grow">{item.name}</h3>
                                            {/* Status (Mobile Only Inline) */}
                                            <span className={`md:hidden px-2 py-0.5 rounded text-[7px] font-black tracking-widest border uppercase shrink-0 ${getStatusColor(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <span className="text-[7px] md:text-[9px] font-bold text-zinc-300 uppercase tracking-widest whitespace-nowrap">{item.origin}</span>
                                            <span className="text-zinc-100">|</span>
                                            <span className="text-[7px] md:text-[9px] font-bold text-zinc-300 uppercase tracking-widest tabular-nums">{item.time}</span>
                                        </div>
                                        {item.note && (
                                            <div className="mt-2 flex items-start gap-1.5 bg-red-50/50 p-1.5 rounded-lg border border-red-100/30 max-w-fit">
                                                <p className="text-[8px] md:text-[11px] font-black text-[#D43425] uppercase tracking-tighter leading-none">{item.note}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Status (Desktop Only Far Right) */}
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

                {/* Audit Log Hint */}
                <p className="text-center text-[7px] md:text-[10px] font-black text-zinc-300 uppercase tracking-[0.5em] py-4 md:py-8">End of Live Sequence</p>
            </div>

            {/* OPERATIONAL DOCK (Action Tray - Mobile Pinned) */}
            <div className="p-4 md:p-8 border-t border-zinc-200 bg-white grid grid-cols-2 gap-3 md:gap-6 pb-6 md:pb-12 shrink-0">
                <Link
                    href={`/waiter/table/${id}/add`}
                    className="h-14 md:h-20 bg-black text-white rounded-xl md:rounded-[1.5rem] flex items-center justify-center gap-2 md:gap-4 active:scale-95 transition-all shadow-lg"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest md:tracking-[0.3em]">ADD_ENTRY</span>
                </Link>

                <button
                    className={`h-14 md:h-20 rounded-xl md:rounded-[1.5rem] flex items-center justify-center gap-2 md:gap-4 transition-all active:scale-95 shadow-lg border-2 ${tableData.status === 'ATTENTION' ? 'bg-[#D43425] border-[#D43425] text-white' : 'bg-white border-zinc-100 text-black'}`}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 7h6M9 12h6M9 17h6M5 7h.01M5 12h.01M5 17h.01" /></svg>
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest md:tracking-[0.3em]">REQ_BILL</span>
                </button>
            </div>
        </div>
    );
}
