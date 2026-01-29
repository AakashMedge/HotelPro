'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
        { label: 'CONTROL', path: '/admin', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m10 4a2 2 0 100-4m0 4a2 2 0 110-4M6 20v-2m0-4V4m6 16v-6m6 6v-2m0-4V4' },
        { label: 'STAFF', path: '/admin/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
        { label: 'MENU', path: '/admin/menu', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
        { label: 'SYSTEM', path: '/admin/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    ];

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-[#F9F9F9] text-[#1A1A1A] font-sans flex flex-col md:flex-row antialiased overflow-hidden h-screen">

            {/* ROOT ADMIN SIDEBAR */}
            <aside className="hidden md:flex w-20 lg:w-24 bg-[#111111] flex-col items-center py-6 lg:py-8 shrink-0 z-50">
                <div className="mb-8 lg:mb-12">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#D43425] rounded-xl flex items-center justify-center font-black text-white text-lg lg:text-xl shadow-lg border border-white/10">
                        HP
                    </div>
                </div>

                <nav className="flex flex-col gap-6 lg:gap-8 grow">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <div
                                key={item.label}
                                className={`flex flex-col items-center gap-1.5 lg:gap-2 group transition-all ${isActive ? 'opacity-100 text-[#D43425]' : 'opacity-40 text-zinc-500 cursor-not-allowed'}`}
                            >
                                <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-[#D43425]/10 border border-[#D43425]/20' : 'hover:bg-white/5'}`}>
                                    <svg width="20" height="20" className="lg:w-[22px] lg:h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d={item.icon} />
                                    </svg>
                                </div>
                                <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.15em]">{item.label}</span>
                            </div>
                        )
                    })}
                </nav>

                <div className="mt-auto">
                    <Link href="/login" className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-white transition-all">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    </Link>
                </div>
            </aside>

            {/* MOBILE BOTTOM NAVIGATION */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#111111] border-t border-white/5 flex items-center justify-around h-16 sm:h-20 px-4 z-[100] pb-[env(safe-area-inset-bottom)]">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <div
                            key={item.label}
                            className={`flex flex-col items-center gap-1 opacity-40 transition-all ${isActive ? 'opacity-100 text-[#D43425]' : 'text-zinc-500'}`}
                        >
                            <div className={`w-9 h-9 flex items-center justify-center ${isActive ? 'bg-[#D43425]/10 rounded-xl' : ''}`}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d={item.icon} />
                                </svg>
                            </div>
                            <span className="text-[7px] font-black uppercase tracking-widest leading-none">{item.label}</span>
                        </div>
                    )
                })}
                <Link href="/login" className="flex flex-col items-center gap-1 text-zinc-500">
                    <div className="w-9 h-9 flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    </div>
                    <span className="text-[7px] font-black uppercase tracking-widest leading-none">EXIT</span>
                </Link>
            </nav>

            {/* MAIN OPERATIONS FRAME */}
            <div className="grow flex flex-col min-w-0 h-full overflow-hidden">
                {/* REFINED HEADER */}
                <header className="h-14 md:h-16 lg:h-20 bg-white border-b border-zinc-200 flex items-center justify-between px-4 md:px-6 lg:px-8 shrink-0 relative z-40">
                    <div className="flex flex-col">
                        <h2 className="text-[7px] md:text-[8px] lg:text-[10px] font-bold text-zinc-400 uppercase tracking-[0.4em] leading-none mb-1 md:mb-1.5 lg:mb-2 italic">System Architecture</h2>
                        <div className="flex items-center gap-2 md:gap-3">
                            <span className="text-sm md:text-lg lg:text-xl font-black tracking-tight uppercase">Master_Node_Root</span>
                            <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(212,52,37,0.4)]" />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-8">
                        <div className="hidden sm:flex flex-col items-end leading-none border-r border-zinc-100 pr-4 md:pr-6 lg:pr-8 mr-2 md:mr-4 lg:mr-8 text-right">
                            <span className="text-[7px] md:text-[9px] lg:text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5 md:mb-1">Authentication Context</span>
                            <span className="text-[10px] md:text-sm font-black italic uppercase">Super_Administrator</span>
                        </div>
                        <div className="bg-[#111111] text-white px-3 md:px-5 lg:px-6 py-1 md:py-2 lg:py-2.5 rounded-lg border border-white/10 flex flex-col items-center">
                            <span className="text-[6px] md:text-[7px] lg:text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-0.5 lg:mb-1">Security Status</span>
                            <span className="text-[10px] md:text-xs lg:text-sm font-black tabular-nums text-[#D43425] uppercase tracking-tighter">Hardened_Mode</span>
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
