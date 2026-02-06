
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import MobileNav from '@/components/public/MobileNav';
import ItemCustomizationModal, { FullMenuItem } from '@/components/public/ItemModal';

// ============================================
// Types
// ============================================

interface CartItem {
    cartId: string;
    menuItemId: string;
    title: string;
    price: number;
    quantity: number;
    image: string;
    selectedVariant?: { id: string, name: string, price: number };
    selectedModifiers?: { id: string, name: string, price: number }[];
    notes?: string;
}

interface ApiResponse {
    success: boolean;
    items?: any[];
    order?: any;
    error?: string;
}

// ============================================
// Constants & Styles
// ============================================

const CATEGORY_PRIORITY = ['Signature', 'Appetizers', 'Main Course', 'Desserts', 'Wine & Drinks'];

const IMAGE_MAP: Record<string, string> = {
    'Wagyu Beef Tenderloin': '/images/menu/wagyu.png',
    'Perigord Black Truffle Risotto': '/images/menu/risotto.png',
    'Luxury Tandoori Lobster': '/images/menu/lobster.png',
    'Burrata di Puglia': '/images/menu/burrata.png',
    'Saffron Paneer Tikka': '/images/menu/paneer.png',
    'Wild-Caught Sea Bass': '/images/menu/wagyu.png',
    'Grand Cru Chocolate Fondant': '/images/menu/fondant.png',
    'Royal Chai Panna Cotta': '/images/menu/chai.png',
    'Vintage Reserve Red': '/images/menu/wine.png',
    'Imperial Masala Chai': '/images/menu/chai.png'
};

const DEFAULT_IMAGE = '/images/menu/wagyu.png';

// ============================================
// Core Component
// ============================================

function MenuContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tableId = searchParams.get('tableId');
    const tableCode = searchParams.get('tableCode');
    const isStaffMode = searchParams.get('staff') === 'true';
    const staffTableId = searchParams.get('staffTableId');

    const [activeCategory, setActiveCategory] = useState('Signature');
    const [menuItems, setMenuItems] = useState<FullMenuItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isMenuRevealed, setIsMenuRevealed] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [selectedItemForModal, setSelectedItemForModal] = useState<FullMenuItem | null>(null);
    const [mounted, setMounted] = useState(false);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTags, setActiveTags] = useState<string[]>([]);
    const [isSearchVisible, setIsSearchVisible] = useState(false);

    // ============================================
    // Logic: Menu Initialization
    // ============================================

    const initMenu = useCallback(async () => {
        try {
            const res = await fetch('/api/menu');
            const data: ApiResponse = await res.json();
            if (data.success && data.items) {
                const formatted: FullMenuItem[] = data.items.map(item => ({
                    id: item.id,
                    title: item.name,
                    description: item.description,
                    priceRaw: Number(item.price),
                    imageUrl: item.imageUrl,
                    isVeg: item.isVeg || false,
                    isAvailable: item.isAvailable,
                    category: item.category?.name || 'Chef\'s Selection',
                    variants: item.variants || [],
                    modifierGroups: item.modifierGroups || [],

                    // New fields for search & pricing
                    isChefSpecial: item.isChefSpecial || false,
                    isGlutenFree: item.isGlutenFree || false,
                    specialPrice: item.specialPrice,
                    isSpecialPriceActive: item.isSpecialPriceActive,
                    specialPriceStart: item.specialPriceStart,
                    specialPriceEnd: item.specialPriceEnd
                }));

                setMenuItems(formatted);
                const uniqueCats = Array.from(new Set(formatted.map(i => i.category)));
                const sortedCats = uniqueCats.sort((a, b) => {
                    const idxA = CATEGORY_PRIORITY.indexOf(a);
                    const idxB = CATEGORY_PRIORITY.indexOf(b);
                    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
                    if (idxA === -1) return 1;
                    if (idxB === -1) return -1;
                    return idxA - idxB;
                });
                setCategories(sortedCats);
                if (sortedCats.length > 0) setActiveCategory(sortedCats[0]);
            }
        } catch (err) {
            console.error("Menu fetch error", err);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Auto-fix table selection if missing but present in URL
        if (tableId) localStorage.setItem('hp_table_id', tableId);
        if (tableCode) localStorage.setItem('hp_table_code', tableCode);

        // Staff Mode Safety
        if (isStaffMode && staffTableId) {
            localStorage.setItem('hp_table_id', staffTableId);
            localStorage.setItem('hp_table_code', `T-${staffTableId.slice(0, 2)}`);
        }
    }, [isStaffMode, staffTableId, tableId, tableCode]);

    useEffect(() => {
        setMounted(true);
        initMenu();
        const timer = setTimeout(() => {
            setIsMenuRevealed(true);
        }, 800);
        return () => clearTimeout(timer);
    }, [initMenu]);

    // ============================================
    // Logic: Cart Management
    // ============================================

    const addToCart = (item: FullMenuItem, config: { variant?: any, modifiers?: any[], finalPrice: number, qty: number, notes: string }) => {
        const cartId = Math.random().toString(36).substr(2, 9);
        const newItem: CartItem = {
            cartId,
            menuItemId: item.id,
            title: item.title,
            image: item.imageUrl || IMAGE_MAP[item.title] || DEFAULT_IMAGE,
            price: config.finalPrice,
            quantity: config.qty,
            selectedVariant: config.variant,
            selectedModifiers: config.modifiers,
            notes: config.notes
        };
        setCart(prev => [...prev, newItem]);
    };

    const removeFromCart = (cartId: string) => {
        setCart(prev => prev.filter(i => i.cartId !== cartId));
    };

    const executeOrder = async () => {
        const currentTableId = tableId || localStorage.getItem('hp_table_id');
        const currentTableCode = tableCode || localStorage.getItem('hp_table_code');

        if (!currentTableId || cart.length === 0 || executing) return;
        setExecuting(true);
        try {
            const activeOrderId = localStorage.getItem('hp_active_order_id');
            const isAppending = searchParams.get('append') === 'true';

            const items = cart.map(item => ({
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                selectedVariant: item.selectedVariant ? { name: item.selectedVariant.name, price: item.selectedVariant.price } : undefined,
                selectedModifiers: item.selectedModifiers ? item.selectedModifiers.map(m => ({ name: m.name, price: m.price })) : undefined,
                notes: item.notes
            }));

            if (isAppending && activeOrderId && !isStaffMode) {
                const res = await fetch(`/api/orders/${activeOrderId}/items`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items })
                });
                if (!res.ok) throw new Error('Adding items failed');
                router.push(`/order-status?id=${activeOrderId}`);
            } else {
                const res = await fetch('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tableId: currentTableId,
                        tableCode: currentTableCode,
                        customerName: isStaffMode ? "Staff Service" : (localStorage.getItem('hp_guest_name') || 'Guest'),
                        sessionId: localStorage.getItem('hp_session_id'),
                        items
                    })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Placing order failed');

                if (isStaffMode) {
                    router.push('/waiter');
                } else {
                    localStorage.setItem('hp_active_order_id', data.order.id);
                    router.push(`/order-status?id=${data.order.id}`);
                }
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : 'An error occurred');
            setExecuting(false);
        }
    };

    const basketCount = cart.reduce((a, b) => a + b.quantity, 0);
    const basketTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // ============================================
    // Logic: Filtering System
    // ============================================

    const isHappyHourActive = (item: FullMenuItem) => {
        if (!item.isSpecialPriceActive || !item.specialPrice) return false;
        if (!item.specialPriceStart || !item.specialPriceEnd) return true; // Always active if no window set

        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        return currentTime >= item.specialPriceStart && currentTime <= item.specialPriceEnd;
    };

    const filteredItems = menuItems.filter(item => {
        const matchesCategory = item.category === activeCategory;
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesTags = activeTags.length === 0 || activeTags.every(tag => {
            if (tag === 'VEG') return item.isVeg;
            if (tag === 'NON-VEG') return !item.isVeg;
            if (tag === 'GLUTEN-FREE') return item.isGlutenFree;
            if (tag === 'CHEF-SPECIAL') return item.isChefSpecial;
            if (tag === 'HAPPY-HOUR') return isHappyHourActive(item);
            return true;
        });

        // If search is active, ignore categories to show all matches
        if (searchQuery.length > 0) return matchesSearch && matchesTags;
        return matchesCategory && matchesSearch && matchesTags;
    });

    if (!mounted) return null;

    return (
        <main className="min-h-screen bg-[#FDFCF8] text-[#1A1A1A] font-sans relative overflow-x-hidden selection:bg-[var(--tenant-primary)]/10">
            {/* BACKGROUND TEXTURE */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] z-0" />

            {/* STAFF MODE BANNER */}
            {isStaffMode && (
                <div className="bg-black text-white text-[10px] font-black uppercase tracking-[0.4em] py-2.5 text-center fixed w-full z-100 top-0 shadow-lg">
                    Terminal Active &bull; Table {tableCode?.replace('T-', '')}
                </div>
            )}

            {/* CUSTOMIZATION MODAL */}
            {selectedItemForModal && (
                <ItemCustomizationModal
                    item={selectedItemForModal}
                    isOpen={!!selectedItemForModal}
                    onClose={() => setSelectedItemForModal(null)}
                    onAdd={(config) => {
                        addToCart(selectedItemForModal, config);
                        setSelectedItemForModal(null);
                    }}
                />
            )}

            {/* PREMIUM STICKY HEADER */}
            <header className={`sticky ${isStaffMode ? 'top-8' : 'top-0'} z-50 bg-white/80 backdrop-blur-xl px-4 md:px-12 py-4 flex flex-col border-b border-black/5 shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all duration-500`}>
                <div className="flex justify-between items-center w-full">
                    <Link href={isStaffMode ? "/waiter" : "/welcome-guest"} className="p-2.5 hover:bg-zinc-100 rounded-full transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </Link>

                    {!isSearchVisible ? (
                        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                            <span className="text-[var(--tenant-primary)] font-black text-xl tracking-tighter uppercase">HotelPro</span>
                            <span className="text-[8px] uppercase font-bold tracking-[0.5em] text-zinc-400 mt-0.5">La Carte Royale</span>
                        </div>
                    ) : (
                        <div className="flex-1 max-w-sm mx-4 animate-in slide-in-from-right-4 duration-300">
                            <div className="relative group">
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search for a masterpiece..."
                                    className="w-full bg-zinc-100/50 border-none rounded-2xl py-2.5 px-4 text-sm font-medium focus:ring-2 focus:ring-[var(--tenant-primary)]/20 focus:bg-white transition-all outline-none"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsSearchVisible(!isSearchVisible)}
                            className={`p-2.5 rounded-full transition-colors ${isSearchVisible ? 'bg-[var(--tenant-primary)] text-white' : 'hover:bg-zinc-100'}`}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </button>
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="relative p-2.5 hover:bg-zinc-100 rounded-full transition-colors group"
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                            {basketCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-[var(--tenant-primary)] text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full ring-4 ring-white shadow-lg animate-in zoom-in duration-300">
                                    {basketCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* HERO SECTION */}
            <section className="px-6 py-12 md:py-20 text-center relative z-10">
                <div className="max-w-4xl mx-auto space-y-4">
                    <span className="inline-block px-3 py-1 bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)] text-[9px] font-bold uppercase tracking-[0.3em] rounded-full">
                        H&P Gastronomy 2026
                    </span>
                    <h1 className="text-4xl md:text-6xl font-playfair font-black text-[#1A1A1A] italic leading-tight">
                        Culinary Masterpieces
                    </h1>
                    <p className="text-zinc-500 text-xs md:text-sm font-medium tracking-wide max-w-lg mx-auto leading-relaxed">
                        Hand-selected ingredients prepared with precision for an unparalleled dining experience.
                    </p>
                </div>
            </section>

            {/* STICKY CATEGORY NAV & TAGS */}
            <div className={`sticky ${isStaffMode ? 'top-32' : 'top-[73px]'} z-40 bg-white/90 backdrop-blur-md border-y border-black/5 overflow-x-auto no-scrollbar py-2`}>
                {/* Categories */}
                {!searchQuery && (
                    <div className="flex gap-4 px-6 md:px-12 min-w-max justify-center mb-2 animate-in fade-in duration-500">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-5 py-2.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeCategory === cat ? 'bg-[var(--tenant-primary)] text-white shadow-lg shadow-red-500/20' : 'text-zinc-400 hover:text-black hover:bg-zinc-100'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                {/* Quick Tags */}
                <div className="flex gap-2 px-6 md:px-12 min-w-max justify-center pb-1">
                    {[
                        { id: 'CHEF-SPECIAL', label: 'Chef\'s Pick', color: 'bg-amber-100 text-amber-700' },
                        { id: 'HAPPY-HOUR', label: 'Happy Hour', color: 'bg-red-100 text-red-700' },
                        { id: 'VEG', label: 'Pure Veg', color: 'bg-green-100 text-green-700' },
                        { id: 'GLUTEN-FREE', label: 'Gluten-Free', color: 'bg-blue-100 text-blue-700' }
                    ].map(tag => {
                        const isActive = activeTags.includes(tag.id);
                        return (
                            <button
                                key={tag.id}
                                onClick={() => setActiveTags(prev => isActive ? prev.filter(t => t !== tag.id) : [...prev, tag.id])}
                                className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all duration-300 border ${isActive ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] scale-105' : 'bg-white text-zinc-400 border-black/5 hover:border-black/20'}`}
                            >
                                {tag.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* GRID LAYOUT */}
            <section className="px-6 md:px-12 py-12 min-h-[60vh] max-w-7xl mx-auto">
                {searchQuery && (
                    <div className="mb-12 text-center animate-in fade-in slide-in-from-top-4 duration-500">
                        <span className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest">Searching Results for</span>
                        <h2 className="text-3xl font-playfair font-black text-[#1A1A1A] italic">"{searchQuery}"</h2>
                        <button onClick={() => setSearchQuery('')} className="mt-4 text-[10px] font-black uppercase text-[var(--tenant-primary)] underline decoration-2 underline-offset-4">Clear All Filters</button>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                    {isMenuRevealed && filteredItems.map((item, idx) => {
                        const inCartQty = cart.filter(c => c.menuItemId === item.id).reduce((a, b) => a + b.quantity, 0);
                        const isDiscounted = isHappyHourActive(item);
                        const basePrice = item.variants.length > 0 ? Math.min(...item.variants.map((v: any) => v.price)) : item.priceRaw;
                        const displayPrice = isDiscounted ? item.specialPrice : basePrice;

                        return (
                            <div
                                key={item.id}
                                className={`group relative bg-white rounded-[2.5rem] p-4 border border-black/[0.03] shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:shadow-[0_40px_80px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-2 cursor-pointer ${!item.isAvailable ? 'grayscale opacity-50' : ''}`}
                                style={{ animation: `fadeUp 0.8s cubic-bezier(0.2, 0, 0, 1) forwards ${idx * 0.05}s` }}
                                onClick={() => { if (item.isAvailable) setSelectedItemForModal(item); }}
                            >
                                <div className="relative aspect-4/3 overflow-hidden rounded-[2rem] bg-zinc-100 mb-6 flex-shrink-0">
                                    <Image
                                        src={item.imageUrl || IMAGE_MAP[item.title] || DEFAULT_IMAGE}
                                        alt={item.title}
                                        fill
                                        className="object-cover transition-transform duration-1000 group-hover:scale-110"
                                    />

                                    {/* STATUS BADGES */}
                                    <div className="absolute top-4 left-4 flex flex-col gap-2 scale-90 origin-top-left">
                                        <div className="p-1.5 bg-white/90 backdrop-blur-md rounded-lg shadow-xl border border-black/5 flex items-center justify-center">
                                            <div className={`w-2.5 h-2.5 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                                        </div>
                                        {item.isChefSpecial && (
                                            <div className="px-3 py-1 bg-amber-400 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg">Chef's Pick</div>
                                        )}
                                        {item.isGlutenFree && (
                                            <div className="px-3 py-1 bg-blue-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg">Gluten-Free</div>
                                        )}
                                        {isDiscounted && (
                                            <div className="px-3 py-1 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg animate-pulse">Happy Hour</div>
                                        )}
                                    </div>

                                    {/* QUANTITY IN CART */}
                                    {inCartQty > 0 && (
                                        <div className="absolute top-4 right-4 bg-[var(--tenant-primary)] text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shadow-2xl animate-bounce">
                                            {inCartQty}
                                        </div>
                                    )}

                                    {!item.isAvailable && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <span className="px-6 py-2 bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] rounded-full">
                                                Sold Out
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="px-2 pb-2">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-playfair text-xl font-black text-[#1A1A1A] group-hover:text-[var(--tenant-primary)] transition-colors line-clamp-1">
                                            {item.title}
                                        </h3>
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-2">
                                                {isDiscounted && (
                                                    <span className="text-zinc-300 line-through text-xs font-bold decoration-[var(--tenant-primary)]">₹{basePrice}</span>
                                                )}
                                                <span className="text-[var(--tenant-primary)] font-black text-lg tabular-nums">
                                                    ₹{displayPrice}
                                                </span>
                                            </div>
                                            {item.variants.length > 0 && !isDiscounted && (
                                                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Start</span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-zinc-500 font-medium leading-relaxed italic line-clamp-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                        {item.description}
                                    </p>

                                    <div className="mt-6 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            {item.isGlutenFree && (
                                                <span className="text-[7px] font-black text-blue-500 border border-blue-200 px-1.5 py-0.5 rounded-full uppercase">GF</span>
                                            )}
                                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
                                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                                                {item.category}
                                            </span>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-[var(--tenant-primary)] group-hover:bg-[var(--tenant-primary)] group-hover:text-white transition-all shadow-inner">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {isMenuRevealed && filteredItems.length === 0 && (
                        <div className="col-span-full py-20 text-center space-y-6">
                            <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mx-auto text-zinc-200">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                            </div>
                            <div>
                                <h3 className="text-2xl font-playfair font-black text-[#1A1A1A] italic">No Masterpieces Found</h3>
                                <p className="text-xs text-zinc-400 font-medium mt-2">Try adjusting your search or filters to find something else.</p>
                            </div>
                            <button onClick={() => { setSearchQuery(''); setActiveTags([]); }} className="px-8 py-3 bg-[#1A1A1A] text-white text-[10px] font-black uppercase tracking-widest rounded-full">Explore All Dishes</button>
                        </div>
                    )}
                </div>
            </section>

            {/* FLOATING TRAY (MOBILE) */}
            {basketCount > 0 && !isCartOpen && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90vw] max-w-sm z-60 animate-in slide-in-from-bottom-10 fade-in duration-500">
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="w-full bg-[#1A1A1A] text-white p-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-between px-8 border border-white/10 group active:scale-95 transition-transform"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center relative">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                                <span className="absolute -top-1 -right-1 bg-[var(--tenant-primary)] text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                                    {basketCount}
                                </span>
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">View Cart</span>
                                <span className="text-sm font-black tracking-tight">₹{basketTotal.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--tenant-primary)]">
                            Checkout
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                        </div>
                    </button>
                </div>
            )}

            {/* CART DRAWER - TOP TIER PRIORITY */}
            <div className={`fixed inset-0 z-[9000] transition-all duration-500 ${isCartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                {/* BACKDROP */}
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    onClick={() => setIsCartOpen(false)}
                />

                {/* DRAWER CONTENT */}
                <div className={`absolute bottom-0 left-0 right-0 max-h-[92vh] bg-white rounded-t-[3rem] shadow-[0_-20px_100px_rgba(0,0,0,0.4)] flex flex-col transform transition-all duration-700 ease-[cubic-bezier(0.2,0,0,1)] z-10 ${isCartOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                    <div className="px-6 pt-10 pb-16 overflow-y-auto max-h-[88vh] hide-scrollbar">
                        {/* HEADER */}
                        <div className="flex justify-between items-center mb-10 sticky top-0 bg-white z-20 pb-4">
                            <div>
                                <h2 className="text-3xl font-playfair font-black text-[#1A1A1A] italic">Order Selection</h2>
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1 italic font-playfair">Review your curated items</p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsCartOpen(false);
                                }}
                                className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-black transition-all hover:scale-110 active:scale-95 shadow-inner"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        {cart.length === 0 ? (
                            <div className="py-20 text-center space-y-6">
                                <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-200 shadow-inner">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                                </div>
                                <h3 className="font-playfair text-2xl font-black text-zinc-400 italic">Empty Order Binder</h3>
                                <p className="text-xs text-zinc-400 font-medium">Begin your journey by adding masterpieces.</p>
                                <button
                                    onClick={() => setIsCartOpen(false)}
                                    className="mt-8 px-10 py-4 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-black transition-all active:scale-95 shadow-xl"
                                >
                                    Explore Menu
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {cart.map((item) => (
                                    <div key={item.cartId} className="flex items-start gap-5 p-5 rounded-4xl bg-white border border-black/[0.03] shadow-sm hover:shadow-md transition-shadow">
                                        <div className="relative w-24 h-24 rounded-[1.5rem] overflow-hidden shadow-sm shrink-0 border border-black/5">
                                            <Image src={item.image} alt={item.title} fill className="object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col h-24 justify-between py-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-black text-[#1A1A1A] uppercase text-xs tracking-tight truncate pr-4">{item.title}</h4>
                                                    <div className="text-[9px] text-zinc-400 mt-1 space-x-2">
                                                        {item.selectedVariant && <span className="font-bold text-[var(--tenant-primary)]">{item.selectedVariant.name}</span>}
                                                        {item.selectedModifiers?.map(m => (<span key={m.id} className="inline-block">+ {m.name}</span>))}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.cartId)}
                                                    className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                </button>
                                            </div>

                                            <div className="flex justify-between items-end">
                                                <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-full border border-black/5">
                                                    <span className="text-[10px] font-black text-zinc-400 uppercase">Qty</span>
                                                    <span className="text-xs font-black text-zinc-900">{item.quantity}</span>
                                                </div>
                                                <span className="font-playfair text-xl font-black text-[var(--tenant-primary)]">₹{(item.price * item.quantity).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="mt-12 space-y-4 pt-10 border-t border-black/5">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Consolidated Sum</span>
                                        <span className="text-4xl font-playfair font-black text-[#1A1A1A] tabular-nums underline decoration-[var(--tenant-primary)]/30 underline-offset-8">₹{basketTotal.toLocaleString()}</span>
                                    </div>

                                    <p className="text-[9px] text-zinc-400 font-medium leading-relaxed italic">
                                        * Final taxes and service charges will be calculated on the next page.
                                    </p>

                                    <button
                                        onClick={executeOrder}
                                        disabled={executing}
                                        className="w-full py-6 mt-6 bg-[var(--tenant-primary)] text-white rounded-4xl font-black text-xs uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(212,52,37,0.3)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
                                    >
                                        {executing ? 'Authorizing...' : isStaffMode ? 'Commit to Kitchen' : 'Confirm Order'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MOBILE NAV COMPONENT */}
            {!isCartOpen && <MobileNav />}

            {/* GLOBAL ANIMATIONS */}
            <style jsx global>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </main>
    );
}

// ============================================
// Page Entry
// ============================================

export default function MenuPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center flex-col gap-6">
                <div className="w-12 h-12 border-4 border-zinc-100 border-t-[var(--tenant-primary)] rounded-full animate-spin" />
                <span className="text-[10px] font-black text-zinc-400 tracking-[0.5em] uppercase animate-pulse">Initializing Menu...</span>
            </div>
        }>
            <MenuContent />
        </Suspense>
    );
}
