'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle({ isCollapsed }: { isCollapsed?: boolean }) {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedTheme = (localStorage.getItem('hotelpro_theme') as 'light' | 'dark') || 'light';
        setTheme(savedTheme);
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(nextTheme);
        localStorage.setItem('hotelpro_theme', nextTheme);
        if (nextTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    if (!mounted) return null;

    return (
        <button
            onClick={toggleTheme}
            type="button"
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all font-semibold text-xs ${
                theme === 'dark'
                    ? 'bg-[#2A2A2A] text-white hover:bg-[#333333] border border-zinc-700'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
            {theme === 'dark' ? (
                <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ) : (
                <svg className="w-4 h-4 text-zinc-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
            )}
            {!isCollapsed && (
                <span>{theme === 'dark' ? 'Dark Theme' : 'Light Theme'}</span>
            )}
        </button>
    );
}
