'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SidebarLogoutButton from '@/components/auth/SidebarLogoutButton';

export default function CashierLayout({
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
        { label: 'TERMINAL', path: '/cashier', icon: 'M9 7h6M9 12h6M9 17h6M5 7h.01M5 12h.01M5 17h.01' },
        { label: 'LEDGER', path: '/cashier/history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
        { label: 'VAULT', path: '/cashier/vault', icon: 'M3 10h18M7 15h1m4 0h1m4 0h1M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z' },
    ];

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-[#F0F0F2] text-[#1D1D1F] font-sans flex flex-col md:flex-row antialiased overflow-hidden h-screen">

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
                            <div
                                key={item.label}
                                className={`flex flex-col items-center gap-1.5 lg:gap-2 group transition-all ${isActive ? 'opacity-100 text-[#D43425]' : 'opacity-40 text-zinc-500 cursor-not-allowed'}`}
                            >
                                <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-[#D43425]/10 border border-[#D43425]/20 shadow-[0_0_15px_rgba(212,52,37,0.1)]' : 'hover:bg-white/5'}`}>
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
                    <SidebarLogoutButton variant="desktop" />
                </div>
            </aside>

            {/* MOBILE BOTTOM NAVIGATION */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#0F0F0F] border-t border-white/5 flex items-center justify-around h-16 sm:h-20 px-4 z-[100] pb-[env(safe-area-inset-bottom)]">
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
                <SidebarLogoutButton variant="mobile" />
            </nav>

            {/* MAIN OPERATIONS FRAME */}
            <div className="grow flex flex-col min-w-0 h-full overflow-hidden">
                {/* REFINED HEADER */}
                <header className="h-14 md:h-16 lg:h-20 bg-white border-b border-zinc-200 flex items-center justify-between px-4 md:px-6 lg:px-8 shrink-0 shadow-sm relative z-40">
                    <div className="flex flex-col">
                        <h2 className="text-[7px] md:text-[8px] lg:text-[10px] font-bold text-zinc-400 uppercase tracking-[0.4em] leading-none mb-1 md:mb-1.5 lg:mb-2 italic">Financial Settlement</h2>
                        <div className="flex items-center gap-2 md:gap-3">
                            <span className="text-sm md:text-lg lg:text-xl font-black tracking-tight uppercase">Terminal_C1</span>
                            <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-8">
                        <div className="hidden sm:flex flex-col items-end leading-none border-r border-zinc-100 pr-4 md:pr-6 lg:pr-8 mr-2 md:mr-4 lg:mr-8">
                            <span className="text-[7px] md:text-[9px] lg:text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5 md:mb-1">Fiscal Authority</span>
                            <span className="text-[10px] md:text-sm font-black italic uppercase">Director_Finance</span>
                        </div>
                        <div className="bg-zinc-950 text-white px-3 md:px-5 lg:px-6 py-1 md:py-2 lg:py-2.5 rounded-lg lg:rounded-xl border border-white/10 flex flex-col items-center">
                            <span className="text-[6px] md:text-[7px] lg:text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-0.5 lg:mb-1">Vault Status</span>
                            <span className="text-[10px] md:text-xs lg:text-sm font-black tabular-nums text-green-400 uppercase tracking-tighter">Synchronized</span>
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
