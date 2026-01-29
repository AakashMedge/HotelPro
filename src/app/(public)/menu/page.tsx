'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const categories = ['Signature', 'Appetizers', 'Main Course', 'Desserts', 'Wine & Drinks'];

const menuItems = [
    {
        id: 1,
        category: 'Signature',
        title: 'Wagyu Beef Tenderloin',
        description: 'Gold-grade Wagyu served with truffle-infused marrow and seasonal baby vegetables.',
        price: '₹6,800',
        image: '/images/menu/wagyu.png',
    },
    {
        id: 2,
        category: 'Signature',
        title: 'Perigord Black Truffle Risotto',
        description: 'Acquerello rice slow-cooked with aged parmesan and fresh truffle shavings.',
        price: '₹4,900',
        image: '/images/menu/risotto.png',
    },
    {
        id: 6,
        category: 'Signature',
        title: 'Luxury Tandoori Lobster',
        description: 'Fresh lobster tails marinated in royal spices with an edible gold leaf garnish.',
        price: '₹7,500',
        image: '/images/menu/lobster.png',
    },
    {
        id: 3,
        category: 'Appetizers',
        title: 'Burrata di Puglia',
        description: 'Creamy burrata paired with heirloom tomatoes, aged balsamic, and basil oil.',
        price: '₹2,200',
        image: '/images/menu/burrata.png',
    },
    {
        id: 7,
        category: 'Appetizers',
        title: 'Saffron Paneer Tikka',
        description: 'Charcoal-grilled paneer cubes marinated in premium Kashmiri saffron and yogurt.',
        price: '₹1,800',
        image: '/images/menu/paneer.png',
    },
    {
        id: 4,
        category: 'Main Course',
        title: 'Wild-Caught Sea Bass',
        description: 'Pan-seared Chilean sea bass with lemon-caper reduction and saffron potatoes.',
        price: '₹4,300',
        image: '/images/menu/wagyu.png',
    },
    {
        id: 5,
        category: 'Desserts',
        title: 'Grand Cru Chocolate Fondant',
        description: 'Warm dark chocolate souffle center served with Tahitian vanilla bean gelato.',
        price: '₹1,900',
        image: '/images/menu/fondant.png',
    },
    {
        id: 8,
        category: 'Desserts',
        title: 'Royal Chai Panna Cotta',
        description: 'Masala Chai infused cream with cardamom dust and pistachio nut crumble.',
        price: '₹1,500',
        image: '/images/menu/chai.png',
    },
    {
        id: 9,
        category: 'Wine & Drinks',
        title: 'Vintage Reserve Red',
        description: 'Château de l’Ouest 1995. A full-bodied masterpiece aged in oak barrels.',
        price: '₹12,000',
        image: '/images/menu/wine.png',
    },
];

export default function MenuPage() {
    const [activeCategory, setActiveCategory] = useState('Signature');
    const [basket, setBasket] = useState<number[]>([]);
    const router = useRouter();

    const filteredItems = menuItems.filter(item => item.category === activeCategory);

    const toggleBasket = (id: number) => {
        setBasket(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const executeOrder = () => {
        router.push('/order-status');
    };

    return (
        <main className="min-h-screen bg-[#EFE7D9] text-black font-sans relative overflow-x-hidden">
            {/* Editorial Header - MOBILE FIX */}
            <header className="sticky top-0 z-50 bg-[#EFE7D9]/90 backdrop-blur-md px-4 md:px-12 py-4 md:py-6 flex justify-between items-center border-b border-black/5">
                <Link href="/home" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 md:w-10 md:h-10 border border-black/20 rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="md:w-5 md:h-5">
                            <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </div>
                </Link>

                <div className="text-center">
                    <div className="text-[#D43425] font-black text-xl md:text-2xl tracking-tighter leading-none uppercase">HOTELPRO</div>
                    <p className="text-[8px] md:text-[9px] uppercase font-bold tracking-[0.4em] opacity-40">Culinary Reserve</p>
                </div>

                <button className="flex items-center gap-2 md:gap-3 bg-black text-white px-4 md:px-5 py-2 md:py-2.5 rounded-full hover:scale-105 transition-transform active:scale-95">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="md:w-18 md:h-18">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path>
                    </svg>
                    <span className="font-black text-[10px] md:text-sm uppercase tracking-widest">{basket.length}</span>
                </button>
            </header>

            {/* Hero Branding - MOBILE FIX */}
            <section className="px-6 md:px-12 py-8 md:py-12">
                <div className="max-w-7xl mx-auto space-y-4">
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.85] uppercase flex flex-col">
                        <span>Discover</span>
                        <span className="italic font-playfair font-medium lowercase ml-4 md:ml-12 text-[#D43425]">Experience</span>
                    </h1>
                    <p className="max-w-md text-xs md:text-sm uppercase font-bold tracking-[0.2em] opacity-60 leading-relaxed pt-2 md:pt-4">
                        A curated collection of culinary masterpieces. Featuring our Royal Fusion collection.
                    </p>
                </div>
            </section>

            {/* Category Navigation - MOBILE FIX */}
            <div className="sticky top-[73px] md:top-[89px] z-40 bg-[#EFE7D9] py-3 md:py-4 border-y border-black/5 overflow-x-auto no-scrollbar">
                <div className="flex gap-6 md:gap-8 px-6 md:px-12 min-w-max">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`text-[9px] md:text-sm font-black uppercase tracking-[0.3em] transition-all relative py-2 ${activeCategory === cat ? 'text-[#D43425]' : 'text-black/30 hover:text-black'}`}
                        >
                            {cat}
                            {activeCategory === cat && (
                                <div className="absolute -bottom-1 left-0 w-full h-[2px] md:h-[3px] bg-[#D43425] rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu Grid - MOBILE FIX */}
            <section className="px-6 md:px-12 py-10 md:py-16">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16 md:gap-y-24">
                    {filteredItems.map((item) => (
                        <div key={item.id} className="group flex flex-col gap-5 md:gap-6">
                            <div className="relative aspect-square md:aspect-4/5 overflow-hidden rounded-[2rem] md:rounded-4xl shadow-2xl">
                                <Image
                                    src={item.image}
                                    alt={item.title}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/5" />
                                <button
                                    onClick={() => toggleBasket(item.id)}
                                    className={`absolute bottom-4 right-4 md:bottom-6 md:right-6 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${basket.includes(item.id) ? 'bg-[#D43425] text-white scale-110' : 'bg-white text-black hover:scale-110 active:scale-95'}`}
                                >
                                    {basket.includes(item.id) ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="md:w-6 md:h-6">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="md:w-6 md:h-6">
                                            <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    )}
                                </button>
                            </div>

                            <div className="space-y-1.5 md:space-y-2">
                                <div className="flex justify-between items-start gap-4">
                                    <h3 className="font-playfair text-xl md:text-2xl font-black leading-tight flex-grow">{item.title}</h3>
                                    <span className="font-bold text-lg md:text-xl text-[#D43425] whitespace-nowrap">{item.price}</span>
                                </div>
                                <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-40 leading-relaxed line-clamp-2 md:line-clamp-none">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Floating Action Tray - MOBILE FIX */}
            <div className={`fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-100 w-[95vw] max-w-md transition-all duration-500 transform ${basket.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
                <div className="bg-black text-white p-1.5 md:p-2 rounded-full shadow-2xl flex items-center justify-between pl-5 md:pl-6 overflow-hidden">
                    <div className="flex flex-col">
                        <span className="text-[8px] md:text-[10px] font-black tracking-widest uppercase opacity-40">Selection Active</span>
                        <span className="font-bold text-sm md:text-lg">{basket.length} {basket.length === 1 ? 'Item' : 'Items'}</span>
                    </div>
                    <button
                        onClick={executeOrder}
                        className="bg-[#D43425] px-6 md:px-8 py-3.5 md:py-4 rounded-full font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] hover:bg-white hover:text-[#D43425] transition-all"
                    >
                        Execute Order
                    </button>
                </div>
            </div>

            <div className="h-24 md:h-32" />
        </main>
    );
}
