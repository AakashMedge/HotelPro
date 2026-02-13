'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// Types
// ============================================

interface MenuItemData {
    id: string;
    name: string;
    description?: string;
    price: number;
    category: string;
    isAvailable: boolean;
    isVeg: boolean;
    isChefSpecial: boolean;
    isGlutenFree: boolean;
    imageUrl?: string | null;
    specialPrice?: number;
    isSpecialPriceActive?: boolean;
    specialPriceStart?: string;
    specialPriceEnd?: string;
    variants: { id: string; name: string; price: number }[];
    modifierGroups: any[];
}

interface CartItem {
    cartId: string;
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
    notes?: string;
    selectedVariant?: { name: string; price: number };
    selectedModifiers?: { name: string; price: number }[];
}

interface TableInfo {
    id: string;
    tableCode: string;
    capacity: number;
    status: string;
}

// ============================================
// Constants
// ============================================

const DEFAULT_IMAGE = '/images/menu/wagyu.png';

const CATEGORY_ICONS: Record<string, string> = {
    'Signature': '⭐',
    'Appetizers': '🥗',
    'Main Course': '🍛',
    'Desserts': '🍰',
    'Wine & Drinks': '🍷',
    "Chef's Selection": '👨‍🍳',
    'General': '🍽️',
};

// ============================================
// Component
// ============================================

export default function WaiterMenuPage() {
    const { id: tableId } = useParams();
    const router = useRouter();
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Data State
    const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [table, setTable] = useState<TableInfo | null>(null);
    const [existingOrderId, setExistingOrderId] = useState<string | null>(null);

    // UI State
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [sending, setSending] = useState(false);
    const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);
    const [itemNoteId, setItemNoteId] = useState<string | null>(null);
    const [noteText, setNoteText] = useState('');
    const [notification, setNotification] = useState<string | null>(null);

    // ============================================
    // Data Fetching
    // ============================================

    const fetchData = useCallback(async () => {
        try {
            const [menuRes, tablesRes, ordersRes] = await Promise.all([
                fetch('/api/menu'),
                fetch('/api/tables'),
                fetch('/api/orders?status=NEW,PREPARING,READY,SERVED'),
            ]);

            const [menuData, tablesData, ordersData] = await Promise.all([
                menuRes.json(),
                tablesRes.json(),
                ordersRes.json(),
            ]);

            // Menu items
            if (menuData.success && menuData.items) {
                const items: MenuItemData[] = menuData.items.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    price: Number(item.price),
                    category: item.category || 'General',
                    isAvailable: item.isAvailable,
                    isVeg: Boolean(item.isVeg),
                    isChefSpecial: item.isChefSpecial || false,
                    isGlutenFree: item.isGlutenFree || false,
                    imageUrl: item.imageUrl,
                    specialPrice: item.specialPrice ? Number(item.specialPrice) : undefined,
                    isSpecialPriceActive: item.isSpecialPriceActive,
                    specialPriceStart: item.specialPriceStart,
                    specialPriceEnd: item.specialPriceEnd,
                    variants: item.variants || [],
                    modifierGroups: item.modifierGroups || [],
                }));
                setMenuItems(items);

                const cats = Array.from(new Set(items.map(i => i.category))) as string[];
                cats.sort();
                setCategories(cats);
                if (cats.length > 0 && activeCategory === 'ALL') {
                    // Keep ALL as default
                }
            }

            // Table info
            if (tablesData.success && tablesData.tables) {
                const t = tablesData.tables.find((tb: any) => tb.id === tableId);
                if (t) setTable({ id: t.id, tableCode: t.tableCode, capacity: t.capacity, status: t.status });
            }

            // Check for existing order on this table
            if (ordersData.success && ordersData.orders) {
                const activeOrder = ordersData.orders.find((o: any) => o.tableId === tableId);
                if (activeOrder) setExistingOrderId(activeOrder.id);
            }
        } catch (err) {
            console.error('[WAITER_MENU] Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [tableId, activeCategory]);

    useEffect(() => {
        setMounted(true);
        fetchData();
    }, [fetchData]);

    // ============================================
    // Cart Logic
    // ============================================

    const addToCart = (item: MenuItemData) => {
        if (!item.isAvailable) return;

        const existing = cart.find(c => c.menuItemId === item.id);
        if (existing) {
            setCart(prev => prev.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            const price = getItemPrice(item);
            setCart(prev => [...prev, {
                cartId: Math.random().toString(36).substr(2, 9),
                menuItemId: item.id,
                name: item.name,
                price,
                quantity: 1,
                image: item.imageUrl || DEFAULT_IMAGE,
            }]);
        }
        if (navigator.vibrate) navigator.vibrate(30);
    };

    const updateQty = (menuItemId: string, delta: number) => {
        setCart(prev => {
            const idx = prev.findIndex(c => c.menuItemId === menuItemId);
            if (idx === -1) return prev;
            const updated = [...prev];
            const newQty = updated[idx].quantity + delta;
            if (newQty <= 0) {
                updated.splice(idx, 1);
            } else {
                updated[idx] = { ...updated[idx], quantity: newQty };
            }
            return updated;
        });
        if (navigator.vibrate) navigator.vibrate(20);
    };

    const removeFromCart = (cartId: string) => {
        setCart(prev => prev.filter(c => c.cartId !== cartId));
    };

    const saveItemNote = (menuItemId: string) => {
        setCart(prev => prev.map(c => c.menuItemId === menuItemId ? { ...c, notes: noteText || undefined } : c));
        setItemNoteId(null);
        setNoteText('');
    };

    const getItemCartQty = (menuItemId: string) => {
        return cart.filter(c => c.menuItemId === menuItemId).reduce((a, b) => a + b.quantity, 0);
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const cartCount = cart.reduce((a, b) => a + b.quantity, 0);

    // ============================================
    // Send to Kitchen
    // ============================================

    const sendToKitchen = async () => {
        if (cart.length === 0 || sending) return;
        setSending(true);

        try {
            const items = cart.map(item => ({
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                selectedVariant: item.selectedVariant ? { name: item.selectedVariant.name, price: item.selectedVariant.price } : undefined,
                selectedModifiers: item.selectedModifiers?.map(m => ({ name: m.name, price: m.price })),
                notes: item.notes,
            }));

            if (existingOrderId) {
                // Append to existing order
                const res = await fetch(`/api/orders/${existingOrderId}/items`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items }),
                });
                if (!res.ok) throw new Error('Failed to add items');
                setNotification(`${cartCount} item${cartCount > 1 ? 's' : ''} sent to kitchen!`);
            } else {
                // Create new order
                const res = await fetch('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tableId,
                        customerName: 'Walk-in Guest',
                        items,
                    }),
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Failed to create order');
                setNotification('Order placed successfully!');
            }

            setCart([]);
            setIsCartSheetOpen(false);
            setTimeout(() => router.push(`/waiter/table/${tableId}`), 1200);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setSending(false);
        }
    };

    // ============================================
    // Helpers
    // ============================================

    const getItemPrice = (item: MenuItemData) => {
        if (item.variants.length > 0) return Math.min(...item.variants.map(v => v.price));
        if (item.isSpecialPriceActive && item.specialPrice) {
            if (!item.specialPriceStart || !item.specialPriceEnd) return item.specialPrice;
            const now = new Date();
            const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            if (time >= item.specialPriceStart && time <= item.specialPriceEnd) return item.specialPrice;
        }
        return item.price;
    };

    const filteredItems = useMemo(() => {
        return menuItems.filter(item => {
            const matchesCat = activeCategory === 'ALL' || item.category === activeCategory;
            const matchesSearch = searchQuery.length === 0 ||
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCat && matchesSearch;
        });
    }, [menuItems, activeCategory, searchQuery]);

    // ============================================
    // Render Guards
    // ============================================

    if (!mounted) return null;

    if (loading) return (
        <div className="h-full flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-zinc-200 border-t-[#111] rounded-full animate-spin" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Loading Menu...</span>
            </div>
        </div>
    );

    // ============================================
    // Render: Desktop Cart Panel (right side)
    // ============================================

    const CartPanel = () => (
        <div className="flex flex-col h-full">
            {/* Cart Header */}
            <div className="px-5 py-4 border-b border-zinc-100">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-sm font-black text-[#111] uppercase tracking-wider">Current Order</h2>
                    {cartCount > 0 && (
                        <span className="bg-[#111] text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                            {cartCount} item{cartCount !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <p className="text-[10px] text-zinc-400 font-medium">
                    {table ? `Table ${table.tableCode}` : 'Loading...'} · {existingOrderId ? 'Adding to existing order' : 'New order'}
                </p>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4 no-scrollbar">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                        <span className="text-4xl mb-3 opacity-30">📝</span>
                        <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">No items yet</p>
                        <p className="text-[10px] text-zinc-300 mt-1">Tap items from menu to add</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {cart.map((item) => (
                            <div key={item.cartId} className="flex gap-3 items-start group">
                                <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
                                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-[#111] truncate leading-tight">{item.name}</h4>
                                    {item.notes && (
                                        <p className="text-[9px] text-amber-600 mt-0.5 italic truncate">📝 {item.notes}</p>
                                    )}
                                    <div className="flex items-center justify-between mt-1.5">
                                        <span className="text-xs font-bold text-[#111]">₹{item.price * item.quantity}</span>
                                        <div className="flex items-center gap-0">
                                            <button
                                                onClick={() => updateQty(item.menuItemId, -1)}
                                                className="w-6 h-6 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 active:scale-90 transition-all"
                                            >
                                                <span className="text-sm font-bold leading-none">−</span>
                                            </button>
                                            <span className="w-6 text-center text-xs font-black tabular-nums">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQty(item.menuItemId, 1)}
                                                className="w-6 h-6 rounded-md bg-[#111] text-white flex items-center justify-center hover:bg-zinc-800 active:scale-90 transition-all"
                                            >
                                                <span className="text-sm font-bold leading-none">+</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {/* Note / Delete */}
                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => { setItemNoteId(item.menuItemId); setNoteText(item.notes || ''); }}
                                        className="w-5 h-5 rounded bg-amber-50 text-amber-500 flex items-center justify-center text-[8px]"
                                        title="Add note"
                                    >📝</button>
                                    <button
                                        onClick={() => removeFromCart(item.cartId)}
                                        className="w-5 h-5 rounded bg-red-50 text-red-400 flex items-center justify-center text-[8px]"
                                        title="Remove"
                                    >✕</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
                <div className="border-t border-zinc-100 p-5 pb-8 md:pb-5 bg-zinc-50/50">
                    <div className="flex justify-between items-baseline mb-4">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Subtotal</span>
                        <span className="text-lg font-black text-[#111]">₹{cartTotal.toLocaleString()}</span>
                    </div>
                    <button
                        onClick={sendToKitchen}
                        disabled={sending}
                        className="w-full py-3.5 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {sending ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg>
                                Send to Kitchen
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );

    // ============================================
    // MAIN RENDER
    // ============================================

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden relative">

            {/* ============================================ */}
            {/* NOTIFICATION TOAST */}
            {/* ============================================ */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-emerald-500 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-200 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                        onAnimationComplete={() => setTimeout(() => setNotification(null), 2000)}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        {notification}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ============================================ */}
            {/* ITEM NOTE MODAL */}
            {/* ============================================ */}
            <AnimatePresence>
                {itemNoteId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setItemNoteId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-sm font-black text-[#111] uppercase tracking-wider mb-3">Special Instructions</h3>
                            <textarea
                                autoFocus
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="e.g. No onions, extra spicy..."
                                className="w-full h-24 p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm resize-none outline-none focus:border-zinc-400 transition-colors"
                            />
                            <div className="flex gap-2 mt-3">
                                <button onClick={() => setItemNoteId(null)} className="flex-1 py-2.5 text-xs font-bold text-zinc-500 bg-zinc-100 rounded-xl">Cancel</button>
                                <button onClick={() => saveItemNote(itemNoteId)} className="flex-1 py-2.5 text-xs font-bold text-white bg-[#111] rounded-xl">Save Note</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ============================================ */}
            {/* HEADER BAR */}
            {/* ============================================ */}
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-zinc-100 shrink-0 bg-white z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push(`/waiter/table/${tableId}`)}
                        className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 active:scale-95 transition-all shrink-0"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-sm md:text-base font-black text-[#111] tracking-tight">
                            {existingOrderId ? 'Add Items' : 'New Order'}
                        </h1>
                        <p className="text-[9px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            Table {table?.tableCode || '...'} · {existingOrderId ? 'Append' : 'Dine In'}
                        </p>
                    </div>
                    {/* Mobile cart badge */}
                    <button
                        onClick={() => setIsCartSheetOpen(true)}
                        className="md:hidden relative w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full">{cartCount}</span>
                        )}
                    </button>
                </div>

                {/* Search Bar */}
                <div className="mt-3 relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search items, category..."
                        className="w-full h-9 md:h-10 bg-zinc-50 border border-zinc-100 rounded-xl pl-9 pr-4 text-sm font-medium placeholder:text-zinc-300 outline-none focus:border-zinc-300 transition-colors"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    )}
                </div>
            </div>

            {/* ============================================ */}
            {/* MAIN CONTENT: SPLIT ON DESKTOP, STACKED ON MOBILE */}
            {/* ============================================ */}
            <div className="flex-1 flex overflow-hidden">

                {/* ─── LEFT: CATEGORY SIDEBAR (Desktop Only) ─── */}
                <aside className="hidden lg:flex flex-col w-44 border-r border-zinc-100 bg-zinc-50/30 shrink-0 overflow-y-auto no-scrollbar">
                    <div className="p-3">
                        <p className="text-[8px] font-black text-zinc-300 uppercase tracking-widest px-2 mb-2">Categories</p>
                        <button
                            onClick={() => setActiveCategory('ALL')}
                            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all mb-1 flex items-center gap-2 ${activeCategory === 'ALL'
                                ? 'bg-[#111] text-white shadow-sm'
                                : 'text-zinc-500 hover:bg-zinc-100'
                                }`}
                        >
                            <span className="text-sm">📋</span>
                            All Items
                            <span className={`ml-auto text-[9px] ${activeCategory === 'ALL' ? 'text-white/50' : 'text-zinc-300'}`}>{menuItems.length}</span>
                        </button>
                        {categories.map(cat => {
                            const count = menuItems.filter(i => i.category === cat).length;
                            const icon = CATEGORY_ICONS[cat] || '🍽️';
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all mb-1 flex items-center gap-2 ${activeCategory === cat
                                        ? 'bg-[#111] text-white shadow-sm'
                                        : 'text-zinc-500 hover:bg-zinc-100'
                                        }`}
                                >
                                    <span className="text-sm">{icon}</span>
                                    <span className="truncate">{cat}</span>
                                    <span className={`ml-auto text-[9px] shrink-0 ${activeCategory === cat ? 'text-white/50' : 'text-zinc-300'}`}>{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* ─── MOBILE/TABLET: Horizontal Category Chips ─── */}
                {/* ─── CENTER: MENU GRID ─── */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                    {/* Mobile/Tablet Category Chips */}
                    <div className="lg:hidden border-b border-zinc-100 shrink-0">
                        <div className="flex overflow-x-auto no-scrollbar px-4 py-2.5 gap-1.5">
                            <button
                                onClick={() => setActiveCategory('ALL')}
                                className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeCategory === 'ALL' ? 'bg-[#111] text-white' : 'bg-zinc-100 text-zinc-500'}`}
                            >All</button>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold transition-all whitespace-nowrap flex items-center gap-1 ${activeCategory === cat ? 'bg-[#111] text-white' : 'bg-zinc-100 text-zinc-500'}`}
                                >
                                    <span className="text-xs">{CATEGORY_ICONS[cat] || '🍽️'}</span>
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Item Grid */}
                    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 no-scrollbar pb-36 md:pb-6">

                        {/* Category Title */}
                        {activeCategory !== 'ALL' && (
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-base">{CATEGORY_ICONS[activeCategory] || '🍽️'}</span>
                                <h2 className="text-xs font-black uppercase tracking-wider text-[#111]">{activeCategory}</h2>
                                <div className="flex-1 h-px bg-zinc-100" />
                                <span className="text-[10px] font-bold text-zinc-400">{filteredItems.length} items</span>
                            </div>
                        )}

                        {/* Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                            {filteredItems.map((item) => {
                                const qty = getItemCartQty(item.id);
                                const price = getItemPrice(item);
                                const isOffer = item.isSpecialPriceActive && item.specialPrice && item.specialPrice < item.price;

                                return (
                                    <div
                                        key={item.id}
                                        className={`rounded-2xl border overflow-hidden transition-all ${!item.isAvailable ? 'opacity-40 grayscale' : ''} ${qty > 0 ? 'border-emerald-200 bg-emerald-50/30 shadow-sm' : 'border-zinc-100 bg-white hover:border-zinc-200 hover:shadow-sm'}`}
                                    >
                                        {/* Image */}
                                        <div className="relative aspect-[4/3] bg-zinc-100">
                                            <Image
                                                src={item.imageUrl || DEFAULT_IMAGE}
                                                alt={item.name}
                                                fill
                                                className="object-cover"
                                            />
                                            {/* Badges */}
                                            <div className="absolute top-2 left-2 flex gap-1">
                                                <span className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center ${item.isVeg ? 'border-green-500 bg-white' : 'border-red-500 bg-white'}`}>
                                                    <span className={`block w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                                                </span>
                                            </div>
                                            {item.isChefSpecial && (
                                                <div className="absolute top-2 right-2 bg-amber-400 text-[7px] font-black text-black px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                                                    ★ Best
                                                </div>
                                            )}
                                            {!item.isAvailable && (
                                                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 bg-white px-2 py-1 rounded-lg">Sold Out</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="p-2.5 md:p-3">
                                            <h3 className="text-xs font-bold text-[#111] leading-tight line-clamp-2 mb-1">{item.name}</h3>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-black text-[#111]">₹{price}</span>
                                                {isOffer && (
                                                    <span className="text-[9px] line-through text-zinc-400">₹{item.price}</span>
                                                )}
                                            </div>

                                            {/* Add / Stepper */}
                                            {item.isAvailable && (
                                                <div className="mt-2">
                                                    {qty > 0 ? (
                                                        <div className="flex items-center justify-center bg-emerald-500 rounded-lg overflow-hidden">
                                                            <button
                                                                onClick={() => updateQty(item.id, -1)}
                                                                className="w-8 h-8 flex items-center justify-center text-white font-bold text-base active:bg-emerald-600 transition-colors"
                                                            >−</button>
                                                            <span className="w-7 text-center text-white font-black text-sm">{qty}</span>
                                                            <button
                                                                onClick={() => updateQty(item.id, 1)}
                                                                className="w-8 h-8 flex items-center justify-center text-white font-bold text-base active:bg-emerald-600 transition-colors"
                                                            >+</button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => addToCart(item)}
                                                            className="w-full py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 border-2 border-emerald-500 rounded-lg hover:bg-emerald-50 active:scale-95 transition-all"
                                                        >
                                                            + ADD
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Empty State */}
                        {filteredItems.length === 0 && (
                            <div className="py-16 text-center">
                                <span className="text-4xl block mb-3 opacity-30">🍽️</span>
                                <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">No items found</p>
                                <button
                                    onClick={() => { setSearchQuery(''); setActiveCategory('ALL'); }}
                                    className="mt-3 text-[10px] font-bold text-emerald-500 underline underline-offset-4"
                                >Clear filters</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── RIGHT: CART PANEL (Desktop Only) ─── */}
                <aside className="hidden md:flex flex-col w-80 lg:w-96 border-l border-zinc-100 bg-white shrink-0">
                    <CartPanel />
                </aside>
            </div>

            {/* ============================================ */}
            {/* MOBILE: STICKY CART BAR */}
            {/* ============================================ */}
            {cartCount > 0 && !isCartSheetOpen && (
                <div className="md:hidden fixed bottom-24 left-0 right-0 z-40 px-4">
                    <motion.button
                        initial={{ y: 60, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        onClick={() => setIsCartSheetOpen(true)}
                        className="w-full bg-emerald-500 text-white py-3 px-5 rounded-2xl shadow-[0_8px_25px_rgba(16,185,129,0.35)] flex items-center justify-between active:scale-[0.98] transition-transform"
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                                <span className="absolute -top-1.5 -right-1.5 bg-white text-emerald-600 text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-full">{cartCount}</span>
                            </div>
                            <div className="text-left">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-white/70">{cartCount} item{cartCount > 1 ? 's' : ''}</p>
                                <p className="text-sm font-black">₹{cartTotal.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                            View Cart
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
                        </div>
                    </motion.button>
                </div>
            )}

            {/* ============================================ */}
            {/* MOBILE: CART BOTTOM SHEET */}
            {/* ============================================ */}
            <div className={`md:hidden fixed inset-0 z-110 transition-all duration-400 ${isCartSheetOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCartSheetOpen(false)} />
                <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] transition-transform duration-400 ease-out ${isCartSheetOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                    {/* Handle */}
                    <div className="w-full h-6 flex items-center justify-center shrink-0 cursor-pointer" onClick={() => setIsCartSheetOpen(false)}>
                        <div className="w-10 h-1 bg-zinc-200 rounded-full" />
                    </div>
                    <CartPanel />
                </div>
            </div>

            {/* ============================================ */}
            {/* GLOBAL STYLES */}
            {/* ============================================ */}
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
