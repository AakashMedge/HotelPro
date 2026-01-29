'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = (role: string) => {
        setIsLoading(true);
        // Simulate auth delay for "security" feel
        setTimeout(() => {
            router.push(role);
        }, 1200);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#0A0A0A] relative overflow-hidden font-sans">
            {/* Background Ambience */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#D43425] rounded-full blur-[150px] opacity-10 animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#D43425] rounded-full blur-[150px] opacity-10 animate-pulse delay-1000" />
            </div>

            <div className={`max-w-md w-full relative z-10 transition-all duration-700 ${isLoading ? 'scale-95 opacity-50 blur-sm' : 'scale-100 opacity-100'}`}>
                {/* Branding */}
                <div className="text-center mb-12 space-y-4">
                    <div className="inline-block px-4 py-1 border border-[#D43425]/30 rounded-full text-[10px] font-black tracking-[0.4em] text-[#D43425] uppercase animate-in fade-in slide-in-from-bottom-2">
                        Classified Access
                    </div>
                    <h1 className="text-[#D43425] font-playfair font-black text-6xl tracking-tighter italic">Staff Portal</h1>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.5em]">Real-time Hospitality Logistics</p>
                </div>

                <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl space-y-8">
                    <div className="space-y-6">
                        <div className="group space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#D43425] ml-4 transition-all group-focus-within:opacity-100 opacity-60">Employee Identifier</label>
                            <input
                                type="text"
                                className="w-full h-16 px-8 rounded-full bg-white/5 border border-white/10 text-white font-playfair italic text-lg outline-none focus:border-[#D43425] focus:bg-white/10 transition-all"
                                placeholder="e.g. ALPHA-001"
                            />
                        </div>
                        <div className="group space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#D43425] ml-4 transition-all group-focus-within:opacity-100 opacity-60">Authentication Key</label>
                            <input
                                type="password"
                                className="w-full h-16 px-8 rounded-full bg-white/5 border border-white/10 text-white font-playfair italic text-lg outline-none focus:border-[#D43425] focus:bg-white/10 transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-4">
                        <button
                            onClick={() => handleLogin('/manager')}
                            className="w-full h-16 bg-[#D43425] text-white rounded-full font-black text-xs uppercase tracking-[0.4em] shadow-xl hover:bg-white hover:text-black transition-all active:scale-95 flex items-center justify-center gap-4"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                            Secure Login
                        </button>
                    </div>

                    {/* Quick Role Selectors for Demo */}
                    <div className="pt-8 border-t border-white/5">
                        <p className="text-center text-[9px] font-black uppercase tracking-[0.4em] text-white/20 mb-6">Select Department</p>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { name: 'Waiter', path: '/waiter', icon: 'M13 3h7b2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7M2 3h7b2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H2' },
                                { name: 'Kitchen', path: '/kitchen', icon: 'M18 8a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8Z' },
                                { name: 'Admin', path: '/admin', icon: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z' },
                                { name: 'Manager', path: '/manager', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' }
                            ].map((role) => (
                                <button
                                    key={role.name}
                                    onClick={() => handleLogin(role.path)}
                                    className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 hover:border-[#D43425]/50 transition-all text-white group"
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">{role.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center text-[10px] font-black uppercase tracking-[0.5em] text-white/20">
                    © 2026 HotelPro Logistics • Unified Staff Ecosystem
                </div>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-500">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 border-4 border-[#D43425]/20 rounded-full" />
                        <div className="absolute inset-0 border-4 border-[#D43425] rounded-full border-t-transparent animate-spin" />
                    </div>
                    <p className="mt-8 text-[#D43425] font-black text-xs uppercase tracking-[0.6em] animate-pulse">Synchronizing Terminal</p>
                </div>
            )}
        </div>
    );
}
