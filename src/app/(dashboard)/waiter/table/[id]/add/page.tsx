'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

// ============================================
// Types
// ============================================

interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: string;
    code: string;
}

interface ApiResponse {
    success: boolean;
    items?: MenuItem[];
    orders?: any[];
    order?: any;
    error?: string;
}

// ============================================
// Component
// ============================================

export default function QuickAddPad() {
    const { id } = useParams();
    const router = useRouter();

    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [activeCategory, setActiveCategory] = useState('');
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [committing, setCommitting] = useState(false);
    const [orderId, setOrderId] = useState<string | null>(null);

    // ============================================
    // Init Data
    // ============================================

    const initData = useCallback(async () => {
        try {
            // 1. Fetch Menu
            const menuRes = await fetch('/api/menu');
            const menuData: ApiResponse = await menuRes.json();

            if (!menuData.success || !menuData.items) throw new Error(menuData.error || 'Failed to fetch menu');

            // Add mock category/code if missing (API doesn't provide them yet)
            const items = menuData.items.map(item => ({
                ...item,
                category: (item as any).category || 'General',
                code: item.name.slice(0, 3).toUpperCase()
            }));

            setMenuItems(items);

            // Extract unique categories
            const cats = Array.from(new Set(items.map(i => i.category)));
            setCategories(cats);
            if (cats.length > 0) setActiveCategory(cats[0]);

            // 2. Fetch Active Order for this Table
            const ordersRes = await fetch('/api/orders?status=NEW,PREPARING,READY,SERVED');
            const ordersData = await ordersRes.json();
            const activeOrder = ordersData.orders?.find((o: any) => o.tableId === id);

            if (activeOrder) {
                setOrderId(activeOrder.id);
            }
        } catch (err) {
            console.error('[QUICK ADD] Init Error:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        initData();
    }, [initData]);

    const filteredItems = menuItems.filter(item =>
        (item.category === activeCategory || search !== '') &&
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    const updateCart = (itemId: string, delta: number) => {
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

    const commitOrder = async () => {
        if (!orderId || totalItems === 0 || committing) return;

        setCommitting(true);
        try {
            const items = Object.entries(cart).map(([menuItemId, quantity]) => ({
                menuItemId,
                quantity
            }));

            const res = await fetch(`/api/orders/${orderId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items })
            });

            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'Failed to add items');

            router.push(`/waiter/table/${id}`);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error committing order');
            setCommitting(false);
        }
    };

    if (loading) return (
        <div className="h-full flex items-center justify-center bg-white">
            <div className="w-8 h-8 border-4 border-zinc-100 border-t-black rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-[#F8F9FA] overflow-hidden">
            {/* QUICK ENTRY SEARCH BAR */}
            <div className="p-4 md:p-6 bg-white border-b border-zinc-200 shrink-0 z-30">
                <div className="flex items-center gap-4 md:gap-6 mb-4 md:mb-6">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-400 active:scale-90 transition-all"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-lg md:text-2xl font-black tracking-tighter uppercase leading-none">ENTRY_UPDATE</h1>
                        <span className="text-[7px] md:text-[10px] font-black text-zinc-300 uppercase mt-0.5 md:mt-1 tracking-widest leading-none italic">
                            {orderId ? `REF: ${orderId.slice(0, 8).toUpperCase()}` : 'NO ACTIVE ORDER'}
                        </span>
                    </div>
                </div>

                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search items..."
                        className="w-full h-12 md:h-16 bg-zinc-50 border border-zinc-200 rounded-xl md:rounded-2xl px-4 md:pl-14 md:pr-6 font-bold text-sm md:text-lg focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white transition-all placeholder:text-zinc-300 uppercase"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* MOBILE CATEGORY SCROLLER */}
            <div className="md:hidden flex overflow-x-auto bg-zinc-100 border-b border-zinc-200 shrink-0 hide-scrollbar scroll-smooth p-2 gap-2">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat); setSearch(''); }}
                        className={`px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat && !search ? 'bg-black text-white shadow-lg' : 'bg-white text-zinc-400 border border-zinc-100'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="grow flex overflow-hidden">
                {/* DESKTOP CATEGORY RAIL */}
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
                    {!orderId ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-400">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 opacity-50"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <p className="text-[10px] font-black uppercase tracking-widest">A table must have an active order <br /> created by a guest to add items.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                            {filteredItems.map(item => (
                                <div key={item.id} className="bg-white border border-zinc-100 p-4 md:p-6 rounded-xl md:rounded-2xl flex justify-between items-center group active:scale-[0.98] transition-all">
                                    <div className="flex flex-col gap-0.5 md:gap-1">
                                        <span className="text-[7px] md:text-[10px] font-black text-zinc-300 uppercase tracking-widest leading-none">{item.code}</span>
                                        <span className="font-black text-sm md:text-lg text-[#1D1D1F] leading-tight transition-colors">{item.name}</span>
                                        <span className="text-xs md:text-sm font-bold text-[#D43425] tabular-nums">${item.price}</span>
                                    </div>

                                    <div className="flex items-center gap-2 md:gap-3">
                                        {(cart[item.id] || 0) > 0 && (
                                            <div className="flex items-center bg-zinc-50 rounded-lg md:rounded-xl p-1">
                                                <button
                                                    onClick={() => updateCart(item.id, -1)}
                                                    className="w-10 h-10 md:w-12 md:h-12 rounded-md flex items-center justify-center text-zinc-400 active:bg-white transition-all shadow-sm"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14" /></svg>
                                                </button>
                                                <span className="w-6 md:w-10 text-center font-black text-sm md:text-xl tabular-nums">{cart[item.id]}</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => updateCart(item.id, 1)}
                                            className={`w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl flex items-center justify-center transition-all ${cart[item.id] ? 'bg-black text-white shadow-lg' : 'bg-white border border-zinc-200 text-zinc-400 hover:border-black hover:text-black'}`}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* CONFIRMATION DOCK */}
            <div className={`fixed bottom-0 md:bottom-8 left-0 md:left-1/2 md:-translate-x-1/2 w-full md:max-w-lg transition-all transform duration-500 z-[60] bg-white md:bg-transparent p-4 md:p-0 border-t border-zinc-100 md:border-0 ${totalItems > 0 ? 'translate-y-0 opacity-100' : 'translate-y-40 opacity-0 pointer-events-none'}`}>
                <button
                    onClick={commitOrder}
                    disabled={committing}
                    className="w-full h-14 md:h-20 bg-green-600 text-white rounded-xl md:rounded-3xl flex items-center justify-between px-6 md:px-10 shadow-xl active:scale-95 transition-all group disabled:opacity-50"
                >
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 flex items-center justify-center font-black text-xs md:text-lg">{committing ? '...' : totalItems}</div>
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-widest md:tracking-[0.2em]">{committing ? 'SENDING...' : 'COMMIT_ENTRY'}</span>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
            </div>
        </div>
    );
}
