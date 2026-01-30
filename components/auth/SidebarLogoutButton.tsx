'use client';

import { useRouter } from 'next/navigation';

interface SidebarLogoutButtonProps {
    className?: string;
    variant?: 'desktop' | 'mobile';
}

/**
 * Logout button styled for dashboard sidebars.
 * Calls the logout API and redirects to login.
 */
export default function SidebarLogoutButton({
    className = '',
    variant = 'desktop'
}: SidebarLogoutButtonProps) {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
            });
        } catch {
            // Even if API fails, redirect to login
        }

        router.push('/login');
        router.refresh();
    };

    if (variant === 'mobile') {
        return (
            <button
                onClick={handleLogout}
                className={`flex flex-col items-center gap-1 text-zinc-500 hover:text-red-400 transition-colors ${className}`}
            >
                <div className="w-9 h-9 flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                </div>
                <span className="text-[7px] font-black uppercase tracking-widest leading-none">OUT</span>
            </button>
        );
    }

    // Desktop variant
    return (
        <button
            onClick={handleLogout}
            className={`w-10 h-10 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-white hover:bg-red-500/10 transition-all ${className}`}
            title="Logout"
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
        </button>
    );
}
