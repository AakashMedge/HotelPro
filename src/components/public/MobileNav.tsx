'use client';

import { useRouter, usePathname } from 'next/navigation';

/**
 * MobileNav — Floating Bottom Navigation Dock
 * Gives customers quick access to Menu, Orders, and Help.
 * Only shows on public (customer) pages.
 */
export default function MobileNav() {
    const router = useRouter();
    const pathname = usePathname();

    const navItems = [
        {
            label: 'Menu',
            path: '/menu',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            ),
        },
        {
            label: 'Orders',
            path: '/order-status',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            ),
        },
        {
            label: 'Help',
            path: '/welcome-guest',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
                </svg>
            ),
        },
    ];

    return (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-2 bg-zinc-900/95 backdrop-blur-xl rounded-full px-3 py-2 shadow-2xl border border-white/10">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <button
                            key={item.path}
                            onClick={() => router.push(item.path)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-full transition-all duration-300 ${isActive
                                    ? 'bg-white text-zinc-900 shadow-lg'
                                    : 'text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            {item.icon}
                            {isActive && (
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {item.label}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
