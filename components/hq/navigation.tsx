'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Building2,
    CreditCard,
    ShieldCheck,
    Settings
} from 'lucide-react';

export function HQNavigation() {
    const pathname = usePathname();

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

function SidebarLink({ href, icon, label, active }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-[11px] font-black uppercase tracking-widest group 
                ${active
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100 ring-1 ring-indigo-200/50'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 border border-transparent'
                }`}
        >
            <span className={`transition-transform group-hover:scale-110 ${active ? 'text-indigo-600' : 'text-zinc-400 group-hover:text-indigo-600'}`}>{icon}</span>
            {label}
        </Link>
    );
}
