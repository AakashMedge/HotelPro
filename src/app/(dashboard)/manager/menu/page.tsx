
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

    // Advanced Search State
    const [managerSearch, setManagerSearch] = useState('');
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [filterCategory, setFilterCategory] = useState('');

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

    const TabButton = ({ id, label }: { id: typeof activeTab, label: string }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all ${activeTab === id
                ? 'bg-[#D43425] text-white shadow-lg shadow-red-500/20 rounded-xl'
                : 'text-zinc-400 hover:text-zinc-800'
                }`}
        >
            {label}
        </button>
    );

    if (loading) return <div className="p-10 text-center animate-pulse text-zinc-400 uppercase tracking-widest">Waking up the Ledger...</div>;

    const uncategorized = data.items.filter(i => !i.category);
    const groupedItems = data.categories.map(cat => ({
        ...cat,
        items: data.items.filter(i => {
            const matchesCategory = i.category?.id === cat.id;
            const matchesSearch = i.name.toLowerCase().includes(managerSearch.toLowerCase()) || i.id.toLowerCase().includes(managerSearch.toLowerCase());
            const matchesPrice = (!priceRange.min || i.price >= Number(priceRange.min)) && (!priceRange.max || i.price <= Number(priceRange.max));
            return matchesCategory && matchesSearch && matchesPrice;
        })
    }));

    const filteredUncategorized = uncategorized.filter(i => {
        const matchesSearch = i.name.toLowerCase().includes(managerSearch.toLowerCase()) || i.id.toLowerCase().includes(managerSearch.toLowerCase());
        const matchesPrice = (!priceRange.min || i.price >= Number(priceRange.min)) && (!priceRange.max || i.price <= Number(priceRange.max));
        return matchesSearch && matchesPrice;
    });

    return (
        <div className="h-full overflow-y-auto bg-[#FDFCF9] p-6 lg:p-10">
            <div className="max-w-7xl mx-auto space-y-10 pb-32">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-zinc-200/50 pb-6 gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-zinc-900 tracking-tighter uppercase mb-2">Menu Matrix</h1>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Operations Command Center</p>
                    </div>

                    <div className="flex gap-2">
                        <TabButton id="items" label="Dishes" />
                        <TabButton id="collections" label="Collections" />
                        <TabButton id="modifiers" label="Add-ons" />
                    </div>
                </div>

                {/* ADVANCED COMMAND FILTERS */}
                {activeTab === 'items' && (
                    <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2 relative">
                                <input
                                    type="text"
                                    placeholder="Search by Name or SKU..."
                                    className="w-full bg-zinc-50 border-none p-3 pl-10 rounded-xl text-sm font-bold placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900 transition-all"
                                    value={managerSearch}
                                    onChange={e => setManagerSearch(e.target.value)}
                                />
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="Min ₹"
                                    className="flex-1 bg-zinc-50 border-none p-3 rounded-xl text-sm font-bold placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900 transition-all"
                                    value={priceRange.min}
                                    onChange={e => setPriceRange(p => ({ ...p, min: e.target.value }))}
                                />
                                <input
                                    type="number"
                                    placeholder="Max ₹"
                                    className="flex-1 bg-zinc-50 border-none p-3 rounded-xl text-sm font-bold placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900 transition-all"
                                    value={priceRange.max}
                                    onChange={e => setPriceRange(p => ({ ...p, max: e.target.value }))}
                                />
                            </div>
                            <button
                                onClick={() => setShowDeleted(!showDeleted)}
                                className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showDeleted ? 'bg-zinc-900 text-white shadow-xl' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                            >
                                {showDeleted ? 'Showing Archived' : 'Show Archived'}
                            </button>
                        </div>
                    </div>
                )}

                {/* FILTERS & QUICK ACTIONS */}
                {activeTab === 'items' && (
                    <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm gap-4">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-2">Visibility Filter:</span>
                            <button
                                onClick={() => setShowDeleted(!showDeleted)}
                                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${showDeleted ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                            >
                                {showDeleted ? 'Viewing All (Inc. Archived)' : 'Viewing Active Only'}
                            </button>
                        </div>
                        <button onClick={() => setShowAddItem(true)} className="w-full md:w-auto bg-[#D43425] text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:scale-105 transition-transform shadow-xl shadow-red-100">+ Add New Dish</button>
                    </div>
                )}

                {/* DISHES TAB */}
                {activeTab === 'items' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">

                        {groupedItems.length === 0 && uncategorized.length === 0 && (
                            <div className="py-20 text-center bg-white rounded-4xl border border-dashed border-zinc-200">
                                <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">No items found in your ledger.</p>
                                <button onClick={() => setShowAddItem(true)} className="mt-4 text-[#D43425] font-black uppercase text-[10px] tracking-widest underline">Create your first dish</button>
                            </div>
                        )}

                        {groupedItems.map(cat => (
                            cat.items.length > 0 && (
                                <div key={cat.id} className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-2xl font-black text-zinc-800 uppercase tracking-tighter">{cat.name}</h2>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{cat.isActive ? 'On Digital Menu' : 'Suspended'}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {cat.items.map(item => (
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
                                </div>
                            )
                        ))}

                        {filteredUncategorized.length > 0 && (
                            <div className="space-y-6 pt-10 border-t border-zinc-100">
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-black text-zinc-800 uppercase tracking-tighter">Chef's Selection</h2>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Uncategorized Ledger Entries</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredUncategorized.map(item => (
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
                            </div>
                        )}
                    </motion.div>
                )}

                {/* COLLECTIONS TAB */}
                {activeTab === 'collections' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-8">
                        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-zinc-200/50 border border-zinc-100">
                            <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight mb-6 text-center">Active Menus</h3>
                            <div className="space-y-4">
                                {data.categories.map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                                        <span className="font-bold text-zinc-700 uppercase tracking-tight">{cat.name}</span>
                                        <button onClick={() => handleToggleCategory(cat.id, cat.isActive)} className={`w-14 h-8 flex items-center bg-gray-300 rounded-full p-1 duration-300 ease-in-out ${cat.isActive ? 'bg-[#D43425]' : 'bg-zinc-200'}`}>
                                            <div className={`bg-white w-6 h-6 rounded-full shadow-md transform duration-300 ease-in-out ${cat.isActive ? 'translate-x-6' : ''}`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setShowAddCategory(true)} className="w-full mt-6 py-4 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400 font-bold uppercase tracking-widest hover:border-zinc-400 hover:text-zinc-600 transition-colors">+ New Category</button>
                        </div>
                    </motion.div>
                )}

                {/* MODIFIERS TAB */}
                {activeTab === 'modifiers' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto space-y-8">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Modifier Vault</h3>
                            <button onClick={() => setShowAddModifier(true)} className="bg-zinc-900 text-white px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest">+ Create Group</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {data.modifierGroups.map(group => (
                                <div key={group.id} className="bg-white rounded-4xl p-8 border border-zinc-100 shadow-2xl relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h4 className="font-black text-zinc-800 uppercase tracking-tight text-lg">{group.name}</h4>
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Rules: {group.minSelection}-{group.maxSelection || '∞'} Selection</span>
                                        </div>
                                        <button onClick={() => handleDeleteModifierGroup(group.id)} className="opacity-40 hover:opacity-100 hover:text-red-500 transition-all text-red-400 font-bold text-[10px] uppercase">Remove</button>
                                    </div>
                                    <div className="space-y-2">
                                        {group.options.map(opt => (
                                            <div key={opt.id} className="text-xs bg-zinc-50 p-2 rounded-lg flex justify-between font-bold text-zinc-600">
                                                <span>{opt.name}</span>
                                                <span className="text-zinc-400">+₹{opt.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

            </div>

            {/* MODALS */}

            {/* ADD / EDIT DISH MODAL */}
            <AnimatePresence>
                {showAddItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#FDFCF9] rounded-[3rem] p-10 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar relative">
                            <button onClick={() => { setShowAddItem(false); setEditingItem(null); setItemForm({ name: '', description: '', price: '', isVeg: true, categoryId: '', imageUrl: '', isChefSpecial: false, isGlutenFree: false, specialPrice: '', isSpecialPriceActive: false, specialPriceStart: '17:00', specialPriceEnd: '19:00', variants: [], modifierGroupIds: [] }); }} className="absolute top-8 right-8 text-zinc-400 hover:text-black">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>

                            <h3 className="text-3xl font-black text-zinc-900 uppercase tracking-tighter mb-8">{editingItem ? 'Edit Masterpiece' : 'Dish Architect'}</h3>

                            <form onSubmit={handleSubmitItem} className="space-y-8">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Dish Identity</label>
                                        <input required className="w-full bg-white border border-zinc-100 p-4 rounded-2xl font-bold" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} placeholder="e.g. Signature Butter Chicken" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Base Value (₹)</label>
                                        <input required type="number" className="w-full bg-white border border-zinc-100 p-4 rounded-2xl font-bold" value={itemForm.price} onChange={e => setItemForm({ ...itemForm, price: e.target.value })} placeholder="499" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Description / Story</label>
                                    <textarea className="w-full bg-white border border-zinc-100 p-4 rounded-2xl text-sm font-medium" rows={2} value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} placeholder="Describe the soul of this dish..." />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Portrait / Image URL</label>
                                    <input className="w-full bg-white border border-zinc-100 p-4 rounded-2xl font-bold text-sm" value={itemForm.imageUrl} onChange={e => setItemForm({ ...itemForm, imageUrl: e.target.value })} placeholder="https://images.unsplash.com/..." />
                                    <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Link an image to represent this creation.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Collection</label>
                                        <select className="w-full bg-white border border-zinc-100 p-4 rounded-2xl font-bold text-sm outline-none" value={itemForm.categoryId} onChange={e => setItemForm({ ...itemForm, categoryId: e.target.value })}>
                                            <option value="">-- No Category --</option>
                                            {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setItemForm({ ...itemForm, isVeg: true })} className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${itemForm.isVeg ? 'bg-green-600 text-white shadow-lg' : 'bg-zinc-100 text-zinc-400'}`}>VEG</button>
                                            <button type="button" onClick={() => setItemForm({ ...itemForm, isVeg: false })} className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${!itemForm.isVeg ? 'bg-red-600 text-white shadow-lg' : 'bg-zinc-100 text-zinc-400'}`}>NON-VEG</button>
                                        </div>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setItemForm({ ...itemForm, isChefSpecial: !itemForm.isChefSpecial })} className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${itemForm.isChefSpecial ? 'bg-amber-500 text-white shadow-lg' : 'bg-zinc-100 text-zinc-400'}`}>Chef's Special</button>
                                            <button type="button" onClick={() => setItemForm({ ...itemForm, isGlutenFree: !itemForm.isGlutenFree })} className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${itemForm.isGlutenFree ? 'bg-blue-500 text-white shadow-lg' : 'bg-zinc-100 text-zinc-400'}`}>Gluten Free</button>
                                        </div>
                                    </div>
                                </div>

                                {/* HAPPY HOUR / SPECIAL PRICING */}
                                <div className="bg-red-50/50 p-6 rounded-3xl border border-red-100/50 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-xs font-black uppercase tracking-widest text-red-700">Special Pricing Scheduling</h4>
                                            <p className="text-[8px] font-bold text-red-400 uppercase tracking-widest mt-1">Automated Happy Hour / Surge pricing</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setItemForm(p => ({ ...p, isSpecialPriceActive: !p.isSpecialPriceActive }))}
                                            className={`w-12 h-6 flex items-center bg-gray-300 rounded-full p-1 duration-300 ease-in-out ${itemForm.isSpecialPriceActive ? 'bg-red-600' : 'bg-zinc-200'}`}
                                        >
                                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${itemForm.isSpecialPriceActive ? 'translate-x-6' : ''}`} />
                                        </button>
                                    </div>

                                    {itemForm.isSpecialPriceActive && (
                                        <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                                            <div className="space-y-2 col-span-2">
                                                <label className="text-[9px] font-black text-red-400 uppercase tracking-widest">Special Discounted Price (₹)</label>
                                                <input type="number" className="w-full bg-white border border-red-100 p-3 rounded-xl font-bold text-sm text-red-600 focus:ring-2 focus:ring-red-200" value={itemForm.specialPrice} onChange={e => setItemForm({ ...itemForm, specialPrice: e.target.value })} placeholder="e.g. 299" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-red-400 uppercase tracking-widest">Start Time</label>
                                                <input type="time" className="w-full bg-white border border-red-100 p-3 rounded-xl font-bold text-sm" value={itemForm.specialPriceStart} onChange={e => setItemForm({ ...itemForm, specialPriceStart: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-red-400 uppercase tracking-widest">End Time</label>
                                                <input type="time" className="w-full bg-white border border-red-100 p-3 rounded-xl font-bold text-sm" value={itemForm.specialPriceEnd} onChange={e => setItemForm({ ...itemForm, specialPriceEnd: e.target.value })} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* VARIANTS EDITOR */}
                                <div className="pt-4 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Price Variants (e.g. Half / Full)</label>
                                        <button type="button" onClick={() => setItemForm(p => ({ ...p, variants: [...p.variants, { name: '', price: 0 }] }))} className="text-[10px] font-black text-black underline">ADD VARIANT</button>
                                    </div>
                                    <div className="space-y-3">
                                        {itemForm.variants.map((v, i) => (
                                            <div key={i} className="flex gap-3 animate-in slide-in-from-left-2 transition-all">
                                                <input required className="flex-2 bg-white border border-zinc-100 p-3 rounded-xl text-xs font-bold" value={v.name} onChange={e => {
                                                    const next = [...itemForm.variants]; next[i].name = e.target.value; setItemForm({ ...itemForm, variants: next });
                                                }} placeholder="Size Name (Half)" />
                                                <input required type="number" className="flex-1 bg-white border border-zinc-100 p-3 rounded-xl text-xs font-bold" value={v.price} onChange={e => {
                                                    const next = [...itemForm.variants]; next[i].price = Number(e.target.value); setItemForm({ ...itemForm, variants: next });
                                                }} placeholder="Price" />
                                                <button type="button" onClick={() => setItemForm(p => ({ ...p, variants: p.variants.filter((_, idx) => idx !== i) }))} className="p-3 text-red-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ADD-ONS PICKER */}
                                <div className="pt-4 space-y-4">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Available Add-ons</label>
                                    <div className="flex flex-wrap gap-2">
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
                                                className={`flex-2 p-3 rounded-4xl border text-left transition-all ${itemForm.modifierGroupIds.includes(g.id) ? 'bg-[#111111] border-[#111111] text-white' : 'bg-white border-zinc-100 text-zinc-400'}`}
                                            >{g.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-10 sticky bottom-0 bg-[#FDFCF9] py-4 border-t border-zinc-100/50">
                                    <button type="button" onClick={() => { setShowAddItem(false); setEditingItem(null); setItemForm({ name: '', description: '', price: '', isVeg: true, categoryId: '', imageUrl: '', isChefSpecial: false, isGlutenFree: false, specialPrice: '', isSpecialPriceActive: false, specialPriceStart: '17:00', specialPriceEnd: '19:00', variants: [], modifierGroupIds: [] }); }} className="flex-1 py-5 font-black text-zinc-400 uppercase text-[10px] tracking-widest">Cancel</button>
                                    <button type="submit" className="flex-2 bg-[#D43425] text-white rounded-4xl font-black uppercase text-[11px] tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-red-100">{editingItem ? 'Update Ledger' : 'Establish Dish'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ADD MODIFIER MODAL */}
            <AnimatePresence>
                {showAddModifier && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[85vh]">
                            <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight mb-8">Group Architect</h3>
                            <form onSubmit={handleCreateModifierGroup} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Group Label</label>
                                    <input required className="w-full bg-zinc-50 p-4 rounded-2xl font-bold" value={modGroupForm.name} onChange={e => setModGroupForm({ ...modGroupForm, name: e.target.value })} placeholder="e.g. Spice Level" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Min Choice</label>
                                        <input type="number" className="w-full bg-zinc-50 p-4 rounded-2xl font-bold" value={modGroupForm.minSelection} onChange={e => setModGroupForm({ ...modGroupForm, minSelection: Number(e.target.value) })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Max Choice</label>
                                        <input type="number" className="w-full bg-zinc-50 p-4 rounded-2xl font-bold" value={modGroupForm.maxSelection || ''} onChange={e => setModGroupForm({ ...modGroupForm, maxSelection: e.target.value ? Number(e.target.value) : null })} placeholder="∞" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Options</label>
                                        <button type="button" onClick={() => setModGroupForm(p => ({ ...p, options: [...p.options, { name: '', price: 0 }] }))} className="text-[10px] font-black underline">+ ADD OPTION</button>
                                    </div>
                                    <div className="space-y-3">
                                        {modGroupForm.options.map((opt, i) => (
                                            <div key={i} className="flex gap-2">
                                                <input required className="flex-2 bg-zinc-50 p-3 rounded-xl text-xs font-bold" value={opt.name} onChange={e => {
                                                    const next = [...modGroupForm.options]; next[i].name = e.target.value; setModGroupForm({ ...modGroupForm, options: next });
                                                }} placeholder="Option (e.g. Spicy)" />
                                                <input required type="number" className="flex-1 bg-zinc-50 p-3 rounded-xl text-xs font-bold" value={opt.price} onChange={e => {
                                                    const next = [...modGroupForm.options]; next[i].price = Number(e.target.value); setModGroupForm({ ...modGroupForm, options: next });
                                                }} placeholder="₹" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-10">
                                    <button type="button" onClick={() => setShowAddModifier(false)} className="flex-1 py-4 font-black text-zinc-400 uppercase text-[10px] tracking-widest">Cancel</button>
                                    <button type="submit" className="flex-2 bg-zinc-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Build Vault Group</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ADD CATEGORY MODAL */}
            <AnimatePresence>
                {showAddCategory && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-4xl p-8 w-full max-w-sm">
                            <h3 className="text-xl font-black uppercase mb-6 text-center">New Collection</h3>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const form = e.target as HTMLFormElement;
                                const name = (form.elements.namedItem('catName') as HTMLInputElement).value;
                                handleCreateCategory(name);
                            }}>
                                <input name="catName" required placeholder="e.g. Royal Starters" className="w-full bg-zinc-50 p-4 rounded-2xl font-black uppercase border-none text-center outline-none mb-6" />
                                <div className="flex flex-col gap-2">
                                    <button type="submit" className="w-full bg-[#D43425] text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-100">Create Collection</button>
                                    <button type="button" onClick={() => setShowAddCategory(false)} className="w-full py-4 text-[10px] font-black text-zinc-400 uppercase">Cancel</button>
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
        <div className={`bg-white rounded-4xl border transition-all flex flex-col group overflow-hidden ${isDeleted ? 'grayscale opacity-60 border-dashed border-zinc-300' : (item.isAvailable ? 'border-zinc-100 shadow-sm hover:shadow-2xl hover:-translate-y-2' : 'border-zinc-200 bg-zinc-50/50')}`}>
            {/* Image Section */}
            <div className={`relative aspect-16/10 bg-zinc-100 overflow-hidden ${isDeleted ? '' : 'cursor-pointer'}`} onClick={() => !isDeleted && onEdit()}>
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-300 opacity-50">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] mt-2">No Image Linked</span>
                    </div>
                )}
                {!isDeleted && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="bg-white text-black px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">Edit Details</button>
                    </div>
                )}
                {isDeleted && (
                    <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-white text-zinc-900 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Archived</span>
                    </div>
                )}
                {!item.isVeg && <div className="absolute top-4 left-4 w-5 h-5 bg-white rounded-lg flex items-center justify-center shadow-md border border-red-100 z-10"><div className="w-2 h-2 rounded-full bg-red-500" /></div>}
                {item.isVeg && <div className="absolute top-4 left-4 w-5 h-5 bg-white rounded-lg flex items-center justify-center shadow-md border border-green-100 z-10"><div className="w-2 h-2 rounded-full bg-green-500" /></div>}
            </div>

            <div className="p-7 flex flex-col grow">
                <div className="flex justify-between items-start mb-4">
                    <h4 className={`text-xl font-black leading-tight uppercase tracking-tight ${item.isAvailable && !isDeleted ? 'text-zinc-900' : 'text-zinc-400'}`}>{item.name}</h4>
                    <div className={`text-lg font-black ${isDeleted ? 'text-zinc-400' : 'text-[#D43425]'}`}>₹{item.price}</div>
                </div>

                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight leading-relaxed mb-6 h-10 line-clamp-3 italic">{item.description || 'No lore recorded for this dish.'}</p>

                <div className="flex flex-wrap gap-1.5 mb-8">
                    {item.variants.length > 0 && <span className="bg-zinc-100 text-zinc-500 px-3 py-1 rounded-full text-[8px] font-black uppercase">{item.variants.length} SKU</span>}
                    {item.modifierGroups.length > 0 && <span className="bg-[#D43425]/10 text-[#D43425] px-3 py-1 rounded-full text-[8px] font-black uppercase">{item.modifierGroups.length} Mods</span>}
                </div>

                <div className="mt-auto pt-6 border-t border-zinc-100/50 flex justify-between items-center">
                    {isDeleted ? (
                        <button onClick={onRestore} className="w-full bg-zinc-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#D43425] transition-colors">Restore to Ledger</button>
                    ) : (
                        <>
                            <button onClick={onToggle} className={`flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${item.isAvailable ? 'bg-green-600' : 'bg-red-600 animate-pulse'}`} />
                                {item.isAvailable ? 'In Inventory' : 'Sold Out'}
                            </button>
                            <div className="flex gap-2">
                                <button onClick={onEdit} className="p-2 text-zinc-300 hover:text-black transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>
                                <button onClick={onDelete} className="p-2 text-zinc-200 hover:text-red-500 transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
