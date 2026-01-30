'use client';

import { useState, useEffect, useCallback } from 'react';

type StockItem = {
    id: string;
    name: string;
    category: string;
    quantity: number;
    isAvailable: boolean; // Added for 86 functionality
    unit: string;
    threshold: number;
    lastUpdated: string;
};

export default function KitchenInventory() {
    const [mounted, setMounted] = useState(false);
    const [items, setItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStock = useCallback(async () => {
        try {
            const res = await fetch('/api/kitchen/inventory');
            const data = await res.json();
            if (data.success) {
                setItems(data.items);
            }
        } catch (err) {
            console.error('[STOCK_FETCH] Error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleAdjust = async (menuItemId: string, currentQty: number) => {
        const newQty = prompt(`Adjust Stock Level:`, currentQty.toString());
        if (newQty === null || isNaN(parseInt(newQty))) return;

        try {
            const res = await fetch('/api/kitchen/inventory', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ menuItemId, quantity: newQty })
            });
            if (res.ok) fetchStock();
        } catch (err) {
            console.error('[STOCK_UPDATE] Error:', err);
        }
    };

    const toggle86 = async (menuItemId: string, currentStatus: boolean) => {
        try {
            const res = await fetch('/api/kitchen/inventory', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ menuItemId, isAvailable: !currentStatus })
            });
            if (res.ok) fetchStock();
        } catch (err) {
            console.error('[86_TOGGLE] Error:', err);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchStock();
        const interval = setInterval(fetchStock, 10000); // 10s refresh for stock
        return () => clearInterval(interval);
    }, [fetchStock]);

    if (!mounted) return null;

    if (loading && items.length === 0) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-[#F8F9FA]">
                <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#D43425] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full bg-[#F8F9FA] overflow-hidden">
            {/* 1. HEADER SECTION */}
            <div className="bg-white border-b border-zinc-200 p-6 md:p-8 lg:p-10 shrink-0">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] italic leading-none">Resource_Management</span>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-950">STOCK_INVENTORY</h1>
                    </div>
                    <div className="flex gap-4">
                        <div className="px-6 py-3 bg-zinc-950 rounded-xl flex flex-col items-center">
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Low_Stock</span>
                            <span className="text-xl font-black text-red-500 tabular-nums">
                                {items.filter(i => i.quantity <= i.threshold).length.toString().padStart(2, '0')}
                            </span>
                        </div>
                        <div className="px-6 py-3 bg-white border border-zinc-200 rounded-xl flex flex-col items-center shadow-sm">
                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Total_SKU</span>
                            <span className="text-xl font-black text-zinc-950 tabular-nums">{items.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. INVENTORY GRID - MICRO CARDS */}
            <div className="grow overflow-y-auto p-4 md:p-6 lg:p-8 hide-scrollbar pb-32">
                <div className="max-w-[1600px] mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                    {items.map(item => {
                        const isLow = item.quantity <= item.threshold;
                        const is86 = !item.isAvailable;
                        return (
                            <div
                                key={item.id}
                                className={`bg-white border transition-all rounded-xl p-3 md:p-4 flex flex-col gap-3 relative overflow-hidden group active:scale-[0.98] ${is86 ? 'opacity-40 grayscale border-zinc-100' : 'border-zinc-200 hover:border-zinc-400 hover:shadow-lg hover:shadow-zinc-200/40'}`}
                            >
                                {is86 && <div className="absolute inset-0 bg-zinc-100/10 z-10 pointer-events-none" />}
                                {isLow && !is86 && <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />}

                                <div className="space-y-0.5">
                                    <div className="flex justify-between items-start">
                                        <span className="text-[7px] font-black text-zinc-300 uppercase tracking-widest">{item.category}</span>
                                        {is86 ? (
                                            <span className="text-[7px] font-black text-[#D43425] uppercase tracking-widest">OUT_OF_STOCK</span>
                                        ) : (
                                            isLow && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                        )}
                                    </div>
                                    <h3 className={`text-xs md:text-sm font-black tracking-tight text-zinc-950 uppercase truncate leading-tight ${is86 ? 'line-through' : ''}`}>{item.name}</h3>
                                </div>

                                <div className="flex items-end justify-between">
                                    <div className="flex items-baseline gap-1 leading-none">
                                        <span className={`text-2xl md:text-3xl font-black tracking-tighter ${is86 ? 'text-zinc-400' : isLow ? 'text-red-500' : 'text-zinc-950'}`}>
                                            {item.quantity}
                                        </span>
                                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{item.unit}</span>
                                    </div>
                                    <div className="text-right leading-none">
                                        <span className="text-[7px] font-black italic text-zinc-300">{item.lastUpdated}</span>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-zinc-50 flex gap-1.5 z-20">
                                    <button
                                        onClick={() => handleAdjust(item.id, item.quantity)}
                                        className="grow py-1.5 bg-zinc-50 hover:bg-zinc-100 rounded-md text-[8px] font-black uppercase tracking-widest transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => toggle86(item.id, item.isAvailable)}
                                        className={`px-3 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${is86 ? 'bg-[#D43425] text-white' : 'bg-zinc-900 text-white hover:bg-[#D43425]'}`}
                                    >
                                        {is86 ? 'STOCK_IN' : '86'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {/* Quick Add Micro Placeholder */}
                    <button className="bg-transparent border-2 border-dashed border-zinc-100 rounded-xl flex flex-col items-center justify-center p-4 text-zinc-200 hover:text-zinc-400 hover:border-zinc-300 hover:bg-white transition-all group min-h-[120px]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="mb-2 transition-transform group-hover:scale-110"><path d="M12 5v14M5 12h14" /></svg>
                        <span className="text-[8px] font-black uppercase tracking-widest">Add_SKU</span>
                    </button>
                </div>
            </div>

            <style jsx global>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
