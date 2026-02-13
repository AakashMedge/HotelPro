'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import SidebarLogoutButton from '@/components/auth/SidebarLogoutButton';

export default function ManagerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState<{ name: string, plan: string } | null>(null);
    const [authChecking, setAuthChecking] = useState(true);

    useEffect(() => {
        setMounted(true);
        fetch('/api/auth/me')
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok || !data.success) {
                    router.replace('/login?redirect=/manager&error=AUTH_REQUIRED');
                    return;
                }

                const role = data.user?.role as string | undefined;
                if (role && !['MANAGER', 'ADMIN'].includes(role)) {
                    const roleRoute: Record<string, string> = {
                        WAITER: '/waiter',
                        KITCHEN: '/kitchen',
                        CASHIER: '/cashier',
                        ADMIN: '/admin',
                        MANAGER: '/manager',
                    };
                    router.replace(roleRoute[role] || '/login');
                    return;
                }

                setUser(data.user);
            })
            .catch(console.error)
            .finally(() => setAuthChecking(false));
    }, [router]);

    const allNavItems = [
        { label: 'DIRECTOR', path: '/manager', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', feature: null },
        { label: 'STAFF', path: '/manager/staff', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m16-10a4 4 0 00-4-4H5a4 4 0 00-4 4v2m16-10a4 4 0 00-4-4H5a4 4 0 00-4 4v2', feature: null },
        { label: 'FLOOR', path: '/manager/floor', icon: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm2 0v12h12V6H6z M8 10h8 M8 14h4', feature: null },
        { label: 'MENU', path: '/manager/menu', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', feature: null },
        { label: 'LEDGER', path: '/manager/ledger', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', feature: 'INVENTORY_MANAGEMENT' },
        { label: 'HUB', path: '/manager/hub', icon: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z', feature: null },
        { label: 'SETTINGS', path: '/manager/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', feature: null },
    ];

    // Filter items based on plan
    // Note: In production, we'd use lib/subscription, but here we check user context
    const navItems = allNavItems.filter(item => {
        if (!item.feature) return true;
        if (!user) return true; // Show all until loaded or handle otherwise

        // Custom check for DEMO purpose
        if (user.plan === 'BASIC' && item.feature === 'INVENTORY_MANAGEMENT') return false;
        return true;
    });

    if (!mounted || authChecking) {
        return <div className="min-h-screen bg-[#FDFCF9] flex items-center justify-center text-xs font-black uppercase tracking-widest text-zinc-400">Verifying session...</div>;
    }

    return (
        <div className="min-h-screen bg-[#FDFCF9] text-[#1A1A1A] font-sans flex flex-col md:flex-row antialiased overflow-hidden h-screen">

            {/* PROFESSIONAL STAFF SIDEBAR */}
            <aside className="hidden md:flex w-20 lg:w-24 bg-[#0F0F0F] flex-col items-center py-6 lg:py-8 shrink-0 z-50">
                <div className="mb-8 lg:mb-12">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#D43425] rounded-xl flex items-center justify-center font-black text-white text-lg lg:text-xl shadow-lg shadow-red-900/20">
                        HP
                    </div>
                </div>

                <nav className="flex flex-col gap-6 lg:gap-8 grow">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                href={item.path}
                                key={item.label}
                                className={`flex flex-col items-center gap-1.5 lg:gap-2 group transition-all ${isActive ? 'text-[#D43425]' : 'text-zinc-500 hover:text-white'}`}
                            >
                                <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-[#D43425]/10 border border-[#D43425]/20 shadow-[0_0_15px_rgba(212,52,37,0.1)]' : 'bg-white/5 border border-white/5'}`}>
                                    <svg width="20" height="20" className="lg:w-[22px] lg:h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d={item.icon} />
                                    </svg>
                                </div>
                                <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.15em]">{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="mt-auto">
                    <SidebarLogoutButton variant="desktop" />
                </div>
            </aside>

            {/* MOBILE BOTTOM NAVIGATION */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#0F0F0F] border-t border-white/5 flex items-center justify-around h-16 sm:h-20 px-4 z-100 pb-[env(safe-area-inset-bottom)]">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            href={item.path}
                            key={item.label}
                            className={`flex flex-col items-center gap-1 opacity-40 transition-all ${isActive ? 'opacity-100 text-[#D43425]' : 'text-zinc-500'}`}
                        >
                            <div className={`w-9 h-9 flex items-center justify-center ${isActive ? 'bg-[#D43425]/10 rounded-xl' : ''}`}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d={item.icon} />
                                </svg>
                            </div>
                            <span className="text-[7px] font-black uppercase tracking-widest leading-none">{item.label}</span>
                        </Link>
                    )
                })}
                <SidebarLogoutButton variant="mobile" />
            </nav>

            {/* MAIN OPERATIONS FRAME */}
            <div className="grow flex flex-col min-w-0 h-full overflow-hidden">
                {/* REFINED HEADER */}
                <header className="h-14 md:h-16 lg:h-20 bg-white border-b border-zinc-200 flex items-center justify-between px-4 md:px-6 lg:px-8 shrink-0 shadow-sm relative z-40">
                    <div className="flex flex-col">
                        <h2 className="text-[7px] md:text-[8px] lg:text-[10px] font-bold text-zinc-400 uppercase tracking-[0.4em] leading-none mb-1 md:mb-1.5 lg:mb-2 italic font-playfair">Floor Intelligence</h2>
                        <div className="flex items-center gap-2 md:gap-3">
                            <span className="text-sm md:text-lg lg:text-xl font-black tracking-tight uppercase">Control_Center_HQ</span>
                            <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-8">
                        <div className="hidden sm:flex flex-col items-end leading-none border-r border-zinc-100 pr-4 md:pr-6 lg:pr-8 mr-2 md:mr-4 lg:mr-8">
                            <span className="text-[7px] md:text-[9px] lg:text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5 md:mb-1">Operations Lead</span>
                            <span className="text-[10px] md:text-sm font-black italic uppercase whitespace-nowrap">{user?.name || 'LEAD_DIRECTOR'}</span>
                        </div>
                        <div className="bg-zinc-950 text-white px-3 md:px-5 lg:px-6 py-1 md:py-2 lg:py-2.5 rounded-lg lg:rounded-xl border border-white/10 flex flex-col items-center">
                            <span className="text-[6px] md:text-[7px] lg:text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-0.5 lg:mb-1">Service Health</span>
                            <span className="text-[10px] md:text-xs lg:text-sm font-black tabular-nums text-green-400 uppercase tracking-tighter">OPTIMAL_FLOW</span>
                        </div>
                    </div>
                </header>

                <main className="grow overflow-hidden flex flex-col pb-16 sm:pb-20 md:pb-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
