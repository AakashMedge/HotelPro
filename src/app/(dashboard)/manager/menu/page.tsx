
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type Category = { id: string; name: string; isActive: boolean };
type ModifierOption = { id?: string; name: string; price: number };
type ModifierGroup = { id: string; name: string; minSelection: number; maxSelection?: number; options: ModifierOption[] };
type MenuItemVariant = { id?: string; name: string; price: number };
type MenuItem = {
    id: string;
    name: string;
    description: string;
    price: number;
    isAvailable: boolean;
    isVeg: boolean;
    category: Category | null;
    imageUrl: string | null;
    variants: MenuItemVariant[];
    modifierGroups: { modifierGroupId: string; modifierGroup: ModifierGroup }[];
    // New fields
    isChefSpecial?: boolean;
    isGlutenFree?: boolean;
    specialPrice?: number;
    isSpecialPriceActive?: boolean;
    specialPriceStart?: string | null;
    specialPriceEnd?: string | null;
};

export default function MenuManagerPage() {
    const [activeTab, setActiveTab] = useState<'items' | 'collections' | 'modifiers'>('items');
    const [data, setData] = useState<{ items: MenuItem[], categories: Category[], modifierGroups: ModifierGroup[] }>({ items: [], categories: [], modifierGroups: [] });
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [showDeleted, setShowDeleted] = useState(false);

    // Modals
    const [showAddItem, setShowAddItem] = useState(false);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [showAddModifier, setShowAddModifier] = useState(false);

    // Form States (Add Dish)
    const [itemForm, setItemForm] = useState({
        name: '', description: '', price: '', isVeg: true, categoryId: '',
        imageUrl: '',
        isChefSpecial: false,
        isGlutenFree: false,
        specialPrice: '',
        isSpecialPriceActive: false,
        specialPriceStart: '17:00',
        specialPriceEnd: '19:00',
        variants: [] as MenuItemVariant[],
        modifierGroupIds: [] as string[]
    });

    // Navigation & Interaction
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all'>('all');
    const [managerSearch, setManagerSearch] = useState('');
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });

    // Advanced Matrix Filters
    const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
    const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'out'>('all');
    const [specialsOnly, setSpecialsOnly] = useState(false);
    const [healthFilter, setHealthFilter] = useState<'all' | 'missing-image' | 'missing-desc'>('all');

    // Form States (Modifier Group)
    const [modGroupForm, setModGroupForm] = useState({
        name: '', minSelection: 0, maxSelection: null as number | null,
        options: [] as ModifierOption[]
    });

    // Helper to fetch all data
    const refreshData = async () => {
        try {
            const res = await fetch(`/api/manager/menu?includeDeleted=${showDeleted}`);
            const json = await res.json();
            if (json.success) setData(json);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { refreshData(); }, [showDeleted]);

    // --- Actions ---

    const handleSubmitItem = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = editingItem ? 'PATCH' : 'POST';
            const payload = editingItem ? { ...itemForm, id: editingItem.id } : itemForm;
            const isPatch = method === 'PATCH';
            const itemId = (payload as any).id;

            if (isPatch && !itemId) {
                console.error("[MANAGER_MENU] PATCH attempted without ID");
                alert("Critical Error: Missing entry ID in ledger.");
                return;
            }

            const res = await fetch('/api/manager/menu', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const json = await res.json();

            if (res.ok) {
                console.log(`[MANAGER_MENU] ${method} successful`);
                setShowAddItem(false);
                setEditingItem(null);
                refreshData();
                setItemForm({
                    name: '', description: '', price: '', isVeg: true, categoryId: '', imageUrl: '',
                    isChefSpecial: false, isGlutenFree: false,
                    specialPrice: '', isSpecialPriceActive: false,
                    specialPriceStart: '17:00', specialPriceEnd: '19:00',
                    variants: [], modifierGroupIds: []
                });
            } else {
                console.error(`[MANAGER_MENU] ${method} failed:`, json);
                alert(`Ledger Error: ${json.error || 'The terminal rejected this entry.'}`);
            }
        } catch (e) {
            console.error("[MANAGER_MENU] Network error:", e);
            alert("Connection to the digital ledger failed.");
        }
    };

    const handleCreateModifierGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fetch('/api/manager/modifiers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(modGroupForm)
            });
            setShowAddModifier(false);
            refreshData();
            setModGroupForm({ name: '', minSelection: 0, maxSelection: null, options: [] });
        } catch (e) { console.error(e); }
    };

    const handleToggleAvailability = async (id: string, current: boolean) => {
        // Optimistic UI
        setData(prev => ({
            ...prev,
            items: prev.items.map(i => i.id === id ? { ...i, isAvailable: !current } : i)
        }));
        await fetch('/api/manager/menu', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, isAvailable: !current })
        });
    };

    const handleRestoreItem = async (id: string) => {
        await fetch('/api/manager/menu', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, restore: true })
        });
        refreshData();
    };

    const handleDeleteModifierGroup = async (id: string) => {
        if (!confirm("Remove this modifier group permanently?")) return;
        await fetch(`/api/manager/modifiers?id=${id}`, { method: 'DELETE' });
        refreshData();
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm("Are you sure? This will hide the item from the menu.")) return;
        setData(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
        await fetch(`/api/manager/menu?id=${id}`, { method: 'DELETE' });
    };

    const handleToggleCategory = async (id: string, current: boolean) => {
        setData(prev => ({ ...prev, categories: prev.categories.map(c => c.id === id ? { ...c, isActive: !current } : c) }));
        await fetch('/api/manager/categories', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, isActive: !current })
        });
    };

    const handleCreateCategory = async (name: string) => {
        await fetch('/api/manager/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        setShowAddCategory(false);
        refreshData();
    };

    const handleUploadCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const csvData = event.target?.result as string;
            if (!csvData) return;

            setLoading(true);
            try {
                const res = await fetch('/api/manager/menu/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ csvData })
                });
                const json = await res.json();
                if (json.success) {
                    alert(`Success! Created ${json.itemsCreated} items and ${json.categoriesCreated} categories.`);
                    refreshData();
                } else {
                    alert(`Upload Error: ${json.error}`);
                }
            } catch (err) {
                console.error(err);
                alert("Matrix connection failed during upload.");
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    const TabButton = ({ id, label }: { id: typeof activeTab, label: string }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`px-8 py-3.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 rounded-2xl ${activeTab === id
                ? 'bg-zinc-900 text-white shadow-xl shadow-zinc-200'
                : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50'
                }`}
        >
            {label}
        </button>
    );

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F8F7] gap-4">
            <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em]">Synchronizing Menu Matrix</p>
        </div>
    );

    const activeCategoryItems = selectedCategoryId === 'all'
        ? data.items.filter(i => {
            const matchesSearch = i.name.toLowerCase().includes(managerSearch.toLowerCase()) || i.id.toLowerCase().includes(managerSearch.toLowerCase());
            const matchesPrice = (!priceRange.min || i.price >= Number(priceRange.min)) && (!priceRange.max || i.price <= Number(priceRange.max));
            const matchesDiet = dietaryFilter === 'all' ? true : (dietaryFilter === 'veg' ? i.isVeg : !i.isVeg);
            const matchesStock = stockFilter === 'all' ? true : (stockFilter === 'in' ? i.isAvailable : !i.isAvailable);
            const matchesSpecials = specialsOnly ? i.isChefSpecial : true;
            const matchesHealth = healthFilter === 'all' ? true : (healthFilter === 'missing-image' ? !i.imageUrl : !i.description);
            return matchesSearch && matchesPrice && matchesDiet && matchesStock && matchesSpecials && matchesHealth;
        })
        : data.items.filter(i => {
            const matchesCategory = i.category?.id === selectedCategoryId;
            const matchesSearch = i.name.toLowerCase().includes(managerSearch.toLowerCase()) || i.id.toLowerCase().includes(managerSearch.toLowerCase());
            const matchesPrice = (!priceRange.min || i.price >= Number(priceRange.min)) && (!priceRange.max || i.price <= Number(priceRange.max));
            const matchesDiet = dietaryFilter === 'all' ? true : (dietaryFilter === 'veg' ? i.isVeg : !i.isVeg);
            const matchesStock = stockFilter === 'all' ? true : (stockFilter === 'in' ? i.isAvailable : !i.isAvailable);
            const matchesSpecials = specialsOnly ? i.isChefSpecial : true;
            const matchesHealth = healthFilter === 'all' ? true : (healthFilter === 'missing-image' ? !i.imageUrl : !i.description);
            return matchesCategory && matchesSearch && matchesPrice && matchesDiet && matchesStock && matchesSpecials && matchesHealth;
        });

    const selectedCategoryName = selectedCategoryId === 'all' ? 'Universal Inventory' : (data.categories.find(c => c.id === selectedCategoryId)?.name || 'Selected Category');

    return (
        <div className="h-screen flex flex-col bg-[#F8F8F7] font-sans selection:bg-zinc-900 selection:text-white overflow-hidden">
            {/* 1. TOP COMMAND BAR */}
            <header className="h-20 shrink-0 bg-white border-b border-zinc-100 flex items-center justify-between px-8 z-20">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center shadow-lg shadow-zinc-200">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2v20M2 12h20" /></svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Menu Console</h1>
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest -mt-1">Architect v2.0</p>
                    </div>
                </div>

                <div className="flex bg-zinc-50 p-1 rounded-2xl border border-zinc-100">
                    <button onClick={() => setActiveTab('items')} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'items' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>Inventory</button>
                    <button onClick={() => setActiveTab('modifiers')} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'modifiers' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>Modifiers</button>
                    <button onClick={() => setActiveTab('collections')} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'collections' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>Collections</button>
                </div>

                <div className="flex items-center gap-3">
                    <label className="bg-zinc-900 text-white px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-xl shadow-zinc-200 flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                        Upload CSV
                        <input type="file" accept=".csv" className="hidden" onChange={handleUploadCSV} />
                    </label>
                    <button onClick={() => setShowAddItem(true)} className="bg-white border border-zinc-100 text-zinc-900 px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all font-bold">
                        + New Entry
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* 2. CATEGORY SIDEBAR */}
                <aside className="w-72 shrink-0 bg-white border-r border-zinc-100 flex flex-col z-10">
                    <div className="p-6 pb-2">
                        <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em] mb-4 pl-1">Navigator</p>
                        <div className="relative mb-6">
                            <input
                                type="text"
                                placeholder="Search collection..."
                                className="w-full bg-zinc-50 border-none rounded-2xl p-4 pl-11 text-[11px] font-bold placeholder:text-zinc-300 focus:ring-2 focus:ring-zinc-100 transition-all"
                            />
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar px-3 space-y-1">
                        <button
                            onClick={() => setSelectedCategoryId('all')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${selectedCategoryId === 'all' ? 'bg-zinc-900 text-white shadow-xl shadow-zinc-200' : 'text-zinc-600 hover:bg-zinc-100'}`}
                        >
                            <span className="text-[11px] font-black uppercase tracking-tight">Total Menu</span>
                            <span className={`text-[10px] font-black transition-opacity ${selectedCategoryId === 'all' ? 'opacity-60' : 'opacity-30'}`}>{data.items.length}</span>
                        </button>

                        <div className="h-4" />

                        {data.categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${selectedCategoryId === cat.id ? 'bg-zinc-900 text-white shadow-xl shadow-zinc-200' : 'text-zinc-600 hover:bg-zinc-100'}`}
                            >
                                <span className="text-[11px] font-black uppercase tracking-tight truncate pr-4">{cat.name}</span>
                                <span className={`text-[10px] font-black transition-opacity ${selectedCategoryId === cat.id ? 'opacity-60' : 'opacity-30'}`}>{data.items.filter(i => i.category?.id === cat.id).length}</span>
                            </button>
                        ))}
                    </div>

                    <div className="p-4 mt-auto">
                        <button onClick={() => setShowAddCategory(true)} className="w-full py-4 border-2 border-dashed border-zinc-100 rounded-2xl text-[10px] font-black uppercase text-zinc-300 hover:border-zinc-200 hover:text-zinc-400 transition-all">
                            + Add Section
                        </button>
                    </div>
                </aside>

                {/* 3. MAIN TERMINAL */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {activeTab === 'items' && (
                        <>
                            {/* Terminal Header */}
                            <div className="shrink-0 bg-white/50 backdrop-blur-md border-b border-zinc-100 p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-black text-zinc-900 truncate max-w-[300px]">{selectedCategoryName}</h2>
                                        <div className="w-1 h-1 bg-zinc-200 rounded-full" />
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{activeCategoryItems.length} Registry Entries</p>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="SKU or Entry Name..."
                                                value={managerSearch}
                                                onChange={e => setManagerSearch(e.target.value)}
                                                className="w-64 bg-white border border-zinc-100 rounded-xl p-3 pl-10 text-xs font-bold shadow-sm focus:ring-2 focus:ring-zinc-100 transition-all font-sans"
                                            />
                                            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                        </div>

                                        <button
                                            onClick={() => setShowDeleted(!showDeleted)}
                                            className={`p-3 rounded-xl transition-all ${showDeleted ? 'bg-zinc-900 text-white shadow-lg' : 'bg-white border border-zinc-100 text-zinc-300 hover:text-zinc-500'}`}
                                            title="Archive Toggle"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" /></svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Matrix Filter Control Strip */}
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex bg-zinc-100 p-1 rounded-xl gap-1">
                                        {(['all', 'veg', 'non-veg'] as const).map(f => (
                                            <button
                                                key={f}
                                                onClick={() => setDietaryFilter(f)}
                                                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${dietaryFilter === f
                                                        ? f === 'veg' ? 'bg-emerald-500 text-white shadow-lg' : f === 'non-veg' ? 'bg-rose-500 text-white shadow-lg' : 'bg-white text-zinc-900 shadow-sm'
                                                        : 'text-zinc-400 hover:text-zinc-600'
                                                    }`}
                                            >
                                                {f === 'veg' ? 'Only Veg' : f === 'non-veg' ? 'Only Non-Veg' : 'Diet: All'}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex bg-zinc-100 p-1 rounded-xl gap-1">
                                        {(['all', 'in', 'out'] as const).map(f => (
                                            <button key={f} onClick={() => setStockFilter(f)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${stockFilter === f ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>
                                                {f === 'in' ? 'In Stock' : f === 'out' ? 'Stock Out' : 'Status: All'}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => setSpecialsOnly(!specialsOnly)}
                                        className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all flex items-center gap-2 ${specialsOnly ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-white border border-zinc-100 text-zinc-400 hover:bg-zinc-50'}`}
                                    >
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill={specialsOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="3"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" /></svg>
                                        Chef Specials
                                    </button>

                                    <div className="h-4 w-px bg-zinc-100 mx-2" />

                                    <div className="flex items-center gap-3">
                                        <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">Health:</span>
                                        <select
                                            value={healthFilter}
                                            onChange={e => setHealthFilter(e.target.value as any)}
                                            className="bg-transparent border-none text-[9px] font-black uppercase text-zinc-500 focus:ring-0 cursor-pointer hover:text-zinc-900 transition-all p-0"
                                        >
                                            <option value="all">Complete Menu</option>
                                            <option value="missing-image">Pending Items (No Image)</option>
                                            <option value="missing-desc">Action Required (No Desc)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Terminal Content */}
                            <div className="flex-1 overflow-y-auto p-8 no-scrollbar scroll-smooth">
                                <div className="max-w-6xl mx-auto">
                                    {activeCategoryItems.length === 0 ? (
                                        <div className="py-32 text-center">
                                            <div className="w-16 h-16 bg-zinc-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D1D1D1" strokeWidth="2"><path d="M12 2v20M2 12h20" /></svg>
                                            </div>
                                            <h3 className="text-zinc-900 font-bold text-lg mb-1">Zero Results Found</h3>
                                            <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Adjustment to search parameters required</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {activeCategoryItems.map(item => (
                                                <MenuItemCard
                                                    key={item.id}
                                                    item={item}
                                                    onToggle={() => handleToggleAvailability(item.id, item.isAvailable)}
                                                    onRestore={() => handleRestoreItem(item.id)}
                                                    onDelete={() => handleDeleteItem(item.id)}
                                                    onEdit={() => {
                                                        setEditingItem(item);
                                                        setItemForm({
                                                            name: item.name,
                                                            description: item.description || '',
                                                            price: item.price.toString(),
                                                            isVeg: item.isVeg,
                                                            categoryId: item.category?.id || '',
                                                            imageUrl: item.imageUrl || '',
                                                            isChefSpecial: item.isChefSpecial || false,
                                                            isGlutenFree: item.isGlutenFree || false,
                                                            specialPrice: item.specialPrice?.toString() || '',
                                                            isSpecialPriceActive: item.isSpecialPriceActive || false,
                                                            specialPriceStart: item.specialPriceStart || '17:00',
                                                            specialPriceEnd: item.specialPriceEnd || '19:00',
                                                            variants: item.variants,
                                                            modifierGroupIds: item.modifierGroups.map(m => m.modifierGroupId)
                                                        });
                                                        setShowAddItem(true);
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'modifiers' && (
                        <div className="flex-1 overflow-y-auto p-12 no-scrollbar">
                            <div className="max-w-5xl mx-auto space-y-12">
                                <div className="flex justify-between items-end mb-12">
                                    <div>
                                        <h2 className="text-3xl font-black text-zinc-900 tracking-tighter">Modifier Logic</h2>
                                        <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Appendage & Customization Modules</p>
                                    </div>
                                    <button onClick={() => setShowAddModifier(true)} className="bg-zinc-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-zinc-200">
                                        + Create Group
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {data.modifierGroups.map(group => (
                                        <div key={group.id} className="bg-white rounded-[2.5rem] p-8 border border-zinc-100 shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-zinc-100/50 transition-all duration-500">
                                            <div className="flex justify-between items-start mb-8">
                                                <div>
                                                    <h4 className="font-bold text-zinc-800 text-lg tracking-tight mb-1">{group.name}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">REQS: {group.minSelection}-{group.maxSelection || '∞'} UNITS</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteModifierGroup(group.id)} className="opacity-0 group-hover:opacity-100 transition-all text-zinc-200 hover:text-rose-500">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {group.options.map(opt => (
                                                    <div key={opt.id} className="text-[10px] bg-zinc-50/50 p-4 rounded-2xl flex justify-between font-black text-zinc-500 border border-zinc-100/50 uppercase tracking-tight">
                                                        <span>{opt.name}</span>
                                                        <span className="text-zinc-900">+₹{opt.price}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'collections' && (
                        <div className="flex-1 overflow-y-auto p-12 no-scrollbar">
                            <div className="max-w-xl mx-auto">
                                <div className="bg-white p-12 rounded-[3.5rem] shadow-xl shadow-zinc-100/50 border border-zinc-100">
                                    <div className="text-center mb-12">
                                        <h3 className="text-3xl font-black text-zinc-900 tracking-tighter mb-2">Collection Registry</h3>
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Global Visibility Management Controls</p>
                                    </div>
                                    <div className="space-y-3">
                                        {data.categories.map(cat => (
                                            <div key={cat.id} className="flex items-center justify-between p-6 bg-zinc-50/50 rounded-[2rem] border border-zinc-100 transition-hover hover:scale-[1.02] duration-300">
                                                <span className="font-bold text-zinc-800 tracking-tight uppercase text-xs">{cat.name}</span>
                                                <button onClick={() => handleToggleCategory(cat.id, cat.isActive)} className={`w-12 h-7 flex items-center rounded-full p-1 transition-all duration-300 ${cat.isActive ? 'bg-zinc-900 shadow-lg shadow-zinc-200' : 'bg-zinc-200'}`}>
                                                    <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-all duration-300 ${cat.isActive ? 'translate-x-5' : ''}`} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => setShowAddCategory(true)} className="w-full mt-10 py-6 border-2 border-dashed border-zinc-100 rounded-[2rem] text-zinc-300 font-black uppercase tracking-widest text-[9px] hover:border-zinc-300 hover:text-zinc-400 transition-all">
                                        + Append New Section
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* MODALS */}
            {/* ADD / EDIT DISH MODAL */}
            <AnimatePresence>
                {showAddItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xl transition-all duration-500">
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-[#F8F8F7] rounded-[3.5rem] p-12 w-full max-w-2xl shadow-[0_40px_100px_rgba(0,0,0,0.2)] max-h-[90vh] overflow-y-auto no-scrollbar relative border border-white/20">
                            <button onClick={() => { setShowAddItem(false); setEditingItem(null); setItemForm({ name: '', description: '', price: '', isVeg: true, categoryId: '', imageUrl: '', isChefSpecial: false, isGlutenFree: false, specialPrice: '', isSpecialPriceActive: false, specialPriceStart: '17:00', specialPriceEnd: '19:00', variants: [], modifierGroupIds: [] }); }} className="absolute top-10 right-10 text-zinc-300 hover:text-zinc-900 transition-colors p-2 hover:bg-zinc-100 rounded-full">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>

                            <div className="mb-10">
                                <h3 className="text-4xl font-bold text-zinc-900 tracking-tight leading-none mb-2">{editingItem ? 'Refine Entry' : 'Dish Architect'}</h3>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em]">Operational Menu Definition</p>
                            </div>

                            <form onSubmit={handleSubmitItem} className="space-y-10">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Dish Identity</label>
                                        <input required className="w-full bg-white border border-zinc-100 p-5 rounded-3xl font-semibold shadow-sm focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all outline-none" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} placeholder="e.g. Signature Risotto" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Base Price (₹)</label>
                                        <input required type="number" className="w-full bg-white border border-zinc-100 p-5 rounded-3xl font-semibold shadow-sm focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all outline-none" value={itemForm.price} onChange={e => setItemForm({ ...itemForm, price: e.target.value })} placeholder="499" />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Composition Summary</label>
                                    <textarea className="w-full bg-white border border-zinc-100 p-5 rounded-3xl text-sm font-medium shadow-sm focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all outline-none" rows={3} value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} placeholder="Tell the culinary story of this item..." />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Gallery Resource (URL)</label>
                                    <input className="w-full bg-white border border-zinc-100 p-5 rounded-3xl font-semibold text-sm shadow-sm focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all outline-none" value={itemForm.imageUrl} onChange={e => setItemForm({ ...itemForm, imageUrl: e.target.value })} placeholder="https://images.unsplash.com/..." />
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Target Collection</label>
                                        <select className="w-full bg-white border border-zinc-100 p-5 rounded-3xl font-semibold text-sm shadow-sm focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all outline-none appearance-none" value={itemForm.categoryId} onChange={e => setItemForm({ ...itemForm, categoryId: e.target.value })}>
                                            <option value="">-- No Collection --</option>
                                            {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setItemForm({ ...itemForm, isVeg: true })} className={`flex-1 py-4 rounded-2xl text-[9px] font-bold uppercase tracking-widest transition-all ${itemForm.isVeg ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white border border-zinc-100 text-zinc-400'}`}>VEG</button>
                                            <button type="button" onClick={() => setItemForm({ ...itemForm, isVeg: false })} className={`flex-1 py-4 rounded-2xl text-[9px] font-bold uppercase tracking-widest transition-all ${!itemForm.isVeg ? 'bg-rose-600 text-white shadow-lg shadow-rose-100' : 'bg-white border border-zinc-100 text-zinc-400'}`}>PROTEIN</button>
                                        </div>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setItemForm({ ...itemForm, isChefSpecial: !itemForm.isChefSpecial })} className={`flex-1 py-4 rounded-2xl text-[9px] font-bold uppercase tracking-widest transition-all ${itemForm.isChefSpecial ? 'bg-amber-400 text-white shadow-lg' : 'bg-white border border-zinc-100 text-zinc-400'}`}>Bestseller</button>
                                            <button type="button" onClick={() => setItemForm({ ...itemForm, isGlutenFree: !itemForm.isGlutenFree })} className={`flex-1 py-4 rounded-2xl text-[9px] font-bold uppercase tracking-widest transition-all ${itemForm.isGlutenFree ? 'bg-sky-500 text-white shadow-lg' : 'bg-white border border-zinc-100 text-zinc-400'}`}>Gluten Free</button>
                                        </div>
                                    </div>
                                </div>

                                {/* HAPPY HOUR / SPECIAL PRICING */}
                                <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-8">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-900">Dynamic Pricing Schedule</h4>
                                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1.5">Automated Happy Hour / Flash Pricing</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setItemForm(p => ({ ...p, isSpecialPriceActive: !p.isSpecialPriceActive }))}
                                            className={`w-14 h-8 flex items-center rounded-full p-1 transition-all duration-300 ${itemForm.isSpecialPriceActive ? 'bg-zinc-900' : 'bg-zinc-200'}`}
                                        >
                                            <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-all duration-300 ${itemForm.isSpecialPriceActive ? 'translate-x-6' : ''}`} />
                                        </button>
                                    </div>

                                    {itemForm.isSpecialPriceActive && (
                                        <div className="grid grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                            <div className="space-y-3 col-span-2">
                                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Scheduled Discounted Price (₹)</label>
                                                <input type="number" className="w-full bg-zinc-50 border border-zinc-100 p-5 rounded-3xl font-bold text-zinc-900 focus:ring-2 focus:ring-zinc-200 transition-all outline-none" value={itemForm.specialPrice} onChange={e => setItemForm({ ...itemForm, specialPrice: e.target.value })} placeholder="e.g. 299" />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Start Window</label>
                                                <input type="time" className="w-full bg-zinc-50 border border-zinc-100 p-5 rounded-3xl font-bold text-sm" value={itemForm.specialPriceStart} onChange={e => setItemForm({ ...itemForm, specialPriceStart: e.target.value })} />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">End Window</label>
                                                <input type="time" className="w-full bg-zinc-50 border border-zinc-100 p-5 rounded-3xl font-bold text-sm" value={itemForm.specialPriceEnd} onChange={e => setItemForm({ ...itemForm, specialPriceEnd: e.target.value })} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* VARIANTS EDITOR */}
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Dimension Variations (e.g. Size)</label>
                                        <button type="button" onClick={() => setItemForm(p => ({ ...p, variants: [...p.variants, { name: '', price: 0 }] }))} className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest bg-white px-4 py-2 rounded-xl shadow-sm border border-zinc-100 hover:bg-zinc-50 transition-all">Add Option</button>
                                    </div>
                                    <div className="space-y-3">
                                        {itemForm.variants.map((v, i) => (
                                            <div key={i} className="flex gap-4 animate-in slide-in-from-left-4 duration-300">
                                                <input required className="flex-[3] bg-white border border-zinc-100 p-4 rounded-2xl text-xs font-bold shadow-sm" value={v.name} onChange={e => {
                                                    const next = [...itemForm.variants]; next[i].name = e.target.value; setItemForm({ ...itemForm, variants: next });
                                                }} placeholder="Option Label (e.g. Full)" />
                                                <input required type="number" className="flex-1 bg-white border border-zinc-100 p-4 rounded-2xl text-xs font-bold shadow-sm text-right font-mono" value={v.price} onChange={e => {
                                                    const next = [...itemForm.variants]; next[i].price = Number(e.target.value); setItemForm({ ...itemForm, variants: next });
                                                }} placeholder="₹" />
                                                <button type="button" onClick={() => setItemForm(p => ({ ...p, variants: p.variants.filter((_, idx) => idx !== i) }))} className="p-4 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ADD-ONS PICKER */}
                                <div className="space-y-6">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Compatible Modifier Groups</label>
                                    <div className="flex flex-wrap gap-2.5">
                                        {data.modifierGroups.map(g => (
                                            <button
                                                key={g.id}
                                                type="button"
                                                onClick={() => {
                                                    const exists = itemForm.modifierGroupIds.includes(g.id);
                                                    setItemForm(p => ({
                                                        ...p,
                                                        modifierGroupIds: exists
                                                            ? p.modifierGroupIds.filter(id => id !== g.id)
                                                            : [...p.modifierGroupIds, g.id]
                                                    }));
                                                }}
                                                className={`px-6 py-4 rounded-2xl border text-[11px] font-bold tracking-tight transition-all duration-300 ${itemForm.modifierGroupIds.includes(g.id) ? 'bg-zinc-900 border-zinc-900 text-white shadow-xl' : 'bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200'}`}
                                            >{g.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-6 pt-10 sticky bottom-0 bg-[#F8F8F7] py-6 border-t border-zinc-100/50">
                                    <button type="button" onClick={() => { setShowAddItem(false); setEditingItem(null); setItemForm({ name: '', description: '', price: '', isVeg: true, categoryId: '', imageUrl: '', isChefSpecial: false, isGlutenFree: false, specialPrice: '', isSpecialPriceActive: false, specialPriceStart: '17:00', specialPriceEnd: '19:00', variants: [], modifierGroupIds: [] }); }} className="flex-1 py-5 font-bold text-zinc-400 uppercase text-[10px] tracking-[0.3em] hover:text-zinc-900 transition-colors">Cancel</button>
                                    <button type="submit" className="flex-[1.5] bg-zinc-900 text-white rounded-3xl font-bold uppercase text-[11px] tracking-[0.3em] shadow-2xl shadow-zinc-200 hover:scale-[1.02] active:scale-95 transition-all">
                                        {editingItem ? 'Update Registry' : 'Establish Item'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ADD MODIFIER MODAL */}
            <AnimatePresence>
                {showAddModifier && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xl">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#F8F8F7] rounded-[3.5rem] p-12 w-full max-w-lg shadow-[0_40px_100px_rgba(0,0,0,0.2)] overflow-y-auto max-h-[85vh] border border-white/20">
                            <div className="mb-10">
                                <h3 className="text-3xl font-bold text-zinc-900 tracking-tight leading-none mb-2">Group Architect</h3>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em]">Operational Logic Definition</p>
                            </div>
                            <form onSubmit={handleCreateModifierGroup} className="space-y-10">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Group Label</label>
                                    <input required className="w-full bg-white border border-zinc-100 p-5 rounded-3xl font-bold shadow-sm focus:ring-2 focus:ring-zinc-900 outline-none" value={modGroupForm.name} onChange={e => setModGroupForm({ ...modGroupForm, name: e.target.value })} placeholder="e.g. Protein Choice" />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Min Floor</label>
                                        <input type="number" className="w-full bg-white border border-zinc-100 p-5 rounded-3xl font-bold shadow-sm" value={modGroupForm.minSelection} onChange={e => setModGroupForm({ ...modGroupForm, minSelection: Number(e.target.value) })} />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Max Ceiling</label>
                                        <input type="number" className="w-full bg-white border border-zinc-100 p-5 rounded-3xl font-bold shadow-sm" value={modGroupForm.maxSelection || ''} onChange={e => setModGroupForm({ ...modGroupForm, maxSelection: e.target.value ? Number(e.target.value) : null })} placeholder="∞" />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Logic Nodes</label>
                                        <button type="button" onClick={() => setModGroupForm(p => ({ ...p, options: [...p.options, { name: '', price: 0 }] }))} className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest bg-white px-4 py-2 rounded-xl shadow-sm border border-zinc-100 hover:bg-zinc-50 transition-all">+ Add Option</button>
                                    </div>
                                    <div className="space-y-3">
                                        {modGroupForm.options.map((opt, i) => (
                                            <div key={i} className="flex gap-4 animate-in slide-in-from-left-4 duration-300">
                                                <input required className="flex-[3] bg-white border border-zinc-100 p-4 rounded-2xl text-xs font-bold shadow-sm" value={opt.name} onChange={e => {
                                                    const next = [...modGroupForm.options]; next[i].name = e.target.value; setModGroupForm({ ...modGroupForm, options: next });
                                                }} placeholder="Label (e.g. Extra Cheese)" />
                                                <input required type="number" className="flex-1 bg-white border border-zinc-100 p-4 rounded-2xl text-xs font-bold shadow-sm text-right font-mono" value={opt.price} onChange={e => {
                                                    const next = [...modGroupForm.options]; next[i].price = Number(e.target.value); setModGroupForm({ ...modGroupForm, options: next });
                                                }} placeholder="₹" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-6 pt-10">
                                    <button type="button" onClick={() => setShowAddModifier(false)} className="flex-1 py-5 font-bold text-zinc-400 uppercase text-[10px] tracking-[0.3em] hover:text-zinc-900 transition-colors">Cancel</button>
                                    <button type="submit" className="flex-[1.5] bg-zinc-900 text-white rounded-3xl font-bold uppercase text-[10px] tracking-[0.3em] shadow-2xl">Establish Group</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ADD CATEGORY MODAL */}
            <AnimatePresence>
                {showAddCategory && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xl">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#F8F8F7] rounded-[3.5rem] p-12 w-full max-w-sm shadow-[0_40px_100px_rgba(0,0,0,0.2)] border border-white/20">
                            <div className="text-center mb-10">
                                <h3 className="text-2xl font-bold text-zinc-900 tracking-tight mb-2">New Collection</h3>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Grouping Identification</p>
                            </div>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const form = e.target as HTMLFormElement;
                                const name = (form.elements.namedItem('catName') as HTMLInputElement).value;
                                handleCreateCategory(name);
                            }}>
                                <input name="catName" required placeholder="e.g. Royal Starters" className="w-full bg-white p-6 rounded-[2rem] font-bold text-xl border border-zinc-100 shadow-sm text-center outline-none mb-10 focus:ring-4 focus:ring-zinc-100 transition-all" />
                                <div className="flex flex-col gap-3">
                                    <button type="submit" className="w-full bg-zinc-900 text-white py-5 rounded-3xl font-bold uppercase text-[11px] tracking-[0.4em] shadow-2xl shadow-zinc-200">Establish</button>
                                    <button type="button" onClick={() => setShowAddCategory(false)} className="w-full py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em] hover:text-zinc-900 transition-colors">Abort</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function MenuItemCard({ item, onToggle, onRestore, onDelete, onEdit }: { item: MenuItem & { deletedAt?: string | null }, onToggle: () => void, onRestore: () => void, onDelete: () => void, onEdit: () => void }) {
    const isDeleted = !!item.deletedAt;

    return (
        <div className={`bg-white rounded-[1.75rem] border transition-all duration-300 flex items-center p-3 gap-5 group hover:shadow-md ${isDeleted ? 'grayscale opacity-60 border-dashed border-zinc-200 shadow-none' : (item.isAvailable ? 'border-zinc-100 hover:border-zinc-300' : 'border-zinc-100 bg-zinc-50/30')}`}>
            {/* Thumbnail Section */}
            <div className={`relative w-24 h-24 shrink-0 bg-zinc-50 rounded-2xl overflow-hidden ${isDeleted ? '' : 'cursor-pointer'}`} onClick={() => !isDeleted && onEdit()}>
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-100 bg-zinc-50 space-y-1">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7M16 5l2 2 4-4" /></svg>
                        <span className="text-[8px] font-bold text-zinc-300 uppercase tracking-widest">N/A</span>
                    </div>
                )}

                {isDeleted && (
                    <div className="absolute inset-0 bg-zinc-100/60 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="text-[7px] font-black text-white bg-zinc-400 px-2 py-1 rounded-md uppercase tracking-tighter">Archived</span>
                    </div>
                )}

                <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                    <div className={`w-4 h-4 bg-white/90 backdrop-blur shadow-sm rounded-lg flex items-center justify-center border ${item.isVeg ? 'border-emerald-100' : 'border-rose-100'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    </div>
                </div>
            </div>
            {/* Information Section */}
            <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className={`text-md font-bold tracking-tight truncate ${item.isAvailable && !isDeleted ? 'text-zinc-900' : 'text-zinc-400'}`}>{item.name}</h4>
                    {item.isChefSpecial && (
                        <div className="bg-amber-100 text-amber-600 p-1 rounded-md">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" /></svg>
                        </div>
                    )}
                </div>

                <p className="text-[10px] text-zinc-400 font-medium leading-tight line-clamp-1 italic mb-2">{item.description || 'No digital description provided.'}</p>

                <div className="flex items-center gap-2">
                    <div className={`text-sm font-bold font-mono ${isDeleted ? 'text-zinc-300' : 'text-zinc-900'}`}>₹{item.price}</div>
                    <div className="h-3 w-px bg-zinc-100" />
                    <div className="flex gap-1.5">
                        {item.variants.length > 0 && (
                            <span className="text-[8px] font-bold uppercase text-zinc-400 tracking-tight">{item.variants.length} Vars</span>
                        )}
                        {item.modifierGroups.length > 0 && (
                            <span className="text-[8px] font-bold uppercase text-emerald-500 tracking-tight">{item.modifierGroups.length} Mods</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions Section */}
            <div className="flex items-center gap-4 pl-4 border-l border-zinc-50">
                {!isDeleted ? (
                    <>
                        <button onClick={onToggle} className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-tight transition-all border ${item.isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${item.isAvailable ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                            {item.isAvailable ? 'Active' : 'Stocked Out'}
                        </button>
                        <div className="flex gap-1">
                            <button onClick={onEdit} className="p-2.5 text-zinc-300 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg></button>
                            <button onClick={onDelete} className="p-2.5 text-zinc-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg></button>
                        </div>
                    </>
                ) : (
                    <button onClick={onRestore} className="text-[9px] font-black uppercase text-zinc-400 hover:text-emerald-600 transition-colors tracking-widest px-4 py-2 bg-zinc-50 rounded-xl border border-zinc-100">Restore</button>
                )}
            </div>
        </div>
    );
}
