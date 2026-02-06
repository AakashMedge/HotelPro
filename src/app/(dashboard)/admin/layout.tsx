
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SidebarLogoutButton from '@/components/auth/SidebarLogoutButton';

export default function AdminLayout({
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
        { label: 'DASHBOARD', path: '/admin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
        { label: 'STAFF', path: '/admin/staff', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
        { label: 'SETTINGS', path: '/admin/settings', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
        { label: 'USERS', path: '/admin/users', icon: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 7a4 4 0 100-8 4 4 0 000 8' },
    ];

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-[#F2F2F2] text-[#1A1A1A] font-sans flex flex-col md:flex-row antialiased overflow-hidden h-screen">

            {/* ADMIN SIDEBAR (Industrial / Sharp Look) */}
            <aside className="hidden md:flex w-20 lg:w-24 bg-[#111] flex-col items-center py-6 lg:py-8 shrink-0 z-50 border-r border-zinc-800">
                <div className="mb-8 lg:mb-12">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-none flex items-center justify-center font-black text-black text-lg lg:text-xl">
                        AD
                    </div>
                </div>

                <nav className="flex flex-col gap-6 lg:gap-8 grow">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                href={item.path}
                                key={item.label}
                                className={`flex flex-col items-center gap-1.5 lg:gap-2 group transition-all ${isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <div className={`w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center transition-all ${isActive ? 'bg-white text-black' : 'bg-transparent border border-zinc-800'}`}>
                                    <svg width="20" height="20" className="lg:w-[22px] lg:h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
                                        <path d={item.icon} />
                                    </svg>
                                </div>
                                <span className="text-[8px] lg:text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="mt-auto">
                    <SidebarLogoutButton variant="desktop" />
                </div>
            </aside>

            {/* MOBILE BOTTOM NAVIGATION */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#111] border-t border-zinc-800 flex items-center justify-around h-16 sm:h-20 px-4 z-100 pb-[env(safe-area-inset-bottom)]">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            href={item.path}
                            key={item.label}
                            className={`flex flex-col items-center gap-1 opacity-40 transition-all ${isActive ? 'opacity-100 text-white' : 'text-zinc-500'}`}
                        >
                            <div className={`w-9 h-9 flex items-center justify-center ${isActive ? 'bg-white text-black' : ''}`}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
                                    <path d={item.icon} />
                                </svg>
                            </div>
                            <span className="text-[7px] font-bold uppercase tracking-widest leading-none">{item.label}</span>
                        </Link>
                    )
                })}
                <SidebarLogoutButton variant="mobile" />
            </nav>

            {/* MAIN CONTENT */}
            <div className="grow flex flex-col min-w-0 h-full overflow-hidden">
                <header className="h-14 md:h-16 lg:h-20 bg-white border-b border-zinc-200 flex items-center justify-between px-4 md:px-6 lg:px-8 shrink-0 shadow-sm relative z-40">
                    <div className="flex flex-col">
                        <h2 className="text-[7px] md:text-[8px] lg:text-[10px] font-bold text-zinc-400 uppercase tracking-[0.4em] leading-none mb-1 md:mb-1.5 lg:mb-2 italic">Hypervisor Level 0</h2>
                        <span className="text-sm md:text-lg lg:text-xl font-bold tracking-tight uppercase text-zinc-900">System_Administration</span>
                    </div>
                </header>

                <main className="grow overflow-hidden flex flex-col pb-16 sm:pb-20 md:pb-0 bg-[#F2F2F2]">
                    {children}
                </main>
            </div>
        </div>
    );
}
