
'use client';

import { useState, useEffect } from 'react';

type MenuItem = {
    id: string;
    name: string;
    category: string;
    description: string;
    price: number;
    isAvailable: boolean;
};

export default function MenuManagerPage() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        category: 'Main Course',
        description: '',
        price: ''
    });

    const fetchMenu = async () => {
        try {
            const res = await fetch('/api/manager/menu');
            const data = await res.json();
            if (data.success) {
                setItems(data.items);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenu();
    }, []);

    const toggleAvailability = async (id: string, currentStatus: boolean) => {
        // Optimistic update
        setItems(prev => prev.map(item => item.id === id ? { ...item, isAvailable: !currentStatus } : item));

        try {
            await fetch('/api/manager/menu', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isAvailable: !currentStatus })
            });
        } catch (err) {
            console.error(err);
            fetchMenu(); // Revert on error
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/manager/menu', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setShowAddModal(false);
                setFormData({ name: '', category: 'Main Course', description: '', price: '' });
                fetchMenu();
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="p-10 text-center animate-pulse">Loading Menu...</div>;

    // Group items by category
    const grouped = items.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, MenuItem[]>);

    return (
        <div className="h-full overflow-y-auto p-4 md:p-8 lg:p-10 hide-scrollbar bg-[#FDFCF9]">
            <div className="max-w-7xl mx-auto space-y-8 pb-32">

                <div className="flex justify-between items-end border-b border-zinc-100 pb-6">
                    <div>
                        <h2 className="text-3xl font-black tracking-tighter uppercase text-zinc-900">Digital Menu</h2>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Live Inventory Control</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-[#D43425] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-zinc-900 transition-colors shadow-lg shadow-red-500/20"
                    >
                        + Add Dish
                    </button>
                </div>

                {Object.entries(grouped).map(([category, categoryItems]) => (
                    <div key={category} className="space-y-4">
                        <h3 className="text-xl font-black text-zinc-300 uppercase tracking-widest pl-2 border-l-4 border-zinc-200">{category}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categoryItems.map(item => (
                                <div key={item.id} className={`bg-white border p-6 rounded-2xl flex flex-col gap-3 group transition-all ${item.isAvailable ? 'border-zinc-100' : 'border-red-100 bg-red-50/10'}`}>
                                    <div className="flex justify-between items-start">
                                        <h4 className={`text-lg font-black leading-tight ${item.isAvailable ? 'text-zinc-900' : 'text-zinc-400 line-through'}`}>{item.name}</h4>
                                        <div className="text-sm font-black text-[#D43425]">₹{item.price}</div>
                                    </div>
                                    <p className="text-xs text-zinc-500 font-medium leading-relaxed line-clamp-2">{item.description}</p>

                                    <div className="pt-4 mt-auto border-t border-zinc-50 flex justify-between items-center">
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${item.isAvailable ? 'text-green-500' : 'text-red-500'}`}>
                                            {item.isAvailable ? 'IN STOCK' : 'SOLD OUT (86)'}
                                        </span>
                                        <button
                                            onClick={() => toggleAvailability(item.id, item.isAvailable)}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${item.isAvailable
                                                ? 'bg-zinc-100 text-zinc-500 hover:bg-red-100 hover:text-red-600'
                                                : 'bg-green-100 text-green-600 hover:bg-green-200'
                                                }`}
                                        >
                                            {item.isAvailable ? 'Disable' : 'Enable'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

            </div>

            {/* ADD ITEM MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter mb-6">Create New Dish</h3>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Item Name</label>
                                <input
                                    required
                                    className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-xl font-bold text-zinc-900 focus:outline-none focus:border-zinc-400"
                                    placeholder="e.g. Lobster Thermidor"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Category</label>
                                    <select
                                        className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-xl font-bold text-zinc-900 focus:outline-none focus:border-zinc-400"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option>Signature</option>
                                        <option>Appetizers</option>
                                        <option>Main Course</option>
                                        <option>Desserts</option>
                                        <option>Wine & Drinks</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Price (₹)</label>
                                    <input
                                        required
                                        type="number"
                                        className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-xl font-bold text-zinc-900 focus:outline-none focus:border-zinc-400"
                                        placeholder="0"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Description</label>
                                <textarea
                                    className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-xl font-bold text-zinc-900 focus:outline-none focus:border-zinc-400 h-24 resize-none"
                                    placeholder="Describe the dish..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-3 text-[10px] font-black text-zinc-400 hover:text-zinc-900 uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-2 bg-[#D43425] text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-colors"
                                >
                                    Add to Menu
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
