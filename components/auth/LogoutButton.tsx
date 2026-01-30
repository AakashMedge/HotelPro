'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface LogoutButtonProps {
    className?: string;
    variant?: 'icon' | 'text' | 'full';
}

/**
 * Logout button component that calls the logout API
 * and redirects to the login page.
 */
export default function LogoutButton({
    className = '',
    variant = 'full'
}: LogoutButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogout = async () => {
        setIsLoading(true);

        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
            });
        } catch {
            // Even if API fails, we redirect to login
        }

        // Redirect to login and refresh
        router.push('/login');
        router.refresh();
    };

    if (variant === 'icon') {
        return (
            <button
                onClick={handleLogout}
                disabled={isLoading}
                className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${className}`}
                title="Logout"
            >
                {isLoading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                )}
            </button>
        );
    }

    if (variant === 'text') {
        return (
            <button
                onClick={handleLogout}
                disabled={isLoading}
                className={`text-sm hover:underline transition-colors ${className}`}
            >
                {isLoading ? 'Logging out...' : 'Logout'}
            </button>
        );
    }

    // Full variant (default)
    return (
        <button
            onClick={handleLogout}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors ${className}`}
        >
            {isLoading ? (
                <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm font-medium">Logging out...</span>
                </>
            ) : (
                <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="text-sm font-medium">Logout</span>
                </>
            )}
        </button>
    );
}
