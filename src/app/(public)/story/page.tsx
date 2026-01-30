'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';

// --- SVG Stickers ---

const PizzaSVG = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <path d="M50 10 L90 85 L10 85 Z" fill="#F8E2A1" stroke="#D43425" strokeWidth="2" />
        <path d="M50 10 L90 15 Q95 85 90 85" fill="#E2B16A" />
        <circle cx="45" cy="45" r="8" fill="#D43425" opacity="0.8" />
        <circle cx="65" cy="65" r="6" fill="#D43425" opacity="0.8" />
        <circle cx="35" cy="70" r="7" fill="#D43425" opacity="0.8" />
    </svg>
);

const WineSVG = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <path d="M30 20 Q50 15 70 20 L65 50 Q50 60 35 50 Z" fill="#A12A34" opacity="0.8" />
        <path d="M30 20 Q50 10 70 20 L75 10 L25 10 Z" fill="none" stroke="#EFE7D9" strokeWidth="2" />
        <line x1="50" y1="60" x2="50" y2="90" stroke="#EFE7D9" strokeWidth="2" />
        <line x1="35" y1="90" x2="65" y2="90" stroke="#EFE7D9" strokeWidth="2" />
    </svg>
);

const LemonSVG = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="50" cy="55" rx="35" ry="25" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="2" />
        <path d="M50 30 Q55 10 45 10" fill="none" stroke="#229954" strokeWidth="3" />
        <path d="M45 15 L35 5" fill="#229954" />
        <circle cx="40" cy="50" r="2" fill="white" opacity="0.3" />
    </svg>
);

const SundaeSVG = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <path d="M30 80 L70 80 L50 95 Z" fill="#EFE7D9" />
        <path d="M35 80 L65 80 L50 20 Z" fill="#D43425" opacity="0.2" />
        <circle cx="50" cy="40" r="20" fill="#FFC0CB" />
        <circle cx="50" cy="25" r="18" fill="#FDFEFE" />
        <circle cx="50" cy="10" r="6" fill="#D43425" />
    </svg>
);

const GlassSVG = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect x="35" y="30" width="30" height="40" rx="5" fill="none" stroke="#EFE7D9" strokeWidth="2" opacity="0.6" />
        <path d="M35 50 Q50 45 65 50" fill="none" stroke="#EFE7D9" strokeWidth="2" opacity="0.4" />
        <circle cx="50" cy="40" r="3" fill="#EFE7D9" opacity="0.3" />
    </svg>
);

const STICKERS_DATA = [
    { component: <PizzaSVG />, size: 80, x: "10%", y: "20%", rotate: -15, duration: 4.5 },
    { component: <WineSVG />, size: 60, x: "85%", y: "15%", rotate: 10, duration: 5.2 },
    { component: <LemonSVG />, size: 50, x: "15%", y: "70%", rotate: 45, duration: 6.1 },
    { component: <SundaeSVG />, size: 70, x: "75%", y: "65%", rotate: -5, duration: 4.9 },
    { component: <PizzaSVG />, size: 60, x: "90%", y: "80%", rotate: 20, duration: 5.8 },
    { component: <GlassSVG />, size: 40, x: "5%", y: "45%", rotate: -25, duration: 4.2 },
    { component: <LemonSVG />, size: 40, x: "40%", y: "85%", rotate: 15, duration: 6.5 },
    { component: <WineSVG />, size: 55, x: "70%", y: "25%", rotate: -10, duration: 5.5 },
];

const FloatingSticker = ({ sticker, mousePos }: { sticker: any, mousePos: { x: number, y: number } }) => {
    // Subtle parallax effect based on mouse position
    const parallaxX = (mousePos.x - 0.5) * 40;
    const parallaxY = (mousePos.y - 0.5) * 40;

    return (
        <motion.div
            className="absolute pointer-events-none"
            style={{
                left: sticker.x,
                top: sticker.y,
                width: sticker.size,
                height: sticker.size,
            }}
            initial={{ rotate: sticker.rotate, y: 0 }}
            animate={{
                x: parallaxX,
                y: [parallaxY, parallaxY - 20, parallaxY],
                rotate: [sticker.rotate, sticker.rotate + 10, sticker.rotate],
            }}
            transition={{
                x: { type: "spring", stiffness: 50, damping: 20 },
                y: { duration: sticker.duration, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: sticker.duration + 1, repeat: Infinity, ease: "easeInOut" }
            }}
        >
            <div className="w-full h-full drop-shadow-2xl filter blur-[0.2px]">
                {sticker.component}
            </div>
        </motion.div>
    );
};

export default function StoryPage() {
    const [mounted, setMounted] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({
                x: e.clientX / window.innerWidth,
                y: e.clientY / window.innerHeight
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const articles = [
        {
            id: 1,
            title: "Valentine's Day in Rome: Romantic Emily in Paris Experiences",
            date: "JANUARY 22, 2026",
            image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
            category: "ARTICLE"
        },
        {
            id: 2,
            title: "The Architecture of Hospitality: Designing for Elite Guests",
            date: "JANUARY 15, 2026",
            image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
            category: "LIFESTYLE"
        },
        {
            id: 3,
            title: "Culinary Secrets: The Root of Classic Gastronomy Tradition",
            date: "JANUARY 05, 2026",
            image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
            category: "CUISINE"
        }
    ];

    return (
        <main ref={containerRef} className="min-h-screen bg-[#7D1B2B] text-[#EFE7D9] overflow-x-hidden relative">

            {/* Nav Header */}
            <div className="absolute top-0 left-0 right-0 z-50 px-8 py-8 flex justify-between items-center">
                <Link href="/home" className="text-[#EFE7D9] font-black text-2xl tracking-tighter hover:text-white transition-colors">HOTELPRO</Link>
                <Link href="/home" className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-[#EFE7D9] hover:text-[#7D1B2B] transition-all">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </Link>
            </div>

            {/* Hero Section */}
            <section className="relative h-[80vh] flex flex-col items-center justify-center text-center overflow-hidden">
                {/* Floating Stickers */}
                <div className="absolute inset-0">
                    <AnimatePresence>
                        {mounted && STICKERS_DATA.map((sticker, i) => (
                            <FloatingSticker key={i} sticker={sticker} mousePos={mousePos} />
                        ))}
                    </AnimatePresence>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1 }}
                    className="relative z-10"
                >
                    <h1 className="text-[12rem] md:text-[18rem] font-playfair font-black leading-none tracking-tight opacity-90">
                        Stories
                    </h1>
                    <h2 className="text-3xl md:text-5xl font-playfair italic tracking-widest -mt-8 md:-mt-12 uppercase font-light">
                        Articles
                    </h2>
                </motion.div>

                {/* Mouse interaction hint */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
                    <div className="w-px h-16 bg-white/20 relative overflow-hidden">
                        <motion.div
                            className="absolute top-0 left-0 w-full h-full bg-[#EFE7D9]"
                            animate={{ y: ["-100%", "100%"] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        />
                    </div>
                </div>
            </section>

            {/* Articles List */}
            <section className="max-w-6xl mx-auto px-6 py-24 space-y-32">
                {articles.map((article, index) => (
                    <motion.div
                        key={article.id}
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: index * 0.2 }}
                        className="group flex flex-col md:flex-row items-center gap-12 md:gap-24"
                    >
                        {/* Image Side */}
                        <div className="relative w-full md:w-1/2 aspect-4/3 rounded-[2.5rem] overflow-hidden shadow-2xl">
                            <Image
                                src={article.image}
                                alt={article.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                        </div>

                        {/* Content Side */}
                        <div className="w-full md:w-1/2 space-y-6">
                            <div className="flex items-center gap-4">
                                <span className="px-4 py-1.5 border border-[#EFE7D9]/30 rounded-full text-[10px] font-bold tracking-widest uppercase">{article.category}</span>
                                <span className="px-4 py-1.5 border border-[#EFE7D9]/30 rounded-full text-[10px] font-bold tracking-widest uppercase">{article.date}</span>
                            </div>

                            <div className="w-full h-px bg-[#EFE7D9]/20" />

                            <h3 className="text-4xl md:text-6xl font-playfair font-black leading-tight group-hover:italic transition-all duration-500">
                                {article.title}
                            </h3>

                            <Link href="/menu" className="inline-flex items-center gap-4 group/btn">
                                <span className="text-sm font-bold uppercase tracking-widest border-b border-[#EFE7D9]/50 group-hover/btn:border-[#EFE7D9] transition-all">Read Story</span>
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover/btn:bg-[#EFE7D9] group-hover/btn:text-[#7D1B2B] transition-all">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="7" y1="17" x2="17" y2="7" />
                                        <polyline points="7 7 17 7 17 17" />
                                    </svg>
                                </div>
                            </Link>
                        </div>
                    </motion.div>
                ))}
            </section>

            {/* Footer */}
            <footer className="py-24 border-t border-white/10 text-center">
                <div className="text-[#EFE7D9]/20 font-black text-[15vw] leading-none select-none">
                    HOTELPRO
                </div>
            </footer>
        </main>
    );
}
