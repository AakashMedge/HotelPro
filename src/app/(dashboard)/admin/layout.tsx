
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
        { label: 'SYSTEM', path: '/admin', icon: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z M12 6v12 M6 12h12' },
        { label: 'ORG_SETTINGS', path: '/admin/settings', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
        { label: 'ACCESS', path: '/admin/users', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
        { label: 'SECURITY', path: '/admin/security', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
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
