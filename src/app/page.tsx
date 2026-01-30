'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SplashPage() {
    const router = useRouter();
    const [phase, setPhase] = useState(0);
    // Phase 0: "When will your hotel story begin?"
    // Phase 1: "Welcome to HotelPro"
    // Phase 2: Redirect to /home

    useEffect(() => {
        // Phase 1: After 2.5 seconds, show "Welcome to HotelPro"
        const timer1 = setTimeout(() => {
            setPhase(1);
        }, 2500);

        // Phase 2: After 5 seconds total, redirect to home
        const timer2 = setTimeout(() => {
            setPhase(2);
            router.push('/home');
        }, 5000);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [router]);

    return (
        <main className="min-h-screen bg-[#3D2329] flex items-center justify-center overflow-hidden relative">
            {/* Decorative Lines */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-0 w-full h-px bg-[#D43425]/10" />
                <div className="absolute top-3/4 left-0 w-full h-px bg-[#D43425]/10" />
                <div className="absolute left-1/4 top-0 w-px h-full bg-[#D43425]/10" />
                <div className="absolute left-3/4 top-0 w-px h-full bg-[#D43425]/10" />
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2A181B]">
                <div
                    className="h-full bg-[#D43425] animate-progress"
                />
            </div>

            {/* Content Container */}
            <div className="relative z-10 text-center px-6">
                {/* Phase 0: When will your hotel story begin? */}
                <div className={`transition-all duration-1000 ${phase === 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute inset-0 flex items-center justify-center'}`}>
                    <div className="space-y-8">
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <span className="w-12 md:w-24 h-px bg-[#D43425]/40" />
                            <span className="text-[#EFE7D9]/40 text-[10px] sm:text-xs uppercase tracking-[0.5em] font-light">
                                H&P
                            </span>
                            <span className="w-12 md:w-24 h-px bg-[#D43425]/40" />
                        </div>
                        <h1 className="text-[#EFE7D9] font-playfair text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-[1.2] animate-modern-reveal">
                            <span className="font-light italic">When will your</span><br />
                            <span className="font-black text-[#D43425]">hotel story</span><br />
                            <span className="font-light italic">begin?</span>
                        </h1>
                        <p className="text-[#EFE7D9]/30 text-xs uppercase tracking-[0.4em]">
                            Premium Hospitality Experience
                        </p>
                    </div>
                </div>

                {/* Phase 1: Welcome to HotelPro */}
                <div className={`transition-all duration-1000 ${phase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}>
                    {phase >= 1 && (
                        <div className="space-y-8">
                            <div className="flex items-center justify-center gap-4 mb-6">
                                <span className="w-16 md:w-32 h-px bg-[#D43425]/40" />
                                <span className="text-[#D43425] font-playfair text-2xl sm:text-3xl italic">H&P</span>
                                <span className="w-16 md:w-32 h-px bg-[#D43425]/40" />
                            </div>
                            <p className="text-[#EFE7D9]/40 text-[10px] sm:text-xs uppercase tracking-[0.5em] font-bold mb-4">
                                Your Journey Starts Now
                            </p>
                            <h1 className="text-[#EFE7D9] font-playfair font-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl leading-[0.95] animate-modern-reveal">
                                Welcome to<br />
                                <span className="text-[#D43425]">HotelPro</span>
                            </h1>
                            <p className="text-[#EFE7D9]/50 text-base sm:text-lg md:text-xl font-playfair italic tracking-wide mt-8">
                                Where Your Dining Experience Begins
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Corner Branding */}
            <div className="absolute top-6 sm:top-8 left-6 sm:left-8">
                <span className="text-[#D43425] font-black text-lg sm:text-xl tracking-tighter">HOTELPRO</span>
            </div>
            <div className="absolute top-6 sm:top-8 right-6 sm:right-8">
                <span className="text-[#EFE7D9]/20 font-playfair italic text-sm sm:text-base">Est. 2026</span>
            </div>
            <div className="absolute bottom-8 left-6 sm:left-8 hidden sm:block">
                <span className="text-[#D43425]/30 text-[10px] uppercase tracking-[0.3em]">Private Residence</span>
            </div>
            <div className="absolute bottom-8 right-6 sm:right-8 hidden sm:block">
                <span className="text-[#D43425]/30 text-[10px] uppercase tracking-[0.3em]">Elite Hospitality</span>
            </div>

            {/* Decorative Year - Large Background Text */}
            <div className="absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 pointer-events-none select-none">
                <span className="text-[#D43425]/5 font-playfair font-black text-[20rem] sm:text-[25rem] md:text-[35rem] leading-none">
                    26
                </span>
            </div>
        </main>
    );
}
