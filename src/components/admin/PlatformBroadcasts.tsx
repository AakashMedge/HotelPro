'use client';

import { useState, useEffect } from 'react';
import { Megaphone, X, Bell, Info, ShieldAlert, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Broadcast = {
    id: string;
    title: string;
    content: string;
    type: string;
    priority: string;
    createdAt: string;
};

export default function PlatformBroadcasts() {
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [hasNew, setHasNew] = useState(false);

    useEffect(() => {
        const fetchBroadcasts = async () => {
            try {
                const res = await fetch('/api/admin/broadcasts');
                const data = await res.json();
                if (data.broadcasts && data.broadcasts.length > 0) {
                    setBroadcasts(data.broadcasts);
                    setHasNew(true);
                    setIsOpen(true);
                }
            } catch (err) {
                console.error('Failed to fetch broadcasts:', err);
            }
        };

        fetchBroadcasts();
        // Poll every 5 minutes
        const interval = setInterval(fetchBroadcasts, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (broadcasts.length === 0) return null;

    const current = broadcasts[currentIndex];

    const getIcon = (type: string) => {
        switch (type) {
            case 'UPDATE': return <Zap className="w-5 h-5 text-blue-500" />;
            case 'ALERT': return <ShieldAlert className="w-5 h-5 text-rose-500" />;
            default: return <Info className="w-5 h-5 text-emerald-500" />;
        }
    };

    const getPriorityStyles = (priority: string) => {
        switch (priority) {
            case 'HIGH': return 'border-l-4 border-l-rose-500 bg-rose-50/30';
            case 'MEDIUM': return 'border-l-4 border-l-amber-500 bg-amber-50/30';
            default: return 'border-l-4 border-l-emerald-500 bg-emerald-50/30';
        }
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`mb-8 p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden bg-white ${getPriorityStyles(current.priority)}`}
                    >
                        <div className="flex items-start gap-5 relative z-10">
                            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-50">
                                {getIcon(current.type)}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Platform Broadcast</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                    <span className="text-[10px] font-bold text-slate-400">{new Date(current.createdAt).toLocaleDateString()}</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 leading-tight mb-2">{current.title}</h3>
                                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{current.content}</p>

                                {broadcasts.length > 1 && (
                                    <div className="mt-4 flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : broadcasts.length - 1))}
                                            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            <span className="text-xs font-bold text-slate-400 px-2 tracking-tighter cursor-pointer">← Prev</span>
                                        </button>
                                        <span className="text-[10px] font-bold text-slate-300">{currentIndex + 1} / {broadcasts.length}</span>
                                        <button
                                            onClick={() => setCurrentIndex((prev) => (prev < broadcasts.length - 1 ? prev + 1 : 0))}
                                            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            <span className="text-xs font-bold text-slate-400 px-2 tracking-tighter cursor-pointer">Next →</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!isOpen && hasNew && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-10 right-10 bg-indigo-600 text-white p-4 rounded-full shadow-2xl shadow-indigo-200 hover:scale-110 active:scale-95 transition-all z-50 group"
                >
                    <Megaphone className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white" />
                </button>
            )}
        </>
    );
}
