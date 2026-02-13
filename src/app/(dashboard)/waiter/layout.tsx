'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SidebarLogoutButton from '@/components/auth/SidebarLogoutButton';
import { motion } from 'framer-motion';

export default function WaiterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const navItems = [
        { label: 'Floor', path: '/waiter', icon: 'M4 6h16M4 12h16M4 18h7' },
        { label: 'Alerts', path: '/waiter/notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', badge: true },
        { label: 'History', path: '/waiter/history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
        { label: 'HUB', path: '/waiter/hub', icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
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
                                    {item.badge && (
                                        <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
                                    )}
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

                {/* SLIM HEADER BAR */}
                <header className="hidden md:flex h-10 bg-white border-b border-zinc-100 items-center justify-between px-6 shrink-0 z-40">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-[#111] rounded flex items-center justify-center">
                            <span className="text-[7px] font-black text-white">HP</span>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Waiter Terminal</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="text-[10px] font-bold text-zinc-500">Online</span>
                    </div>
                </header>

                <main className="grow overflow-hidden flex flex-col pb-20 md:pb-0">
                    {children}
                </main>

                {/* 3. MINIMALIST MOBILE BOTTOM NAVIGATION */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-zinc-100 flex items-center justify-around px-2 z-100">
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

                                    {item.badge && (
                                        <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
                                    )}
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
