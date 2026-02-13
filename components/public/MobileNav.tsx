'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileNav() {
    const pathname = usePathname();
    const activeOrderId = typeof window !== 'undefined' ? localStorage.getItem('hp_active_order_id') : null;

    const tabs = [
        {
            href: '/menu',
            label: 'Menu',
            isActive: pathname === '/menu',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5" />
                    <polyline points="10 2 10 10 13 7 16 10 16 2" />
                </svg>
            ),
        },
        {
            href: activeOrderId ? `/order-status?id=${activeOrderId}` : '#',
            label: 'Orders',
            isActive: pathname === '/order-status',
            disabled: !activeOrderId,
            hasNotif: !!activeOrderId && pathname !== '/order-status',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
            ),
            onClick: (e: React.MouseEvent) => {
                if (!activeOrderId) {
                    e.preventDefault();
                    alert('No active order. Please order from the menu first.');
                }
            },
        },
        {
            href: '/ai-assistant',
            label: 'AI Waiter',
            isActive: pathname === '/ai-assistant',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
            ),
        },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-100 pb-[env(safe-area-inset-bottom,0px)]">
            <div className="flex items-stretch max-w-md mx-auto">
                {tabs.map((tab) => (
                    <Link
                        key={tab.label}
                        href={tab.href}
                        onClick={tab.onClick}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors relative ${tab.isActive
                                ? 'text-[#D43425]'
                                : tab.disabled
                                    ? 'text-zinc-200'
                                    : 'text-zinc-400'
                            }`}
                    >
                        <div className="relative">
                            {tab.icon}
                            {tab.hasNotif && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#D43425] rounded-full animate-pulse" />
                            )}
                        </div>
                        <span className="text-[10px] font-semibold">{tab.label}</span>
                        {tab.isActive && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#D43425] rounded-full" />
                        )}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
