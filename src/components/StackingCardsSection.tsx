'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const STACKING_CARDS = [
    { src: '/images/hotel9.jpg', alt: 'HotelPro Experience 1' },
    { src: '/images/hotel4.jpg', alt: 'HotelPro Experience 2' },
    { src: '/images/hotel5.png', alt: 'HotelPro Experience 3' },
];

export default function StackingCardsSection() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const card1Ref = useRef<HTMLDivElement>(null);
    const card2Ref = useRef<HTMLDivElement>(null);
    const card3Ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top top',
                    end: '+=180%',
                    pin: true,
                    scrub: 0.8,
                    anticipatePin: 1,
                },
            });

            // Card 2 slides up over Card 1; Card 1 shrinks & dims
            tl.fromTo(card2Ref.current,
                { yPercent: 105 },
                { yPercent: 0, ease: 'power1.inOut', duration: 1 },
                0
            )
            .to(card1Ref.current, {
                scale: 0.94,
                filter: 'brightness(0.72)',
                ease: 'power1.inOut',
                duration: 1,
            }, 0)
            // Card 3 slides up over Card 2; Card 2 shrinks & dims
            .fromTo(card3Ref.current,
                { yPercent: 105 },
                { yPercent: 0, ease: 'power1.inOut', duration: 1 },
                1
            )
            .to(card2Ref.current, {
                scale: 0.94,
                filter: 'brightness(0.72)',
                ease: 'power1.inOut',
                duration: 1,
            }, 1);

        }, sectionRef);

        return () => {
            ctx.revert();
            ScrollTrigger.getAll().forEach(t => t.kill());
        };
    }, []);

    return (
        <section ref={sectionRef} className="relative w-full h-screen bg-[#EFE7D9] overflow-hidden flex items-center justify-center">
            {/* Pinned Viewport Stage */}
            <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8">
                <div className="relative w-full max-w-7xl h-[78vh] sm:h-[82vh] md:h-[85vh]">
                    
                    {/* Card 1: hotel9.jpg */}
                    <div
                        ref={card1Ref}
                        className="absolute inset-0 w-full h-full rounded-3xl sm:rounded-4xl md:rounded-[3rem] overflow-hidden shadow-2xl origin-top bg-neutral-900 z-10 will-change-transform"
                    >
                        <Image
                            src={STACKING_CARDS[0].src}
                            alt={STACKING_CARDS[0].alt}
                            fill
                            priority
                            className="object-cover w-full h-full select-none"
                            sizes="(max-width: 1024px) 100vw, 1280px"
                        />
                    </div>

                    {/* Card 2: hotel4.jpg */}
                    <div
                        ref={card2Ref}
                        className="absolute inset-0 w-full h-full rounded-3xl sm:rounded-4xl md:rounded-[3rem] overflow-hidden shadow-2xl origin-top bg-neutral-900 z-20 will-change-transform"
                    >
                        <Image
                            src={STACKING_CARDS[1].src}
                            alt={STACKING_CARDS[1].alt}
                            fill
                            priority
                            className="object-cover w-full h-full select-none"
                            sizes="(max-width: 1024px) 100vw, 1280px"
                        />
                    </div>

                    {/* Card 3: hotel5.png */}
                    <div
                        ref={card3Ref}
                        className="absolute inset-0 w-full h-full rounded-3xl sm:rounded-4xl md:rounded-[3rem] overflow-hidden shadow-2xl origin-top bg-neutral-900 z-30 will-change-transform"
                    >
                        <Image
                            src={STACKING_CARDS[2].src}
                            alt={STACKING_CARDS[2].alt}
                            fill
                            priority
                            className="object-cover w-full h-full select-none"
                            sizes="(max-width: 1024px) 100vw, 1280px"
                        />
                    </div>

                </div>
            </div>
        </section>
    );
}
