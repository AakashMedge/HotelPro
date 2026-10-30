'use client';

import { useState, FormEvent, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, KeyRound, ShieldCheck, CheckCircle2, X, Loader2, ArrowLeft } from 'lucide-react';

const ROLE_DASHBOARDS: Record<string, string> = {
    ADMIN: '/admin',
    MANAGER: '/manager',
    WAITER: '/waiter',
    KITCHEN: '/kitchen',
    CASHIER: '/cashier',
};

const BILLING_ONLY_DASHBOARD = '/billing';

function LoginContent({ isOpened }: { isOpened: boolean }) {
    const [view, setView] = useState<'LOGIN' | 'RESET'>('LOGIN');
    const [isFlipping, setIsFlipping] = useState(false);
    const [flipDirection, setFlipDirection] = useState<'FORWARD' | 'BACKWARD'>('FORWARD');

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // Auto-dismiss success toast after 4.5 seconds
    useEffect(() => {
        if (!successMsg) return;
        const timer = setTimeout(() => {
            setSuccessMsg('');
        }, 4500);
        return () => clearTimeout(timer);
    }, [successMsg]);

    // Reset via PIN State
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

    const goToReset = () => {
        setResetError('');
        setResetUsername(username);
        setFlipDirection('FORWARD');
        setIsFlipping(true);
        setTimeout(() => {
            setView('RESET');
        }, 550);
        setTimeout(() => {
            setIsFlipping(false);
        }, 1150);
    };

    const goToLogin = () => {
        setFlipDirection('BACKWARD');
        setIsFlipping(true);
        setTimeout(() => {
            setView('LOGIN');
        }, 550);
        setTimeout(() => {
            setIsFlipping(false);
        }, 1150);
    };

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

            // Success: fill in username, leave password blank for manual entry
            setUsername(resetUsername.trim().toLowerCase());
            setPassword('');
            setSuccessMsg('Password updated successfully. Please enter your new password to sign in.');
            setResetUsername('');
            setResetPin('');
            setResetNewPassword('');
            goToLogin();
        } catch {
            setResetError('Network error while resetting password.');
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <div className={`relative w-full h-full flex flex-col items-center justify-center p-6 sm:p-8 md:p-12 transition-opacity duration-700 ${isOpened ? 'opacity-100 delay-500' : 'opacity-0'}`}>
            
            {/* Rapid Page Flutter Animation Sheets */}
            <AnimatePresence>
                {isFlipping && (
                    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden" style={{ perspective: 1800 }}>
                        {/* Leaf 1 */}
                        <motion.div
                            initial={{ rotateY: flipDirection === 'FORWARD' ? 0 : -170, opacity: 0.95 }}
                            animate={{ rotateY: flipDirection === 'FORWARD' ? -170 : 0, opacity: [0.95, 1, 0] }}
                            transition={{ duration: 0.85, ease: [0.45, 0.05, 0.55, 0.95], delay: 0 }}
                            className="absolute inset-0 bg-vellum shadow-2xl origin-left border-l-2 border-[#3D2329]/20"
                            style={{ transformStyle: 'preserve-3d' }}
                        />
                        {/* Leaf 2 */}
                        <motion.div
                            initial={{ rotateY: flipDirection === 'FORWARD' ? 0 : -170, opacity: 0.95 }}
                            animate={{ rotateY: flipDirection === 'FORWARD' ? -170 : 0, opacity: [0.95, 1, 0] }}
                            transition={{ duration: 0.85, ease: [0.45, 0.05, 0.55, 0.95], delay: 0.15 }}
                            className="absolute inset-0 bg-vellum shadow-2xl origin-left border-l-2 border-[#3D2329]/20"
                            style={{ transformStyle: 'preserve-3d' }}
                        />
                        {/* Leaf 3 */}
                        <motion.div
                            initial={{ rotateY: flipDirection === 'FORWARD' ? 0 : -170, opacity: 0.95 }}
                            animate={{ rotateY: flipDirection === 'FORWARD' ? -170 : 0, opacity: [0.95, 1, 0] }}
                            transition={{ duration: 0.85, ease: [0.45, 0.05, 0.55, 0.95], delay: 0.3 }}
                            className="absolute inset-0 bg-vellum shadow-2xl origin-left border-l-2 border-[#3D2329]/20"
                            style={{ transformStyle: 'preserve-3d' }}
                        />
                    </div>
                )}
            </AnimatePresence>

            {/* VIEW 1: STAFF ENTRANCE (LOGIN) */}
            {view === 'LOGIN' && (
                <div className="w-full max-w-sm animate-ink-spread">
                    <div className="text-center mb-6 sm:mb-8 space-y-1.5">
                        <span className="text-[9px] sm:text-[10px] font-black tracking-[0.4em] uppercase opacity-35 text-[#3D2329]">Staff Entrance</span>
                        <h2 className="text-3xl sm:text-4xl font-playfair font-black tracking-tighter italic text-[#3D2329]">Sign In</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="w-full space-y-4 sm:space-y-5">
                        {(error || accessError) && (
                            <div className="bg-[#D43425]/5 border border-[#D43425]/20 rounded-xl px-4 py-2.5 text-center mb-3">
                                <p className="text-[#D43425] text-[10px] font-black uppercase tracking-widest leading-none">
                                    {error || 'Access Denied'}
                                </p>
                            </div>
                        )}

                        <div className="space-y-3 sm:space-y-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-[#3D2329]/50 ml-3">Identifier</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full h-11 sm:h-13 px-5 rounded-full bg-black/5 border border-black/10 text-black font-playfair italic text-base sm:text-lg outline-none focus:border-[#D43425] transition-all"
                                    placeholder="username"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between items-center ml-3 mr-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-[#3D2329]/50">Access Key</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-[10px] text-[#3D2329]/60 hover:text-black flex items-center gap-1 font-bold tracking-wider cursor-pointer"
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
                                        className="w-full h-11 sm:h-13 px-5 pr-12 rounded-full bg-black/5 border border-black/10 text-black font-playfair italic text-base sm:text-lg outline-none focus:border-[#D43425] transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pr-1">
                            <button
                                type="button"
                                onClick={goToReset}
                                className="text-[10px] sm:text-[11px] font-bold text-[#3D2329]/70 hover:text-[#D43425] transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                                <KeyRound className="w-3 h-3 text-[#D43425]" />
                                Forgot Password? Reset via PIN →
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-11 sm:h-13 bg-[#3D2329] text-white rounded-full font-black text-[10px] uppercase tracking-[0.4em] shadow-xl hover:bg-black active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            {isLoading ? 'Verifying...' : 'Unlock Entry'}
                        </button>
                    </form>
                </div>
            )}

            {/* VIEW 2: RESET PASSWORD PAGE */}
            {view === 'RESET' && (
                <div className="w-full max-w-sm animate-ink-spread">
                    {/* Return Navigation */}
                    <div className="flex items-center mb-5 pb-2 border-b border-[#3D2329]/10">
                        <button
                            type="button"
                            onClick={goToLogin}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-[#3D2329]/70 hover:text-[#D43425] transition-colors cursor-pointer"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back to Sign In
                        </button>
                    </div>

                    <div className="text-center mb-6 space-y-1">
                        <h2 className="text-2xl sm:text-3xl font-playfair font-black tracking-tight italic text-[#3D2329]">Reset Password</h2>
                        <p className="text-[10px] sm:text-[11px] text-[#3D2329]/60 font-serif italic">Enter your security PIN to set a new password</p>
                    </div>

                    {resetError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2 text-xs font-serif italic text-center mb-3">
                            {resetError}
                        </div>
                    )}

                    <form onSubmit={handleResetPassword} className="space-y-3.5">
                        <div className="space-y-1">
                            <label className="block text-[9px] font-black uppercase tracking-widest text-[#3D2329]/60 ml-1">Username / Identifier</label>
                            <input
                                type="text"
                                required
                                value={resetUsername}
                                onChange={(e) => setResetUsername(e.target.value)}
                                placeholder="your_admin_username"
                                className="w-full px-4 py-2.5 bg-black/5 rounded-xl border border-black/10 text-[#3D2329] font-playfair italic text-sm outline-none focus:border-[#D43425] transition-all placeholder:text-[#3D2329]/30"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[9px] font-black uppercase tracking-widest text-[#3D2329]/60 ml-1">Security PIN (4-6 digits)</label>
                            <input
                                type="password"
                                required
                                maxLength={6}
                                value={resetPin}
                                onChange={(e) => setResetPin(e.target.value)}
                                placeholder="••••"
                                className="w-full px-4 py-2.5 bg-black/5 rounded-xl border border-black/10 text-[#3D2329] font-mono tracking-widest text-base outline-none focus:border-[#D43425] transition-all placeholder:text-[#3D2329]/30"
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between items-center ml-1 mr-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-[#3D2329]/60">New Password</label>
                                <button
                                    type="button"
                                    onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                                    className="text-[9px] text-[#3D2329]/70 hover:text-[#D43425] font-black uppercase tracking-wider cursor-pointer"
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
                                className="w-full px-4 py-2.5 bg-black/5 rounded-xl border border-black/10 text-[#3D2329] font-playfair italic text-sm outline-none focus:border-[#D43425] transition-all placeholder:text-[#3D2329]/30"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={resetLoading}
                            className="w-full py-3.5 bg-[#3D2329] hover:bg-black disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-full transition-all shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center gap-2 mt-4 cursor-pointer"
                        >
                            {resetLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                            {resetLoading ? 'Updating Password...' : 'Update Password'}
                        </button>
                    </form>
                </div>
            )}

            <div className="mt-6 sm:mt-8 text-[8px] font-black uppercase tracking-[0.3em] opacity-25 text-center text-[#3D2329]">
                Private Ledger • HotelPro Reserve
            </div>

            {/* Floating Toast Notification Outside The Ledger - Bottom Right */}
            <AnimatePresence>
                {successMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-200 max-w-sm flex items-center gap-3 px-5 py-3.5 bg-[#1F1416]/95 backdrop-blur-md text-[#EFE7D9] rounded-2xl border border-emerald-500/30 shadow-[0_20px_45px_rgba(0,0,0,0.6)]"
                    >
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex-1 pr-1">
                            <p className="text-xs font-semibold text-emerald-300 leading-snug">
                                {successMsg}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSuccessMsg('')}
                            className="text-[#EFE7D9]/40 hover:text-[#EFE7D9] transition-colors p-1 cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function LoginPage() {
    const [isOpened, setIsOpened] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [windowSize, setWindowSize] = useState({ width: 1200, height: 800 });
    const router = useRouter();

    const handleCloseLedger = () => {
        setIsOpened(false);
        // Wait for book closing 3D flip animation to finish before redirecting
        setTimeout(() => {
            router.push('/home');
        }, 850);
    };

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
                            onClick={handleCloseLedger}
                            className="absolute -top-12 sm:-top-16 right-2 sm:right-0 z-100 p-4 flex items-center gap-2 sm:gap-3 text-[#EFE7D9]/40 hover:text-[#D43425] transition-all group uppercase font-black text-[9px] sm:text-[10px] tracking-[0.3em] cursor-pointer"
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
