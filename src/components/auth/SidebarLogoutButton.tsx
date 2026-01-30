
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SidebarLogoutButton({ variant }: { variant: 'desktop' | 'mobile' }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
            router.refresh();
        } catch (error) {
            console.error('Logout failed', error);
            setLoading(false);
        }
    };

    if (variant === 'mobile') {
        return (
            <button
                onClick={handleLogout}
                disabled={loading}
                className="flex flex-col items-center gap-1 text-zinc-500 hover:text-white opacity-40 hover:opacity-100 transition-all"
            >
                <div className="w-9 h-9 flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                </div>
                <span className="text-[7px] font-black uppercase tracking-widest leading-none">
                    {loading ? '...' : 'EXIT'}
                </span>
            </button>
        );
    }

    return (
        <button
            onClick={handleLogout}
            disabled={loading}
            className="flex flex-col items-center gap-2 text-zinc-500 hover:text-[#D43425] transition-colors group mb-8"
        >
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/5 group-hover:bg-[#D43425]/10 group-hover:border-[#D43425]/20 group-hover:shadow-[0_0_15px_rgba(212,52,37,0.1)] transition-all">
                <svg width="20" height="20" className="lg:w-[22px] lg:h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
            </div>
            <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.15em]">
                {loading ? 'EXITING...' : 'LOGOUT'}
            </span>
        </button>
    );
}
