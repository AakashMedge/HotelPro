'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
    const [mounted, setMounted] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <main className="min-h-screen bg-white text-white font-sans overflow-x-hidden">

            {/* HERO SECTION - ROUNDED WITH PADDING */}
            <section className="p-2 sm:p-4 md:p-6 lg:p-8 min-h-screen">
                <div className="relative w-full h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)] rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[3rem] overflow-hidden">
                    {/* Background Video */}
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                    >
                        <source src="https://cdn.prod.website-files.com/684fc56fc7e02f3dad4a6138%2F6852764f5adbef713a1a18ef_PbE-Hero-Video-B-transcode.mp4" type="video/mp4" />
                    </video>
                    {/* Dark Gradient Overlay for Navbar Visibility */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-transparent z-[5] pointer-events-none" />

                    {/* Top Navbar - Inside the rounded container */}
                    <div className="absolute top-0 left-0 right-0 z-20 px-4 sm:px-6 md:px-10 py-4 sm:py-6 flex justify-between items-center">
                        <div className="text-white font-black text-lg sm:text-xl md:text-2xl tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                            HOTELPRO
                        </div>

                        <div className="flex items-center gap-4 md:gap-8">
                            <Link href="/login" className="hidden md:block px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/20 transition-all border border-white/20">
                                LOGIN
                            </Link>
                            <Link
                                href="/customer"
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-all border border-white/20"
                            >
                                <span className="w-5 h-px bg-white" />
                                <span className="text-sm font-medium">Menu</span>
                            </Link>
                        </div>
                    </div>

                    {/* Central Quatrefoil Crest */}
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="relative">
                            <svg
                                viewBox="0 0 400 440"
                                className="w-[240px] h-[265px] sm:w-[280px] sm:h-[310px] md:w-[360px] md:h-[400px] lg:w-[420px] lg:h-[460px]"
                                fill="none"
                            >
                                {/* Outer Border */}
                                <path
                                    d="M200 10 
                                       C240 10 280 30 300 60 
                                       C340 40 390 70 390 120 
                                       C390 160 370 190 340 210 
                                       C370 230 390 270 390 320 
                                       C390 370 340 400 300 380 
                                       C280 410 240 430 200 430 
                                       C160 430 120 410 100 380 
                                       C60 400 10 370 10 320 
                                       C10 270 30 230 60 210 
                                       C30 190 10 160 10 120 
                                       C10 70 60 40 100 60 
                                       C120 30 160 10 200 10 Z"
                                    fill="#F5F0EC"
                                    stroke="#D43425"
                                    strokeWidth="3"
                                />
                                {/* Inner Border */}
                                <path
                                    d="M200 25 
                                       C235 25 270 42 288 68 
                                       C322 52 365 78 365 120 
                                       C365 155 348 183 322 202 
                                       C348 221 365 255 365 300 
                                       C365 342 322 368 288 352 
                                       C270 378 235 395 200 395 
                                       C165 395 130 378 112 352 
                                       C78 368 35 342 35 300 
                                       C35 255 52 221 78 202 
                                       C52 183 35 155 35 120 
                                       C35 78 78 52 112 68 
                                       C130 42 165 25 200 25 Z"
                                    fill="none"
                                    stroke="#D43425"
                                    strokeWidth="2"
                                    strokeDasharray="0"
                                />
                            </svg>

                            {/* Content Overlay */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 sm:px-8 md:px-12">
                                {/* H&P Monogram with flanking text */}
                                <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-8 mb-1 sm:mb-2">
                                    <span className="text-[#D43425] text-[7px] sm:text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em]">Private</span>
                                    <span className="text-[#D43425] font-playfair text-2xl sm:text-3xl md:text-4xl italic">H&P</span>
                                    <span className="text-[#D43425] text-[7px] sm:text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em]">Residence</span>
                                </div>
                                {/* Main Title */}
                                <h1 className="text-[#D43425] font-playfair text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[0.95] tracking-tight mb-0 sm:mb-1">
                                    HOTEL
                                </h1>
                                <h1 className="text-[#D43425] font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[0.95] tracking-tight mb-2 sm:mb-4">
                                    PRO
                                </h1>
                                {/* Location Text */}
                                <div className="space-y-0.5 sm:space-y-1 mb-4 sm:mb-6">
                                    <p className="text-[#D43425]/70 text-[10px] sm:text-xs md:text-sm font-playfair italic">Premium Suite</p>
                                    <p className="text-[#D43425] text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.4em]">Elite Hospitality</p>
                                </div>

                                {/* CTA Buttons */}
                                <div className="space-y-1.5 sm:space-y-2 w-full max-w-[180px] sm:max-w-[200px] md:max-w-[240px]">
                                    <Link href="/welcome-guest" className="flex items-center justify-center gap-1.5 sm:gap-2 w-full py-2.5 sm:py-3 bg-[#D43425] text-white font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.15em] rounded-full hover:bg-[#8B0000] transition-all">
                                        <svg className="w-3 h-3 sm:w-[14px] sm:h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="3" width="7" height="7" />
                                            <rect x="14" y="3" width="7" height="7" />
                                            <rect x="14" y="14" width="7" height="7" />
                                            <rect x="3" y="14" width="7" height="7" />
                                        </svg>
                                        Scan the QR
                                    </Link>
                                    <Link href="/customer" className="flex items-center justify-center gap-1.5 sm:gap-2 w-full py-2.5 sm:py-3 border-2 border-[#D43425] text-[#D43425] font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.15em] rounded-full hover:bg-[#D43425] hover:text-white transition-all">
                                        Book a Table
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Left Text */}
                    <div className="absolute bottom-4 sm:bottom-8 left-4 sm:left-6 md:left-10 z-20 max-w-[160px] sm:max-w-[200px]">
                        <p className="text-[6px] sm:text-[7px] md:text-[9px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white/50 leading-relaxed drop-shadow-lg">
                            Revolutionizing the<br />Architecture of<br />Luxury Hospitality<br />Management.
                        </p>
                    </div>

                    {/* Bottom Left Logo */}
                    <div className="absolute bottom-8 left-6 md:bottom-10 md:left-10 z-20 hidden md:block" style={{ bottom: '6rem' }}>
                        <div className="w-10 h-10 bg-black/80 rounded-xl flex items-center justify-center text-white font-playfair italic text-lg">
                            N
                        </div>
                    </div>

                    {/* Bottom Right Year - Roman Numerals */}
                    <div className="absolute bottom-4 sm:bottom-8 right-4 sm:right-6 md:right-10 z-20">
                        <span className="text-white/30 font-playfair italic text-base sm:text-lg md:text-2xl drop-shadow-lg tracking-wider">MCMXXVI</span>
                    </div>
                </div>
            </section>

            {/* FULL SCREEN MENU OVERLAY */}
            {menuOpen && (
                <div className="fixed inset-0 bg-[#EFE7D9] z-[200] animate-in fade-in duration-300 text-black">
                    <div className="h-full overflow-y-auto p-6 md:p-12">
                        <div className="flex justify-between items-center mb-16">
                            <button
                                onClick={() => setMenuOpen(false)}
                                className="w-10 h-10 rounded-full border border-black/20 flex items-center justify-center hover:bg-black hover:text-white transition-all"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                            <Link href="/welcome-guest" className="flex items-center gap-2">
                                <span className="px-6 py-3 bg-white rounded-full text-sm font-semibold shadow-sm">Book Now</span>
                                <div className="w-10 h-10 bg-[#D43425] rounded-full flex items-center justify-center text-white">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="7" y1="17" x2="17" y2="7" />
                                        <polyline points="7 7 17 7 17 17" />
                                    </svg>
                                </div>
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-24">
                            <div className="space-y-8">
                                <div>
                                    <h4 className="text-sm font-semibold mb-4">Discover Venues</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {['Restaurant', 'Lounge', 'Terrace'].map((venue) => (
                                            <button key={venue} className="px-4 py-2 border border-black/20 rounded-full text-sm hover:bg-black hover:text-white transition-all">
                                                {venue}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 flex flex-col justify-center">
                                <div className="space-y-2">
                                    {[
                                        { label: 'HOME', href: '/home' },
                                        { label: 'EXPERIENCES', href: '/customer' },
                                        { label: 'MENU', href: '/menu' },
                                        { label: 'RESERVATIONS', href: '/welcome-guest' },
                                    ].map((link) => (
                                        <Link
                                            key={link.label}
                                            href={link.href}
                                            onClick={() => setMenuOpen(false)}
                                            className="block text-5xl md:text-7xl lg:text-8xl font-black tracking-tight hover:italic transition-all"
                                        >
                                            {link.label}
                                        </Link>
                                    ))}
                                </div>
                                <div className="flex gap-8 mt-12">
                                    {['Blog', 'Contact', 'Privacy Policy'].map((item) => (
                                        <a key={item} href="#" className="text-sm font-medium hover:underline">{item}</a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CTA SECTION */}
            <section className="py-16 sm:py-24 md:py-40 px-4 sm:px-6 bg-[#EFE7D9] text-black text-center">
                <div className="max-w-3xl mx-auto">
                    <div className="inline-block px-3 sm:px-5 py-1.5 sm:py-2 bg-[#E8D5F0] rounded-lg mb-6 sm:mb-8">
                        <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]">Explore at Your Own Pace</span>
                    </div>

                    <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-playfair font-black italic leading-[0.95] mb-8 sm:mb-12">
                        Unlock The<br />HotelPro<br />Experiences
                    </h2>

                    <Link href="/customer" className="inline-flex items-center gap-3">
                        <span className="px-8 py-4 bg-white rounded-full text-sm font-semibold shadow-sm hover:shadow-lg transition-all">
                            View Experiences
                        </span>
                        <div className="w-12 h-12 bg-[#D43425] rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="7" y1="17" x2="17" y2="7" />
                                <polyline points="7 7 17 7 17 17" />
                            </svg>
                        </div>
                    </Link>
                </div>
            </section>

            {/* VIDEO SECTION */}
            <section className="px-4 sm:px-6 md:px-12 lg:px-24 pb-16 sm:pb-24 bg-[#EFE7D9]">
                <div className="max-w-5xl mx-auto">
                    <div className="rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl">
                        <video autoPlay loop muted playsInline className="w-full aspect-video object-cover">
                            <source src="https://cdn.prod.website-files.com/684fc56fc7e02f3dad4a6138%2F6852764f5adbef713a1a18ef_PbE-Hero-Video-B-transcode.mp4" type="video/mp4" />
                        </video>
                    </div>
                </div>
            </section>

            {/* 2026 SECTION */}
            <section className="min-h-[80vh] sm:min-h-screen bg-[#3D2329] flex flex-col items-center justify-center px-4 sm:px-6 py-20 sm:py-32">
                <div className="text-[#D43425] font-playfair font-black text-[25vw] sm:text-[20vw] md:text-[25vw] leading-[0.85] tracking-tight">
                    2026
                </div>
                <div className="text-center mt-6 sm:mt-8 max-w-xs sm:max-w-lg md:max-w-2xl px-4">
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.5em] text-[#D43425]/60 mb-3 sm:mb-4">The HotelPro Legacy</p>
                    <p className="text-[#EFE7D9]/60 text-xs sm:text-sm md:text-base leading-relaxed">
                        The 2026 represents a culinary journey rooted in classic gastronomy tradition. Sourced from rare ingredients,
                        combined with Asian influences, we are dedicated to innovation and exceptional service.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 md:gap-24 mt-12 sm:mt-16 md:mt-24">
                    <div className="flex flex-col items-center">
                        <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 border border-[#D43425]/40 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center">
                            <svg className="w-12 h-12 sm:w-[60px] sm:h-[60px]" viewBox="0 0 80 80" fill="none" stroke="#D43425" strokeWidth="1">
                                <path d="M40 10 C20 10 10 30 10 50 L10 70 L70 70 L70 50 C70 30 60 10 40 10" />
                                <circle cx="40" cy="35" r="10" />
                                <line x1="20" y1="55" x2="35" y2="40" />
                            </svg>
                        </div>
                        <p className="text-[#D43425]/60 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-3 sm:mt-4">French Asian Cuisine</p>
                    </div>
                    <div className="w-16 sm:w-px h-px sm:h-24 bg-[#D43425]/20" />
                    <div className="flex flex-col items-center">
                        <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 border border-[#D43425]/40 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center">
                            <svg className="w-12 h-12 sm:w-[60px] sm:h-[60px]" viewBox="0 0 80 80" fill="none" stroke="#D43425" strokeWidth="1">
                                <path d="M40 10 C20 10 10 30 10 50 L10 70 L70 70 L70 50 C70 30 60 10 40 10" />
                                <path d="M40 20 L40 50" />
                                <circle cx="40" cy="55" r="8" />
                            </svg>
                        </div>
                        <p className="text-[#D43425]/60 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-3 sm:mt-4">Kitchen Garden</p>
                    </div>
                </div>
            </section>

            {/* DISCOVER EXPERIENCES */}
            <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 md:px-12 bg-[#EFE7D9] text-black">
                <h2 className="text-3xl sm:text-5xl md:text-7xl lg:text-9xl font-playfair font-black italic mb-8 sm:mb-12">Discover experiences</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                    {[
                        { title: 'Experience the atmosphere.', img: '/images/homepage/chateau.png' },
                        { title: 'Savor the culinary arts.', img: '/images/homepage/culinary.png' },
                        { title: 'Indulge in wellness.', img: '/images/homepage/spa.png' },
                    ].map((card) => (
                        <Link key={card.title} href="/customer" className="group relative aspect-[4/3] rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden">
                            <Image src={card.img} alt={card.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                            <div className="absolute bottom-6 sm:bottom-8 left-6 sm:left-8 right-6 sm:right-8">
                                <p className="text-white font-playfair text-xl sm:text-2xl md:text-3xl italic">{card.title}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-[#3D2329]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-8 sm:gap-12">
                    <div>
                        <div className="text-[#D43425] font-black text-2xl sm:text-3xl md:text-4xl tracking-tighter mb-3 sm:mb-4">HOTELPRO</div>
                        <p className="text-[#EFE7D9]/40 text-xs sm:text-sm max-w-sm">Premium dining and accommodation experiences.</p>
                    </div>
                    <div className="flex flex-col items-start md:items-end gap-4 sm:gap-6">
                        <div className="flex gap-4 sm:gap-6">
                            {['Instagram', 'LinkedIn'].map((s) => (
                                <a key={s} href="#" className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[#EFE7D9]/40 hover:text-[#D43425] transition-colors">{s}</a>
                            ))}
                        </div>
                        <p className="text-[9px] sm:text-[10px] text-[#EFE7D9]/30 uppercase tracking-widest">© HOTELPRO @2026</p>
                    </div>
                </div>
            </footer>
        </main>
    );
}
