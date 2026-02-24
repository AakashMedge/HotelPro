'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Building2,
    CreditCard,
    ShieldCheck,
    Settings,
    MessageSquare,
    Megaphone
} from 'lucide-react';

export function HQNavigation() {
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = React.useState(0);

    React.useEffect(() => {
        const fetchUnread = async () => {
            try {
                const res = await fetch('/api/hq/concierge/unread-count');
                const data = await res.json();
                if (data.success) setUnreadCount(data.count);
            } catch (err) { }
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 15000); // Check every 15s
        return () => clearInterval(interval);
    }, []);

    return (
        <nav className="flex-1 px-4 py-8 space-y-2">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 px-6 mb-6">Global Ops</p>

            <SidebarLink
                href="/hq/dashboard"
                icon={<LayoutDashboard className="w-4 h-4" />}
                label="Command Center"
                active={pathname === '/hq/dashboard'}
            />
            <SidebarLink
                href="/hq/clients"
                icon={<Building2 className="w-4 h-4" />}
                label="Properties"
                active={pathname === '/hq/clients'}
            />
            <SidebarLink
                href="/hq/subscriptions"
                icon={<CreditCard className="w-4 h-4" />}
                label="Revenue"
                active={pathname === '/hq/subscriptions'}
            />
            <SidebarLink
                href="/hq/concierge"
                icon={<MessageSquare className="w-4 h-4" />}
                label="Concierge"
                active={pathname === '/hq/concierge'}
                badge={unreadCount > 0 ? unreadCount : undefined}
            />
            <SidebarLink
                href="/hq/broadcasts"
                icon={<Megaphone className="w-4 h-4" />}
                label="Broadcast"
                active={pathname === '/hq/broadcasts'}
            />

            <div className="pt-10 mb-4">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 px-6 mb-6">Security</p>
                <SidebarLink
                    href="/hq/security"
                    icon={<ShieldCheck className="w-4 h-4" />}
                    label="Guardians"
                    active={pathname === '/hq/security'}
                />
                <SidebarLink
                    href="/hq/settings"
                    icon={<Settings className="w-4 h-4" />}
                    label="Registry"
                    active={pathname === '/hq/settings'}
                />
            </div>
        </nav>
    );
}

function SidebarLink({
    href,
    icon,
    label,
    active,
    badge
}: {
    href: string,
    icon: React.ReactNode,
    label: string,
    active?: boolean,
    badge?: number
}) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-[11px] font-black uppercase tracking-widest group relative
                ${active
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100 ring-1 ring-indigo-200/50'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 border border-transparent'
                }`}
        >
            <span className={`transition-transform group-hover:scale-110 ${active ? 'text-indigo-600' : 'text-zinc-400 group-hover:text-indigo-600'}`}>{icon}</span>
            <span className="flex-1">{label}</span>
            {badge && (
                <span className="w-4 h-4 bg-indigo-600 text-white text-[8px] font-black flex items-center justify-center rounded-full animate-pulse shadow-lg shadow-indigo-500/50">
                    {badge}
                </span>
            )}
        </Link>
    );
}
