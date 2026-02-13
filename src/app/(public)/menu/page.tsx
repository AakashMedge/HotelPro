'use client';

import { useState, useEffect, useCallback, Suspense, useMemo, useRef } from 'react';
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
    imageUrl: string | null;
    category: string;
    isVeg: boolean;
    selectedVariant?: { id: string; name: string; price: number };
    selectedModifiers?: { id: string; name: string; price: number }[];
    notes?: string;
}

interface ApiResponse {
    success: boolean;
    items?: any[];
    order?: any;
    error?: string;
}

// ============================================
// Category Placeholder System
// ============================================

const CATEGORY_GRADIENTS: Record<string, string> = {
    'Signature': 'from-stone-300 to-stone-500',
    'Appetizers': 'from-amber-200 to-amber-400',
    'Starters': 'from-amber-200 to-amber-400',
    'Main Course': 'from-stone-400 to-stone-600',
    'Desserts': 'from-rose-200 to-rose-400',
    'Wine & Drinks': 'from-slate-300 to-slate-500',
    'Drinks': 'from-sky-200 to-sky-400',
    'Biryani': 'from-amber-300 to-amber-500',
    'Rice': 'from-amber-200 to-amber-400',
    'Breads': 'from-amber-300 to-stone-400',
    'Soups': 'from-orange-200 to-orange-400',
    'Salads': 'from-emerald-200 to-emerald-400',
    "Chef's Selection": 'from-violet-200 to-violet-400',
};

const CATEGORY_PRIORITY = ['Signature', 'Appetizers', 'Main Course', 'Desserts', 'Wine & Drinks'];

function getGradient(category: string): string {
    return CATEGORY_GRADIENTS[category] || 'from-zinc-300 to-zinc-500';
}

// ============================================
// Minimal Image Component
// ============================================

function FoodImage({ src, category, title, className = '' }: {
    src: string | null | undefined;
    category: string;
    title: string;
    className?: string;
}) {
    const [imgError, setImgError] = useState(false);
    const hasImage = !!src && !imgError;

    if (hasImage) {
        return (
            <div className={`relative overflow-hidden bg-zinc-100 ${className}`}>
                <Image
                    src={src}
                    alt={title}
                    fill
                    className="object-cover"
                    onError={() => setImgError(true)}
                    sizes="(max-width: 768px) 50vw, 200px"
                    loading="eager"
                />
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden ${className}`}>
            <div className={`absolute inset-0 bg-linear-to-br ${getGradient(category)}`} />
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">{category}</span>
            </div>
        </div>
    );
}

// ============================================
// Core Component
// ============================================

function MenuContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const categoryScrollRef = useRef<HTMLDivElement>(null);
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const tableId = searchParams.get('tableId');
    const tableCode = searchParams.get('tableCode');
    const isStaffMode = searchParams.get('staff') === 'true';
    const staffTableId = searchParams.get('staffTableId');

    // State
    const [activeCategory, setActiveCategory] = useState(CATEGORY_PRIORITY[0]);
    const [menuItems, setMenuItems] = useState<FullMenuItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [hotelName, setHotelName] = useState('');

    // UI
    const [isMenuRevealed, setIsMenuRevealed] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [selectedItemForModal, setSelectedItemForModal] = useState<FullMenuItem | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [headerScrolled, setHeaderScrolled] = useState(false);
    const [isScrollSpy, setIsScrollSpy] = useState(false);
    const [isNamePromptOpen, setIsNamePromptOpen] = useState(false);
    const [customerNameInput, setCustomerNameInput] = useState('');

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTags, setActiveTags] = useState<string[]>([]);

    // Session countdown
    const [sessionSecondsLeft, setSessionSecondsLeft] = useState<number | null>(null);
    const sessionStartRef = useRef<number>(Date.now());
    const SESSION_TIMEOUT = 5 * 60;
    const SESSION_WARNING = 60;

    // ============================================
    // Session Countdown Timer
    // ============================================
    useEffect(() => {
        if (isStaffMode) return;
        const hasExistingOrder = !!localStorage.getItem('hp_active_order_id');
        if (hasExistingOrder) return;

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
            const remaining = SESSION_TIMEOUT - elapsed;

            if (remaining <= 0) {
                clearInterval(interval);
                localStorage.removeItem('hp_table_id');
                localStorage.removeItem('hp_table_code');
                localStorage.removeItem('hp_session_id');
                router.push('/welcome-guest?expired=true');
                return;
            }

            if (remaining <= SESSION_WARNING) {
                setSessionSecondsLeft(remaining);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isStaffMode, router]);

    useEffect(() => {
        if (cart.length > 0) {
            sessionStartRef.current = Date.now();
            setSessionSecondsLeft(null);
        }
    }, [cart.length]);

    // ============================================
    // Scroll tracking
    // ============================================
    useEffect(() => {
        const onScroll = () => {
            setHeaderScrolled(window.scrollY > 60);
            if (!isScrollSpy) return;
            const scrollY = window.scrollY + 180;
            for (const cat of categories) {
                const el = sectionRefs.current[cat];
                if (el) {
                    const top = el.offsetTop;
                    const bottom = top + el.offsetHeight;
                    if (scrollY >= top && scrollY < bottom) {
                        setActiveCategory(cat);
                        const chipEl = document.getElementById(`chip-${cat}`);
                        chipEl?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        break;
                    }
                }
            }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [categories, isScrollSpy]);

    // ============================================
    // Logic: Menu Initialization
    // ============================================

    const initMenu = useCallback(async () => {
        try {
            const res = await fetch('/api/menu');
            if (res.status === 401) { router.push('/welcome-guest'); return; }
            const data: ApiResponse = await res.json();
            if (data.success && data.items) {
                const formatted: FullMenuItem[] = data.items.map((item) => ({
                    id: item.id,
                    title: item.name,
                    description: item.description,
                    priceRaw: Number(item.price),
                    imageUrl: item.imageUrl || null,
                    isVeg: item.isVeg || false,
                    isAvailable: item.isAvailable,
                    category: item.category?.name || item.category || "Chef's Selection",
                    variants: item.variants || [],
                    modifierGroups: item.modifierGroups || [],
                    isChefSpecial: item.isChefSpecial || false,
                    isGlutenFree: item.isGlutenFree || false,
                    specialPrice: item.specialPrice,
                    isSpecialPriceActive: item.isSpecialPriceActive,
                    specialPriceStart: item.specialPriceStart,
                    specialPriceEnd: item.specialPriceEnd,
                }));
                setMenuItems(formatted);
                const uniqueCats = Array.from(new Set(formatted.map((i) => i.category)));
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
            console.error('Menu fetch error', err);
        }
    }, [router]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (tableId) localStorage.setItem('hp_table_id', tableId);
        if (tableCode) localStorage.setItem('hp_table_code', tableCode);
        if (isStaffMode && staffTableId) {
            localStorage.setItem('hp_table_id', staffTableId);
            localStorage.setItem('hp_table_code', `T-${staffTableId.slice(0, 2)}`);
        }
        setHotelName(localStorage.getItem('hp_hotel_name') || '');
    }, [isStaffMode, staffTableId, tableId, tableCode]);

    useEffect(() => {
        setMounted(true);
        initMenu();
        const timer = setTimeout(() => {
            setIsMenuRevealed(true);
            setIsScrollSpy(true);
        }, 300);
        return () => clearTimeout(timer);
    }, [initMenu]);

    // ============================================
    // Cart Logic — Unified localStorage Sync
    // ============================================

    // Load cart from localStorage on mount (sync with AI page)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = localStorage.getItem('hp_cart');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const restored: CartItem[] = parsed.map((i: any) => ({
                        cartId: i.cartId || Math.random().toString(36).substr(2, 9),
                        menuItemId: i.menuItemId || i.id,
                        title: i.title || i.name,
                        price: i.price,
                        quantity: i.quantity,
                        imageUrl: i.imageUrl || null,
                        category: i.category || '',
                        isVeg: i.isVeg || false,
                        selectedVariant: i.selectedVariant,
                        selectedModifiers: i.selectedModifiers,
                        notes: i.notes,
                    }));
                    setCart(restored);
                }
            }
        } catch { /* ignore parse errors */ }
    }, []);

    // Persist cart to localStorage on every change (sync with AI page)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        localStorage.setItem('hp_cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (item: FullMenuItem, config: { variant?: any; modifiers?: any[]; finalPrice: number; qty: number; notes: string }) => {
        const cartId = Math.random().toString(36).substr(2, 9);
        const newItem: CartItem = {
            cartId, menuItemId: item.id, title: item.title,
            imageUrl: item.imageUrl || null, category: item.category,
            isVeg: item.isVeg, price: config.finalPrice, quantity: config.qty,
            selectedVariant: config.variant, selectedModifiers: config.modifiers, notes: config.notes,
        };
        setCart((prev) => [...prev, newItem]);
    };

    const quickAddToCart = (item: FullMenuItem) => {
        if (item.variants.length > 0 || item.modifierGroups.length > 0) {
            setSelectedItemForModal(item);
            return;
        }
        const price = isHappyHourActive(item) && item.specialPrice ? item.specialPrice : item.priceRaw;
        addToCart(item, { finalPrice: price, qty: 1, notes: '' });
    };

    const updateCartItemQty = (menuItemId: string, delta: number) => {
        setCart((prev) => {
            const idx = prev.findIndex((c) => c.menuItemId === menuItemId);
            if (idx === -1) return prev;
            const updated = [...prev];
            const newQty = updated[idx].quantity + delta;
            if (newQty <= 0) updated.splice(idx, 1);
            else updated[idx] = { ...updated[idx], quantity: newQty };
            return updated;
        });
    };

    const executeOrder = async () => {
        const currentTableId = tableId || localStorage.getItem('hp_table_id');
        const currentTableCode = tableCode || localStorage.getItem('hp_table_code');
        if (!currentTableId || cart.length === 0 || executing) return;

        // Check for customer name (unless staff mode)
        if (!isStaffMode) {
            const storedName = localStorage.getItem('hp_guest_name');
            if (!storedName) {
                setIsNamePromptOpen(true);
                return;
            }
        }

        proceedWithOrder(currentTableId, currentTableCode);
    };

    const handleNameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerNameInput.trim()) return;
        localStorage.setItem('hp_guest_name', customerNameInput.trim());
        setIsNamePromptOpen(false);
        // Re-trigger execution
        const currentTableId = tableId || localStorage.getItem('hp_table_id');
        const currentTableCode = tableCode || localStorage.getItem('hp_table_code');
        if (currentTableId) proceedWithOrder(currentTableId, currentTableCode);
    };

    const proceedWithOrder = async (currentTableId: string, currentTableCode: string | null) => {
        setExecuting(true);
        try {
            const activeOrderId = localStorage.getItem('hp_active_order_id');
            const isAppending = searchParams.get('append') === 'true';
            const items = cart.map((item) => ({
                menuItemId: item.menuItemId, quantity: item.quantity,
                selectedVariant: item.selectedVariant ? { name: item.selectedVariant.name, price: item.selectedVariant.price } : undefined,
                selectedModifiers: item.selectedModifiers ? item.selectedModifiers.map((m) => ({ name: m.name, price: m.price })) : undefined,
                notes: item.notes,
            }));
            if (isAppending && activeOrderId && !isStaffMode) {
                const res = await fetch(`/api/orders/${activeOrderId}/items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
                if (!res.ok) throw new Error('Adding items failed');
                setCart([]); localStorage.removeItem('hp_cart');
                router.push(`/order-status?id=${activeOrderId}`);
            } else {
                const res = await fetch('/api/orders', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tableId: currentTableId, tableCode: currentTableCode, customerName: isStaffMode ? 'Staff Service' : localStorage.getItem('hp_guest_name') || 'Guest', sessionId: localStorage.getItem('hp_session_id'), items }),
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Placing order failed');
                setCart([]); localStorage.removeItem('hp_cart');
                if (isStaffMode) { router.push('/waiter'); }
                else { localStorage.setItem('hp_active_order_id', data.order.id); router.push(`/order-status?id=${data.order.id}`); }
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : 'An error occurred');
            setExecuting(false);
        }
    };

    const basketCount = cart.reduce((a, b) => a + b.quantity, 0);
    const basketTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // ============================================
    // Pricing helpers
    // ============================================

    const isHappyHourActive = (item: FullMenuItem) => {
        if (!item.isSpecialPriceActive || !item.specialPrice) return false;
        if (!item.specialPriceStart || !item.specialPriceEnd) return true;
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        return currentTime >= item.specialPriceStart && currentTime <= item.specialPriceEnd;
    };

    const getItemPrice = (item: FullMenuItem) => {
        const base = item.variants.length > 0 ? Math.min(...item.variants.map((v: any) => v.price)) : item.priceRaw;
        return isHappyHourActive(item) && item.specialPrice ? item.specialPrice : base;
    };

    const getItemCartQty = (menuItemId: string) => {
        return cart.filter((c) => c.menuItemId === menuItemId).reduce((a, b) => a + b.quantity, 0);
    };

    const popularItems = useMemo(() => {
        const specials = menuItems.filter((i) => i.isChefSpecial && i.isAvailable);
        return specials.length >= 3 ? specials.slice(0, 8) : menuItems.filter((i) => i.isAvailable).slice(0, 6);
    }, [menuItems]);

    const scrollToCategory = (cat: string) => {
        setActiveCategory(cat);
        const el = sectionRefs.current[cat];
        if (el) {
            const top = el.offsetTop - 140;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    };

    // ─── Scroll Lock for Cart ───
    useEffect(() => {
        if (isCartOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isCartOpen]);

    const searchResults = useMemo(() => {
        if (searchQuery.length === 0) return [];
        return menuItems.filter((item) => {
            const q = searchQuery.toLowerCase();
            const matchesSearch = item.title.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
            const matchesTags = activeTags.length === 0 || activeTags.every((tag) => {
                if (tag === 'VEG') return item.isVeg;
                if (tag === 'NON-VEG') return !item.isVeg;
                if (tag === 'GF') return item.isGlutenFree;
                return true;
            });
            return matchesSearch && matchesTags;
        });
    }, [menuItems, searchQuery, activeTags]);

    const itemsByCategory = useMemo(() => {
        const map: Record<string, FullMenuItem[]> = {};
        for (const cat of categories) {
            map[cat] = menuItems.filter((item) => {
                const matchesCat = item.category === cat;
                const matchesTags = activeTags.length === 0 || activeTags.every((tag) => {
                    if (tag === 'VEG') return item.isVeg;
                    if (tag === 'NON-VEG') return !item.isVeg;
                    if (tag === 'GF') return item.isGlutenFree;
                    return true;
                });
                return matchesCat && matchesTags;
            });
        }
        return map;
    }, [menuItems, categories, activeTags]);

    if (!mounted) return null;

    const displayTableCode = tableCode || localStorage.getItem('hp_table_code') || '';
    const displayHotelName = hotelName || 'Restaurant';

    return (
        <div className="min-h-screen bg-white pb-24">

            {/* Session Expiry Warning */}
            {sessionSecondsLeft !== null && sessionSecondsLeft > 0 && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-[#1A1A1A] text-white px-4 py-2.5 flex items-center justify-between" style={{ animation: 'slideDown 0.3s ease' }}>
                    <p className="text-xs font-medium tracking-wide">
                        Table hold expires in <span className="font-bold tabular-nums">{sessionSecondsLeft}s</span>
                    </p>
                    <p className="text-[10px] text-white/50">Add an item to stay</p>
                </div>
            )}

            {/* Staff Mode Banner */}
            {isStaffMode && (
                <div className="bg-[#1A1A1A] text-white text-[10px] font-semibold uppercase tracking-[0.25em] py-2 text-center fixed w-full z-50 top-0">
                    Staff Mode · Table {displayTableCode.replace('T-', '')}
                </div>
            )}

            {/* ─── Header ─── */}
            <div className={`px-5 pt-6 pb-5 ${isStaffMode ? 'mt-8' : ''}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-[#1A1A1A] tracking-tight">{displayHotelName}</h1>
                        <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                            {displayTableCode && (
                                <span className="text-[#1A1A1A]">Table {displayTableCode.replace('T-', '')} · </span>
                            )}
                            Dine In
                        </p>
                    </div>
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-400 active:scale-95 transition-transform"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    </button>
                </div>

                {/* Filter pills */}
                <div className="flex gap-2 mt-4">
                    {[
                        { id: 'VEG', label: 'Veg' },
                        { id: 'NON-VEG', label: 'Non-Veg' },
                        { id: 'GF', label: 'Gluten Free' },
                    ].map((tag) => {
                        const isActive = activeTags.includes(tag.id);
                        return (
                            <button
                                key={tag.id}
                                onClick={() => setActiveTags((prev) => (isActive ? prev.filter((t) => t !== tag.id) : [...prev, tag.id]))}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border ${isActive
                                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                                    : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
                                    }`}
                            >
                                {tag.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ─── Search Overlay ─── */}
            {isSearchOpen && (
                <div className="fixed inset-0 z-50 bg-white flex flex-col">
                    <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-100">
                        <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center shrink-0">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                        </button>
                        <input autoFocus type="text" placeholder="Search dishes..."
                            className="flex-1 text-sm font-medium placeholder:text-zinc-300 outline-none bg-transparent"
                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-zinc-300 p-1">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {searchQuery.length === 0 ? (
                            <div className="text-center mt-20">
                                <p className="text-zinc-300 text-sm">Search our menu</p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 mb-3">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</p>
                                {searchResults.map((item) => (
                                    <div key={item.id}
                                        className="flex items-center gap-3 py-3 border-b border-zinc-50 last:border-0"
                                        onClick={() => { setSelectedItemForModal(item); setIsSearchOpen(false); setSearchQuery(''); }}>
                                        <FoodImage src={item.imageUrl} category={item.category} title={item.title} className="w-12 h-12 rounded-lg shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-sm truncate text-[#1A1A1A]">{item.title}</h4>
                                            <p className="text-sm text-zinc-500 mt-0.5">₹{getItemPrice(item)}</p>
                                        </div>
                                    </div>
                                ))}
                                {searchResults.length === 0 && (
                                    <div className="text-center py-16">
                                        <p className="text-zinc-400 text-sm">No dishes found for &ldquo;{searchQuery}&rdquo;</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Category Tabs ─── */}
            <div className={`sticky ${isStaffMode ? 'top-8' : 'top-0'} z-30 bg-white transition-shadow duration-200 ${headerScrolled ? 'shadow-sm' : ''}`}>
                <div ref={categoryScrollRef} className="flex gap-1 px-4 py-2.5 overflow-x-auto no-scrollbar">
                    {categories.map((cat) => {
                        const isActive = activeCategory === cat;
                        const countInCat = (itemsByCategory[cat] || []).length;
                        if (countInCat === 0 && activeTags.length > 0) return null;
                        return (
                            <button id={`chip-${cat}`} key={cat} onClick={() => scrollToCategory(cat)}
                                className={`px-4 py-2 rounded-full text-xs font-medium transition-all shrink-0 ${isActive
                                    ? 'bg-[#1A1A1A] text-white'
                                    : 'text-zinc-400 hover:text-zinc-600'
                                    }`}>
                                {cat}
                            </button>
                        );
                    })}
                </div>
                <div className="h-px bg-zinc-100" />
            </div>

            {/* ─── Popular Section ─── */}
            {popularItems.length > 0 && !searchQuery && activeTags.length === 0 && (
                <div className="px-5 pt-5 pb-1">
                    <h2 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wide mb-4">Popular</h2>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3 -mx-5 px-5">
                        {popularItems.map((item) => {
                            const qty = getItemCartQty(item.id);
                            return (
                                <div key={item.id} className="shrink-0 w-[130px]"
                                    onClick={() => { if (item.isAvailable) setSelectedItemForModal(item); }}>
                                    <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-100 mb-2">
                                        <FoodImage src={item.imageUrl} category={item.category} title={item.title} className="w-full h-full" />
                                        {item.isChefSpecial && (
                                            <div className="absolute top-2 left-2 bg-[#1A1A1A] text-[8px] font-semibold text-white px-2 py-0.5 rounded uppercase tracking-wide">Bestseller</div>
                                        )}
                                        {item.isAvailable && (
                                            <button onClick={(e) => { e.stopPropagation(); quickAddToCart(item); }}
                                                className={`absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all ${qty > 0 ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#1A1A1A] shadow-md'
                                                    }`}>
                                                {qty > 0 ? <span className="text-[10px] font-bold">{qty}</span> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
                                            </button>
                                        )}
                                    </div>
                                    <h4 className="text-xs font-medium leading-tight line-clamp-2 text-[#1A1A1A]">{item.title}</h4>
                                    <p className="text-xs text-zinc-400 mt-0.5">₹{getItemPrice(item)}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ─── Menu Sections ─── */}
            <div className="px-5 pt-3 pb-4">
                {categories.map((cat) => {
                    const items = itemsByCategory[cat] || [];
                    if (items.length === 0) return null;
                    return (
                        <div key={cat} ref={(el) => { sectionRefs.current[cat] = el; }} className="mb-8">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wide">{cat}</h2>
                                <span className="text-[10px] text-zinc-300 font-medium">{items.length} items</span>
                            </div>

                            <div className="space-y-0 divide-y divide-zinc-100">
                                {isMenuRevealed && items.map((item) => {
                                    const qty = getItemCartQty(item.id);
                                    const price = getItemPrice(item);
                                    const isDiscounted = isHappyHourActive(item);
                                    const hasCustomization = item.variants.length > 0 || item.modifierGroups.length > 0;

                                    return (
                                        <div key={item.id}
                                            className={`flex gap-4 py-4 ${!item.isAvailable ? 'opacity-40' : ''}`}
                                            onClick={() => { if (item.isAvailable) setSelectedItemForModal(item); }}>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                {item.isChefSpecial && (
                                                    <span className="text-[9px] font-semibold text-amber-600 uppercase tracking-wider">Bestseller</span>
                                                )}
                                                <h3 className="font-medium text-[15px] leading-snug text-[#1A1A1A] mt-0.5">{item.title}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="font-semibold text-sm text-[#1A1A1A]">₹{price}</span>
                                                    {item.variants.length > 0 && !isDiscounted && (
                                                        <span className="text-[10px] text-zinc-400">onwards</span>
                                                    )}
                                                    {isDiscounted && (
                                                        <>
                                                            <span className="text-[11px] line-through text-zinc-300">₹{item.priceRaw}</span>
                                                            <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">OFFER</span>
                                                        </>
                                                    )}
                                                </div>
                                                {item.description && (
                                                    <p className="text-[12px] text-zinc-400 leading-relaxed line-clamp-2 mt-1.5">{item.description}</p>
                                                )}
                                            </div>

                                            {/* Image + Add */}
                                            <div className="relative shrink-0 flex flex-col items-center">
                                                <FoodImage src={item.imageUrl} category={item.category} title={item.title}
                                                    className="w-24 h-24 rounded-lg" />
                                                {!item.isAvailable && (
                                                    <div className="absolute inset-0 bg-white/60 rounded-lg flex items-center justify-center">
                                                        <span className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500">Sold Out</span>
                                                    </div>
                                                )}
                                                {item.isAvailable && (
                                                    <div className="absolute -bottom-2.5" onClick={(e) => e.stopPropagation()}>
                                                        {qty > 0 ? (
                                                            <div className="flex items-center bg-[#1A1A1A] rounded-lg overflow-hidden shadow-sm">
                                                                <button onClick={() => updateCartItemQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-white text-sm font-medium">-</button>
                                                                <span className="w-6 text-center text-white text-xs font-bold">{qty}</span>
                                                                <button onClick={() => updateCartItemQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-white text-sm font-medium">+</button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => quickAddToCart(item)}
                                                                className="bg-white border border-zinc-200 text-[#1A1A1A] px-5 py-1.5 rounded-lg text-xs font-semibold shadow-sm active:scale-95 transition-transform uppercase tracking-wide">
                                                                Add{hasCustomization && '+'}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {categories.every((cat) => (itemsByCategory[cat] || []).length === 0) && isMenuRevealed && (
                    <div className="py-20 text-center">
                        <p className="text-sm text-zinc-400">No dishes match your filters</p>
                        <button onClick={() => { setSearchQuery(''); setActiveTags([]); }} className="mt-3 text-xs font-medium text-zinc-600 underline underline-offset-4">Clear Filters</button>
                    </div>
                )}
            </div>

            {/* ─── Item Modal ─── */}
            {selectedItemForModal && (
                <ItemCustomizationModal
                    item={selectedItemForModal}
                    isOpen={!!selectedItemForModal}
                    onClose={() => setSelectedItemForModal(null)}
                    onAdd={(config) => { addToCart(selectedItemForModal, config); setSelectedItemForModal(null); }}
                />
            )}

            {/* ─── Cart Bar ─── */}
            {basketCount > 0 && !isCartOpen && (
                <div className="fixed bottom-[60px] left-0 right-0 z-40 px-4" style={{ animation: 'slideUp 0.3s ease' }}>
                    <button onClick={() => setIsCartOpen(true)}
                        className="w-full bg-[#1A1A1A] text-white py-3.5 px-5 rounded-xl flex items-center justify-between active:scale-[0.99] transition-transform">
                        <div className="text-left">
                            <p className="text-[10px] text-white/50 font-medium uppercase tracking-wider">{basketCount} item{basketCount > 1 ? 's' : ''}</p>
                            <p className="text-sm font-bold mt-0.5">₹{basketTotal.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                            View Cart
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
                        </div>
                    </button>
                </div>
            )}

            {/* ─── Cart Drawer ─── */}
            <div className={`fixed inset-0 z-50 transition-all duration-300 ${isCartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/40" onClick={() => setIsCartOpen(false)} />
                <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl flex flex-col max-h-[85vh] transition-transform duration-300 ${isCartOpen ? 'translate-y-0' : 'translate-y-full'}`}>

                    <div className="w-full h-5 flex items-center justify-center shrink-0 cursor-pointer" onClick={() => setIsCartOpen(false)}>
                        <div className="w-8 h-0.5 bg-zinc-200 rounded-full" />
                    </div>

                    <div className="px-5 pb-3 flex justify-between items-center">
                        <div>
                            <h2 className="text-base font-bold text-[#1A1A1A]">Your Order</h2>
                            {displayTableCode && (
                                <p className="text-[10px] text-zinc-400 mt-0.5">Table {displayTableCode.replace('T-', '')}</p>
                            )}
                        </div>
                        <button onClick={() => setIsCartOpen(false)} className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    </div>

                    <div className="px-5 flex-1 overflow-y-auto">
                        {cart.length === 0 ? (
                            <div className="py-10 text-center text-zinc-400">
                                <p className="text-sm">Cart is empty</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-100">
                                {cart.map((item) => (
                                    <div key={item.cartId} className="flex gap-3 items-center py-3">
                                        <FoodImage src={item.imageUrl} category={item.category} title={item.title}
                                            className="w-12 h-12 rounded-lg shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm truncate text-[#1A1A1A]">{item.title}</h4>
                                            {item.selectedVariant && <p className="text-[10px] text-zinc-400">{item.selectedVariant.name}</p>}
                                            <p className="font-semibold text-sm text-[#1A1A1A] mt-0.5">₹{item.price * item.quantity}</p>
                                        </div>
                                        <div className="flex items-center bg-zinc-100 rounded-lg overflow-hidden shrink-0">
                                            <button onClick={() => updateCartItemQty(item.menuItemId, -1)} className="w-8 h-8 flex items-center justify-center text-zinc-600 text-sm">-</button>
                                            <span className="w-5 text-center text-xs font-bold text-[#1A1A1A]">{item.quantity}</span>
                                            <button onClick={() => updateCartItemQty(item.menuItemId, 1)} className="w-8 h-8 flex items-center justify-center text-zinc-600 text-sm">+</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {cart.length > 0 && (
                        <div className="p-5 border-t border-zinc-100">
                            <div className="flex justify-between items-baseline mb-4">
                                <span className="text-xs text-zinc-400">Subtotal</span>
                                <span className="text-lg font-bold text-[#1A1A1A]">₹{basketTotal.toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] text-zinc-300 mb-3">Taxes calculated at billing</p>
                            <button onClick={executeOrder} disabled={executing}
                                className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-xl font-semibold text-sm uppercase tracking-wide active:scale-[0.98] transition-all disabled:opacity-50">
                                {executing ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Placing Order...
                                    </span>
                                ) : (
                                    `Place Order · ₹${basketTotal.toLocaleString()}`
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Name Prompt Modal ─── */}
            {isNamePromptOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-[#1A1A1A]">One last thing...</h3>
                            <p className="text-sm text-zinc-500 mt-1">What should we call you?</p>
                        </div>
                        <form onSubmit={handleNameSubmit} className="space-y-4">
                            <input
                                autoFocus
                                required
                                value={customerNameInput}
                                onChange={(e) => setCustomerNameInput(e.target.value)}
                                placeholder="Your Name"
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-center text-lg font-medium outline-none focus:ring-2 focus:ring-[#1A1A1A] text-[#1A1A1A]"
                            />
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsNamePromptOpen(false)}
                                    className="flex-1 py-3 text-sm font-medium text-zinc-500 hover:bg-zinc-50 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!customerNameInput.trim()}
                                    className="flex-2 py-3 bg-[#1A1A1A] text-white rounded-xl font-bold text-sm disabled:opacity-50"
                                >
                                    Confirm Order
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


            {/* Mobile Nav */}
            {!isCartOpen && <MobileNav />}

            <style jsx global>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-100%); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}

// ============================================
// Page Entry
// ============================================

export default function MenuPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-zinc-200 border-t-zinc-600 rounded-full animate-spin" />
            </div>
        }>
            <MenuContent />
        </Suspense>
    );
}
