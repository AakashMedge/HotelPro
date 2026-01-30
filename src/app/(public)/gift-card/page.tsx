'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

// --- SVG Stickers ---
const MacaronSVG = ({ color = "#E9A8F5" }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
        <rect x="20" y="35" width="60" height="15" rx="8" fill={color} />
        <rect x="25" y="48" width="50" height="8" rx="4" fill="white" opacity="0.8" />
        <rect x="20" y="54" width="60" height="15" rx="8" fill={color} />
    </svg>
);

const ChampagneSVG = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
        <path d="M40 20 L60 20 L55 50 Q50 60 45 50 Z" fill="#F4D03F" opacity="0.6" />
        <path d="M40 20 L60 20 L62 15 L38 15 Z" fill="none" stroke="#6D4C41" strokeWidth="1" />
        <line x1="50" y1="60" x2="50" y2="90" stroke="#6D4C41" strokeWidth="2" />
        <line x1="40" y1="90" x2="60" y2="90" stroke="#6D4C41" strokeWidth="2" />
    </svg>
);

const REVIEWS_DATA = [
    { id: 1, type: 'text', stars: 5, text: "The tour was great, very informative but also fun. Lots of opportunities for pictures.", bgColor: 'bg-[#DFDAFF]' },
    { id: 2, type: 'image', image: 'https://images.unsplash.com/photo-1549463591-24c1882bd396?w=800&q=80' },
    { id: 3, type: 'text', stars: 5, text: "I would recommend this for anyone interested in the Emily in Paris vibes.", bgColor: 'bg-[#DFDAFF]' },
    { id: 4, type: 'image', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80' },
    { id: 5, type: 'text', stars: 5, text: "An absolutely magical experience. HotelPro truly understands luxury.", bgColor: 'bg-[#FEE2E2]' },
    { id: 6, type: 'image', image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80' },
    { id: 7, type: 'text', stars: 5, text: "Best gift I've ever received. Highly recommended!", bgColor: 'bg-[#ECFCCB]' }
];

// Doubling data for infinite loop
const MARQUEE_DATA = [...REVIEWS_DATA, ...REVIEWS_DATA];

export default function GiftCardPage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="min-h-screen bg-[#F5F0EC]" />;

    return (
        <main className="min-h-screen bg-[#F5F0EC] text-[#3D2329] overflow-x-hidden relative">

            {/* Nav */}
            <nav className="absolute top-0 left-0 right-0 z-50 px-8 py-8 flex justify-between items-center">
                <Link href="/home" className="text-[#3D2329] font-black text-2xl tracking-tighter hover:text-[#D43425] transition-colors uppercase">HOTELPRO</Link>
                <Link href="/customer" className="w-12 h-12 rounded-full border border-black/10 bg-white/40 backdrop-blur-md flex items-center justify-center hover:bg-[#D43425] hover:text-white transition-all shadow-sm">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </Link>
            </nav>

            {/* Hero Section */}
            <section className="relative h-[55vh] flex flex-col items-center justify-center text-center overflow-hidden">
                <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
                    <div className="absolute left-[10%] top-[20%] w-16 h-16 animate-pulse"><MacaronSVG color="#F8BBD0" /></div>
                    <div className="absolute right-[15%] top-[15%] w-20 h-20 animate-pulse delay-700"><ChampagneSVG /></div>
                </div>
                <div className="relative z-10 px-4">
                    <h1 className="text-[4rem] md:text-[6rem] lg:text-[8rem] font-playfair font-semibold leading-tight tracking-tight text-[#3D2329]">
                        Gift Card
                    </h1>
                    <p className="text-lg md:text-2xl font-playfair italic tracking-[0.2em] uppercase font-light text-[#D43425] -mt-2">
                        In Paris & Rome
                    </p>
                </div>
            </section>

            {/* Feature Section */}
            <section className="max-w-7xl mx-auto px-6 pb-24">
                <div className="bg-[#EFE7D9]/40 backdrop-blur-md rounded-[3rem] p-8 md:p-16 flex flex-col md:flex-row gap-12 items-center border border-white/40 shadow-2xl">
                    <div className="w-full md:w-1/2 space-y-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#D43425]/10 rounded-full">
                            <span className="text-xl">🎁</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#D43425]">Premium Gifting</span>
                        </div>
                        <h2 className="text-5xl md:text-6xl font-playfair font-black leading-tight">The perfect gift 💝</h2>
                        <p className="text-xl text-[#3D2329]/70 leading-relaxed font-medium">
                            Give the gift of an <strong className="text-[#3D2329]">Official HotelPro Experience</strong>.
                            Perfect for fans of elite hospitality. Choose the flexibility of memory.
                        </p>
                        <button className="bg-white px-10 py-5 rounded-full shadow-lg hover:bg-[#D43425] hover:text-white transition-all font-black text-xs uppercase tracking-widest active:scale-95 duration-300">
                            Buy Experience Card
                        </button>
                    </div>
                    <div className="w-full md:w-1/2 relative aspect-4/3 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <Image src="https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1000&q=80" fill alt="Gift" className="object-cover" priority sizes="(max-width: 768px) 100vw, 50vw" />
                    </div>
                </div>
            </section>

            {/* Automatic Scrolling Reviews (Marquee) */}
            <section className="py-24 bg-transparent overflow-hidden">
                <div className="px-8 md:px-20 mb-16">
                    <h2 className="text-4xl md:text-6xl lg:text-7xl font-playfair font-semibold tracking-tight text-[#3D2329]">
                        What guests <span className="text-[#D43425] italic">are saying</span>
                    </h2>
                </div>

                <div className="relative flex">
                    <motion.div
                        className="flex gap-8 px-4"
                        animate={{ x: ["0%", "-50%"] }}
                        transition={{
                            x: { duration: 40, repeat: Infinity, ease: "linear" }
                        }}
                    >
                        {MARQUEE_DATA.map((review, idx) => (
                            <div
                                key={`${review.id}-${idx}`}
                                className={`shrink-0 w-[80vw] md:w-[450px] aspect-4/5 rounded-[2.5rem] overflow-hidden shadow-xl ${review.type === 'text' ? review.bgColor : 'bg-white'}`}
                            >
                                {review.type === 'text' ? (
                                    <div className="p-10 md:p-12 h-full flex flex-col justify-between">
                                        <div className="text-2xl text-[#D43425]">★★★★★</div>
                                        <p className="text-2xl md:text-3xl font-playfair italic leading-tight text-[#3D2329]">"{review.text}"</p>
                                        <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Verified Experience</div>
                                    </div>
                                ) : (
                                    <div className="relative w-full h-full">
                                        <Image src={review.image!} fill alt="Review" className="object-cover" sizes="(max-width: 768px) 80vw, 450px" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Down Section */}
            <section className="py-24 px-6 text-center space-y-12">
                <h2 className="text-5xl md:text-8xl font-playfair font-black tracking-tighter">Experience Boldness.</h2>
                <Link href="/welcome-guest" className="inline-block px-12 py-5 bg-[#3D2329] text-[#EFE7D9] rounded-full font-black uppercase tracking-[0.3em] hover:bg-[#D43425] transition-all transform hover:scale-105 shadow-xl">
                    Begin Your Journey
                </Link>
            </section>

            {/* Footer */}
            <footer className="py-24 border-t border-black/5 text-center bg-[#F5F0EC]">
                <div className="text-[#3D2329]/5 font-black text-[18vw] leading-none select-none tracking-tighter">HOTELPRO</div>
                <div className="mt-12 flex justify-center gap-8 flex-wrap text-[10px] font-black uppercase tracking-[0.4em] opacity-30">
                    <span>INSTAGRAM</span><span>TERMS</span><span>PRIVACY</span><span>CONTACT</span>
                </div>
            </footer>
        </main>
    );
}
