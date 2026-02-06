'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SidebarLogoutButton from '@/components/auth/SidebarLogoutButton';
import { motion } from 'framer-motion';

export default function KitchenLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState<{ name: string } | null>(null);

    useEffect(() => {
        setMounted(true);
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.success) setUser(data.user);
            })
            .catch(console.error);
    }, []);

    const navItems = [
        { label: 'KDS', path: '/kitchen', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
        { label: 'Stock', path: '/kitchen/inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
        { label: 'History', path: '/kitchen/history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    ];

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-[#111111] font-sans flex flex-col md:flex-row antialiased overflow-hidden h-screen">

            {/* 1. MINIMALIST DESKTOP SIDEBAR */}
            <aside className="hidden md:flex w-20 bg-white border-r border-zinc-100 flex-col items-center py-8 shrink-0 z-50">
                <div className="mb-10">
                    <div className="w-10 h-10 bg-[#111111] rounded-lg flex items-center justify-center font-bold text-white text-xs">
                        HP
                    </div>
                </div>

                <nav className="flex flex-col gap-6 grow">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.label}
                                href={item.path}
                                className={`flex flex-col items-center gap-1.5 group transition-all relative ${isActive ? 'text-[#111111]' : 'text-zinc-400 hover:text-zinc-600'}`}
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-zinc-50' : 'hover:bg-zinc-50/50'}`}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d={item.icon} />
                                    </svg>
                                </div>
                                <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="mt-auto">
                    <SidebarLogoutButton variant="desktop" />
                </div>
            </aside>

            {/* 2. MAIN OPERATIONS AREA */}
            <div className="grow flex flex-col min-w-0 h-full overflow-hidden relative">

                {/* CLEAN MINIMALIST HEADER */}
                <header className="h-16 bg-white border-b border-zinc-100 flex items-center justify-between px-6 md:px-8 shrink-0 z-40">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest leading-none mb-1">Kitchen Display System</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold tracking-tight text-[#111111]">Main Station</span>
                            <div className="w-1 h-1 rounded-full bg-red-500" />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-zinc-100">
                            <span className="text-[10px] font-bold text-[#111111]">HotelPro</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-bold text-[#111111] whitespace-nowrap">{user?.name || 'Chef_Staff'}</span>
                                <span className="text-[8px] font-medium text-zinc-400 uppercase tracking-widest leading-none">Load: Heavy</span>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="grow overflow-hidden flex flex-col pb-20 md:pb-0">
                    {children}
                </main>

                {/* 3. MINIMALIST MOBILE BOTTOM NAVIGATION */}
                <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-sm h-14 bg-white border border-zinc-100 rounded-2xl flex items-center justify-around px-2 z-100 shadow-sm">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.label}
                                href={item.path}
                                className="relative flex flex-col items-center justify-center h-full flex-1"
                            >
                                <div className={`relative flex items-center justify-center p-2 transition-all ${isActive ? 'text-[#111111]' : 'text-zinc-400'}`}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d={item.icon} />
                                    </svg>
                                </div>
                                <span className={`text-[9px] font-bold tracking-tight ${isActive ? 'text-[#111111]' : 'text-zinc-400'}`}>
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}
                    <div className="w-px h-6 bg-zinc-100 mx-1" />
                    <div className="flex-1 flex flex-col items-center justify-center h-full">
                        <SidebarLogoutButton variant="mobile" />
                    </div>
                </nav>
            </div>
        </div>
    );
}
