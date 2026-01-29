'use client';

import { useState, useEffect } from 'react';

// Unified Order Type for Cashier
type LineItem = {
    name: string;
    qty: number;
    price: number;
};

type PendingTable = {
    id: string;
    guestName: string;
    items: LineItem[];
    requestedAt: number;
};

const MOCK_PENDING: PendingTable[] = [
    {
        id: '12',
        guestName: 'Mr. Singhania',
        requestedAt: Date.now() - 300000,
        items: [
            { name: 'Wagyu Beef Tenderloin', qty: 2, price: 8500 },
            { name: 'Truffle Mac & Cheese', qty: 1, price: 2100 },
            { name: 'Vintage Reserve Red', qty: 2, price: 1200 },
        ]
    },
    {
        id: '04',
        guestName: 'Suite 401',
        requestedAt: Date.now() - 600000,
        items: [
            { name: 'Persian Saffron Risotto', qty: 1, price: 2100 },
            { name: 'Imperial Masala Chai', qty: 4, price: 450 },
        ]
    },
    {
        id: '09',
        guestName: 'Guest Walk-in',
        requestedAt: Date.now() - 60000,
        items: [
            { name: 'Tandoori Lobster Tail', qty: 1, price: 4200 },
            { name: 'Mineral Water', qty: 2, price: 450 },
        ]
    }
];

export default function CashierTerminal() {
    const [mounted, setMounted] = useState(false);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'CASH' | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [settledIds, setSettledIds] = useState<string[]>([]);
    const [isMobileDetailView, setIsMobileDetailView] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (MOCK_PENDING.length > 0 && window.innerWidth >= 768) {
            setSelectedTableId(MOCK_PENDING[0].id);
        }
    }, []);

    if (!mounted) return null;

    const currentTable = MOCK_PENDING.find(t => t.id === selectedTableId);
    const isSettled = selectedTableId ? settledIds.includes(selectedTableId) : false;

    const calculateTotal = (items: LineItem[]) => {
        const subtotal = items.reduce((acc, item) => acc + (item.price * item.qty), 0);
        const tax = subtotal * 0.18;
        return { subtotal, tax, total: subtotal + tax };
    };

    const handleSettlement = () => {
        if (selectedTableId) {
            setSettledIds([...settledIds, selectedTableId]);
            setShowConfirm(false);
            setPaymentMethod(null);
            setIsMobileDetailView(false);
        }
    };

    const selectMobileTable = (id: string) => {
        setSelectedTableId(id);
        setIsMobileDetailView(true);
    };

    return (
        <div className="flex h-full w-full bg-[#F8F9FA] overflow-hidden flex-col md:flex-row relative">

            {/* READY TO PAY QUEUE (Left Sidebar) */}
            <aside className={`w-full md:w-80 lg:w-96 bg-white border-r border-zinc-200 flex flex-col shrink-0 transition-transform duration-300 ${isMobileDetailView ? '-translate-x-full md:translate-x-0' : 'translate-x-0'} absolute md:relative inset-0 md:inset-auto z-20`}>
                <div className="h-14 border-b border-zinc-100 flex items-center px-6 bg-zinc-50/50">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Pending_Settlements</span>
                </div>
                <div className="grow overflow-y-auto p-4 md:p-6 space-y-3 lg:space-y-4 hide-scrollbar pb-32">
                    {MOCK_PENDING.filter(t => !settledIds.includes(t.id)).map(table => {
                        const { total } = calculateTotal(table.items);
                        const active = selectedTableId === table.id;
                        return (
                            <button
                                key={table.id}
                                onClick={() => {
                                    if (window.innerWidth < 768) selectMobileTable(table.id);
                                    else { setSelectedTableId(table.id); setPaymentMethod(null); }
                                }}
                                className={`flex flex-col p-4 lg:p-6 rounded-2xl border-2 transition-all w-full text-left active:scale-[0.98] ${active ? 'bg-zinc-900 border-zinc-900 text-white shadow-xl md:ring-2 md:ring-black/5' : 'bg-white border-zinc-100 text-zinc-900 hover:border-zinc-300'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-3xl lg:text-4xl font-black tracking-tighter">T_{table.id}</span>
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${active ? 'bg-red-500 text-white' : 'bg-red-50 text-red-500 border border-red-100'}`}>PAID_PENDING</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest leading-none mb-1">Guest</span>
                                        <span className="text-sm font-bold truncate leading-none">{table.guestName}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xl lg:text-2xl font-black tabular-nums tracking-tighter">₹{total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                    {MOCK_PENDING.filter(t => !settledIds.includes(t.id)).length === 0 && (
                        <div className="p-12 text-center text-zinc-300 italic text-sm border-2 border-dashed border-zinc-100 rounded-2xl w-full">
                            All accounts cleared.
                        </div>
                    )}
                </div>
            </aside>

            {/* SETTLEMENT PANEL (Main View) */}
            <main className={`grow overflow-y-auto flex flex-col bg-white transition-transform duration-300 ${isMobileDetailView ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} absolute md:relative inset-0 md:inset-auto z-30`}>
                {currentTable && !isSettled ? (
                    <div className="flex flex-col h-full bg-white">
                        {/* TICKET HEADER */}
                        <div className="p-4 md:p-8 lg:p-10 border-b border-zinc-100 flex justify-between items-center md:items-end bg-white sticky top-0 md:relative z-10 shadow-sm md:shadow-none">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setIsMobileDetailView(false)} className="md:hidden w-10 h-10 rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-900">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                </button>
                                <div className="space-y-0.5 md:space-y-1">
                                    <h2 className="text-2xl md:text-5xl lg:text-7xl font-black tracking-tighter leading-none">SETTLE_T_{selectedTableId}</h2>
                                    <p className="hidden md:block text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest italic">Tx_{selectedTableId}_Auth</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[8px] md:text-[10px] font-black text-zinc-300 uppercase tracking-widest leading-none block md:mb-1">Guest</span>
                                <p className="text-sm md:text-xl font-bold uppercase truncate max-w-[120px] md:max-w-none">{currentTable.guestName}</p>
                            </div>
                        </div>

                        <div className="grow grid grid-cols-1 lg:grid-cols-2 overflow-y-auto">
                            {/* ITEMIZATION */}
                            <div className="p-6 md:p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-zinc-100 bg-white">
                                <span className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.4em] mb-6 md:mb-8 block">Itemized_ledger</span>
                                <div className="space-y-5 md:space-y-6">
                                    {currentTable.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-start">
                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-lg border border-zinc-100 flex items-center justify-center font-black text-xs text-zinc-400 shrink-0">{item.qty}</div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-base md:text-lg text-zinc-900 leading-tight">{item.name}</span>
                                                    <span className="text-[9px] font-bold text-zinc-300 uppercase tabular-nums tracking-widest">@ ₹{item.price.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <span className="text-base md:text-lg font-black tabular-nums tracking-tighter text-zinc-900">₹{(item.price * item.qty).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-10 md:mt-12 pt-8 border-t border-dashed border-zinc-200 space-y-2 md:space-y-3">
                                    <div className="flex justify-between text-zinc-400 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">
                                        <span>Subtotal</span>
                                        <span className="text-zinc-600 tabular-nums">₹{calculateTotal(currentTable.items).subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-zinc-400 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">
                                        <span>GST (18%)</span>
                                        <span className="text-zinc-600 tabular-nums">₹{calculateTotal(currentTable.items).tax.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline pt-4">
                                        <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-zinc-400">Net_Settle</span>
                                        <span className="text-4xl md:text-5xl lg:text-6xl font-black tabular-nums tracking-tighter text-[#D43425]">₹{calculateTotal(currentTable.items).total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* SETTLEMENT ACTIONS */}
                            <div className="p-6 md:p-8 lg:p-10 bg-zinc-50/50 flex flex-col pb-32 lg:pb-10">
                                <span className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.4em] mb-6 md:mb-8 block italic">Payment_Orchestration</span>

                                <div className="grid grid-cols-1 gap-3 md:gap-4 grow">
                                    {[
                                        { id: 'UPI', label: 'DIGITAL_UPI', icon: 'M5 13l4 4L19 7' },
                                        { id: 'CARD', label: 'FINANCE_CARD', icon: 'M3 10h18M7 15h1m4 0h1m4 0h1M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z' },
                                        { id: 'CASH', label: 'PHYSICAL_CASH', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' }
                                    ].map(method => (
                                        <button
                                            key={method.id}
                                            onClick={() => setPaymentMethod(method.id as any)}
                                            className={`flex items-center justify-between p-4 md:p-6 rounded-2xl border-2 transition-all active:scale-[0.98] ${paymentMethod === method.id ? 'bg-white border-zinc-900 shadow-xl' : 'bg-white border-zinc-200 text-zinc-400 hover:border-zinc-400'}`}
                                        >
                                            <div className="flex items-center gap-4 md:gap-6">
                                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all ${paymentMethod === method.id ? 'bg-zinc-900 text-white shadow-lg' : 'bg-zinc-100 text-zinc-400'}`}>
                                                    <svg width="20" height="20" className="md:w-[24px] md:h-[24px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={method.icon} /></svg>
                                                </div>
                                                <span className={`text-xs md:text-sm font-black uppercase tracking-[0.2em] md:tracking-[0.3em] ${paymentMethod === method.id ? 'text-zinc-900' : 'text-zinc-400'}`}>{method.label}</span>
                                            </div>
                                            <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === method.id ? 'border-zinc-900 bg-zinc-900 shadow-inner' : 'border-zinc-200'}`}>
                                                {paymentMethod === method.id && <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white transition-all scale-100" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-8 md:mt-12 fixed md:relative bottom-4 left-4 right-4 md:bottom-auto md:left-auto md:right-auto z-40">
                                    <button
                                        disabled={!paymentMethod}
                                        onClick={() => setShowConfirm(true)}
                                        className={`w-full h-16 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center gap-4 text-xs font-black uppercase tracking-[0.4em] transition-all shadow-xl ${paymentMethod ? 'bg-[#D43425] text-white hover:bg-black active:scale-95' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'}`}
                                    >
                                        {paymentMethod === 'CASH' ? 'FINALIZE_CASH' : 'COMMIT_PAYMENT'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center p-10 md:p-20 text-center bg-white">
                        <div className="space-y-6 max-w-sm">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto border border-zinc-100">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D1D1D1" strokeWidth="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"></path></svg>
                            </div>
                            <h3 className="text-lg md:text-xl font-black tracking-tighter uppercase text-zinc-900">Queue_Idle</h3>
                            <p className="text-[10px] md:text-sm font-bold text-zinc-300 leading-relaxed uppercase tracking-widest">Select a table from the settlement ingress to begin orchestration.</p>
                        </div>
                    </div>
                )}
            </main>

            {/* CONFIRMATION OVERLAY */}
            {showConfirm && currentTable && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 md:p-10 space-y-6 md:space-y-8 text-center">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-100 shadow-sm">
                                <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">Authorization_Needed</h4>
                                <p className="text-2xl md:text-3xl font-black tracking-tighter uppercase">Authorize T_{selectedTableId}?</p>
                                <div className="inline-flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-full border border-zinc-100">
                                    <span className="text-[8px] md:text-[10px] font-black text-zinc-900 uppercase tracking-widest">{paymentMethod}</span>
                                    <div className="w-1 h-1 bg-zinc-300 rounded-full" />
                                    <span className="text-[10px] md:text-xs font-black text-[#D43425] tabular-nums">₹{calculateTotal(currentTable.items).total.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 md:gap-4 pt-4">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="h-14 md:h-16 rounded-xl border-2 border-zinc-100 text-zinc-900 text-[10px] md:text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={handleSettlement}
                                    className="h-14 md:h-16 rounded-xl bg-black text-white text-[10px] md:text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-black/10"
                                >
                                    CONFIRM
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
        </div>
    );
}
