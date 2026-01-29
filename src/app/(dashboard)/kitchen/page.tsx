'use client';

import { useState, useEffect } from 'react';

// Unified Ticket Type
type LineItem = {
    name: string;
    qty: number;
    note?: string;
    isNew?: boolean;
};

type Ticket = {
    id: string;
    table: string;
    status: 'NEW' | 'PREPARING' | 'READY';
    items: LineItem[];
    createdAt: number;
};

// Fixed Mock Data to avoid hydration mismatch
const MOCK_START_TIME = 1738221000000; // Fixed timestamp

const INITIAL_TICKS: Ticket[] = [
    {
        id: 'K-101',
        table: '12',
        status: 'NEW',
        createdAt: MOCK_START_TIME - 120000,
        items: [
            { name: 'WAGYU BEEF', qty: 2, note: 'MEDIUM RARE' },
            { name: 'TRUFFLE MAC', qty: 1, isNew: true },
        ]
    },
    {
        id: 'K-102',
        table: '04',
        status: 'PREPARING',
        createdAt: MOCK_START_TIME - 840000,
        items: [
            { name: 'SAFFRON RISOTTO', qty: 1 },
            { name: 'LOBSTER TAIL', qty: 1, note: 'EXTRA BUTTER' },
        ]
    },
    {
        id: 'K-103',
        table: '09',
        status: 'READY',
        createdAt: MOCK_START_TIME - 1200000,
        items: [
            { name: 'MASALA CHAI', qty: 3 },
        ]
    }
];

export default function KitchenKDS() {
    const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKS);
    const [currentTime, setCurrentTime] = useState(MOCK_START_TIME);
    const [activeTab, setActiveTab] = useState<'NEW' | 'PREPARING' | 'READY'>('NEW');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setCurrentTime(Date.now()); // Set real time after mount
        const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const moveStatus = (ticketId: string, nextStatus: 'PREPARING' | 'READY') => {
        setTickets(prev => prev.map(t =>
            t.id === ticketId ? { ...t, status: nextStatus } : t
        ));
        if (activeTab === 'NEW' && nextStatus === 'PREPARING') setActiveTab('PREPARING');
    };

    const getElapsedTime = (createdTime: number) => {
        if (!mounted) return { text: '00:00', isCritical: false };
        const diff = Math.floor((currentTime - createdTime) / 1000);
        const mins = Math.floor(diff / 60);
        const secs = Math.abs(diff % 60);
        return {
            text: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
            isCritical: mins >= 15
        };
    };

    const Column = ({ title, status, mobileHidden = false, tabletHidden = false }: { title: string, status: Ticket['status'], mobileHidden?: boolean, tabletHidden?: boolean }) => (
        <div className={`flex flex-col h-full border-r border-[#E5E5E5] last:border-0 overflow-hidden ${mobileHidden ? 'hidden' : 'flex'} ${tabletHidden ? 'md:hidden lg:flex' : 'md:flex'}`}>
            {/* Column Header */}
            <div className="hidden md:flex h-12 bg-white border-b border-zinc-200 items-center justify-between px-4 lg:px-6 shrink-0">
                <h2 className="text-[9px] lg:text-[10px] font-black tracking-[0.3em] text-zinc-400 uppercase">{title}</h2>
                <div className="px-1.5 lg:px-2 py-0.5 rounded bg-zinc-100 text-zinc-900 text-[8px] lg:text-[9px] font-black tabular-nums border border-zinc-200">
                    {tickets.filter(t => t.status === status).length}
                </div>
            </div>

            {/* Ticket Area */}
            <div className="grow overflow-y-auto p-4 lg:p-6 space-y-6 lg:space-y-8 bg-[#F8F9FA] hide-scrollbar pb-24 md:pb-8">
                {tickets.filter(t => t.status === status).map(ticket => {
                    const timer = getElapsedTime(ticket.createdAt);
                    return (
                        <div key={ticket.id} className="relative group">
                            <div className="bg-white rounded-xl lg:rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col min-h-[300px] lg:min-h-[400px]">
                                <div className={`h-1 w-full ${status === 'NEW' ? 'bg-blue-500' : status === 'PREPARING' ? 'bg-amber-500' : 'bg-green-500'}`} />

                                <div className="p-4 lg:p-8 border-b-[0.5px] border-zinc-100 flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <span className="text-4xl lg:text-6xl font-black tracking-tighter text-[#1D1D1F] leading-none">
                                            T_{ticket.table}
                                        </span>
                                        <span className="text-[8px] lg:text-[10px] font-black text-zinc-300 uppercase tracking-widest mt-1 lg:mt-2 italic leading-none">REF: {ticket.id}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className={`px-2 lg:px-4 py-1 lg:py-2 rounded-lg lg:rounded-xl border flex items-center gap-1.5 lg:gap-2 ${timer.isCritical ? 'bg-red-50 border-red-100 text-[#D43425]' : 'bg-zinc-50 border-zinc-100 text-zinc-400'}`}>
                                            <span className="text-sm lg:text-2xl font-black tabular-nums leading-none tracking-tight">{timer.text}</span>
                                            <div className={`w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full ${timer.isCritical ? 'bg-red-500 animate-pulse' : 'bg-zinc-300'}`} />
                                        </div>
                                    </div>
                                </div>

                                <div className="grow p-4 lg:p-8 space-y-4 lg:space-y-6">
                                    {ticket.items.map((item, idx) => (
                                        <div key={idx} className="flex gap-4 lg:gap-6 items-start">
                                            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#1D1D1F] text-white flex items-center justify-center font-black text-lg lg:text-2xl rounded-lg lg:rounded-xl shrink-0 shadow-sm">
                                                {item.qty}
                                            </div>
                                            <div className="grow flex flex-col">
                                                <div className="flex items-center gap-2 lg:gap-3">
                                                    <h3 className="font-black text-sm lg:text-xl leading-tight text-[#1D1D1F] tracking-tight">{item.name}</h3>
                                                    {item.isNew && <span className="bg-[#D43425] text-white text-[6px] lg:text-[8px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase italic">NEW</span>}
                                                </div>
                                                {item.note && (
                                                    <div className="mt-1 lg:mt-2 flex items-center gap-1.5 text-[#D43425]">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" /></svg>
                                                        <p className="text-[8px] lg:text-[11px] font-black uppercase tracking-widest leading-none">{item.note}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-4 lg:p-6 pt-0 mt-auto lg:px-8 lg:pb-8">
                                    {status === 'NEW' && (
                                        <button onClick={() => moveStatus(ticket.id, 'PREPARING')} className="w-full h-12 lg:h-16 bg-[#1D1D1F] text-white text-[10px] lg:text-xs font-black uppercase tracking-[0.4em] rounded-xl lg:rounded-2xl active:scale-95 transition-all shadow-lg hover:bg-[#D43425]">START_PREP</button>
                                    )}
                                    {status === 'PREPARING' && (
                                        <button onClick={() => moveStatus(ticket.id, 'READY')} className="w-full h-12 lg:h-16 bg-green-600 text-white text-[10px] lg:text-xs font-black uppercase tracking-[0.4em] rounded-xl lg:rounded-2xl active:scale-95 transition-all shadow-lg shadow-green-900/10">MARK_READY</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    if (!mounted) return null;

    return (
        <div className="flex flex-col h-full w-full">
            {/* MOBILE/TABLET TAB NAVIGATOR - Shown on Mobile (up to md) and Tablets (md to lg) */}
            <div className="lg:hidden flex bg-white border-b border-zinc-200 shrink-0">
                {(['NEW', 'PREPARING', 'READY'] as const).map(status => (
                    <button
                        key={status}
                        onClick={() => setActiveTab(status)}
                        className={`grow py-4 px-2 flex flex-col items-center gap-1 relative transition-all ${activeTab === status ? 'text-black' : 'text-zinc-400'}`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] md:text-[10px] font-black tracking-widest uppercase">{status}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === status ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                                {tickets.filter(t => t.status === status).length}
                            </span>
                        </div>
                        {activeTab === status && <div className={`absolute bottom-0 left-0 w-full h-1 ${status === 'NEW' ? 'bg-blue-500' : status === 'PREPARING' ? 'bg-amber-500' : 'bg-green-500'}`} />}
                    </button>
                ))}
            </div>

            {/* RENDER ZONE */}
            <div className="grow flex lg:grid lg:grid-cols-3 h-full divide-x divide-zinc-200 overflow-hidden">
                <Column title="Intake_New" status="NEW" mobileHidden={activeTab !== 'NEW'} tabletHidden={activeTab !== 'NEW'} />
                <Column title="Operations_Prep" status="PREPARING" mobileHidden={activeTab !== 'PREPARING'} tabletHidden={activeTab !== 'PREPARING'} />
                <Column title="Dispatch_Ready" status="READY" mobileHidden={activeTab !== 'READY'} tabletHidden={activeTab !== 'READY'} />
            </div>
        </div>
    );
}
