'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const menuItems = [
    {
        id: 1,
        title: 'Wagyu Beef Tenderloin',
        price: '₹6,800',
        image: '/images/menu/wagyu.png',
        description: 'Gold-grade Wagyu with truffle marrow.'
    },
    {
        id: 2,
        title: 'Black Truffle Risotto',
        price: '₹4,900',
        image: '/images/menu/risotto.png',
        description: 'Aged parmesan and fresh truffle.'
    },
    {
        id: 6,
        title: 'Luxury Tandoori Lobster',
        price: '₹7,500',
        image: '/images/menu/lobster.png',
        description: 'Fresh lobster tails with gold leaf.'
    },
];

export default function AIAssistant() {
    const [messages, setMessages] = useState([
        { role: 'assistant', text: "Greetings. I am the HotelPro Culinary Intelligence. I've analyzed your stay—shall we explore our Signature selections this evening?" }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [basket, setBasket] = useState<number[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const toggleBasket = (id: number) => {
        setBasket(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const simulateResponse = (text: string) => {
        setIsTyping(true);
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'assistant', text }]);
            setIsTyping(false);
        }, 1500);
    };

    return (
        <main className="min-h-screen bg-[#0A0A0A] text-white font-sans relative flex flex-col overflow-hidden">

            {/* Background Ambience */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] md:w-[40%] h-[40%] bg-[#D43425] rounded-full blur-[80px] md:blur-[120px] opacity-10 animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] md:w-[40%] h-[40%] bg-[#D43425] rounded-full blur-[80px] md:blur-[120px] opacity-10 animate-pulse delay-1000" />
            </div>

            {/* Header - MOBILE FIX */}
            <header className="relative z-50 p-6 md:p-12 flex justify-between items-center">
                <Link href="/welcome-guest" className="w-10 h-10 md:w-12 md:h-12 border border-white/10 rounded-full flex items-center justify-center hover:bg-white hover:text-black transition-all">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="md:w-5 md:h-5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                </Link>
                <div className="text-center">
                    <div className="text-[#D43425] font-black text-xl md:text-2xl tracking-tighter uppercase">HOTELPRO</div>
                    <p className="text-[7px] md:text-[8px] uppercase font-bold tracking-[0.5em] opacity-40">Artificial Intelligence Unit</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12" /> {/* Spacer */}
            </header>

            {/* AI Pulse Orb - MOBILE FIX */}
            <div className="relative z-10 flex flex-col items-center justify-center pt-4 md:pt-8 pb-8 md:pb-12">
                <div className="relative w-24 h-24 md:w-48 md:h-48">
                    <div className="absolute inset-0 bg-[#D43425] rounded-full blur-xl md:blur-2xl opacity-20 animate-pulse" />
                    <div className="absolute inset-0 border-2 border-[#D43425] rounded-full animate-[ping_3s_infinite] opacity-30" />
                    <div className="absolute inset-2 md:inset-4 border border-[#D43425]/40 rounded-full animate-[spin_12s_linear_infinite]" />
                    <div className="absolute inset-6 md:inset-8 border-2 border-[#D43425] rounded-full flex items-center justify-center">
                        <div className={`w-8 h-8 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center transition-all duration-500 ${isTyping ? 'scale-110 bg-[#D43425]' : 'scale-100'}`}>
                            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-black rounded-full animate-bounce" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Space - MOBILE FIX */}
            <section className="relative z-10 grow flex flex-col px-6 md:px-24 lg:px-64 overflow-y-auto no-scrollbar pb-32 md:pb-40">
                <div className="space-y-6 md:space-y-8">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end animate-in slide-in-from-right-4'}`}>
                            <div className={`max-w-[90%] md:max-w-[80%] p-5 md:p-6 rounded-[1.8rem] md:rounded-[2rem] ${msg.role === 'assistant' ? 'bg-white/5 border border-white/10 text-lg md:text-2xl font-playfair italic leading-relaxed' : 'bg-[#D43425] text-white font-bold text-sm md:text-base'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-white/5 border border-white/10 p-3 md:p-4 rounded-full flex gap-1.5 md:gap-2">
                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#D43425] rounded-full animate-bounce" />
                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#D43425] rounded-full animate-bounce delay-100" />
                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#D43425] rounded-full animate-bounce delay-200" />
                            </div>
                        </div>
                    )}

                    {/* AI Recommendations - MOBILE FIX */}
                    {!isTyping && messages.length > 0 && (
                        <div className="pt-6 md:pt-8 space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-[#D43425]">Recommended for You</p>
                            <div className="flex gap-5 md:gap-6 overflow-x-auto no-scrollbar pb-6 -mx-6 px-6">
                                {menuItems.map((item) => (
                                    <div key={item.id} className="min-w-[240px] md:min-w-[280px] bg-white/5 border border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-3 md:p-4 flex flex-col gap-3 md:gap-4 group">
                                        <div className="relative aspect-square rounded-[1.5rem] md:rounded-[1.8rem] overflow-hidden">
                                            <Image src={item.image} alt={item.title} fill className="object-cover transition-transform group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-black/20" />
                                        </div>
                                        <div className="px-1 md:px-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <h4 className="font-playfair font-black text-base md:text-lg">{item.title}</h4>
                                                <span className="text-[#D43425] font-bold text-sm md:text-base">{item.price}</span>
                                            </div>
                                            <p className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest opacity-40 mb-3 md:mb-4 line-clamp-1">{item.description}</p>
                                            <button
                                                onClick={() => toggleBasket(item.id)}
                                                className={`w-full py-2.5 md:py-3 rounded-full font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${basket.includes(item.id) ? 'bg-[#D43425] text-white' : 'bg-white text-black hover:bg-[#D43425] hover:text-white'}`}
                                            >
                                                {basket.includes(item.id) ? 'In Tray ✓' : 'Add to Tray'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
            </section>

            {/* Input Bar - MOBILE FIX */}
            <div className="fixed bottom-0 left-0 w-full p-4 md:p-12 z-100 bg-gradient-to-t from-black via-black/90 to-transparent">
                <div className="max-w-4xl mx-auto relative px-2">
                    <input
                        type="text"
                        placeholder="Ask your AI Assistant..."
                        className="w-full bg-white/10 border border-white/10 rounded-full px-6 md:px-8 py-4 md:py-5 text-base md:text-lg font-playfair italic outline-none focus:border-[#D43425] focus:bg-white/15 transition-all text-white pr-16 md:pr-20"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const text = e.currentTarget.value;
                                if (!text) return;
                                setMessages(prev => [...prev, { role: 'user', text }]);
                                e.currentTarget.value = '';
                                simulateResponse("Exquisite choice. I am notifying the cellar to prepare the pairing for your selection.");
                            }
                        }}
                    />
                    <button className="absolute right-4 md:right-3 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-[#D43425] rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="md:w-5 md:h-5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </div>
            </div>

            {/* Floating Tray Summary - MOBILE FIX */}
            {basket.length > 0 && (
                <div className="fixed bottom-24 md:bottom-32 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-12 z-110 animate-in slide-in-from-bottom-8 md:slide-in-from-right-8 w-[90vw] md:w-auto">
                    <div className="bg-[#D43425] text-white px-5 md:px-6 py-3.5 md:py-4 rounded-full shadow-2xl flex items-center justify-between md:justify-start gap-4 md:gap-6">
                        <div className="flex flex-col">
                            <span className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] opacity-60">Selection Active</span>
                            <span className="text-[10px] md:text-xs font-bold leading-none">{basket.length} Selected</span>
                        </div>
                        <div className="hidden md:block w-px h-6 bg-white/20" />
                        <button
                            onClick={() => router.push('/order-status')}
                            className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] bg-white text-[#D43425] px-4 md:px-5 py-2 md:py-2.5 rounded-full hover:bg-black hover:text-white transition-all shadow-lg"
                        >
                            Execute Order
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
