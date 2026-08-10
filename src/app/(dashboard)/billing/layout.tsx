'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import SidebarLogoutButton from '@/components/auth/SidebarLogoutButton';
import ThemeToggle from '@/components/ThemeToggle';
import { motion } from 'framer-motion';

export default function BillingLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [restaurantName, setRestaurantName] = useState('HotelPro');
    const [userName, setUserName] = useState('');
    const [userRole, setUserRole] = useState<'ADMIN' | 'MANAGER' | 'CASHIER' | 'WAITER' | string>('ADMIN');
    const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

    useEffect(() => {
        setMounted(true);

        // Load saved sidebar state
        const savedState = localStorage.getItem('billing_sidebar_collapsed');
        if (savedState !== null) {
            setIsCollapsed(savedState === 'true');
        }

        // Auth guard: ADMIN, MANAGER, CASHIER land here for BILLING_ONLY plan
        fetch('/api/auth/me')
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok || !data.success) {
                    window.location.href = '/login?redirect=/billing';
                    return;
                }
                const role = data.user?.role;
                const plan = data.user?.plan;
                
                // Allow ADMIN, MANAGER, CASHIER
                if (!['ADMIN', 'MANAGER', 'CASHIER'].includes(role)) {
                    window.location.href = '/login';
                    return;
                }
                if (plan !== 'BILLING_ONLY' && role === 'ADMIN') {
                    window.location.href = '/admin';
                    return;
                }

                setUserRole(role);
                setUserName(data.user?.name || '');
                setRestaurantName(data.user?.restaurantName || 'My Restaurant');
            })
            .catch(() => router.replace('/login'));
    }, [router]);

    const toggleSidebar = () => {
        setIsCollapsed(prev => {
            const nextState = !prev;
            localStorage.setItem('billing_sidebar_collapsed', String(nextState));
            return nextState;
        });
    };

    const navItems = [
        {
            label: 'Dashboard',
            path: '/billing',
            icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
            show: true,
        },
        {
            label: 'Tables Layout',
            path: '/billing/tables',
            icon: 'M4 6h16M4 12h16M4 18h7',
            show: true,
        },
        {
            label: 'Food Menu',
            path: '/billing/menu',
            icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
            show: true,
        },
        {
            label: 'POS Billing',
            path: '/billing/pos',
            icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
            show: true,
        },
        {
            label: 'Sales Ledger',
            path: '/billing/history',
            icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
            show: true,
        },
        {
            label: 'Settings',
            path: '/billing/settings',
            icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
            show: ['ADMIN', 'MANAGER'].includes(userRole),
        },
    ].filter(item => item.show);

    if (!mounted) return null;

    const isActive = (path: string) => {
        if (path === '/billing') return pathname === '/billing';
        return pathname.startsWith(path);
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 font-sans flex flex-col md:flex-row antialiased overflow-hidden h-screen">

            {/* ── DESKTOP COLLAPSIBLE SIDEBAR ── */}
            <motion.aside
                initial={false}
                animate={{ width: isCollapsed ? 76 : 240 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="hidden md:flex bg-white border-r border-zinc-200/80 flex-col py-6 shrink-0 z-50 relative select-none"
            >
                {/* BRAND LOGO & TOGGLE BUTTON */}
                <div className={`px-4 mb-8 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-2xs">
                            HP
                        </div>
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="truncate"
                            >
                                <h2 className="text-xs font-bold text-zinc-900 truncate leading-tight">{restaurantName}</h2>
                                <p className="text-[10px] text-zinc-400 font-medium">{userRole} Terminal</p>
                            </motion.div>
                        )}
                    </div>

                    {!isCollapsed && (
                        <button
                            onClick={toggleSidebar}
                            className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-all text-xs shrink-0 font-bold"
                            title="Collapse Sidebar"
                        >
                            ‹
                        </button>
                    )}
                </div>

                {/* COLLAPSE TOGGLE BUTTON WHEN COLLAPSED */}
                {isCollapsed && (
                    <div className="px-3 mb-4 flex justify-center">
                        <button
                            onClick={toggleSidebar}
                            className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center transition-all text-xs font-bold shadow-2xs"
                            title="Expand Sidebar"
                        >
                            ›
                        </button>
                    </div>
                )}

                {/* NAVIGATION ITEMS */}
                <nav className="flex flex-col gap-1 px-3 grow overflow-y-auto no-scrollbar">
                    {navItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.label}
                                href={item.path}
                                title={isCollapsed ? item.label : undefined}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${
                                    active
                                        ? 'bg-[#065F46] text-white font-semibold shadow-2xs'
                                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 font-medium'
                                } ${isCollapsed ? 'justify-center' : ''}`}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                    <path d={item.icon} />
                                </svg>
                                {!isCollapsed && (
                                    <span className="text-xs tracking-tight truncate">{item.label}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* USER & LOGOUT FOOTER */}
                <div className="mt-auto px-3 pt-4 border-t border-zinc-100 space-y-2">
                    <ThemeToggle isCollapsed={isCollapsed} />
                    <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                        <SidebarLogoutButton variant="desktop" />
                    </div>
                </div>
            </motion.aside>

            {/* ── MAIN AREA ── */}
            <div className="grow flex flex-col min-w-0 h-full overflow-hidden relative">

                {/* SLIM HEADER */}
                <header className="hidden md:flex h-11 bg-white border-b border-zinc-200/80 items-center justify-between px-6 shrink-0 z-40">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-700">
                            {restaurantName}
                        </span>
                        <span className="text-zinc-300">|</span>
                        <span className="text-xs font-medium text-zinc-500">
                            Terminal ({userRole})
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-zinc-700">{userName || userRole}</span>
                    </div>
                </header>

                <main className="grow overflow-hidden flex flex-col pb-20 md:pb-0">
                    {children}
                </main>

                {/* MOBILE BOTTOM NAV */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-zinc-200/80 flex items-center justify-around px-2 z-100">
                    {navItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.label}
                                href={item.path}
                                className="relative flex flex-col items-center justify-center h-full flex-1"
                            >
                                <div className={`relative flex items-center justify-center p-1.5 transition-all ${active ? 'text-[#065F46]' : 'text-zinc-400'}`}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d={item.icon} />
                                    </svg>
                                </div>
                                <span className={`text-[9px] font-bold tracking-tight ${active ? 'text-[#065F46]' : 'text-zinc-400'}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                    <div className="w-px h-6 bg-zinc-200 mx-1" />
                    <div className="flex-1 flex flex-col items-center justify-center h-full">
                        <SidebarLogoutButton variant="mobile" />
                    </div>
                </nav>
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
