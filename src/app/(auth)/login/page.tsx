'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Role to dashboard path mapping
 */
const ROLE_DASHBOARDS: Record<string, string> = {
    ADMIN: '/admin',
    MANAGER: '/manager',
    WAITER: '/waiter',
    KITCHEN: '/kitchen',
    CASHIER: '/cashier',
};

function LoginContent() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get redirect URL from query params (set by middleware)
    const redirectTo = searchParams.get('redirect');
    const accessError = searchParams.get('error');

    /**
     * Handle login form submission
     */
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

            // Success - redirect based on role
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

    /**
     * Quick login with demo credentials (updated to match seed)
     */
    const quickLogin = async (demoUsername: string, demoPassword: string) => {
        setUsername(demoUsername);
        setPassword(demoPassword);
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: demoUsername,
                    password: demoPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Demo authentication failed');
                setIsLoading(false);
                return;
            }

            const dashboard = ROLE_DASHBOARDS[data.user.role] || '/';
            router.push(dashboard);
            router.refresh();
        } catch {
            setError('Network error during demo entry.');
            setIsLoading(false);
        }
    };

    return (
        <div className={`max-w-md w-full relative z-10 transition-all duration-700 ${isLoading ? 'scale-95 opacity-50 blur-sm' : 'scale-100 opacity-100'}`}>
            {/* Branding */}
            <div className="text-center mb-10 space-y-4">
                <div className="flex items-center justify-center gap-4 mb-2">
                    <span className="w-12 h-px bg-[#D43425]/30" />
                    <span className="text-[#C9A227] text-[10px] font-black tracking-[0.5em] uppercase">Staff Access</span>
                    <span className="w-12 h-px bg-[#D43425]/30" />
                </div>
                <h1 className="text-[#EFE7D9] font-playfair font-black text-6xl tracking-tighter italic leading-tight">Staff Portal</h1>
                <p className="text-[#EFE7D9]/40 text-[10px] font-black uppercase tracking-[0.4em]">Integrated Hospitality Logistics</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-black/20 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-8 md:p-12 shadow-[0_32px_64px_rgba(0,0,0,0.5)] space-y-8">
                {/* Error Messages */}
                {(error || accessError) && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-6 py-4 text-center animate-in fade-in slide-in-from-top-2">
                        <p className="text-red-400 text-[11px] font-bold uppercase tracking-widest">
                            {error || (accessError === 'access_denied' ? 'Access Denied: Restricted Zone' : 'System Error')}
                        </p>
                    </div>
                )}

                <div className="space-y-6">
                    <div className="group space-y-2">
                        <label htmlFor="username" className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9A227] ml-4 transition-all opacity-60 group-focus-within:opacity-100 group-focus-within:translate-x-1">
                            Employee Identifier
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full h-16 px-8 rounded-full bg-white/5 border border-white/10 text-[#EFE7D9] font-playfair italic text-lg outline-none focus:border-[#D43425] focus:bg-white/10 transition-all placeholder:text-white/10"
                            placeholder="Enter Username"
                            required
                            autoComplete="username"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="group space-y-2">
                        <label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9A227] ml-4 transition-all opacity-60 group-focus-within:opacity-100 group-focus-within:translate-x-1">
                            Authentication Key
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-16 px-8 rounded-full bg-white/5 border border-white/10 text-[#EFE7D9] font-playfair italic text-lg outline-none focus:border-[#D43425] focus:bg-white/10 transition-all placeholder:text-white/10"
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-16 bg-[#D43425] text-white rounded-full font-black text-xs uppercase tracking-[0.5em] shadow-2xl hover:bg-[#EFE7D9] hover:text-[#3D2329] transition-all active:scale-95 flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <span className="group-hover:translate-x-1 transition-transform">Authorize Entry</span>
                        <svg className="w-4 h-4 transition-all group-hover:rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                            <polyline points="10 17 15 12 10 7"></polyline>
                            <line x1="15" y1="12" x2="3" y2="12"></line>
                        </svg>
                    </button>
                </div>

                {/* Quick Role Selectors for Demo (Updated Credentials) */}
                <div className="pt-8 border-t border-white/5">
                    <p className="text-center text-[9px] font-black uppercase tracking-[0.3em] text-[#C9A227]/40 mb-6 italic">Secure Quick Access</p>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { name: 'Waiter', username: 'waiter1', password: 'password123' },
                            { name: 'Kitchen', username: 'kitchen1', password: 'password123' },
                            { name: 'Cashier', username: 'cashier1', password: 'password123' },
                            { name: 'Manager', username: 'manager', password: 'password123' },
                        ].map((role) => (
                            <button
                                key={role.name}
                                type="button"
                                onClick={() => quickLogin(role.username, role.password)}
                                disabled={isLoading}
                                className="px-6 py-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center gap-3 hover:bg-[#D43425]/20 hover:border-[#D43425]/40 transition-all text-[#EFE7D9] group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity whitespace-nowrap">{role.name}</span>
                            </button>
                        ))}
                    </div>
                    <p className="text-center text-[8px] text-white/10 mt-6 font-bold tracking-widest uppercase">
                        Admin: admin | password123
                    </p>
                </div>
            </form>

            <div className="mt-12 text-center text-[9px] font-black uppercase tracking-[0.5em] text-[#EFE7D9]/20">
                © 2026 HotelPro Reserve • Elite Staff Ecosystem
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#3D2329]/80 backdrop-blur-sm animate-in fade-in duration-500">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 border-4 border-[#D43425]/20 rounded-full" />
                        <div className="absolute inset-0 border-4 border-[#D43425] rounded-full border-t-transparent animate-spin" />
                        <div className="absolute inset-4 border border-[#C9A227]/20 rounded-full animate-pulse" />
                    </div>
                    <p className="mt-8 text-[#C9A227] font-black text-xs uppercase tracking-[0.6em] animate-pulse">Verifying Credentials</p>
                </div>
            )}
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#3D2329] relative overflow-hidden font-sans">
            {/* Background Ambience - Premium Glows */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#D43425] rounded-full blur-[180px] opacity-15 animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-20%] w-[70%] h-[70%] bg-[#C9A227] rounded-full blur-[200px] opacity-5 animate-pulse delay-1000" />

                {/* Texture Overlay */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/mocha-grunge.png")' }} />
            </div>

            <Suspense fallback={
                <div className="flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-[#D43425]/20 border-t-[#D43425] rounded-full animate-spin" />
                </div>
            }>
                <LoginContent />
            </Suspense>
        </div>
    );
}
