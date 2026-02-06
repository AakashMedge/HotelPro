
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ModifierOption = {
    id: string;
    name: string;
    price: number;
};

type ModifierGroup = {
    modifierGroup: {
        id: string;
        name: string;
        minSelection: number;
        maxSelection: number | null;
        options: ModifierOption[];
    }
};

type Variant = {
    id: string;
    name: string;
    price: number;
};

export type FullMenuItem = {
    id: string;
    title: string;
    description: string;
    priceRaw: number;
    imageUrl?: string | null;
    isVeg: boolean;
    isAvailable: boolean;
    category: string;
    variants: Variant[];
    modifierGroups: ModifierGroup[];

    // Search & Pricing
    isChefSpecial?: boolean;
    isGlutenFree?: boolean;
    specialPrice?: number;
    isSpecialPriceActive?: boolean;
    specialPriceStart?: string | null;
    specialPriceEnd?: string | null;
};

interface Props {
    item: FullMenuItem;
    isOpen: boolean;
    onClose: () => void;
    onAdd: (config: {
        variant?: Variant | null;
        modifiers: ModifierOption[];
        finalPrice: number;
        qty: number;
        notes: string;
    }) => void;
}

export default function ItemCustomizationModal({ item, isOpen, onClose, onAdd }: Props) {
    const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
    const [selectedModifiers, setSelectedModifiers] = useState<Record<string, ModifierOption[]>>({});
    const [qty, setQty] = useState(1);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            setQty(1);
            setNotes('');
            setSelectedModifiers({});
            if (item.variants.length > 0) {
                setSelectedVariant(item.variants[0]);
            } else {
                setSelectedVariant(null);
            }
        }
    }, [isOpen, item]);

    if (!isOpen) return null;

    // Calculate Price logic with Happy Hour support
    const isHappyHourActive = () => {
        if (!item.isSpecialPriceActive || !item.specialPrice) return false;
        if (!item.specialPriceStart || !item.specialPriceEnd) return true;
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        return currentTime >= item.specialPriceStart && currentTime <= item.specialPriceEnd;
    };

    const activeSpecial = isHappyHourActive();

    let base = item.priceRaw;
    if (selectedVariant) {
        base = selectedVariant.price;
    } else if (activeSpecial && item.specialPrice) {
        base = item.specialPrice;
    }

    const modTotal = Object.values(selectedModifiers).flat().reduce((acc, m) => acc + m.price, 0);
    const unitPrice = base + modTotal;
    const totalPrice = unitPrice * qty;

    const handleModToggle = (groupId: string, option: ModifierOption, group: ModifierGroup['modifierGroup']) => {
        setSelectedModifiers(prev => {
            const current = prev[groupId] || [];
            const exists = current.find(c => c.id === option.id);
            let next = [...current];

            if (exists) {
                next = next.filter(c => c.id !== option.id);
            } else {
                if (group.maxSelection !== null && current.length >= group.maxSelection) {
                    if (group.maxSelection === 1) {
                        next = [option];
                    } else {
                        return prev;
                    }
                } else {
                    next.push(option);
                }
            }
            return { ...prev, [groupId]: next };
        });
    };

    const handleConfirm = () => {
        for (const gWrapper of item.modifierGroups) {
            const g = gWrapper.modifierGroup;
            const selectedCount = (selectedModifiers[g.id] || []).length;
            if (selectedCount < g.minSelection) {
                alert(`Please select at least ${g.minSelection} for ${g.name}`);
                return;
            }
        }

        onAdd({
            variant: selectedVariant,
            modifiers: Object.values(selectedModifiers).flat(),
            finalPrice: unitPrice,
            qty,
            notes
        });
        onClose();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[8000] flex items-end md:items-center justify-center pointer-events-none">
                {/* BACKDROP */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto"
                    onClick={onClose}
                />

                {/* MODAL CONTAINER */}
                <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative bg-[#FDFCF8] w-full max-w-xl rounded-t-[3rem] md:rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden max-h-[92vh] flex flex-col border-t border-white/20 pointer-events-auto"
                >
                    {/* BACKGROUND TEXTURE */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] z-0" />

                    {/* TOP ACTION BAR */}
                    <div className="absolute top-6 left-0 right-0 z-10 px-6 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-white/90 backdrop-blur-md rounded-full shadow-xl border border-black/5">
                                <div className={`w-3 h-3 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                            </div>
                            {item.isChefSpecial && (
                                <div className="px-3 py-1.5 bg-amber-400 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg border border-white/20">Chef's Signature Selection</div>
                            )}
                            {item.isGlutenFree && (
                                <div className="px-3 py-1.5 bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg border border-white/20">Gluten-Free</div>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-black/10 backdrop-blur-xl flex items-center justify-center text-black hover:bg-black hover:text-white transition-all transform active:scale-90"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    {/* IMAGE SECTION */}
                    <div className="relative w-full aspect-16/10 bg-zinc-200 overflow-hidden shrink-0">
                        <img
                            src={item.imageUrl || "/images/menu/wagyu.png"}
                            alt={item.title}
                            className="w-full h-full object-cover scale-105"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />
                        <div className="absolute bottom-6 left-6 text-white z-10">
                            <h2 className="text-3xl font-playfair font-black italic tracking-tight">{item.title}</h2>
                        </div>
                    </div>

                    {/* SCROLLABLE CONTENT */}
                    <div className="flex-1 overflow-y-auto no-scrollbar relative z-10 px-8 py-8 space-y-10 pb-32">

                        {/* DESCRIPTION BOX */}
                        <div className="p-4 rounded-2xl bg-[#D43425]/5 border border-[#D43425]/10">
                            <p className="text-xs font-medium text-zinc-600 leading-relaxed italic">
                                "{item.description}"
                            </p>
                        </div>

                        {/* VARIANTS (IF ANY) */}
                        {item.variants.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D43425]">Select Variation</span>
                                    <div className="h-px grow bg-zinc-100" />
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {item.variants.map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => setSelectedVariant(v)}
                                            className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 ${selectedVariant?.id === v.id ? 'border-[#D43425] bg-white shadow-xl shadow-red-500/5 translate-x-1' : 'border-zinc-50 bg-zinc-50/50 hover:bg-white'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedVariant?.id === v.id ? 'border-[#D43425]' : 'border-zinc-300'}`}>
                                                    {selectedVariant?.id === v.id && <div className="w-2.5 h-2.5 rounded-full bg-[#D43425] animate-in fade-in zoom-in duration-300" />}
                                                </div>
                                                <span className={`text-sm font-black uppercase tracking-widest ${selectedVariant?.id === v.id ? 'text-[#D43425]' : 'text-zinc-400'}`}>{v.name}</span>
                                            </div>
                                            <span className="font-playfair text-lg font-black text-[#1A1A1A]">₹{v.price}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* MODIFIERS */}
                        {item.modifierGroups.map(wrapper => {
                            const g = wrapper.modifierGroup;
                            const selectedInGroup = selectedModifiers[g.id] || [];
                            const isSatisfied = selectedInGroup.length >= g.minSelection;

                            return (
                                <div key={g.id} className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D43425]">{g.name}</span>
                                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${isSatisfied ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-400'}`}>
                                            {g.minSelection > 0 ? `Must Select ${g.minSelection}` : 'Optional'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {g.options.map(opt => {
                                            const isSelected = selectedInGroup.some(s => s.id === opt.id);
                                            return (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => handleModToggle(g.id, opt, g)}
                                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${isSelected ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white shadow-lg' : 'border-zinc-100 bg-[#FDFCF8] hover:border-zinc-300'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-[#D43425] border-[#D43425]' : 'border-zinc-200 bg-white'}`}>
                                                            {isSelected && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>}
                                                        </div>
                                                        <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-white' : 'text-zinc-600'}`}>{opt.name}</span>
                                                    </div>
                                                    <span className={`text-xs font-bold ${isSelected ? 'text-[#D43425]' : 'text-zinc-400'}`}>
                                                        {opt.price > 0 ? `+₹${opt.price}` : 'Free'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        {/* SPECIAL REQUESTS */}
                        <div className="space-y-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300">Manuscript (Notes)</span>
                            <textarea
                                className="w-full bg-zinc-50/50 border border-zinc-100 rounded-2xl p-4 text-xs font-medium focus:outline-none focus:border-[#D43425]/20 focus:ring-1 focus:ring-[#D43425]/20 transition-all placeholder:text-zinc-300"
                                placeholder="Any culinary adjustments?"
                                rows={2}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* PREMIUM BOTTOM ACTION BAR */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-3xl border-t border-black/5 flex items-center gap-4 z-20">
                        <div className="flex items-center gap-2 bg-zinc-50 border border-black/5 rounded-2xl p-1.5 px-3">
                            <button
                                onClick={() => setQty(Math.max(1, qty - 1))}
                                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white transition shadow-sm active:scale-90"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                            <span className="font-black text-lg w-6 text-center">{qty}</span>
                            <button
                                onClick={() => setQty(qty + 1)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white transition shadow-sm active:scale-90"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                        </div>

                        <button
                            onClick={handleConfirm}
                            className="flex-1 bg-[#D43425] text-white h-14 rounded-2xl flex items-center justify-between px-8 hover:bg-[#1A1A1A] transition-all duration-500 shadow-[0_15px_40px_rgba(212,52,37,0.35)] active:scale-[0.97]"
                        >
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add to Selection</span>
                            <div className="flex flex-col items-end leading-none">
                                <span className="font-playfair text-xl font-black italic">₹{totalPrice.toLocaleString()}</span>
                            </div>
                        </button>
                    </div>
                </motion.div>
            </div >
        </AnimatePresence>
    );
}
