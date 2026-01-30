'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// ============================================
// Types
// ============================================

interface MenuItem {
    id: string;
    category: string;
    title: string;
    description: string;
    price: string;
    priceRaw: number;
    image: string;
}

interface ApiResponse {
    success: boolean;
    items?: any[];
    order?: any;
    error?: string;
}

// ============================================
// Constants
// ============================================

const CATEGORY_PRIORITY = ['Signature', 'Appetizers', 'Main Course', 'Desserts', 'Wine & Drinks'];

const IMAGE_MAP: Record<string, string> = {
    'Wagyu Beef Tenderloin': '/images/menu/wagyu.png',
    'Perigord Black Truffle Risotto': '/images/menu/risotto.png',
    'Luxury Tandoori Lobster': '/images/menu/lobster.png',
    'Burrata di Puglia': '/images/menu/burrata.png',
    'Saffron Paneer Tikka': '/images/menu/paneer.png',
    'Wild-Caught Sea Bass': '/images/menu/wagyu.png', // Fallback
    'Grand Cru Chocolate Fondant': '/images/menu/fondant.png',
    'Royal Chai Panna Cotta': '/images/menu/chai.png',
    'Vintage Reserve Red': '/images/menu/wine.png',
    'Imperial Masala Chai': '/images/menu/chai.png'
};

const DEFAULT_IMAGE = '/images/menu/wagyu.png';

// ============================================
// Component
// ============================================

export default function MenuPage() {
    const [activeCategory, setActiveCategory] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [basket, setBasket] = useState<string[]>([]); // Array of item IDs

    const [isMenuRevealed, setIsMenuRevealed] = useState(false);
    const [isCasting, setIsCasting] = useState(false);
    const [magicSparks, setMagicSparks] = useState<{ id: number; x: number; y: number }[]>([]);
    const [mounted, setMounted] = useState(false);
    const [isOwlPeeking, setIsOwlPeeking] = useState(true);
    const [isCartJoyful, setIsCartJoyful] = useState(false);

    const [loading, setLoading] = useState(true);
    const [tableId, setTableId] = useState<string | null>(null);
    const [tableCode, setTableCode] = useState<string | null>(null);
    const [executing, setExecuting] = useState(false);

    const router = useRouter();

    // ============================================
    // Init Data
    // ============================================

    const initMenu = useCallback(async () => {
        try {
            // 1. Fetch Menu
            const res = await fetch('/api/menu');
            const data: ApiResponse = await res.json();
            if (!data.success || !data.items) throw new Error(data.error || 'Failed to fetch menu');

            const items: MenuItem[] = data.items.map(item => ({
                id: item.id,
                category: item.category,
                title: item.name,
                description: item.description || 'A masterpiece of culinary craft.',
                price: `₹${item.price.toLocaleString()}`,
                priceRaw: item.price,
                image: IMAGE_MAP[item.name] || DEFAULT_IMAGE
            }));

            setMenuItems(items);

            // 2. Extract Categories and Sort by Priority
            const cats = Array.from(new Set(items.map(i => i.category)));
            const sortedCats = cats.sort((a, b) => {
                const idxA = CATEGORY_PRIORITY.indexOf(a);
                const idxB = CATEGORY_PRIORITY.indexOf(b);
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
            });

            setCategories(sortedCats);
            if (sortedCats.length > 0) setActiveCategory(sortedCats[0]);

            // 3. Resolve Table
            const storedTableCode = localStorage.getItem('hp_table_no');
            if (storedTableCode) {
                setTableCode(storedTableCode);
                const tableRes = await fetch('/api/tables');
                const tableData = await tableRes.json();
                const table = tableData.tables?.find((t: any) => t.tableCode === storedTableCode || t.id === storedTableCode);
                if (table) setTableId(table.id);
            }
        } catch (err) {
            console.error('[MENU] Init error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        initMenu();

        // Initial magic reveal
        const timer = setTimeout(() => {
            triggerMagic();
        }, 1200);
        return () => clearTimeout(timer);
    }, [initMenu]);

    // ============================================
    // UI Helpers
    // ============================================

    const filteredItems = menuItems.filter(item => item.category === activeCategory);

    const toggleBasket = (id: string) => {
        setBasket(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const triggerMagic = () => {
        setIsCasting(true);
        const newSparks = Array.from({ length: 15 }).map((_, i) => ({
            id: i,
            x: -200 - Math.random() * 400,
            y: -100 - Math.random() * 300
        }));
        setMagicSparks(newSparks);

        setTimeout(() => {
            setIsMenuRevealed(true);
            setIsCasting(false);
            setTimeout(() => setIsOwlPeeking(false), 2000);
        }, 800);
    };

    useEffect(() => {
        if (basket.length > 0) {
            setIsCartJoyful(true);
            setIsOwlPeeking(true);
            const timer = setTimeout(() => setIsCartJoyful(false), 500);
            return () => clearTimeout(timer);
        }
    }, [basket.length]);

    // ============================================
    // Execute Order
    // ============================================

    const executeOrder = async () => {
        if (!tableId || basket.length === 0 || executing) return;

        setExecuting(true);
        try {
            // Group items by ID and count quantities
            const itemCounts = basket.reduce((acc, id) => {
                acc[id] = (acc[id] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const items = Object.entries(itemCounts).map(([menuItemId, quantity]) => ({
                menuItemId,
                quantity
            }));

            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tableId,
                    items
                })
            });

            const data: ApiResponse = await res.json();
            if (!data.success || !data.order) throw new Error(data.error || 'Failed to place order');

            // Save order ID and redirect
            localStorage.setItem('hp_active_order_id', data.order.id);
            router.push(`/order-status?id=${data.order.id}`);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error placing order');
            setExecuting(false);
        }
    };

    return (
        <main className="min-h-screen bg-vellum text-black font-sans relative overflow-x-hidden">
            {/* Premium Ledger Header */}
            <header className="sticky top-0 z-50 bg-[#3D2329]/95 backdrop-blur-md px-4 md:px-12 py-3 md:py-4 flex justify-between items-center border-b border-[#D43425]/20 shadow-xl">
                <Link href="/welcome-guest" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 md:w-10 md:h-10 border border-[#D43425]/30 rounded-full flex items-center justify-center text-[#EFE7D9] group-hover:bg-[#D43425] group-hover:text-white transition-all">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="md:w-5 md:h-5">
                            <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </div>
                </Link>

                <div className="flex flex-col items-center">
                    <div className="text-[#D43425] font-black text-xl md:text-2xl tracking-tighter leading-none mb-0.5">HOTELPRO</div>
                    <div className="flex items-center gap-2 text-center">
                        <div className="h-px w-4 bg-[#C9A227]/40" />
                        <p className="text-[#C9A227] text-[7px] md:text-[9px] uppercase font-bold tracking-[0.4em]">The Menu Ledger</p>
                        <div className="h-px w-4 bg-[#C9A227]/40" />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 md:gap-3 bg-[#D43425] text-white px-4 md:px-6 py-1.5 md:py-2 rounded-full hover:bg-red-700 transition-all shadow-lg active:scale-95 group">
                        <svg className="w-4 h-4 md:w-5 md:h-5 group-hover:rotate-12 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <path d="M16 10a4 4 0 0 1-8 0"></path>
                        </svg>
                        <span className="font-bold text-[10px] md:text-sm uppercase tracking-widest">{basket.length}</span>
                    </button>
                </div>
            </header>

            {/* Culinary Ledger Hero */}
            <section className="px-6 md:px-12 py-12 md:py-20 bg-[#3D2329] text-[#EFE7D9] border-b border-[#D43425]/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#D43425]/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#C9A227]/5 rounded-full blur-[120px]" />

                <div className="max-w-7xl mx-auto space-y-6 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <span className="text-[#C9A227] text-[10px] md:text-xs font-bold uppercase tracking-[0.5em] mb-2 opacity-80 animate-pulse">Volume MMXXVI — H&P Reserve</span>
                        <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-playfair font-semibold italic leading-tight">
                            Explore the Culinary Ledger
                        </h1>
                        <div className="w-24 h-px bg-[#C9A227]/30 my-2" />
                    </div>

                    <p className="max-w-2xl mx-auto text-[10px] md:text-xs sm:text-sm uppercase font-medium tracking-[0.25em] text-[#EFE7D9]/60 leading-relaxed drop-shadow-sm">
                        Welcome to Table {tableCode || '...'}. A curated collection of masterpieces. Every page tells a story of Gastronomy.
                    </p>
                </div>
            </section>

            {/* Category Navigation */}
            <div className="sticky top-[73px] md:top-[89px] z-40 bg-[#3D2329]/95 backdrop-blur-md py-3 md:py-4 border-b border-[#D43425]/20 overflow-x-auto no-scrollbar shadow-lg">
                <div className="flex gap-6 md:gap-8 px-6 md:px-12 min-w-max">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`text-[9px] md:text-sm font-bold uppercase tracking-[0.3em] transition-all relative py-2 ${activeCategory === cat ? 'text-[#D43425]' : 'text-[#EFE7D9]/40 hover:text-[#EFE7D9]'}`}
                        >
                            {cat}
                            {activeCategory === cat && (
                                <div className="absolute -bottom-1 left-0 w-full h-[2px] md:h-[3px] bg-[#D43425] rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu Grid */}
            <section className="px-6 md:px-12 py-10 md:py-16 min-h-[60vh]">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
                    {loading || !isMenuRevealed ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-40 italic font-playfair text-lg text-center">
                            Preparing the ledger...
                        </div>
                    ) : (
                        filteredItems.map((item, idx) => (
                            <div
                                key={item.id}
                                className="group flex flex-col gap-6 animate-ink-spread"
                                style={{ animationDelay: `${idx * 150}ms` }}
                            >
                                <div className="relative aspect-square overflow-hidden rounded-[1rem] shadow-xl border border-[#D43425]/10 bg-white">
                                    <Image
                                        src={item.image}
                                        alt={item.title}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-110 saturate-[0.85] hover:saturate-100"
                                    />
                                    <div className="absolute inset-0 bg-black/5" />
                                    <button
                                        onClick={() => toggleBasket(item.id)}
                                        className={`absolute bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${basket.includes(item.id) ? 'bg-[#D43425] text-white scale-110' : 'bg-white/90 backdrop-blur-sm text-black hover:bg-white hover:scale-110 active:scale-95'}`}
                                    >
                                        {basket.includes(item.id) ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                        )}
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-baseline gap-4 border-b border-[#D43425]/10 pb-2">
                                        <h3 className="font-playfair text-2xl font-black text-ink">{item.title}</h3>
                                        <span className="font-playfair italic text-lg text-[#D43425] font-bold tabular-nums">{item.price}</span>
                                    </div>
                                    <p className="text-xs font-medium text-black/50 leading-relaxed italic">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* MAGICAL WAITER */}
            <div className={`owl-container-fixed transition-all duration-1000 transform ${mounted ? 'translate-x-0 opacity-100' : 'translate-x-24 opacity-0'}`}>
                <div
                    className={`owl-interactive ${isOwlPeeking ? 'owl-peek-visible' : 'owl-peek-hidden'} cursor-pointer group pr-1`}
                    onMouseEnter={() => setIsOwlPeeking(true)}
                    onMouseLeave={() => isMenuRevealed && setIsOwlPeeking(false)}
                    onClick={() => setIsOwlPeeking(!isOwlPeeking)}
                >
                    <div className="relative flex flex-col items-end">
                        <div className={`mb-4 mr-10 bg-[#3D2329] text-[#EFE7D9] px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap shadow-2xl border border-[#D43425]/30 ${isOwlPeeking ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
                            {isCartJoyful ? "Magnificent Choice!" : (isMenuRevealed ? "Awaiting your command, sir." : "Shall I reveal the selections?")}
                        </div>

                        <div className={`relative w-40 h-56 md:w-56 md:h-72 transition-all duration-500 transform origin-right ${isCasting ? 'animate-wand-flick' : ''} ${isCartJoyful ? 'animate-owl-hop' : ''}`}>
                            <div className="absolute top-[25%] left-[25%] w-1 h-3 pointer-events-none z-10">
                                {isCasting && magicSparks.map((spark) => (
                                    <div
                                        key={spark.id}
                                        className="absolute w-2 h-2 bg-yellow-400 rounded-full shadow-[0_0_8px_#FACC15] animate-magic-spark-enhanced"
                                        style={{
                                            '--tw-translate-x': `${spark.x}px`,
                                            '--tw-translate-y': `${spark.y}px`,
                                            animationDelay: `${Math.random() * 0.2}s`
                                        } as any}
                                    />
                                ))}
                            </div>

                            <Image
                                src="/images/avatars/master_waiter.png"
                                alt="The Master of Ceremonies"
                                fill
                                priority
                                className="object-contain animate-float mix-blend-multiply brightness-110 contrast-125 saturate-100"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Action Tray */}
            <div className={`fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-100 w-[95vw] max-w-md transition-all duration-500 transform ${basket.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
                <div className="bg-[#3D2329] text-[#EFE7D9] p-2 rounded-full shadow-2xl flex items-center justify-between pl-6 border border-[#D43425]/20">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold tracking-widest uppercase text-[#C9A227]">Selected Plates</span>
                        <span className="font-bold text-lg">{basket.length} {basket.length === 1 ? 'Delicacy' : 'Delicacies'}</span>
                    </div>
                    <button
                        onClick={executeOrder}
                        disabled={executing}
                        className="bg-[#D43425] px-8 py-4 rounded-full font-black text-xs uppercase tracking-[0.3em] hover:bg-[#EFE7D9] hover:text-[#D43425] transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                        {executing ? 'Sending...' : 'Execute Order'}
                    </button>
                </div>
            </div>

            <div className="h-24 md:h-32" />
        </main>
    );
}
