'use client';

import { useState } from 'react';
import Image from 'next/image';

// ============================================
// Types (shared with menu page)
// ============================================

export interface FullMenuItem {
    id: string;
    title: string;
    description?: string;
    priceRaw: number;
    imageUrl?: string | null;
    isVeg: boolean;
    isAvailable: boolean;
    category: string;
    variants: { id: string; name: string; price: number }[];
    modifierGroups: {
        modifierGroup: {
            id: string;
            name: string;
            minSelection: number;
            maxSelection: number;
            options: { id: string; name: string; price: number }[];
        };
    }[];
    isChefSpecial?: boolean;
    isGlutenFree?: boolean;
    specialPrice?: number;
    isSpecialPriceActive?: boolean;
    specialPriceStart?: string;
    specialPriceEnd?: string;
}

interface ItemCustomizationModalProps {
    item: FullMenuItem;
    isOpen: boolean;
    onClose: () => void;
    onAdd: (config: {
        variant?: { id: string; name: string; price: number };
        modifiers?: { id: string; name: string; price: number }[];
        finalPrice: number;
        qty: number;
        notes: string;
    }) => void;
}

// ============================================
// Category Placeholder (for items without images)
// ============================================

const CATEGORY_GRADIENTS: Record<string, string> = {
    'Appetizers': 'from-amber-200 to-amber-400',
    'Starters': 'from-amber-200 to-amber-400',
    'Main Course': 'from-stone-400 to-stone-600',
    'Desserts': 'from-rose-200 to-rose-400',
    'Wine & Drinks': 'from-slate-300 to-slate-500',
    'Drinks': 'from-sky-200 to-sky-400',
    'Signature': 'from-stone-300 to-stone-500',
    'Biryani': 'from-amber-300 to-amber-500',
    'Breads': 'from-amber-300 to-stone-400',
};

function getPlaceholderGradient(category: string): string {
    return CATEGORY_GRADIENTS[category] || 'from-zinc-300 to-zinc-500';
}

// ============================================
// Component
// ============================================

export default function ItemCustomizationModal({ item, isOpen, onClose, onAdd }: ItemCustomizationModalProps) {
    const [selectedVariant, setSelectedVariant] = useState<{ id: string; name: string; price: number } | null>(
        item.variants.length > 0 ? item.variants[0] : null
    );
    const [selectedModifiers, setSelectedModifiers] = useState<{ id: string; name: string; price: number }[]>([]);
    const [qty, setQty] = useState(1);
    const [notes, setNotes] = useState('');

    if (!isOpen) return null;

    const basePrice = selectedVariant ? selectedVariant.price : item.priceRaw;
    const modifierTotal = selectedModifiers.reduce((sum, m) => sum + m.price, 0);
    const unitPrice = basePrice + modifierTotal;
    const totalPrice = unitPrice * qty;

    const hasImage = !!item.imageUrl;

    const toggleModifier = (opt: { id: string; name: string; price: number }, maxSel: number) => {
        setSelectedModifiers((prev) => {
            const exists = prev.find((m) => m.id === opt.id);
            if (exists) return prev.filter((m) => m.id !== opt.id);
            if (maxSel > 0 && prev.length >= maxSel) return prev;
            return [...prev, opt];
        });
    };

    const handleAdd = () => {
        onAdd({
            variant: selectedVariant || undefined,
            modifiers: selectedModifiers.length > 0 ? selectedModifiers : undefined,
            finalPrice: unitPrice,
            qty,
            notes,
        });
    };

    return (
        <div className="fixed inset-0 z-60 flex flex-col">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Bottom Sheet */}
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
                {/* Drag Handle */}
                <div className="w-full h-6 flex items-center justify-center shrink-0 cursor-pointer" onClick={onClose}>
                    <div className="w-10 h-1 bg-zinc-200 rounded-full" />
                </div>

                <div className="overflow-y-auto flex-1 no-scrollbar">
                    {/* Hero Image */}
                    <div className="relative w-full aspect-16/10 overflow-hidden">
                        {hasImage ? (
                            <Image
                                src={item.imageUrl!}
                                alt={item.title}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className={`absolute inset-0 bg-linear-to-br ${getPlaceholderGradient(item.category)} flex items-center justify-center`}>
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">{item.category}</span>
                            </div>
                        )}
                        {item.isChefSpecial && (
                            <div className="absolute top-3 left-3">
                                <span className="bg-[#1A1A1A] text-[9px] font-semibold text-white px-2 py-1 rounded uppercase tracking-wide">
                                    Bestseller
                                </span>
                            </div>
                        )}
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>

                    {/* Item Details */}
                    <div className="px-5 pt-4 pb-2">
                        <h2 className="text-xl font-bold text-[#1A1A1A]">{item.title}</h2>
                        <p className="text-base font-semibold text-[#1A1A1A] mt-1">₹{basePrice}</p>
                        {item.description && (
                            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{item.description}</p>
                        )}
                    </div>

                    {/* Variants */}
                    {item.variants.length > 0 && (
                        <div className="px-5 py-4 border-t border-zinc-100">
                            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">Choose Size</h3>
                            <div className="space-y-2">
                                {item.variants.map((v) => (
                                    <button
                                        key={v.id}
                                        onClick={() => setSelectedVariant(v)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${selectedVariant?.id === v.id
                                            ? 'border-emerald-500 bg-emerald-50'
                                            : 'border-zinc-100 bg-white'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedVariant?.id === v.id ? 'border-emerald-500' : 'border-zinc-300'
                                                }`}>
                                                {selectedVariant?.id === v.id && (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                                )}
                                            </div>
                                            <span className="font-semibold text-sm text-[#1A1A1A]">{v.name}</span>
                                        </div>
                                        <span className="font-bold text-sm text-[#1A1A1A]">₹{v.price}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Modifier Groups */}
                    {item.modifierGroups.map((mg) => (
                        <div key={mg.modifierGroup.id} className="px-5 py-4 border-t border-zinc-100">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{mg.modifierGroup.name}</h3>
                                {mg.modifierGroup.maxSelection > 0 && (
                                    <span className="text-[10px] font-medium text-zinc-400">
                                        Max {mg.modifierGroup.maxSelection}
                                    </span>
                                )}
                            </div>
                            <div className="space-y-2">
                                {mg.modifierGroup.options.map((opt) => {
                                    const isSelected = selectedModifiers.some((m) => m.id === opt.id);
                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => toggleModifier(opt, mg.modifierGroup.maxSelection)}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${isSelected
                                                ? 'border-emerald-500 bg-emerald-50'
                                                : 'border-zinc-100 bg-white'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-300'
                                                    }`}>
                                                    {isSelected && (
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span className="font-semibold text-sm text-[#1A1A1A]">{opt.name}</span>
                                            </div>
                                            {opt.price > 0 && (
                                                <span className="font-bold text-sm text-zinc-500">+₹{opt.price}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Notes */}
                    <div className="px-5 py-4 border-t border-zinc-100">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Special Instructions</h3>
                        <textarea
                            placeholder="e.g., Less spicy, no onions..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            maxLength={200}
                            rows={2}
                            className="w-full p-3 bg-zinc-50 rounded-xl text-sm placeholder:text-zinc-300 outline-none focus:ring-2 focus:ring-emerald-200 resize-none"
                        />
                    </div>
                </div>

                {/* CTA — Sticky at bottom */}
                <div className="p-4 border-t border-zinc-100 bg-white">
                    <div className="flex items-center gap-3">
                        {/* Qty Control */}
                        <div className="flex items-center bg-zinc-100 rounded-xl overflow-hidden shrink-0">
                            <button
                                onClick={() => setQty(Math.max(1, qty - 1))}
                                className="w-10 h-10 flex items-center justify-center text-zinc-600 font-bold text-lg active:bg-zinc-200"
                            >
                                −
                            </button>
                            <span className="w-8 text-center font-black text-sm text-[#1A1A1A]">{qty}</span>
                            <button
                                onClick={() => setQty(qty + 1)}
                                className="w-10 h-10 flex items-center justify-center text-zinc-600 font-bold text-lg active:bg-zinc-200"
                            >
                                +
                            </button>
                        </div>

                        {/* Add Button */}
                        <button
                            onClick={handleAdd}
                            className="flex-1 py-3.5 bg-[#1A1A1A] text-white rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                        >
                            <span>Add to Cart</span>
                            <span className="text-white/40">·</span>
                            <span>₹{totalPrice}</span>
                        </button>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes slide-in-from-bottom {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-in.slide-in-from-bottom { animation: slide-in-from-bottom 0.3s ease-out; }
            `}</style>
        </div>
    );
}
