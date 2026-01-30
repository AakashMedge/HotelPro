'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const ROLE_DASHBOARDS: Record<string, string> = {
    ADMIN: '/admin',
    MANAGER: '/manager',
    WAITER: '/waiter',
    KITCHEN: '/kitchen',
    CASHIER: '/cashier',
};

function LoginContent({ isOpened }: { isOpened: boolean }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirect');
    const accessError = searchParams.get('error');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username.trim().toLowerCase(),
                    password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Identity verification failed');
                setIsLoading(false);
                return;
            }

            const dashboard = ROLE_DASHBOARDS[data.user.role] || '/';
            if (redirectTo && redirectTo.startsWith(dashboard)) {
                router.push(redirectTo);
            } else {
                router.push(dashboard);
            }
            router.refresh();
        } catch {
            setError('System connectivity issue. Please retry.');
            setIsLoading(false);
        }
    };

    return (
        <div className={`w-full h-full flex flex-col items-center justify-center p-8 md:p-12 transition-opacity duration-700 ${isOpened ? 'opacity-100 delay-500' : 'opacity-0'}`}>
            <div className="text-center mb-10 space-y-2">
                <span className="text-[10px] font-black tracking-[0.4em] uppercase opacity-30 text-[#3D2329]">Staff Entrance</span>
                <h2 className="text-4xl font-playfair font-black tracking-tighter italic text-[#3D2329]">Sign In</h2>
            </div>

            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
                {(error || accessError) && (
                    <div className="bg-[#D43425]/5 border border-[#D43425]/20 rounded-xl px-4 py-3 text-center mb-4">
                        <p className="text-[#D43425] text-[10px] font-black uppercase tracking-widest leading-none">
                            {error || 'Access Denied'}
                        </p>
                    </div>
                )}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-[#3D2329]/40 ml-4">Identifier</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full h-14 px-6 rounded-full bg-black/5 border border-black/10 text-black font-playfair italic text-lg outline-none focus:border-[#D43425] transition-all"
                            placeholder="username"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-[#3D2329]/40 ml-4">Access Key</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-14 px-6 rounded-full bg-black/5 border border-black/10 text-black font-playfair italic text-lg outline-none focus:border-[#D43425] transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-14 bg-[#3D2329] text-white rounded-full font-black text-[10px] uppercase tracking-[0.4em] shadow-xl hover:bg-black active:scale-95 transition-all disabled:opacity-50"
                >
                    {isLoading ? 'Verifying...' : 'Unlock Entry'}
                </button>
            </form>
            <div className="mt-10 text-[8px] font-black uppercase tracking-[0.3em] opacity-20 text-center text-[#3D2329]">
                Private Ledger • HotelPro Reserve
            </div>
        </div>
    );
}

export default function LoginPage() {
    const [isOpened, setIsOpened] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="min-h-screen bg-[#0E0809]" />;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0809] p-6 relative overflow-hidden font-sans">
            {/* Background Ambience */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-full bg-[#D43425]/10 rounded-full blur-[180px] opacity-40" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[70%] bg-[#C9A227]/5 rounded-full blur-[200px]" />
            </div>

            {/* PRE-OPEN TEXTING */}
            <AnimatePresence>
                {!isOpened && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="mb-12 text-center relative z-10 pointer-events-none"
                    >
                        <h2 className="text-[#EFE7D9]/20 font-black text-xs uppercase tracking-[0.8em] mb-2">Restricted Access</h2>
                        <div className="w-12 h-px bg-[#D43425]/30 mx-auto" />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative z-10 w-full max-w-5xl h-[700px] flex items-center justify-center" style={{ perspective: '2500px' }}>

                {/* CLOSE ICON */}
                <AnimatePresence>
                    {isOpened && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={() => setIsOpened(false)}
                            className="absolute -top-16 right-0 z-[100] p-4 flex items-center gap-3 text-[#EFE7D9]/40 hover:text-[#D43425] transition-all group uppercase font-black text-[10px] tracking-[0.3em]"
                        >
                            <span>Close Ledger</span>
                            <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-[#D43425] group-hover:rotate-90 transition-all">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </div>
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* THE BOOK CASE */}
                <motion.div
                    initial={false}
                    animate={{ x: isOpened ? "25%" : "0%" }}
                    transition={{ duration: 1.2, ease: [0.6, 0.05, -0.01, 0.9] }}
                    className="relative w-[340px] md:w-[420px] h-[580px] md:h-[680px]"
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* BACK LAYER (RIGHT PAGE) */}
                    <div className="absolute inset-0 bg-vellum rounded-r-2xl shadow-3xl border-l border-black/10 flex flex-col items-center justify-center translate-z-0">
                        <Suspense fallback={null}><LoginContent isOpened={isOpened} /></Suspense>
                    </div>

                    {/* FRONT COVER */}
                    <motion.div
                        className="absolute inset-0 z-30 cursor-pointer origin-left"
                        style={{ transformStyle: 'preserve-3d' }}
                        initial={false}
                        animate={{ rotateY: isOpened ? -165 : 0 }}
                        transition={{ duration: 1.5, ease: [0.6, 0.05, -0.01, 0.9] }}
                        onClick={() => !isOpened && setIsOpened(true)}
                    >
                        {/* COVER FRONT */}
                        <div className="absolute inset-0 bg-[#3D2329] rounded-r-2xl border-l-12 md:border-l-15 border-black/40 shadow-2xl flex flex-col items-center justify-center p-12 text-center space-y-12" style={{ backfaceVisibility: 'hidden' }}>
                            <div className="w-28 h-28 border border-[#C9A227]/10 rounded-full flex items-center justify-center relative">
                                <motion.div className="absolute inset-0 border-t border-[#D43425]/30 rounded-full" animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />
                                <span className="text-[#C9A227] text-3xl font-playfair font-black">HP</span>
                            </div>
                            <div className="space-y-4">
                                <h1 className="text-[#EFE7D9] font-playfair font-black text-5xl md:text-6xl italic tracking-tighter leading-none">Internal<br />Reserve</h1>
                                <p className="text-[#C9A227] text-[10px] font-black uppercase tracking-[0.5em] opacity-30">Confidential Ledger</p>
                            </div>
                            <div className="pt-8 text-[#EFE7D9]/20 text-[9px] font-black uppercase tracking-[0.8em] group-hover:text-[#D43425] transition-all">
                                Open Entry
                            </div>
                        </div>

                        {/* COVER INSIDE (Revealed during flip) */}
                        <div className="absolute inset-0 bg-vellum rounded-l-2xl border-r border-[#3D2329]/10 shadow-inner flex flex-col justify-center p-16" style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
                            <div className="space-y-8 opacity-40">
                                <h4 className="font-playfair text-2xl italic font-black text-[#3D2329]">The Rules.</h4>
                                <div className="space-y-4">
                                    {['Silent Service', 'Pure Precision', 'Brand Loyalty'].map((rule, i) => (
                                        <div key={i} className="flex gap-4 items-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#D43425]" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#3D2329]">{rule}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
