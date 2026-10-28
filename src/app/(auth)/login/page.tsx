'use client';

import { useState, FormEvent, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, KeyRound, ShieldCheck, CheckCircle2, X, Loader2 } from 'lucide-react';

const ROLE_DASHBOARDS: Record<string, string> = {
    ADMIN: '/admin',
    MANAGER: '/manager',
    WAITER: '/waiter',
    KITCHEN: '/kitchen',
    CASHIER: '/cashier',
};

const BILLING_ONLY_DASHBOARD = '/billing';

function LoginContent({ isOpened }: { isOpened: boolean }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // Reset via PIN State
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetUsername, setResetUsername] = useState('');
    const [resetPin, setResetPin] = useState('');
    const [resetNewPassword, setResetNewPassword] = useState('');
    const [showResetNewPassword, setShowResetNewPassword] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetError, setResetError] = useState('');

    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirect');
    const accessError = searchParams.get('error');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
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

            // After login, check plan to decide where to redirect
            let dashboard = ROLE_DASHBOARDS[data.user.role] || '/';

            if (data.user?.plan === 'BILLING_ONLY' && ['ADMIN', 'MANAGER', 'CASHIER'].includes(data.user.role)) {
                dashboard = BILLING_ONLY_DASHBOARD;
            } else {
                try {
                    const meRes = await fetch('/api/auth/me');
                    const meData = await meRes.json();
                    if (meData.success && meData.user?.plan === 'BILLING_ONLY') {
                        dashboard = BILLING_ONLY_DASHBOARD;
                    }
                } catch { /* ignore, use default dashboard */ }
            }

            if (redirectTo && redirectTo.startsWith(dashboard)) {
                window.location.href = redirectTo;
            } else {
                window.location.href = dashboard;
            }
        } catch {
            setError('System connectivity issue. Please retry.');
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: FormEvent) => {
        e.preventDefault();
        setResetError('');
        setResetLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: resetUsername.trim().toLowerCase(),
                    pin: resetPin.trim(),
                    newPassword: resetNewPassword,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                setResetError(data.error || 'Password reset failed');
                setResetLoading(false);
                return;
            }

            // Success: fill in login form and close modal
            setUsername(resetUsername.trim().toLowerCase());
            setPassword(resetNewPassword);
            setSuccessMsg('Password updated! Click "Unlock Entry" to login.');
            setShowResetModal(false);
            setResetUsername('');
            setResetPin('');
            setResetNewPassword('');
        } catch {
            setResetError('Network error while resetting password.');
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <div className={`w-full h-full flex flex-col items-center justify-center p-6 sm:p-8 md:p-12 transition-opacity duration-700 ${isOpened ? 'opacity-100 delay-500' : 'opacity-0'}`}>
            <div className="text-center mb-6 sm:mb-10 space-y-2">
                <span className="text-[9px] sm:text-[10px] font-black tracking-[0.4em] uppercase opacity-30 text-[#3D2329]">Staff Entrance</span>
                <h2 className="text-3xl sm:text-4xl font-playfair font-black tracking-tighter italic text-[#3D2329]">Sign In</h2>
            </div>

            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 sm:space-y-6">
                {(error || accessError) && (
                    <div className="bg-[#D43425]/5 border border-[#D43425]/20 rounded-xl px-4 py-3 text-center mb-4">
                        <p className="text-[#D43425] text-[10px] font-black uppercase tracking-widest leading-none">
                            {error || 'Access Denied'}
                        </p>
                    </div>
                )}

                {successMsg && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-center mb-4">
                        <p className="text-emerald-700 text-[11px] font-bold leading-snug">
                            {successMsg}
                        </p>
                    </div>
                )}

                <div className="space-y-3 sm:space-y-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-[#3D2329]/40 ml-4">Identifier</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full h-12 sm:h-14 px-6 rounded-full bg-black/5 border border-black/10 text-black font-playfair italic text-lg outline-none focus:border-[#D43425] transition-all"
                            placeholder="username"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center ml-4 mr-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-[#3D2329]/40">Access Key</label>
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-[10px] text-[#3D2329]/60 hover:text-black flex items-center gap-1 font-bold tracking-wider"
                            >
                                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                {showPassword ? 'HIDE' : 'SHOW'}
                            </button>
                        </div>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-12 sm:h-14 px-6 pr-12 rounded-full bg-black/5 border border-black/10 text-black font-playfair italic text-lg outline-none focus:border-[#D43425] transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pr-2">
                    <button
                        type="button"
                        onClick={() => {
                            setResetError('');
                            setResetUsername(username);
                            setShowResetModal(true);
                        }}
                        className="text-[11px] font-bold text-[#3D2329]/70 hover:text-[#D43425] transition-colors"
                    >
                        Forgot Password? Reset via PIN
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 sm:h-14 bg-[#3D2329] text-white rounded-full font-black text-[10px] uppercase tracking-[0.4em] shadow-xl hover:bg-black active:scale-95 transition-all disabled:opacity-50"
                >
                    {isLoading ? 'Verifying...' : 'Unlock Entry'}
                </button>
            </form>

            {/* Reset Password via Security PIN Modal */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                                    <KeyRound className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Reset Password</h3>
                                    <p className="text-[10px] text-slate-400">Verify using your Security PIN</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowResetModal(false)}
                                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {resetError && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-xl px-3 py-2 text-xs font-medium">
                                {resetError}
                            </div>
                        )}

                        <form onSubmit={handleResetPassword} className="space-y-3.5">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Username / Identifier</label>
                                <input
                                    type="text"
                                    required
                                    value={resetUsername}
                                    onChange={(e) => setResetUsername(e.target.value)}
                                    placeholder="your_admin_username"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Security PIN (4-6 digits)</label>
                                <input
                                    type="password"
                                    required
                                    maxLength={6}
                                    value={resetPin}
                                    onChange={(e) => setResetPin(e.target.value)}
                                    placeholder="••••"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-mono tracking-widest text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                                />
                                <p className="text-[9px] text-slate-400 mt-1">Initial PIN provided by Super Admin during setup</p>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[11px] font-bold text-slate-700">New Password</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                                        className="text-[10px] text-amber-700 font-bold"
                                    >
                                        {showResetNewPassword ? 'HIDE' : 'SHOW'}
                                    </button>
                                </div>
                                <input
                                    type={showResetNewPassword ? 'text' : 'password'}
                                    required
                                    minLength={6}
                                    value={resetNewPassword}
                                    onChange={(e) => setResetNewPassword(e.target.value)}
                                    placeholder="At least 6 characters"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={resetLoading}
                                className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 mt-2"
                            >
                                {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                {resetLoading ? 'Verifying PIN...' : 'Save & Update Password'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="mt-8 sm:mt-10 text-[8px] font-black uppercase tracking-[0.3em] opacity-20 text-center text-[#3D2329]">
                Private Ledger • HotelPro Reserve
            </div>
        </div>
    );
}

export default function LoginPage() {
    const [isOpened, setIsOpened] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [windowSize, setWindowSize] = useState({ width: 1200, height: 800 });

    useEffect(() => {
        setMounted(true);
        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = windowSize.width < 768;
    const isSmallMobile = windowSize.width < 400;

    // Intelligent responsive sizing
    const bookWidth = useMemo(() => {
        if (isSmallMobile) return Math.min(windowSize.width - 32, 340);
        if (isMobile) return 360;
        return 420;
    }, [isMobile, isSmallMobile, windowSize.width]);

    const bookHeight = useMemo(() => {
        if (windowSize.height < 600) return windowSize.height - 100;
        if (isMobile) return 580;
        return 680;
    }, [isMobile, windowSize.height]);

    // Calculate dynamic translation to keep the "opened" book visible
    const translateX = useMemo(() => {
        if (!isOpened) return "0%";
        if (isMobile) return "0%"; // Keep centered on mobile
        return "20%"; // Shift slightly on desktop
    }, [isOpened, isMobile]);

    if (!mounted) return <div className="min-h-screen bg-[#0E0809]" />;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0809] p-4 sm:p-6 relative overflow-hidden font-sans">
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
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.3 } }}
                        className="mb-8 sm:mb-12 text-center relative z-10 pointer-events-none"
                    >
                        <h2 className="text-[#EFE7D9]/20 font-black text-[10px] sm:text-xs uppercase tracking-[0.8em] mb-2">Restricted Access</h2>
                        <div className="w-12 h-px bg-[#D43425]/30 mx-auto" />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={`relative z-10 w-full max-w-5xl flex items-center justify-center transition-all duration-500 ${isOpened ? 'mt-4' : 'mt-0'}`} style={{ perspective: isMobile ? '1500px' : '2500px', height: bookHeight }}>

                {/* CLOSE ICON */}
                <AnimatePresence>
                    {isOpened && (
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            onClick={() => setIsOpened(false)}
                            className="absolute -top-12 sm:-top-16 right-2 sm:right-0 z-100 p-4 flex items-center gap-2 sm:gap-3 text-[#EFE7D9]/40 hover:text-[#D43425] transition-all group uppercase font-black text-[9px] sm:text-[10px] tracking-[0.3em]"
                        >
                            <span className={isMobile ? "text-[#D43425]" : "block"}>Close Ledger</span>
                            <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-[#D43425] group-hover:rotate-90 transition-all bg-black/40 backdrop-blur-sm">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </div>
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* THE BOOK CASE */}
                <motion.div
                    initial={false}
                    animate={{
                        x: translateX,
                        scale: isOpened && isMobile ? 1.05 : 1
                    }}
                    transition={{ duration: isMobile ? 0.8 : 1.2, ease: [0.6, 0.05, -0.01, 0.9] }}
                    className="relative"
                    style={{
                        transformStyle: 'preserve-3d',
                        width: bookWidth,
                        height: bookHeight
                    }}
                >
                    {/* BACK LAYER (RIGHT PAGE) - The Form */}
                    <div className="absolute inset-0 bg-vellum rounded-r-2xl sm:rounded-r-3xl shadow-3xl border-l border-black/10 flex flex-col items-center justify-center translate-z-0 overflow-hidden">
                        <Suspense fallback={null}><LoginContent isOpened={isOpened} /></Suspense>
                    </div>

                    {/* FRONT COVER */}
                    <motion.div
                        className="absolute inset-0 z-30 cursor-pointer origin-left"
                        style={{ transformStyle: 'preserve-3d' }}
                        initial={false}
                        animate={{ rotateY: isOpened ? (isMobile ? -175 : -165) : 0 }}
                        transition={{ duration: isMobile ? 1.0 : 1.5, ease: [0.6, 0.05, -0.01, 0.9] }}
                        onClick={() => !isOpened && setIsOpened(true)}
                    >
                        {/* COVER FRONT */}
                        <div className="absolute inset-0 bg-[#3D2329] rounded-r-2xl sm:rounded-r-3xl border-l-8 sm:border-l-12 md:border-l-15 border-black/40 shadow-2xl flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-8 sm:space-y-12" style={{ backfaceVisibility: 'hidden' }}>
                            <div className="w-20 h-20 sm:w-28 sm:h-28 border border-[#C9A227]/10 rounded-full flex items-center justify-center relative">
                                <motion.div className="absolute inset-0 border-t border-[#D43425]/30 rounded-full" animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />
                                <span className="text-[#C9A227] text-2xl sm:text-3xl font-playfair font-black">HP</span>
                            </div>
                            <div className="space-y-3 sm:space-y-4">
                                <h1 className="text-[#EFE7D9] font-playfair font-black text-4xl sm:text-5xl md:text-6xl italic tracking-tighter leading-none">Internal<br />Reserve</h1>
                                <p className="text-[#C9A227] text-[8px] sm:text-[10px] font-black uppercase tracking-[0.5em] opacity-30">Confidential Ledger</p>
                            </div>
                            <div className="pt-4 sm:pt-8 text-[#EFE7D9]/20 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.8em] group-hover:text-[#D43425] transition-all">
                                Open Entry
                            </div>
                        </div>

                        {/* COVER INSIDE (Revealed during flip) */}
                        <div className="absolute inset-0 bg-vellum rounded-l-2xl sm:rounded-l-3xl border-r border-[#3D2329]/10 shadow-inner flex flex-col justify-center p-8 sm:p-16" style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
                            <div className="space-y-6 sm:space-y-8 opacity-40">
                                <h4 className="font-playfair text-xl sm:text-2xl italic font-black text-[#3D2329]">The Rules.</h4>
                                <div className="space-y-3 sm:space-y-4">
                                    {['Silent Service', 'Pure Precision', 'Brand Loyalty'].map((rule, i) => (
                                        <div key={i} className="flex gap-4 items-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#D43425]" />
                                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[#3D2329]">{rule}</span>
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
