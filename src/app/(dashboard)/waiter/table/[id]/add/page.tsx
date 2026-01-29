'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Mock Menu Data
const categories = ['Signature', 'Bevs', 'Start', 'Mains', 'Sweet'];
const menuItems = [
    { id: 1, name: 'Lobster Tail', price: '₹4,200', category: 'Signature', code: 'LOB' },
    { id: 2, name: 'Wagyu Medallion', price: '₹8,500', category: 'Mains', code: 'BMED' },
    { id: 3, name: 'Saffron Risotto', price: '₹2,100', category: 'Mains', code: 'RIS' },
    { id: 4, name: 'Masala Chai', price: '₹450', category: 'Bevs', code: 'CHAI' },
    { id: 5, name: 'Reserve Red', price: '₹1,200', category: 'Bevs', code: 'WINE' },
    { id: 6, name: 'Paneer Tikka', price: '₹1,800', category: 'Start', code: 'PAN' },
    { id: 7, name: 'Mineral Water', price: '₹450', category: 'Bevs', code: 'H2O' },
    { id: 8, name: 'Gold Espresso', price: '₹350', category: 'Bevs', code: 'ESP' },
];

export default function QuickAddPad() {
    const { id } = useParams();
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('Signature');
    const [cart, setCart] = useState<Record<number, number>>({});

    const filteredItems = menuItems.filter(item =>
        (item.category === activeCategory || search !== '') &&
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    const updateCart = (itemId: number, delta: number) => {
        setCart(prev => {
            const newQty = (prev[itemId] || 0) + delta;
            if (newQty <= 0) {
                const { [itemId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [itemId]: newQty };
        });
    };

    const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);

    return (
        <div className="h-full flex flex-col bg-[#F8F9FA] overflow-hidden">
            {/* QUICK ENTRY SEARCH BAR */}
            <div className="p-4 md:p-6 bg-white border-b border-zinc-200 shrink-0 z-30">
                <div className="flex items-center gap-4 md:gap-6 mb-4 md:mb-6">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-400 active:scale-90"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-lg md:text-2xl font-black tracking-tighter uppercase leading-none">ORDER_ENTRY</h1>
                        <span className="text-[7px] md:text-[10px] font-black text-zinc-300 uppercase mt-0.5 md:mt-1 tracking-widest">Table T-{id}</span>
                    </div>
                </div>

                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search code or name..."
                        className="w-full h-12 md:h-16 bg-zinc-50 border border-zinc-200 rounded-xl md:rounded-2xl px-4 md:pl-14 md:pr-6 font-bold text-sm md:text-lg focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white transition-all placeholder:text-zinc-300 uppercase"
                        value={search}
                        onChange={(e) => setSearch(e.target.value.toUpperCase())}
                    />
                </div>
            </div>

            {/* MOBILE CATEGORY SCROLLER (Horizontal on Mobile) */}
            <div className="md:hidden flex overflow-x-auto bg-zinc-100 border-b border-zinc-200 shrink-0 hide-scrollbar scroll-smooth p-2 gap-2">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat); setSearch(''); }}
                        className={`px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat && !search ? 'bg-black text-white' : 'bg-white text-zinc-400 border border-zinc-200'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="grow flex overflow-hidden">
                {/* DESKTOP CATEGORY RAIL (Vertical) */}
                <aside className="hidden md:flex w-32 bg-zinc-100 border-r border-zinc-200 overflow-y-auto hide-scrollbar flex-col pt-4">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => { setActiveCategory(cat); setSearch(''); }}
                            className={`py-8 px-4 flex flex-col items-center gap-3 transition-all relative ${activeCategory === cat && !search ? 'bg-white text-black' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            <span className="text-[9px] font-black uppercase tracking-widest vertical-text rotate-180 h-16">{cat}</span>
                            {activeCategory === cat && !search && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-black rounded-l-full" />}
                        </button>
                    ))}
                </aside>

                {/* HIGH-DENSITY ITEM GRID */}
                <div className="grow overflow-y-auto p-3 md:p-8 space-y-3 md:space-y-4 pb-32 md:pb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        {filteredItems.map(item => (
                            <div key={item.id} className="bg-white border border-zinc-100 p-4 md:p-6 rounded-xl md:rounded-2xl flex justify-between items-center group active:scale-[0.98] transition-all">
                                <div className="flex flex-col gap-0.5 md:gap-1">
                                    <span className="text-[7px] md:text-[10px] font-black text-zinc-300 uppercase tracking-widest leading-none">{item.code}</span>
                                    <span className="font-black text-sm md:text-lg text-[#1D1D1F] leading-tight transition-colors">{item.name}</span>
                                    <span className="text-xs md:text-sm font-bold text-[#D43425] tabular-nums">{item.price}</span>
                                </div>

                                <div className="flex items-center gap-2 md:gap-3">
                                    {(cart[item.id] || 0) > 0 && (
                                        <div className="flex items-center bg-zinc-50 rounded-lg md:rounded-xl p-1">
                                            <button
                                                onClick={() => updateCart(item.id, -1)}
                                                className="w-10 h-10 md:w-12 md:h-12 rounded-md flex items-center justify-center text-zinc-400 active:bg-white"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14" /></svg>
                                            </button>
                                            <span className="w-6 md:w-10 text-center font-black text-sm md:text-xl tabular-nums">{cart[item.id]}</span>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => updateCart(item.id, 1)}
                                        className={`w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl flex items-center justify-center transition-all ${cart[item.id] ? 'bg-black text-white' : 'bg-white border border-zinc-200 text-zinc-400'}`}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* CONFIRMATION DOCK (Mobile Bottom Float) */}
            <div className={`fixed bottom-0 md:bottom-8 left-0 md:left-1/2 md:-translate-x-1/2 w-full md:max-w-lg transition-all transform duration-500 z-[60] bg-white md:bg-transparent p-4 md:p-0 border-t border-zinc-100 md:border-0 ${totalItems > 0 ? 'translate-y-0 opacity-100' : 'translate-y-40 opacity-0 pointer-events-none'}`}>
                <button
                    onClick={() => router.push(`/waiter/table/${id}`)}
                    className="w-full h-14 md:h-20 bg-green-600 text-white rounded-xl md:rounded-3xl flex items-center justify-between px-6 md:px-10 shadow-xl active:scale-95 transition-all group"
                >
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 flex items-center justify-center font-black text-xs md:text-lg">{totalItems}</div>
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-widest md:tracking-[0.2em]">COMMIT_ORDER</span>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
            </div>
        </div>
    );
}
