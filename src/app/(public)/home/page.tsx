'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function HomePage() {
    const [mounted, setMounted] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [yearCount, setYearCount] = useState(2000);
    const [hasAnimatedYear, setHasAnimatedYear] = useState(false);
    const [showLegacyContent, setShowLegacyContent] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [targetUrl, setTargetUrl] = useState('');
    const yearSectionRef = useRef<HTMLDivElement>(null);
    const heroVideoRef = useRef<HTMLVideoElement>(null);
    const secondaryVideoRef = useRef<HTMLVideoElement>(null);
    const router = useRouter();

    const handleBookClick = (e: React.MouseEvent, url: string) => {
        e.preventDefault();
        setTargetUrl(url);
        setIsTransitioning(true);

        // Wait for animation (2.5s) + a little buffer
        setTimeout(() => {
            router.push(url);
        }, 2800);
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    // Ensure videos play on mount
    useEffect(() => {
        if (mounted) {
            if (heroVideoRef.current) {
                heroVideoRef.current.muted = true;
                heroVideoRef.current.play().catch(e => console.log("Hero video autoplay failed:", e));
            }
            if (secondaryVideoRef.current) {
                secondaryVideoRef.current.muted = true;
                secondaryVideoRef.current.play().catch(e => console.log("Secondary video autoplay failed:", e));
            }
        }
    }, [mounted]);

    // Year counter animation with variable speed
    useEffect(() => {
        if (!mounted || hasAnimatedYear) return;

        const animateYearCounter = () => {
            const years = [
                // Slow start (300ms each)
                { year: 2000, delay: 300 },
                { year: 2001, delay: 300 },
                { year: 2002, delay: 250 },
                // Speed up (progressively faster)
                { year: 2005, delay: 100 },
                { year: 2008, delay: 80 },
                { year: 2010, delay: 60 },
                { year: 2012, delay: 50 },
                { year: 2014, delay: 40 },
                { year: 2016, delay: 35 },
                { year: 2018, delay: 30 },
                { year: 2020, delay: 40 },
                { year: 2022, delay: 60 },
                // Slow down at end (300ms each)
                { year: 2024, delay: 150 },
                { year: 2025, delay: 300 },
                { year: 2026, delay: 0 },
            ];

            let index = 0;

            const runNext = () => {
                if (index < years.length) {
                    setYearCount(years[index].year);
                    const delay = years[index].delay;
                    index++;
                    if (delay > 0) {
                        setTimeout(runNext, delay);
                    } else {
                        // Animation complete - trigger legacy content reveal
                        setTimeout(() => {
                            setShowLegacyContent(true);
                        }, 500);
                    }
                }
            };

            runNext();
        };

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !hasAnimatedYear) {
                        setHasAnimatedYear(true);
                        animateYearCounter();
                    }
                });
            },
            { threshold: 0.5 }
        );

        if (yearSectionRef.current) {
            observer.observe(yearSectionRef.current);
        }

        return () => observer.disconnect();
    }, [mounted, hasAnimatedYear]);

    if (!mounted) return null;


    return (
        <main className="min-h-screen bg-white text-white font-sans overflow-x-hidden">

            {/* HERO SECTION - ROUNDED WITH PADDING */}
            <section className="p-2 sm:p-4 md:p-6 lg:p-8 min-h-screen">
                <div className="relative w-full h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)] rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[3rem] overflow-hidden">
                    {/* Background Video */}
                    <video
                        ref={heroVideoRef}
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
                            <Link href="/login" className="px-3 py-2 md:px-4 md:py-2 bg-white/10 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/20 transition-all border border-white/20">
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
                        <div className="relative group cursor-pointer">
                            {/* SVG Quatrefoil Shape - Transparent by default, solid on hover */}
                            <svg
                                viewBox="0 0 400 440"
                                className="w-[260px] h-[290px] sm:w-[300px] sm:h-[330px] md:w-[380px] md:h-[420px] lg:w-[440px] lg:h-[485px] transition-all duration-500"
                                fill="none"
                            >
                                {/* Outer Border - Glassmorphism effect */}
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
                                    className="fill-white/20 group-hover:fill-[#F5F0EC] transition-all duration-500"
                                    stroke="#D43425"
                                    strokeWidth="3"
                                    strokeOpacity="0.6"
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
                                    strokeOpacity="0.4"
                                    className="group-hover:stroke-[#D43425] transition-all duration-500"
                                />
                            </svg>

                            {/* Content Overlay */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 sm:px-10 md:px-14">
                                {/* H&P Monogram with flanking text */}
                                <div className="flex items-center justify-center gap-3 sm:gap-5 md:gap-8 mb-1 sm:mb-2">
                                    <span className="text-[#D43425]/70 group-hover:text-[#D43425] text-[7px] sm:text-[8px] md:text-[10px] font-semibold uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-all duration-500">Private</span>
                                    <span className="text-[#D43425]/80 group-hover:text-[#D43425] font-playfair text-2xl sm:text-3xl md:text-4xl italic transition-all duration-500">H&P</span>
                                    <span className="text-[#D43425]/70 group-hover:text-[#D43425] text-[7px] sm:text-[8px] md:text-[10px] font-semibold uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-all duration-500">Residence</span>
                                </div>

                                {/* Main Title */}
                                <h1 className="text-[#D43425]/80 group-hover:text-[#D43425] font-playfair text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[0.95] tracking-tight mb-0 transition-all duration-500">
                                    HOTEL
                                </h1>
                                <h1 className="text-[#D43425]/90 group-hover:text-[#D43425] font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[0.95] tracking-tight mb-2 sm:mb-3 transition-all duration-500">
                                    PRO
                                </h1>

                                {/* Location Text */}
                                <div className="space-y-0.5 mb-4 sm:mb-5">
                                    <p className="text-[#D43425]/50 group-hover:text-[#D43425]/70 text-[10px] sm:text-xs md:text-sm font-playfair italic transition-all duration-500">Premium Suite</p>
                                    <p className="text-[#D43425]/60 group-hover:text-[#D43425] text-[7px] sm:text-[8px] md:text-[9px] font-bold uppercase tracking-[0.25em] sm:tracking-[0.3em] transition-all duration-500">Elite Hospitality</p>
                                </div>

                                {/* CTA Buttons - Side by Side Square Cards */}
                                <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4">
                                    {/* Scan the QR - Transparent → White on hover */}
                                    <Link
                                        href="/welcome-guest"
                                        className="flex flex-col items-center justify-center w-[65px] h-[65px] sm:w-[75px] sm:h-[75px] md:w-[90px] md:h-[90px] bg-white/20 group-hover:bg-white rounded-xl sm:rounded-2xl backdrop-blur-sm group-hover:shadow-lg border border-white/30 group-hover:border-[#D43425]/30 transition-all duration-500"
                                    >
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white group-hover:text-[#D43425] mb-1 transition-all duration-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <rect x="3" y="3" width="7" height="7" />
                                            <rect x="14" y="3" width="7" height="7" />
                                            <rect x="14" y="14" width="7" height="7" />
                                            <rect x="3" y="14" width="7" height="7" />
                                        </svg>
                                        <span className="text-white/80 group-hover:text-[#D43425] font-bold text-[5px] sm:text-[6px] md:text-[7px] uppercase tracking-wide text-center leading-tight transition-all duration-500">Scan<br />the QR</span>
                                    </Link>

                                    {/* Book a Table - Transparent → Red on hover */}
                                    <Link
                                        href="/customer"
                                        className="flex flex-col items-center justify-center w-[65px] h-[65px] sm:w-[75px] sm:h-[75px] md:w-[90px] md:h-[90px] bg-[#D43425]/30 group-hover:bg-[#D43425] rounded-xl sm:rounded-2xl backdrop-blur-sm group-hover:shadow-lg border border-[#D43425]/40 group-hover:border-[#D43425] transition-all duration-500"
                                    >
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white/80 group-hover:text-white mb-1 transition-all duration-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <circle cx="12" cy="12" r="9" />
                                            <path d="M8 12h8M12 8v8" />
                                        </svg>
                                        <span className="text-white/80 group-hover:text-white font-bold text-[5px] sm:text-[6px] md:text-[7px] uppercase tracking-wide text-center leading-tight transition-all duration-500">Book<br />a Table</span>
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
                                        { label: 'STORIES', href: '/story' },
                                        { label: 'GIFT CARDS', href: '/gift-card' },
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

                    <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-playfair font-semibold italic leading-[0.95] mb-8 sm:mb-12">
                        Unlock The HotelPro Experiences
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
                        <video
                            ref={secondaryVideoRef}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full aspect-video object-cover"
                        >
                            <source src="https://cdn.prod.website-files.com/684fc56fc7e02f3dad4a6138%2F6852764f5adbef713a1a18ef_PbE-Hero-Video-B-transcode.mp4" type="video/mp4" />
                        </video>
                    </div>
                </div>
            </section>

            {/* 2026 SECTION */}
            <section ref={yearSectionRef} className="min-h-[80vh] sm:min-h-screen bg-[#3D2329] flex flex-col items-center justify-center px-4 sm:px-6 py-20 sm:py-32">
                <div className={`text-[#D43425] font-playfair font-black text-[25vw] sm:text-[20vw] md:text-[25vw] leading-[0.85] tracking-tight transition-all duration-100 ${yearCount > 2002 && yearCount < 2024 ? 'blur-[2px]' : 'blur-0'}`}>
                    {yearCount}
                </div>

                {/* Legacy Content - Cascading Reveal */}
                <div className={`text-center mt-6 sm:mt-8 max-w-xs sm:max-w-lg md:max-w-2xl px-4 transition-all duration-700 ${showLegacyContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.5em] text-[#D43425]/60 mb-3 sm:mb-4">The HotelPro Legacy</p>
                    <p className={`text-[#EFE7D9]/60 text-xs sm:text-sm md:text-base leading-relaxed transition-all duration-700 delay-300 ${showLegacyContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        The 2026 represents a culinary journey rooted in classic gastronomy tradition. Sourced from rare ingredients,
                        combined with Asian influences, we are dedicated to innovation and exceptional service.
                    </p>
                </div>

                {/* Books - Slide in from sides */}
                <div className={`flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12 md:gap-20 mt-12 sm:mt-16 md:mt-24 transition-all duration-1000 delay-500 ${showLegacyContent ? 'opacity-100' : 'opacity-0'}`}>
                    {/* Book 1: Our Story - Slides from left */}
                    <button
                        onClick={(e) => handleBookClick(e, '/story')}
                        className={`group flex flex-col items-center transition-all duration-700 delay-700 ${showLegacyContent ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}
                    >
                        <div className="relative w-36 h-48 sm:w-44 sm:h-60 md:w-52 md:h-72 perspective-1000">
                            {/* Book Cover */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#EFE7D9] via-[#D4C8B8] to-[#C4B8A8] rounded-r-lg rounded-l-sm shadow-2xl border border-[#8B7355]/30 transform group-hover:rotate-y-[-10deg] group-hover:scale-105 transition-all duration-500">
                                {/* Book Spine */}
                                <div className="absolute left-0 top-0 bottom-0 w-4 sm:w-5 bg-gradient-to-r from-[#8B7355] to-[#A08060] rounded-l-sm" />
                                {/* Gold Embossed Frame */}
                                <div className="absolute inset-4 sm:inset-5 border-2 border-[#C9A227]/60 rounded-sm" />
                                <div className="absolute inset-5 sm:inset-6 border border-[#C9A227]/40 rounded-sm" />
                                {/* Book Content */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 sm:px-8">
                                    <div className="w-8 h-px bg-[#C9A227]/60 mb-3" />
                                    <span className="text-[#5C4A32] text-[8px] sm:text-[9px] uppercase tracking-[0.3em] font-bold mb-2">Est. 2026</span>
                                    <h3 className="text-[#3D2329] font-playfair font-black text-lg sm:text-xl md:text-2xl leading-tight mb-1">Our</h3>
                                    <h3 className="text-[#3D2329] font-playfair font-black text-lg sm:text-xl md:text-2xl italic leading-tight mb-3">Story</h3>
                                    <div className="w-8 h-px bg-[#C9A227]/60 mb-3" />
                                    <span className="text-[#C9A227] font-playfair italic text-sm sm:text-base">H&P</span>
                                </div>
                                {/* Decorative Corner Details */}
                                <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-[#C9A227]/40" />
                                <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-[#C9A227]/40" />
                            </div>
                            {/* Book Shadow */}
                            <div className="absolute -bottom-2 left-2 right-2 h-4 bg-black/20 rounded-full blur-md group-hover:blur-lg transition-all" />
                        </div>
                        <p className="text-[#EFE7D9]/80 text-[9px] sm:text-[10px] uppercase tracking-[0.25em] mt-5 group-hover:text-[#EFE7D9] transition-colors">The Hotel Chronicle</p>
                    </button>

                    {/* Divider */}
                    <div className={`w-16 sm:w-px h-px sm:h-32 bg-[#D43425]/30 transition-all duration-500 delay-1000 ${showLegacyContent ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />

                    {/* Book 2: The Menu - Slides from right */}
                    <button
                        onClick={(e) => handleBookClick(e, '/menu')}
                        className={`group flex flex-col items-center transition-all duration-700 delay-700 ${showLegacyContent ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}
                    >
                        <div className="relative w-36 h-48 sm:w-44 sm:h-60 md:w-52 md:h-72 perspective-1000">
                            {/* Book Cover */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#4A2C32] via-[#3D2329] to-[#2A181B] rounded-r-lg rounded-l-sm shadow-2xl border border-[#D43425]/30 transform group-hover:rotate-y-[-10deg] group-hover:scale-105 transition-all duration-500">
                                {/* Book Spine */}
                                <div className="absolute left-0 top-0 bottom-0 w-4 sm:w-5 bg-gradient-to-r from-[#2A181B] to-[#3D2329] rounded-l-sm" />
                                {/* Gold Embossed Frame */}
                                <div className="absolute inset-4 sm:inset-5 border-2 border-[#C9A227]/50 rounded-sm" />
                                <div className="absolute inset-5 sm:inset-6 border border-[#C9A227]/30 rounded-sm" />
                                {/* Book Content */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 sm:px-8">
                                    <div className="w-8 h-px bg-[#C9A227]/50 mb-3" />
                                    <span className="text-[#C9A227]/70 text-[8px] sm:text-[9px] uppercase tracking-[0.3em] font-bold mb-2">Culinary Arts</span>
                                    <h3 className="text-[#EFE7D9] font-playfair font-black text-lg sm:text-xl md:text-2xl leading-tight mb-1">The</h3>
                                    <h3 className="text-[#EFE7D9] font-playfair font-black text-lg sm:text-xl md:text-2xl italic leading-tight mb-3">Menu</h3>
                                    <div className="w-8 h-px bg-[#C9A227]/50 mb-3" />
                                    <span className="text-[#D43425] font-playfair italic text-sm sm:text-base">H&P</span>
                                </div>
                                {/* Decorative Corner Details */}
                                <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-[#C9A227]/30" />
                                <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-[#C9A227]/30" />
                            </div>
                            {/* Book Shadow */}
                            <div className="absolute -bottom-2 left-2 right-2 h-4 bg-black/30 rounded-full blur-md group-hover:blur-lg transition-all" />
                        </div>
                        <p className="text-[#EFE7D9]/80 text-[9px] sm:text-[10px] uppercase tracking-[0.25em] mt-5 group-hover:text-[#EFE7D9] transition-colors">The Menu Ledger</p>
                    </button>
                </div>
            </section>

            {/* PREMIUM BOOK SPLASH SCREEN TRANSITION */}
            {isTransitioning && (
                <div className="fixed inset-0 z-[500] bg-[#3D2329] flex items-center justify-center overflow-hidden animate-in fade-in duration-500">
                    <div className="relative perspective-2000 w-64 h-80 sm:w-80 sm:h-96">
                        {/* 3D Book Animation Container */}
                        <div className="w-full h-full relative preserve-3d">
                            {/* Inner Pages (Stay flat) */}
                            <div className="absolute inset-0 bg-[#F5F0EC] rounded-r-lg shadow-inner flex flex-col items-center justify-center p-8 text-center">
                                <span className="text-[#C9A227] font-playfair italic text-2xl mb-4">H&P</span>
                                <div className="w-12 h-px bg-[#C9A227]/30 mb-6" />
                                <p className="text-[#3D2329]/60 font-playfair italic text-sm sm:text-base leading-relaxed">
                                    "Turning the page to a<br />new chapter of luxury..."
                                </p>
                            </div>

                            {/* Golden Glow emanating from inside */}
                            <div className="absolute inset-0 bg-[#C9A227]/20 filter blur-3xl animate-book-glow" />

                            {/* Back Cover */}
                            <div className="absolute inset-0 bg-[#3D2329] rounded-r-lg" style={{ transform: 'translateZ(-1px)' }} />

                            {/* Front Cover (Animates) */}
                            <div className="absolute inset-0 preserve-3d origin-left animate-book-open">
                                {/* Outside Content */}
                                <div className="absolute inset-0 bg-gradient-to-br from-[#4A2C32] via-[#3D2329] to-[#2A181B] rounded-r-lg rounded-l-sm shadow-2xl backface-hidden flex flex-col items-center justify-center border border-[#D43425]/30">
                                    <div className="absolute inset-4 border border-[#C9A227]/30 rounded-sm" />
                                    <span className="text-[#C9A227] font-playfair italic text-3xl">H&P</span>
                                    <div className="mt-4 w-8 h-px bg-[#C9A227]/50" />
                                </div>
                                {/* Inside Cover Content */}
                                <div className="absolute inset-0 bg-[#4A2C32] rounded-l-lg backface-hidden" style={{ transform: 'rotateY(180deg)' }}>
                                    <div className="absolute inset-4 border border-[#C9A227]/10 rounded-sm" />
                                </div>
                                {/* Spine */}
                                <div className="absolute left-0 top-0 bottom-0 w-6 bg-[#2A181B] origin-left" style={{ transform: 'rotateY(-90deg)' }} />
                            </div>
                        </div>
                    </div>

                    {/* Overall Page Exit Glow */}
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#C9A227]/5 to-[#C9A227]/10 pointer-events-none" />
                </div>
            )}

            {/* DISCOVER EXPERIENCES */}
            <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 md:px-12 bg-[#EFE7D9] text-black">
                <h2 className="text-3xl sm:text-5xl md:text-7xl lg:text-9xl font-playfair font-semibold italic mb-8 sm:mb-12">Discover experiences</h2>
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
