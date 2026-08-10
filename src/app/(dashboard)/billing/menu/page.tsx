'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: string;
    isAvailable: boolean;
    isVeg: boolean;
    description?: string;
}

export default function BillingMenuPage() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCat, setSelectedCat] = useState<string>('ALL');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(16);

    // Single Add/Edit Modal
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [formSaving, setFormSaving] = useState(false);

    // CSV Import Modal
    const [showImportModal, setShowImportModal] = useState(false);
    const [csvText, setCsvText] = useState('');
    const [importing, setImporting] = useState(false);
    const [previewCount, setPreviewCount] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form fields
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [categoryInput, setCategoryInput] = useState('Main Course');
    const [isVeg, setIsVeg] = useState(true);
    const [description, setDescription] = useState('');

    // Inline price editing
    const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
    const [inlinePrice, setInlinePrice] = useState<string>('');

    const fetchMenu = useCallback(async () => {
        try {
            const res = await fetch('/api/manager/menu');
            const data = await res.json();

            if (!res.ok || !data.success) {
                const altRes = await fetch(`/api/menu?t=${Date.now()}`);
                const altData = await altRes.json();
                if (altData.success && altData.items) {
                    setItems(altData.items);
                    const cats = Array.from(new Set(altData.items.map((i: any) => i.category))) as string[];
                    setCategories(cats.sort());
                }
                return;
            }

            const rawItems = data.items || data.menuItems || [];
            const mapped: MenuItem[] = rawItems.map((i: any) => ({
                id: i.id,
                name: i.name,
                price: Number(i.price),
                category: typeof i.category === 'object' ? (i.category?.name || 'General') : (i.category || 'General'),
                isAvailable: i.isAvailable ?? true,
                isVeg: Boolean(i.isVeg),
                description: i.description,
            }));

            setItems(mapped);
            const cats = Array.from(new Set(mapped.map(i => i.category))) as string[];
            cats.sort();
            setCategories(cats);
        } catch (err) {
            console.error('[BILLING_MENU]', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchMenu();
    }, [fetchMenu]);

    const handleToggleAvailability = async (item: MenuItem) => {
        const newStatus = !item.isAvailable;
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, isAvailable: newStatus } : i));

        try {
            const res = await fetch('/api/manager/menu', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: item.id, isAvailable: newStatus }),
            });
            if (!res.ok) fetchMenu();
        } catch {
            fetchMenu();
        }
    };

    const handleInlinePriceSave = async (id: string) => {
        const newPrice = parseFloat(inlinePrice);
        if (isNaN(newPrice) || newPrice < 0) {
            setInlineEditingId(null);
            return;
        }

        setItems(prev => prev.map(i => i.id === id ? { ...i, price: newPrice } : i));
        setInlineEditingId(null);

        try {
            await fetch('/api/manager/menu', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, price: newPrice }),
            });
            setNotification('Price updated successfully');
        } catch {
            fetchMenu();
        }
    };

    const openAddModal = () => {
        setEditingItem(null);
        setName('');
        setPrice('');
        setCategoryInput(categories[0] || 'Main Course');
        setIsVeg(true);
        setDescription('');
        setShowModal(true);
    };

    const openEditModal = (item: MenuItem) => {
        setEditingItem(item);
        setName(item.name);
        setPrice(String(item.price));
        setCategoryInput(item.category);
        setIsVeg(item.isVeg);
        setDescription(item.description || '');
        setShowModal(true);
    };

    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !price) return;

        // Client-side duplicate check
        const trimmedName = name.trim().toLowerCase();
        const isDuplicate = items.some(item => 
            item.name.toLowerCase() === trimmedName && item.id !== editingItem?.id
        );

        if (isDuplicate) {
            setNotification(`Dish named "${name.trim()}" already exists in menu!`);
            return;
        }

        setFormSaving(true);

        try {
            const payload = {
                id: editingItem?.id,
                name: name.trim(),
                price: parseFloat(price),
                category: categoryInput.trim(),
                isVeg,
                description: description.trim(),
            };

            const res = await fetch('/api/manager/menu', {
                method: editingItem ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setNotification(editingItem ? 'Item updated successfully' : 'New dish added');
                setShowModal(false);
                fetchMenu();
            } else {
                setNotification(data.error || 'Failed to save dish');
            }
        } catch {
            setNotification('Network error. Please try again.');
        } finally {
            setFormSaving(false);
        }
    };

    const handleDeleteItem = async (id: string, itemName: string) => {
        if (!confirm(`Are you sure you want to delete "${itemName}"?`)) return;
        try {
            const res = await fetch(`/api/manager/menu?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setNotification(`Deleted "${itemName}"`);
                setItems(prev => prev.filter(i => i.id !== id));
            }
        } catch {
            setNotification('Failed to delete dish');
        }
    };

    // Export Menu to CSV
    const exportToCSV = () => {
        const headers = ['name', 'category', 'price', 'type', 'description'];
        const rows = items.map(i => [
            `"${i.name.replace(/"/g, '""')}"`,
            `"${i.category.replace(/"/g, '""')}"`,
            i.price,
            i.isVeg ? 'veg' : 'non-veg',
            `"${(i.description || '').replace(/"/g, '""')}"`
        ].join(','));

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `menu_export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // CSV Sample Download
    const downloadSampleCSV = () => {
        const sample = `name,category,price,type,description
Butter Chicken,Main Course,320,non-veg,Tender chicken simmered in creamy tomato gravy
Paneer Butter Masala,Main Course,280,veg,Cottage cheese cubes in rich tomato gravy
Dal Makhani,Main Course,220,veg,Slow cooked black lentils with cream
Garlic Naan,Breads,60,veg,Fresh tandoori naan brushed with garlic butter
Chicken Biryani,Rice & Biryani,350,non-veg,Hyderabadi style Dum Biryani
Masala Dosa,South Indian,140,veg,Crispy rice crepe filled with spiced potato
Virgin Mojito,Beverages,120,veg,Refreshing mint lime cooler
Gulab Jamun,Desserts,90,veg,Warm sweet khoya dumplings in syrup`;

        const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'hotelpro_menu_sample.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // CSV File Select
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            if (text) {
                setCsvText(text);
                const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
                setPreviewCount(Math.max(0, lines.length - 1));
            }
        };
        reader.readAsText(file);
    };

    // CSV Bulk Import
    const handleBulkImport = async () => {
        if (!csvText.trim()) return;
        setImporting(true);

        try {
            const res = await fetch('/api/manager/menu/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csvData: csvText }),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setNotification(`Imported ${data.itemsCreated || previewCount} dishes & ${data.categoriesCreated || 0} categories`);
                setShowImportModal(false);
                setCsvText('');
                setPreviewCount(0);
                fetchMenu();
            } else {
                setNotification(data.error || 'Import failed. Check CSV format.');
            }
        } catch {
            setNotification('CSV Import Error. Try again.');
        } finally {
            setImporting(false);
        }
    };

    // Filtered Items
    const isNameDuplicate = useMemo(() => {
        const trimmed = name.trim().toLowerCase();
        if (!trimmed) return false;
        return items.some(item => 
            item.name.toLowerCase() === trimmed && item.id !== editingItem?.id
        );
    }, [name, items, editingItem]);

    const filtered = useMemo(() => {
        return items.filter(item => {
            const catMatch = selectedCat === 'ALL' || item.category === selectedCat;
            const searchMatch = !search || item.name.toLowerCase().includes(search.toLowerCase());
            return catMatch && searchMatch;
        });
    }, [items, selectedCat, search]);

    // Metrics Stats
    const metrics = useMemo(() => {
        const vegCount = items.filter(i => i.isVeg).length;
        const nonVegCount = items.filter(i => !i.isVeg).length;
        const inStockCount = items.filter(i => i.isAvailable).length;
        const outOfStockCount = items.filter(i => !i.isAvailable).length;
        return { total: items.length, veg: vegCount, nonVeg: nonVegCount, inStock: inStockCount, outOfStock: outOfStockCount };
    }, [items]);

    // Paginated Items
    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filtered.slice(start, start + itemsPerPage);
    }, [filtered, currentPage, itemsPerPage]);

    if (!mounted) return null;

    return (
        <div className="h-full bg-[#F8F9FA] flex flex-col overflow-hidden font-sans text-zinc-800">

            {/* TOP HEADER */}
            <header className="shrink-0 bg-white border-b border-zinc-200/80 px-6 md:px-8 py-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Menu Manager</h1>
                        <p className="text-xs text-zinc-500 font-normal mt-0.5">
                            Manage your restaurant menu items, categories and availability
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        {/* Export (Excel) */}
                        <button
                            onClick={exportToCSV}
                            className="px-3.5 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-2xs flex items-center gap-2"
                        >
                            <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Export (Excel)</span>
                        </button>

                        {/* Bulk Import (CSV) */}
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="px-4 py-2 bg-[#065F46] hover:bg-[#044E39] text-white rounded-lg text-xs font-semibold tracking-wide transition-all shadow-2xs flex items-center gap-2"
                        >
                            <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Bulk Import (CSV)</span>
                        </button>

                        {/* Add Dish */}
                        <button
                            onClick={openAddModal}
                            className="px-4 py-2 bg-[#065F46] hover:bg-[#044E39] text-white rounded-lg text-xs font-semibold tracking-wide transition-all shadow-2xs flex items-center gap-1.5"
                        >
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Add Dish</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* NOTIFICATION TOAST */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="mx-6 md:mx-8 mt-4 bg-zinc-900 text-white rounded-xl px-4 py-3 text-xs font-medium flex items-center justify-between shrink-0 shadow-lg"
                        onAnimationComplete={() => setTimeout(() => setNotification(null), 3000)}
                    >
                        <span>{notification}</span>
                        <button onClick={() => setNotification(null)} className="text-zinc-400 hover:text-white text-sm">✕</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MAIN CONTENT AREA */}
            <main className="grow overflow-y-auto px-6 md:px-8 py-6 space-y-5 no-scrollbar pb-24 md:pb-8">

                {/* METRICS STATS CARDS GRID */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">

                    {/* Total Dishes */}
                    <div className="bg-white border border-zinc-200/80 rounded-xl p-4 flex items-center gap-3.5 shadow-2xs">
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xl font-bold text-zinc-900 leading-none">{metrics.total}</p>
                            <p className="text-[11px] font-medium text-zinc-500 mt-1">Total Dishes</p>
                        </div>
                    </div>

                    {/* Veg Dishes */}
                    <div className="bg-white border border-zinc-200/80 rounded-xl p-4 flex items-center gap-3.5 shadow-2xs">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <span className="w-4 h-4 border-2 border-emerald-600 flex items-center justify-center rounded-2xs">
                                <span className="w-2 h-2 bg-emerald-600 rounded-full" />
                            </span>
                        </div>
                        <div>
                            <p className="text-xl font-bold text-zinc-900 leading-none">{metrics.veg}</p>
                            <p className="text-[11px] font-medium text-zinc-500 mt-1">Veg Dishes</p>
                        </div>
                    </div>

                    {/* Non-Veg Dishes */}
                    <div className="bg-white border border-zinc-200/80 rounded-xl p-4 flex items-center gap-3.5 shadow-2xs">
                        <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                            <span className="w-4 h-4 border-2 border-rose-600 flex items-center justify-center rounded-2xs">
                                <span className="w-2 h-2 bg-rose-600 rounded-full" />
                            </span>
                        </div>
                        <div>
                            <p className="text-xl font-bold text-zinc-900 leading-none">{metrics.nonVeg}</p>
                            <p className="text-[11px] font-medium text-zinc-500 mt-1">Non-Veg Dishes</p>
                        </div>
                    </div>

                    {/* In Stock */}
                    <div className="bg-white border border-zinc-200/80 rounded-xl p-4 flex items-center gap-3.5 shadow-2xs">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xl font-bold text-zinc-900 leading-none">{metrics.inStock}</p>
                            <p className="text-[11px] font-medium text-zinc-500 mt-1">In Stock</p>
                        </div>
                    </div>

                    {/* Out of Stock */}
                    <div className="bg-white border border-zinc-200/80 rounded-xl p-4 flex items-center gap-3.5 shadow-2xs">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xl font-bold text-zinc-900 leading-none">{metrics.outOfStock}</p>
                            <p className="text-[11px] font-medium text-zinc-500 mt-1">Out of Stock</p>
                        </div>
                    </div>
                </div>

                {/* SEARCH & FILTER BAR */}
                <div className="bg-white border border-zinc-200/80 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">

                    {/* Search Input */}
                    <div className="relative flex-1 w-full">
                        <svg className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search dishes by name..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="w-full h-9 pl-9 pr-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-normal text-zinc-800 placeholder:text-zinc-400 outline-none focus:bg-white focus:border-zinc-300 transition-all"
                        />
                    </div>

                    {/* Category Dropdown & Filter Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto no-scrollbar py-0.5">

                        {/* Dropdown for All Categories */}
                        <select
                            value={selectedCat}
                            onChange={(e) => { setSelectedCat(e.target.value); setCurrentPage(1); }}
                            className="h-9 bg-zinc-50 border border-zinc-200 rounded-lg px-3 text-xs font-medium text-zinc-700 outline-none cursor-pointer focus:border-zinc-300 shrink-0"
                        >
                            <option value="ALL">All Categories</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        {/* Category Pills */}
                        <button
                            onClick={() => { setSelectedCat('ALL'); setCurrentPage(1); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${selectedCat === 'ALL' ? 'bg-[#065F46] text-white font-semibold' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80'}`}
                        >
                            All ({items.length})
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => { setSelectedCat(cat); setCurrentPage(1); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${selectedCat === cat ? 'bg-[#065F46] text-white font-semibold' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80'}`}
                            >
                                {cat}
                            </button>
                        ))}

                        {/* Filter Button */}
                        <button className="h-9 px-3 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-all flex items-center gap-1.5 shrink-0 ml-1">
                            <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            <span>Filter</span>
                        </button>
                    </div>
                </div>

                {/* DISH CARDS GRID */}
                {loading ? (
                    <div className="py-20 flex items-center justify-center">
                        <div className="w-7 h-7 border-2 border-zinc-200 border-t-[#065F46] rounded-full animate-spin" />
                    </div>
                ) : paginatedItems.length === 0 ? (
                    <div className="bg-white border border-zinc-200/80 rounded-xl py-16 text-center">
                        <p className="text-xs font-medium text-zinc-500 mb-3">No menu items match your search or filter.</p>
                        <button
                            onClick={() => { setSelectedCat('ALL'); setSearch(''); }}
                            className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold"
                        >
                            Reset Filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {paginatedItems.map((item) => (
                            <div
                                key={item.id}
                                className={`bg-white border rounded-xl p-4.5 transition-all flex flex-col justify-between hover:border-zinc-300 shadow-2xs ${item.isAvailable ? 'border-zinc-200/80' : 'border-zinc-200/50 bg-zinc-50/50'}`}
                            >
                                <div>
                                    {/* Category & Availability Status Badge */}
                                    <div className="flex items-center justify-between mb-2.5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                            {item.category}
                                        </span>

                                        <button
                                            onClick={() => handleToggleAvailability(item)}
                                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${item.isAvailable ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-zinc-100 text-zinc-500 border border-zinc-200'}`}
                                        >
                                            {item.isAvailable ? 'IN STOCK' : 'OUT OF STOCK'}
                                        </button>
                                    </div>

                                    {/* Dish Name */}
                                    <h3 className="text-sm font-bold text-zinc-900 leading-snug mb-1">{item.name}</h3>

                                    {/* Price with Inline Edit */}
                                    {inlineEditingId === item.id ? (
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <span className="text-xs font-bold text-zinc-800">₹</span>
                                            <input
                                                type="number"
                                                autoFocus
                                                value={inlinePrice}
                                                onChange={(e) => setInlinePrice(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleInlinePriceSave(item.id);
                                                    if (e.key === 'Escape') setInlineEditingId(null);
                                                }}
                                                className="w-20 h-7 bg-zinc-50 border border-zinc-300 rounded px-2 text-xs font-bold outline-none"
                                            />
                                            <button
                                                onClick={() => handleInlinePriceSave(item.id)}
                                                className="px-2 py-1 bg-[#065F46] text-white text-[10px] font-bold rounded"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <p className="text-base font-bold text-zinc-900">₹{item.price.toLocaleString('en-IN')}</p>
                                            <button
                                                onClick={() => { setInlineEditingId(item.id); setInlinePrice(String(item.price)); }}
                                                className="text-zinc-400 hover:text-zinc-600 p-0.5 rounded"
                                                title="Quick edit price"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}

                                    {/* Description */}
                                    {item.description && (
                                        <p className="text-xs text-zinc-400 mt-1.5 font-normal leading-relaxed line-clamp-2">{item.description}</p>
                                    )}
                                </div>

                                {/* Bottom Row: Veg/Non-Veg & Action Buttons */}
                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-100">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                                        <span className="text-xs font-medium text-zinc-600">{item.isVeg ? 'Veg' : 'Non-Veg'}</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {/* Edit Button */}
                                        <button
                                            onClick={() => openEditModal(item)}
                                            className="w-7 h-7 rounded-lg border border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50 flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors"
                                            title="Edit Dish"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => handleDeleteItem(item.id, item.name)}
                                            className="w-7 h-7 rounded-lg border border-rose-200/60 bg-rose-50/30 hover:bg-rose-50 flex items-center justify-center text-rose-500 hover:text-rose-700 transition-colors"
                                            title="Delete Dish"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* PAGINATION FOOTER */}
                {filtered.length > 0 && (
                    <div className="bg-white border border-zinc-200/80 rounded-xl px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium text-zinc-500 shadow-2xs">
                        <div>
                            Showing <span className="font-semibold text-zinc-800">{Math.min((currentPage - 1) * itemsPerPage + 1, filtered.length)}</span> to{' '}
                            <span className="font-semibold text-zinc-800">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of{' '}
                            <span className="font-semibold text-zinc-800">{filtered.length}</span> dishes
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 disabled:opacity-40 transition-all"
                            >
                                ‹
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-8 h-8 rounded-lg font-semibold transition-all ${currentPage === page ? 'bg-[#065F46] text-white' : 'border border-zinc-200 hover:bg-zinc-50 text-zinc-700'}`}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 disabled:opacity-40 transition-all"
                            >
                                ›
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <select
                                value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="h-8 bg-zinc-50 border border-zinc-200 rounded-lg px-2 text-xs font-medium text-zinc-700 outline-none cursor-pointer"
                            >
                                <option value={16}>16 per page</option>
                                <option value={32}>32 per page</option>
                                <option value={64}>64 per page</option>
                            </select>
                        </div>
                    </div>
                )}

            </main>

            {/* BULK IMPORT MODAL */}
            <AnimatePresence>
                {showImportModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
                        onClick={() => setShowImportModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-zinc-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-bold text-zinc-900">Bulk Import Menu (CSV / Excel)</h3>
                                <button onClick={downloadSampleCSV} className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold transition-all">
                                    Download Sample CSV
                                </button>
                            </div>
                            <p className="text-xs text-zinc-500 mb-4">Upload a .csv file or paste raw CSV text to bulk import dishes in 1 second.</p>

                            <div className="space-y-3 my-4">
                                <input type="file" accept=".csv,.txt" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-5 border-2 border-dashed border-zinc-200 hover:border-[#065F46] rounded-xl bg-zinc-50 hover:bg-emerald-50/30 text-center transition-all"
                                >
                                    <svg className="w-8 h-8 text-zinc-400 mx-auto mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <p className="text-xs font-semibold text-zinc-700">Click to Upload CSV / Excel File</p>
                                    <p className="text-[11px] text-zinc-400 mt-0.5">Accepts columns: name, category, price, type, description</p>
                                </button>

                                <textarea
                                    rows={4}
                                    placeholder={`name,category,price,type,description\nButter Chicken,Main Course,320,non-veg,Creamy chicken gravy`}
                                    value={csvText}
                                    onChange={(e) => {
                                        setCsvText(e.target.value);
                                        const lines = e.target.value.trim().split('\n').filter(l => l.trim().length > 0);
                                        setPreviewCount(Math.max(0, lines.length - 1));
                                    }}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-mono outline-none focus:border-zinc-400"
                                />

                                {previewCount > 0 && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs font-semibold text-emerald-800 flex items-center justify-between">
                                        <span>Dishes detected in CSV:</span>
                                        <span className="bg-[#065F46] text-white px-2.5 py-0.5 rounded-full text-xs font-bold">{previewCount} Items</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setShowImportModal(false)} className="flex-1 py-2.5 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-semibold">
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBulkImport}
                                    disabled={importing || !csvText.trim()}
                                    className="flex-1 py-2.5 bg-[#065F46] hover:bg-[#044E39] text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                                >
                                    {importing ? 'Importing...' : '1-Click Import Menu'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SINGLE ADD / EDIT MODAL */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-zinc-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-base font-bold text-zinc-900 mb-1">{editingItem ? 'Edit Dish' : 'Add New Dish'}</h3>
                            <p className="text-xs text-zinc-500 mb-4">Specify dish details for your billing terminal.</p>

                            <form onSubmit={handleSaveItem} className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Dish Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Butter Chicken"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className={`w-full h-9 bg-zinc-50 border ${isNameDuplicate ? 'border-red-500 bg-red-50/20 text-red-900' : 'border-zinc-200 focus:border-zinc-400'} rounded-lg px-3 text-xs outline-none transition-all`}
                                    />
                                    {isNameDuplicate && (
                                        <p className="text-[11px] font-bold text-red-600 mt-1">
                                            Dish "{name.trim()}" already exists in menu!
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Price (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="250"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-full h-9 bg-zinc-50 border border-zinc-200 rounded-lg px-3 text-xs outline-none focus:border-zinc-400"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Category</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Main Course, Starters, Beverages"
                                        value={categoryInput}
                                        onChange={(e) => setCategoryInput(e.target.value)}
                                        className="w-full h-9 bg-zinc-50 border border-zinc-200 rounded-lg px-3 text-xs outline-none focus:border-zinc-400"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Description (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Tender chicken in creamy tomato gravy"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full h-9 bg-zinc-50 border border-zinc-200 rounded-lg px-3 text-xs outline-none focus:border-zinc-400"
                                    />
                                </div>

                                <div className="flex items-center justify-between py-1">
                                    <label className="text-xs font-semibold text-zinc-700">Dietary Type</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsVeg(true)}
                                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${isVeg ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-600'}`}
                                        >
                                            • Veg
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsVeg(false)}
                                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${!isVeg ? 'bg-rose-600 text-white' : 'bg-zinc-100 text-zinc-600'}`}
                                        >
                                            • Non-Veg
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-semibold">
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={formSaving || isNameDuplicate}
                                        className="flex-1 py-2.5 bg-[#065F46] text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer"
                                    >
                                        {formSaving ? 'Saving...' : (editingItem ? 'Update' : 'Add Dish')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
