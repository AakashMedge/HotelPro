'use client';

import Link from 'next/link';
import { useState } from 'react';

const menuCategories = ['Breakfast', 'Lunch', 'Dinner'];

const signatures = [
    {
        title: "Chef's Signature Selection",
        bgColor: 'bg-[#FF7F7F]',
    },
    {
        title: 'Artisan Morning Bakery',
        bgColor: 'bg-[#C8C2FF]',
    },
    {
        title: 'Vintage Reserve Wine',
        bgColor: 'bg-[#B4D9FF]',
    },
];

export default function CustomerPage() {
    const [isHovered, setIsHovered] = useState(false);
    const isStarter = typeof window !== 'undefined' && localStorage.getItem('hp_hotel_plan') === 'STARTER';

    const mainLinks = [
        { label: 'RESIDENCE', id: 'res', href: '/home' },
        { label: 'CULINARY', id: 'cul', href: '/welcome-guest' },
        { label: 'WELLNESS', id: 'wel', href: '#' },
        { label: 'CONCIERGE', id: 'con', href: '/gift-card' }
    ].filter(link => !isStarter || link.id === 'cul');

    const secondaryLinks = [
        { label: 'STORIES', id: 'sto', href: '/story' },
        { label: 'GIFT CARDS', id: 'gift', href: '/gift-card' },
        { label: 'INQUIRY', id: 'inq', href: '#' },
        { label: 'LEGAL', id: 'leg', href: '#' }
    ].filter(item => !isStarter || ['INQUIRY', 'LEGAL'].includes(item.label));

    return (
        <main className="min-h-screen bg-[#EFE7D9] text-black font-sans relative p-6 md:p-12 overflow-hidden">
            {/* Top Navigation */}
            <div className="flex justify-between items-start mb-12">
                <Link
                    href={isStarter ? "/welcome-guest" : "/home"}
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </Link>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => window.location.href = '/welcome-guest'}
                        className="px-6 py-2 bg-white rounded-full text-sm font-semibold shadow-sm hover:shadow-md transition-shadow"
                    >
                        Book Now
                    </button>
                    <button className="w-10 h-10 bg-[#FF7F7F] text-black flex items-center justify-center rounded-full shadow-sm hover:rotate-12 transition-all">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="7" y1="17" x2="17" y2="7"></line>
                            <polyline points="7 7 17 7 17 17"></polyline>
                        </svg>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
                {/* Left Column: Discoveries */}
                <div className="space-y-12 z-10">
                    <section className="space-y-6">
                        <h2 className="text-2xl font-playfair font-bold italic tracking-tight">Discover Menu</h2>
                        <div className="flex flex-col gap-3">
                            {menuCategories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => window.location.href = '/menu'}
                                    className="w-40 py-3 border border-black/20 rounded-full text-lg font-medium hover:bg-black hover:text-white transition-all text-left px-8 group flex items-center justify-between"
                                >
                                    {cat}
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-2xl font-playfair font-bold italic tracking-tight">Our Selection</h2>
                        <div
                            className="relative"
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                        >
                            <div className={`space-y-3 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isHovered ? 'h-auto opacity-100' : 'h-20 overflow-hidden'}`}>
                                {signatures.map((sig, idx) => (
                                    <div
                                        key={sig.title}
                                        className={`${sig.bgColor} p-4 pr-12 rounded-2xl flex items-center gap-4 transition-all duration-500 cursor-pointer shadow-sm hover:shadow-md`}
                                        style={{
                                            transform: isHovered ? 'translateY(0)' : `translateY(-${idx * 40}px)`,
                                            zIndex: signatures.length - idx,
                                            opacity: !isHovered && idx !== 0 ? 0 : 1
                                        }}
                                    >
                                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center font-bold text-xl">
                                            {idx + 1}
                                        </div>
                                        <p className="font-bold text-sm tracking-tight uppercase max-w-[150px] leading-tight">{sig.title}</p>
                                    </div>
                                ))}
                            </div>
                            {!isHovered && (
                                <div className="absolute top-2 right-4 text-[10px] font-black tracking-widest uppercase opacity-40 animate-pulse">
                                    Hover to Expand
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Right Column: Main Links (Shifted Right) */}
                <div className="md:col-span-2 md:pl-32 flex flex-col justify-center py-12 md:py-0">
                    <div className="space-y-0 text-left">
                        {mainLinks.map((link) => (
                            <Link
                                key={link.id}
                                href={link.href}
                                className="block"
                            >
                                <h1
                                    className="text-[3rem] md:text-[4.5rem] lg:text-[5.5rem] font-semibold leading-[0.9] tracking-tighter hover:italic transition-all cursor-pointer hover:tracking-normal active:scale-[0.98]"
                                >
                                    {link.label}
                                </h1>
                            </Link>
                        ))}

                        <div className="flex flex-wrap gap-8 pt-16">
                            {secondaryLinks.map((item) => (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className="text-xl font-playfair font-black italic border-b-2 border-transparent hover:border-black cursor-pointer transition-all tracking-widest"
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Branding */}
            <div className="fixed bottom-6 left-6 md:bottom-12 md:left-12">
                <button className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                </button>
            </div>

            <div className="fixed bottom-6 right-6 md:bottom-12 md:right-12 text-right">
                <div className="text-[#D43425] font-black text-2xl tracking-tighter mb-1">HOTELPRO</div>
                <p className="text-[10px] uppercase font-bold tracking-[0.4em] opacity-40 leading-none">
                    Automated Hospitality Solutions
                </p>
            </div>
        </main>
    );
}
