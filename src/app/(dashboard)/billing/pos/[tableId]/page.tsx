'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// Types
// ============================================

interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: string;
    isAvailable: boolean;
    isVeg: boolean;
}

interface CartItem {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    isVeg: boolean;
}

interface TableInfo {
    id: string;
    tableCode: string;
    capacity: number;
    status: string;
    section?: string;
}

interface RestaurantSettings {
    businessName: string;
    gstin?: string;
    gstRate: number;
    currencySymbol: string;
}

export default function BillingTablePage() {
    const { tableId } = useParams();
    const router = useRouter();

    const [table, setTable] = useState<TableInfo | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [settings, setSettings] = useState<RestaurantSettings | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [billing, setBilling] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [mounted, setMounted] = useState(false);

    // GST & Discount controls
    const [enableGst, setEnableGst] = useState(true);
    const [customGstRate, setCustomGstRate] = useState<number>(5);
    const [discountType, setDiscountType] = useState<'NONE' | 'PERCENT' | 'FLAT'>('NONE');
    const [discountVal, setDiscountVal] = useState<string>('');

    const searchRef = useRef<HTMLInputElement>(null);

    const fetchData = useCallback(async () => {
        try {
            const [menuRes, tablesRes, settingsRes] = await Promise.all([
                fetch('/api/menu'),
                fetch(`/api/tables?t=${Date.now()}`),
                fetch('/api/settings'),
            ]);
            const [menuData, tablesData, settingsData] = await Promise.all([
                menuRes.json(), tablesRes.json(), settingsRes.json(),
            ]);

            if (menuData.success && menuData.items) {
                const items: MenuItem[] = menuData.items
                    .filter((i: Record<string, unknown>) => i.isAvailable)
                    .map((i: Record<string, unknown>) => ({
                        id: String(i.id),
                        name: String(i.name),
                        price: Number(i.price),
                        category: typeof i.category === 'object' ? (i.category as { name?: string })?.name || 'General' : String(i.category || 'General'),
                        isAvailable: Boolean(i.isAvailable),
                        isVeg: Boolean(i.isVeg),
                    }));
                setMenuItems(items);
                const cats = Array.from(new Set(items.map(i => i.category))) as string[];
                cats.sort();
                setCategories(cats);
            }

            let matchedTable: Record<string, unknown> | null = null;
            if (tablesData.success) {
                const rawParam = decodeURIComponent((tableId as string) || '').trim();
                const t = tablesData.tables?.find((tb: Record<string, unknown>) => 
                    tb.id === tableId || 
                    tb.tableCode === tableId || 
                    tb.tableCode === rawParam || 
                    (tb.tableCode as string)?.toLowerCase() === rawParam.toLowerCase()
                );
                if (t) {
                    matchedTable = t;
                    setTable({ id: String(t.id), tableCode: String(t.tableCode), capacity: Number(t.capacity), status: String(t.status), section: t.section as string | undefined });
                }
            }

            if (settingsData.settings) {
                const s = settingsData.settings;
                setSettings({
                    businessName: s.businessName || 'Shalu Dhaba',
                    gstin: s.gstin,
                    gstRate: Number(s.gstRate || 5),
                    currencySymbol: s.currencySymbol || '₹',
                });
                setCustomGstRate(Number(s.gstRate || 5));
            }

            // Order & Draft Restoration Workflow
            if (typeof window !== 'undefined') {
                const urlParams = new URLSearchParams(window.location.search);
                const editOrderId = urlParams.get('orderId');

                if (editOrderId) {
                    // Explicit order edit request
                    const orderRes = await fetch(`/api/orders/${editOrderId}`);
                    const orderData = await orderRes.json();
                    if (orderData.success && orderData.order) {
                        const o = orderData.order;
                        if (o.customerName) setCustomerName(o.customerName);
                        if (o.customerPhone) setCustomerPhone(o.customerPhone);
                        if (o.items && o.items.length > 0) {
                            const preloadedCart = o.items.map((i: Record<string, unknown>) => ({
                                menuItemId: String(i.menuItemId),
                                name: String(i.itemName || i.name || 'Menu Item'),
                                price: Number(i.priceSnapshot || i.price || 0),
                                quantity: Number(i.quantity || 1),
                                isVeg: true,
                            }));
                            setCart(preloadedCart);
                        }
                    }
                } else if (matchedTable && matchedTable.orders && (matchedTable.orders as Record<string, unknown>[]).length > 0) {
                    // Table has an active DB order ("View Bill" scenario) — load order snapshot items
                    const activeOrder = (matchedTable.orders as Record<string, unknown>[])[0];
                    if (activeOrder.customerName) setCustomerName(String(activeOrder.customerName));
                    if (activeOrder.customerPhone) setCustomerPhone(String(activeOrder.customerPhone));
                    if (activeOrder.items && (activeOrder.items as Record<string, unknown>[]).length > 0) {
                        const preloadedCart = (activeOrder.items as Record<string, unknown>[]).map((i: Record<string, unknown>) => ({
                            menuItemId: String(i.menuItemId),
                            name: String(i.itemName || i.name || 'Menu Item'),
                            price: Number(i.priceSnapshot || i.price || 0),
                            quantity: Number(i.quantity || 1),
                            isVeg: true,
                        }));
                        setCart(preloadedCart);
                    }
                } else if (tableId) {
                    // Load persistent table draft if available
                    try {
                        const effectiveId = matchedTable?.id || tableId;
                        const savedCart = localStorage.getItem(`hotelpro_draft_cart_${effectiveId}`) || localStorage.getItem(`hotelpro_draft_cart_${tableId}`);
                        if (savedCart) {
                            const parsed = JSON.parse(savedCart);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                setCart(parsed);
                            }
                        }
                        const savedCust = localStorage.getItem(`hotelpro_draft_cust_${effectiveId}`) || localStorage.getItem(`hotelpro_draft_cust_${tableId}`);
                        if (savedCust) {
                            const parsedCust = JSON.parse(savedCust);
                            if (parsedCust.customerName) setCustomerName(parsedCust.customerName);
                            if (parsedCust.customerPhone) setCustomerPhone(parsedCust.customerPhone);
                        }
                    } catch (e) {
                        console.error('Failed to load table draft', e);
                    }
                }
            }
        } catch (err) {
            console.error('[BILLING_TABLE]', err);
        } finally {
            setLoading(false);
        }
    }, [tableId]);

    useEffect(() => {
        setMounted(true);
        fetchData();
    }, [fetchData]);

    // Auto-save table draft whenever cart or customer details change
    useEffect(() => {
        if (!mounted || !tableId || loading) return;
        try {
            if (cart.length > 0) {
                localStorage.setItem(`hotelpro_draft_cart_${tableId}`, JSON.stringify(cart));
                localStorage.setItem(`hotelpro_draft_cust_${tableId}`, JSON.stringify({ customerName, customerPhone }));
            } else {
                localStorage.removeItem(`hotelpro_draft_cart_${tableId}`);
                localStorage.removeItem(`hotelpro_draft_cust_${tableId}`);
            }
        } catch (e) {
            console.error('Failed to save table draft', e);
        }
    }, [cart, customerName, customerPhone, tableId, mounted, loading]);

    // Handler to clear and reset the current table bill
    const handleResetCart = () => {
        if (cart.length === 0) return;
        if (typeof window !== 'undefined' && window.confirm('Are you sure you want to reset and clear this table bill?')) {
            setCart([]);
            setCustomerName('');
            setCustomerPhone('');
            setDiscountType('NONE');
            setDiscountVal('');
            if (tableId) {
                localStorage.removeItem(`hotelpro_draft_cart_${tableId}`);
                localStorage.removeItem(`hotelpro_draft_cust_${tableId}`);
            }
            setNotification('Table bill cleared and reset.');
        }
    };

    // ── Cart Logic (Smart Merging: No Duplicates!) ──

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existingIndex = prev.findIndex(c => c.menuItemId === item.id);
            if (existingIndex > -1) {
                const updated = [...prev];
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    quantity: updated[existingIndex].quantity + 1,
                };
                return updated;
            }
            return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, isVeg: item.isVeg }];
        });
    };

    const updateQty = (menuItemId: string, delta: number) => {
        setCart(prev => {
            const updated = prev.map(c => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c);
            return updated.filter(c => c.quantity > 0);
        });
    };

    const getQty = (menuItemId: string) => cart.find(c => c.menuItemId === menuItemId)?.quantity || 0;

    // ── Bill Calculations with Round-off ──

    const subtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

    const parsedDiscountVal = parseFloat(discountVal);
    const isNegativeDiscount = discountType !== 'NONE' && (parsedDiscountVal < 0);
    const isInvalidPercent = discountType === 'PERCENT' && (parsedDiscountVal > 100);
    const isExcessFlatDiscount = discountType === 'FLAT' && (parsedDiscountVal > subtotal);
    const isNegativeGst = enableGst && (customGstRate < 0);

    const discountAmount = useMemo(() => {
        const val = parseFloat(discountVal) || 0;
        if (val < 0) return 0; // Negative discount cannot increase bill or alter subtotal
        if (discountType === 'PERCENT') {
            const pct = Math.min(100, Math.max(0, val));
            return Math.round((subtotal * pct / 100) * 100) / 100;
        }
        if (discountType === 'FLAT') {
            return Math.min(subtotal, Math.max(0, val));
        }
        return 0;
    }, [subtotal, discountType, discountVal]);

    const afterDiscountSubtotal = Math.max(0, subtotal - discountAmount);

    const gstRate = (enableGst && customGstRate >= 0) ? customGstRate : 0;
    const gstAmount = Math.round((afterDiscountSubtotal * gstRate / 100) * 100) / 100;
    const cgstAmount = Math.round((gstAmount / 2) * 100) / 100;
    const sgstAmount = Math.round((gstAmount / 2) * 100) / 100;

    const rawGrandTotal = Math.max(0, afterDiscountSubtotal + gstAmount);
    const grandTotal = Math.round(rawGrandTotal);
    const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

    const cartCount = cart.reduce((a, b) => a + b.quantity, 0);
    const sym = settings?.currencySymbol || '₹';

    // ── Filtered Items ──

    const filtered = useMemo(() => {
        return menuItems.filter(item => {
            const catMatch = activeCategory === 'ALL' || item.category === activeCategory;
            const searchMatch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
            return catMatch && searchMatch;
        });
    }, [menuItems, activeCategory, searchQuery]);

    const billingRef = useRef(false);

    // ── Direct Billing Action ──

    const generateBill = useCallback(async () => {
        if (cart.length === 0 || billingRef.current) return;

        if (isNegativeDiscount) {
            setNotification('Error: Discount amount cannot be negative');
            return;
        }
        if (isInvalidPercent) {
            setNotification('Error: Discount percentage cannot exceed 100%');
            return;
        }
        if (isExcessFlatDiscount) {
            setNotification(`Error: Discount cannot exceed subtotal (${sym}${subtotal})`);
            return;
        }
        if (isNegativeGst) {
            setNotification('Error: GST rate cannot be negative');
            return;
        }

        billingRef.current = true;
        setBilling(true);
        try {
            const effectiveId = table?.id || tableId;
            const payload = {
                tableId: effectiveId,
                customerName: customerName || 'Walk-in Guest',
                customerPhone: customerPhone || undefined,
                paymentMethod,
                items: cart.map(c => ({
                    menuItemId: c.menuItemId,
                    quantity: c.quantity,
                })),
                discountAmount,
                taxAmount: gstAmount,
                cgstAmount,
                sgstAmount,
                grandTotal,
                directBill: true,
            };

            const res = await fetch('/api/orders/direct-bill', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (data.success) {
                if (typeof window !== 'undefined') {
                    if (tableId) localStorage.removeItem(`hotelpro_draft_cart_${tableId}`);
                    if (table?.id) localStorage.removeItem(`hotelpro_draft_cart_${table.id}`);
                    if (tableId) localStorage.removeItem(`hotelpro_draft_cust_${tableId}`);
                    if (table?.id) localStorage.removeItem(`hotelpro_draft_cust_${table.id}`);
                }
                router.push(`/billing/pos/${effectiveId}/bill/${data.orderId}`);
            } else {
                setNotification(data.error || 'Failed to generate bill');
                billingRef.current = false;
            }
        } catch {
            setNotification('Network error. Please try again.');
            billingRef.current = false;
        } finally {
            setBilling(false);
        }
    }, [cart, tableId, table?.id, customerName, customerPhone, paymentMethod, discountAmount, gstAmount, cgstAmount, sgstAmount, grandTotal, router, isNegativeDiscount, isInvalidPercent, isExcessFlatDiscount, isNegativeGst, subtotal, sym]);

    // ── Option 5: Keyboard Shortcuts (Enter / Ctrl+P to Print & Direct Bill) ──

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey && (e.key === 'p' || e.key === 'P')) || (e.key === 'Enter' && e.ctrlKey)) {
                e.preventDefault();
                e.stopPropagation();
                if (!billingRef.current && cart.length > 0) {
                    generateBill();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [generateBill, cart.length]);

    if (!mounted) return null;

    if (loading) return (
        <div className="h-full flex items-center justify-center bg-[#F8F9FA]">
            <div className="flex flex-col items-center gap-3">
                <div className="w-7 h-7 border-2 border-zinc-200 border-t-[#065F46] rounded-full animate-spin" />
                <span className="text-xs font-medium text-zinc-500">Loading Billing Terminal...</span>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col md:flex-row bg-[#F8F9FA] overflow-hidden font-sans text-zinc-800">

            {/* NOTIFICATION TOAST */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white px-5 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-3"
                    >
                        <span>{notification}</span>
                        <button onClick={() => setNotification(null)} className="text-zinc-400 hover:text-white text-sm">✕</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── LEFT: MENU ITEMS GRID ── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Header */}
                <div className="px-6 py-4 bg-white border-b border-zinc-200/80 shrink-0">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push('/billing/pos')}
                                className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200 transition-all shrink-0"
                                title="Back to POS"
                            >
                                ‹
                            </button>
                            <div>
                                <h1 className="text-lg font-bold text-zinc-900 tracking-tight leading-none">
                                    {settings?.businessName || 'Shalu Dhaba'} — Table {table?.tableCode || '...'}
                                </h1>
                                <p className="text-xs text-zinc-500 mt-1 font-normal flex items-center gap-2">
                                    <span>Fast Billing Mode</span>
                                    <span className="hidden sm:inline-block px-1.5 py-0.5 bg-zinc-100 rounded text-[10px] font-mono text-zinc-600 border border-zinc-200">Shortcut: Ctrl + P</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            {table?.section && (
                                <span className="px-2 py-1 bg-zinc-100 text-zinc-700 text-xs font-semibold rounded-md border border-zinc-200">
                                    {table.section}
                                </span>
                            )}
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md border border-emerald-200/60">
                                Table {table?.tableCode}
                            </span>
                        </div>
                    </div>

                    {/* Search & Category Filter */}
                    <div className="flex flex-col sm:flex-row gap-2.5">
                        <div className="relative flex-1">
                            <svg className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                ref={searchRef}
                                type="text"
                                placeholder="Search dish name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-9 pl-9 pr-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-800 placeholder:text-zinc-400 outline-none focus:bg-white focus:border-zinc-300 transition-all"
                            />
                        </div>

                        <div className="flex overflow-x-auto no-scrollbar gap-1.5 py-0.5">
                            <button
                                onClick={() => setActiveCategory('ALL')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeCategory === 'ALL' ? 'bg-[#065F46] text-white font-semibold' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80'}`}
                            >
                                All Dishes ({menuItems.length})
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-[#065F46] text-white font-semibold' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* FAST DISH SELECTION GRID */}
                <div className="flex-1 overflow-y-auto px-6 py-5 no-scrollbar pb-36 md:pb-6">
                    {filtered.length === 0 ? (
                        <div className="bg-white border border-zinc-200/80 rounded-xl py-16 text-center">
                            <p className="text-xs font-medium text-zinc-500">No matching dishes found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                            {filtered.map((item) => {
                                const qty = getQty(item.id);
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => addToCart(item)}
                                        className={`bg-white border rounded-xl p-3.5 cursor-pointer transition-all flex flex-col justify-between hover:border-zinc-300 shadow-2xs group relative select-none ${
                                            qty > 0 ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10' : 'border-zinc-200/80'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                                        {item.category}
                                                    </span>
                                                </div>

                                                {qty > 0 && (
                                                    <span className="bg-[#065F46] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                                                        {qty} in cart
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="text-sm font-bold text-zinc-900 leading-snug mb-1 group-hover:text-[#065F46] transition-colors">
                                                {item.name}
                                            </h3>

                                            <p className="text-base font-bold text-zinc-900 mt-1">
                                                {sym}{item.price.toLocaleString('en-IN')}
                                            </p>
                                        </div>

                                        <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between">
                                            {qty > 0 ? (
                                                <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => updateQty(item.id, -1)}
                                                        className="w-7 h-7 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-md flex items-center justify-center text-sm"
                                                    >
                                                        −
                                                    </button>
                                                    <span className="flex-1 text-center font-bold text-xs">{qty}</span>
                                                    <button
                                                        onClick={() => addToCart(item)}
                                                        className="w-7 h-7 bg-[#065F46] hover:bg-[#044E39] text-white font-bold rounded-md flex items-center justify-center text-sm"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                                                    className="w-full py-1.5 bg-zinc-50 hover:bg-[#065F46] hover:text-white text-zinc-700 text-xs font-semibold rounded-lg border border-zinc-200 transition-all text-center"
                                                >
                                                    + Add to Bill
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── RIGHT: BILL SUMMARY & CART (DESKTOP) ── */}
            <aside className="hidden md:flex flex-col w-80 lg:w-96 bg-white border-l border-zinc-200/80 shrink-0">
                <div className="px-5 py-4 border-b border-zinc-200/80 flex items-center justify-between gap-2">
                    <div>
                        <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">Current Bill</h2>
                        <p className="text-xs text-zinc-500 font-normal mt-0.5">
                            Table {table?.tableCode} · {cartCount} items selected
                        </p>
                    </div>

                    {cart.length > 0 && (
                        <button
                            onClick={handleResetCart}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200/80 transition-all flex items-center gap-1 shrink-0"
                            title="Reset and clear all items for this table bill"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Reset Bill</span>
                        </button>
                    )}
                </div>

                {/* CART ITEMS LIST */}
                <div className="flex-1 overflow-y-auto px-5 py-4 no-scrollbar space-y-2.5">
                    {cart.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-xs font-medium text-zinc-400">No items added to bill yet.</p>
                            <p className="text-[11px] text-zinc-400 mt-1">Tap any dish from the menu to add.</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.menuItemId} className="bg-zinc-50 border border-zinc-200/60 rounded-xl p-3 flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                                        <span className="text-xs font-bold text-zinc-900 truncate block">{item.name}</span>
                                    </div>
                                    <span className="text-[11px] font-medium text-zinc-500 mt-0.5 block">
                                        {sym}{item.price} × {item.quantity} = {sym}{(item.price * item.quantity).toLocaleString('en-IN')}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => updateQty(item.menuItemId, -1)}
                                        className="w-6 h-6 rounded bg-white border border-zinc-200 text-zinc-600 font-bold text-xs flex items-center justify-center hover:bg-zinc-100"
                                    >
                                        −
                                    </button>
                                    <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                                    <button
                                        onClick={() => addToCart({ id: item.menuItemId, name: item.name, price: item.price, category: '', isAvailable: true, isVeg: item.isVeg })}
                                        className="w-6 h-6 rounded bg-[#065F46] text-white font-bold text-xs flex items-center justify-center hover:bg-[#044E39]"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* TAX, DISCOUNT & TOTAL BREAKDOWN */}
                {cart.length > 0 && (
                    <div className="border-t border-zinc-200/80 p-5 bg-white space-y-3">

                        {/* GST & Discount Controls */}
                        <div className="space-y-2 pb-2 border-b border-zinc-100">
                            {/* GST Toggle */}
                            <div className="flex items-center justify-between text-xs">
                                <label className="font-semibold text-zinc-700 flex items-center gap-1.5">
                                    <span>Include GST Tax</span>
                                    <input
                                        type="checkbox"
                                        checked={enableGst}
                                        onChange={(e) => setEnableGst(e.target.checked)}
                                        className="w-3.5 h-3.5 accent-[#065F46]"
                                    />
                                </label>
                                {enableGst && (
                                    <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-600">
                                        <span>Rate:</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={customGstRate}
                                            onChange={(e) => setCustomGstRate(Number(e.target.value))}
                                            className={`w-12 h-6 border rounded px-1 text-center font-bold outline-none ${
                                                isNegativeGst ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-zinc-200'
                                            }`}
                                        />
                                        <span>%</span>
                                    </div>
                                )}
                            </div>

                            {/* Discount Selector */}
                            <div className="flex items-center justify-between text-xs gap-2">
                                <span className="font-semibold text-zinc-700 shrink-0">Discount:</span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => { setDiscountType('NONE'); setDiscountVal(''); }}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${discountType === 'NONE' ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-600'}`}
                                    >
                                        None
                                    </button>
                                    <button
                                        onClick={() => setDiscountType('PERCENT')}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${discountType === 'PERCENT' ? 'bg-[#065F46] text-white' : 'bg-zinc-100 text-zinc-600'}`}
                                    >
                                        %
                                    </button>
                                    <button
                                        onClick={() => setDiscountType('FLAT')}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${discountType === 'FLAT' ? 'bg-[#065F46] text-white' : 'bg-zinc-100 text-zinc-600'}`}
                                    >
                                        ₹ Flat
                                    </button>
                                </div>
                            </div>

                            {discountType !== 'NONE' && (
                                <div>
                                    <input
                                        type="number"
                                        min="0"
                                        max={discountType === 'PERCENT' ? '100' : subtotal}
                                        placeholder={discountType === 'PERCENT' ? 'Discount % (e.g. 10)' : 'Flat Discount ₹ (e.g. 50)'}
                                        value={discountVal}
                                        onChange={(e) => setDiscountVal(e.target.value)}
                                        className={`w-full h-8 bg-zinc-50 border rounded-lg px-2.5 text-xs font-medium outline-none transition-all ${
                                            isNegativeDiscount || isInvalidPercent || isExcessFlatDiscount
                                                ? 'border-rose-500 text-rose-700 bg-rose-50/40 focus:border-rose-600'
                                                : 'border-zinc-200 focus:border-zinc-300'
                                        }`}
                                    />
                                    {isNegativeDiscount && (
                                        <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                                            <span></span> Discount cannot be negative
                                        </p>
                                    )}
                                    {isInvalidPercent && !isNegativeDiscount && (
                                        <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                                            <span></span> Discount percentage cannot exceed 100%
                                        </p>
                                    )}
                                    {isExcessFlatDiscount && !isNegativeDiscount && (
                                        <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                                            <span></span> Discount cannot exceed subtotal ({sym}{subtotal.toLocaleString('en-IN')})
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Breakdown Totals */}
                        <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between text-zinc-600">
                                <span>Subtotal</span>
                                <span className="font-bold text-zinc-900">{sym}{subtotal.toLocaleString('en-IN')}</span>
                            </div>

                            {discountAmount > 0 && (
                                <div className="flex justify-between text-emerald-700 font-medium">
                                    <span>Discount ({discountType === 'PERCENT' ? `${discountVal}%` : `₹${discountVal}`})</span>
                                    <span>- {sym}{discountAmount.toLocaleString('en-IN')}</span>
                                </div>
                            )}

                            {enableGst && gstAmount > 0 && (
                                <>
                                    <div className="flex justify-between text-zinc-500 text-[11px]">
                                        <span>CGST ({(customGstRate / 2).toFixed(1)}%)</span>
                                        <span className="font-semibold">{sym}{cgstAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-zinc-500 text-[11px]">
                                        <span>SGST ({(customGstRate / 2).toFixed(1)}%)</span>
                                        <span className="font-semibold">{sym}{sgstAmount.toFixed(2)}</span>
                                    </div>
                                </>
                            )}

                            {roundOff !== 0 && (
                                <div className="flex justify-between text-zinc-500 text-[11px]">
                                    <span>Round Off</span>
                                    <span className="font-semibold">{roundOff > 0 ? `+${sym}${roundOff.toFixed(2)}` : `-${sym}${Math.abs(roundOff).toFixed(2)}`}</span>
                                </div>
                            )}

                            <div className="h-px bg-zinc-200 my-1" />

                            <div className="flex justify-between items-baseline pt-1">
                                <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Grand Total</span>
                                <span className="text-xl font-bold text-zinc-900">{sym}{grandTotal.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        {/* Payment Method Selector */}
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                            {(['CASH', 'UPI', 'CARD'] as const).map(m => (
                                <button
                                    key={m}
                                    onClick={() => setPaymentMethod(m)}
                                    className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                        paymentMethod === m ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                    }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>

                        {/* Customer Info (Name + Optional Mobile) */}
                        <div className="space-y-1.5">
                            <input
                                type="text"
                                placeholder="Customer Name (Optional)"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="w-full h-8 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 text-xs font-medium outline-none focus:border-zinc-300"
                            />
                            <input
                                type="tel"
                                placeholder="Customer Mobile No. (Optional)"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                className="w-full h-8 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 text-xs font-medium outline-none focus:border-zinc-300 font-mono"
                            />
                        </div>

                        {/* Direct Bill & Print Button */}
                        <button
                            onClick={generateBill}
                            disabled={billing || cart.length === 0 || isNegativeDiscount || isInvalidPercent || isExcessFlatDiscount || isNegativeGst}
                            className="w-full py-3 bg-[#065F46] hover:bg-[#044E39] text-white font-bold text-xs rounded-lg tracking-wide transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-2xs"
                        >
                            {billing ? 'Generating Bill...' : `Print & Direct Bill (${sym}${grandTotal.toLocaleString('en-IN')})`}
                        </button>
                    </div>
                )}
            </aside>

            {/* MOBILE STICKY BAR */}
            {cartCount > 0 && (
                <div className="md:hidden fixed bottom-16 left-4 right-4 z-40 bg-zinc-900 text-white rounded-2xl p-4 shadow-xl flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold">{cartCount} Items Selected</p>
                        <p className="text-base font-bold text-emerald-400">{sym}{grandTotal.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleResetCart}
                            className="px-3 py-2 bg-rose-900/80 hover:bg-rose-900 text-rose-200 text-xs font-bold rounded-xl border border-rose-700/50"
                        >
                            Reset
                        </button>
                        <button
                            onClick={generateBill}
                            disabled={billing || isNegativeDiscount || isInvalidPercent || isExcessFlatDiscount || isNegativeGst}
                            className="px-4 py-2.5 bg-[#065F46] text-white text-xs font-bold rounded-xl disabled:opacity-50"
                        >
                            {billing ? 'Processing...' : 'Direct Bill'}
                        </button>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
