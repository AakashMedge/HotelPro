'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function PosSplitTestimonialSection() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const leftCardRef = useRef<HTMLDivElement>(null);
    const rightCardRef = useRef<HTMLDivElement>(null);
    const centerContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top top',
                    end: '+=130%',
                    pin: true,
                    scrub: 0.8,
                    anticipatePin: 1,
                },
            });

            // Initial positions: close to center, un-tilted, center text subtle
            gsap.set(leftCardRef.current, { xPercent: 16, rotateZ: 0 });
            gsap.set(rightCardRef.current, { xPercent: -16, rotateZ: 0 });
            gsap.set(centerContentRef.current, { opacity: 0, scale: 0.92 });

            // Scrubbed animation: cards part like curtains and tilt gently
            tl.to(leftCardRef.current, {
                xPercent: -58,
                rotateZ: -2.4,
                ease: 'power1.inOut',
            }, 0)
            .to(rightCardRef.current, {
                xPercent: 58,
                rotateZ: 2.4,
                ease: 'power1.inOut',
            }, 0)
            .to(centerContentRef.current, {
                opacity: 1,
                scale: 1,
                ease: 'power1.out',
            }, 0.04);

        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={sectionRef} className="relative w-full h-screen bg-[#DFDEFA] overflow-hidden flex items-center justify-center">
            {/* Stage Container */}
            <div className="relative w-full h-full flex items-center justify-center px-4 sm:px-6">
                
                {/* Left Card: review3.jpg */}
                <div
                    ref={leftCardRef}
                    className="absolute left-1/2 top-1/2 -translate-y-1/2 w-[42vw] sm:w-[34vw] md:w-[28vw] lg:w-[26vw] h-[56vh] sm:h-[65vh] md:h-[72vh] rounded-3xl sm:rounded-4xl md:rounded-[2.75rem] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.3)] z-20 origin-center bg-neutral-900 will-change-transform pointer-events-none sm:pointer-events-auto"
                >
                    <Image
                        src="/images/review3.jpg"
                        alt="HotelPro POS Dining Experience"
                        fill
                        priority
                        className="object-cover w-full h-full select-none"
                        sizes="(max-width: 1024px) 50vw, 400px"
                    />
                </div>

                {/* Center Content: Testimonial & POS Software Highlights */}
                <div
                    ref={centerContentRef}
                    className="relative z-10 max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl text-center px-4 sm:px-6 space-y-4 sm:space-y-6 text-[#1F1728] will-change-transform"
                >
                    {/* Stars */}
                    <div className="flex justify-center items-center gap-1 text-[#1F1728] text-xs sm:text-sm tracking-widest">
                        <span>★</span>
                        <span>★</span>
                        <span>★</span>
                        <span>★</span>
                        <span>★</span>
                    </div>

                    {/* Author / Venue Tag */}
                    <div className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.3em] opacity-60">
                        Danielle & Guillaume, Restaurant Partners
                    </div>

                    {/* Quote (Playfair Display Italic - Emily in Paris Style) */}
                    <p className="font-playfair italic text-base sm:text-xl md:text-2xl lg:text-3xl leading-snug sm:leading-relaxed text-[#1F1728] px-2 sm:px-4">
                        &ldquo;The HotelPro POS software is incredibly fast and convenient to use. Floor tables, instant kitchen order dispatch, and quick guest billing have made service genuinely joyful.&rdquo;
                    </p>

                    {/* Action Button */}
                    <div className="pt-2">
                        <Link
                            href="/customer"
                            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 bg-white text-[#1F1728] rounded-full text-xs sm:text-sm font-semibold shadow-md hover:shadow-xl hover:scale-105 active:scale-95 transition-all group cursor-pointer"
                        >
                            <span>Explore POS System</span>
                            <div className="w-7 h-7 rounded-full bg-[#E85D75] text-white flex items-center justify-center group-hover:rotate-45 transition-transform">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="7" y1="17" x2="17" y2="7" />
                                    <polyline points="7 7 17 7 17 17" />
                                </svg>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Right Card: review1.jpg */}
                <div
                    ref={rightCardRef}
                    className="absolute right-1/2 top-1/2 -translate-y-1/2 w-[42vw] sm:w-[34vw] md:w-[28vw] lg:w-[26vw] h-[56vh] sm:h-[65vh] md:h-[72vh] rounded-3xl sm:rounded-4xl md:rounded-[2.75rem] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.3)] z-20 origin-center bg-neutral-900 will-change-transform pointer-events-none sm:pointer-events-auto"
                >
                    <Image
                        src="/images/review1.jpg"
                        alt="HotelPro POS Table Service Experience"
                        fill
                        priority
                        className="object-cover w-full h-full select-none"
                        sizes="(max-width: 1024px) 50vw, 400px"
                    />
                </div>

            </div>
        </section>
    );
}
