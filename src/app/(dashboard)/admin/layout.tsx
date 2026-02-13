'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import SidebarLogoutButton from '@/components/auth/SidebarLogoutButton';
import { LayoutDashboard, Users, BarChart3, Map, ShieldCheck, History, CreditCard, Settings, ChevronRight, MessageSquare } from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [authChecking, setAuthChecking] = useState(true);

    useEffect(() => {
        setMounted(true);
        fetch('/api/auth/me')
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok || !data.success) {
                    router.replace('/login?redirect=/admin&error=AUTH_REQUIRED');
                    return;
                }

                const role = data.user?.role as string | undefined;
                if (role && !['ADMIN', 'MANAGER'].includes(role)) {
                    const roleRoute: Record<string, string> = {
                        WAITER: '/waiter',
                        KITCHEN: '/kitchen',
                        CASHIER: '/cashier',
                        ADMIN: '/admin',
                        MANAGER: '/manager',
                    };
                    router.replace(roleRoute[role] || '/login');
                }
            })
            .catch(console.error)
            .finally(() => setAuthChecking(false));
    }, [router]);

    const navItems = [
        { label: 'Dashboard', path: '/admin', icon: LayoutDashboard, color: 'text-zinc-600', bg: 'bg-zinc-50' },
        { label: 'HUB', path: '/admin/hub', icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Staff', path: '/admin/staff', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Analytics', path: '/admin/analytics', icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Architecture', path: '/admin/architecture', icon: Map, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'Compliance', path: '/admin/compliance', icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Logs', path: '/admin/logs', icon: History, color: 'text-rose-600', bg: 'bg-rose-50' },
        { label: 'Billing', path: '/admin/billing', icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Settings', path: '/admin/settings', icon: Settings, color: 'text-slate-600', bg: 'bg-slate-50' },
    ];

    if (!mounted || authChecking) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium text-slate-500 animate-pulse">Initializing System...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col md:flex-row antialiased overflow-hidden h-screen">

            {/* MODERN SIDEBAR */}
            <aside className="hidden md:flex w-64 lg:w-72 bg-white flex-col border-r border-slate-200 shrink-0 z-50 overflow-hidden">
                <div className="p-8 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 ring-4 ring-indigo-50">
                            <span className="text-white font-bold text-lg">H</span>
                        </div>
                        <div>
                            <h1 className="font-bold text-slate-900 leading-none tracking-tight text-lg">HotelPro</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Admin Panel</p>
                        </div>
                    </div>
                </div>

                <nav className="flex flex-col gap-1 p-4 grow overflow-y-auto no-scrollbar">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-2 mt-4">Main Menu</p>
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <Link
                                href={item.path}
                                key={item.label}
                                className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all group ${isActive
                                    ? `${item.bg} ${item.color} shadow-sm shadow-slate-100`
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isActive ? 'bg-white shadow-sm' : 'bg-transparent'
                                        }`}>
                                        <Icon className={`w-4 h-4 ${isActive ? item.color : 'text-slate-400 group-hover:text-slate-600'}`} />
                                    </div>
                                    <span className="text-sm font-semibold">{item.label}</span>
                                </div>
                                {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <SidebarLogoutButton variant="desktop" />
                </div>
            </aside>

            {/* MOBILE NAVIGATION */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 flex items-center justify-between h-16 px-6 z-100 pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-black/10">
                {navItems.slice(0, 4).map((item) => {
                    const isActive = pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <Link
                            href={item.path}
                            key={item.label}
                            className={`flex flex-col items-center gap-1 transition-all ${isActive ? item.color : 'text-slate-400'}`}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-[9px] font-bold">{item.label}</span>
                        </Link>
                    )
                })}
                <SidebarLogoutButton variant="mobile" />
            </nav>

            {/* MAIN CONTENT AREA */}
            <div className="grow flex flex-col min-w-0 h-full overflow-hidden">
                <header className="h-16 md:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-10 shrink-0 relative z-40">
                    <div>
                        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Administrator Dashboard</h2>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-base md:text-lg font-bold text-slate-900 tracking-tight">System Operational</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-xs font-bold text-slate-900">Admin Master</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Super User</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                            <div className="w-full h-full bg-linear-to-br from-indigo-500 to-purple-500" />
                        </div>
                    </div>
                </header>

                <main className="grow overflow-hidden flex flex-col pb-16 md:pb-0">
                    <div className="h-full overflow-y-auto custom-scrollbar">
                        {children}
                    </div>
                </main>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #E2E8F0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #CBD5E1;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}
