'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function WelcomeGuest() {
    const [step, setStep] = useState(0); // 0: Namaste, 1: Identity, 2: Verification/Table, 3: Choice
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        tableNo: '',
        isVerified: false
    });
    const router = useRouter();

    useEffect(() => {
        if (step === 0) {
            const timer = setTimeout(() => setStep(1), 3500);
            return () => clearTimeout(timer);
        }
    }, [step]);

    const handleIdentitySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setStep(2);
    };

    return (
        <main className="min-h-screen bg-[#EFE7D9] text-black font-sans flex flex-col items-center justify-center p-6 overflow-hidden relative">

            {/* Step 0: Indian Welcome Animation */}
            {step === 0 && (
                <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-1000">
                    <div className="w-24 h-24 mb-6 relative">
                        <div className="absolute inset-0 border-2 border-[#D43425] rounded-full animate-ping opacity-20" />
                        <div className="absolute inset-2 border border-[#D43425] rounded-full animate-pulse opacity-40" />
                        <div className="absolute inset-0 flex items-center justify-center text-[#D43425]">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-playfair font-black italic text-[#D43425] leading-tight">
                        Namaste.
                    </h1>
                    <p className="text-xl md:text-2xl font-playfair font-bold mt-4 uppercase tracking-[0.4em] opacity-80">
                        Swagaat Hain
                    </p>
                    <div className="mt-8 w-1 h-12 bg-[#D43425] animate-bounce" />
                </div>
            )}

            {/* Step 1: Identity Form */}
            {step === 1 && (
                <div className="w-full max-w-xl animate-in slide-in-from-bottom-12 duration-1000">
                    <header className="mb-12 text-center md:text-left">
                        <h2 className="text-[#D43425] text-[10px] font-black tracking-[0.5em] uppercase mb-4">Identity Verification</h2>
                        <h1 className="text-4xl md:text-6xl font-playfair font-black leading-tight">Your Digital<br />Credential</h1>
                    </header>

                    <form onSubmit={handleIdentitySubmit} className="space-y-8">
                        <div className="group border-b-2 border-black/10 focus-within:border-[#D43425] transition-colors pb-4">
                            <label className="block text-[10px] font-black tracking-widest uppercase opacity-40 mb-2">Guest Name</label>
                            <input
                                required
                                type="text"
                                placeholder="Enter your full name"
                                className="w-full bg-transparent text-2xl font-playfair font-bold placeholder:opacity-20 outline-none"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="group border-b-2 border-black/10 focus-within:border-[#D43425] transition-colors pb-4">
                            <label className="block text-[10px] font-black tracking-widest uppercase opacity-40 mb-2">Contact Number</label>
                            <input
                                required
                                type="tel"
                                placeholder="+91  XXXXX XXXXX"
                                className="w-full bg-transparent text-2xl font-playfair font-bold placeholder:opacity-20 outline-none"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <button type="submit" className="w-full py-5 bg-[#D43425] text-white font-black text-xs uppercase tracking-[0.4em] rounded-full shadow-xl hover:bg-black transition-all transform hover:scale-[1.02] active:scale-95">
                            Secure Identity & Continue
                        </button>
                    </form>
                </div>
            )}

            {/* Step 2: Verification & Table */}
            {step === 2 && (
                <div className="w-full max-w-2xl animate-in slide-in-from-right-12 duration-1000 space-y-12">
                    <header className="text-center">
                        <h2 className="text-[#D43425] text-[10px] font-black tracking-[0.5em] uppercase mb-4">Status & Location</h2>
                        <h1 className="text-4xl md:text-6xl font-playfair font-black leading-tight">Refining Your Stay</h1>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Elite Verification (Optional) */}
                        <div className="bg-white/40 backdrop-blur-sm border-2 border-dashed border-[#D43425]/30 p-8 rounded-[3rem] space-y-4 hover:border-[#D43425] transition-all group">
                            <div className="w-12 h-12 bg-[#D43425]/10 rounded-full flex items-center justify-center text-[#D43425]">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="16" rx="2" />
                                    <circle cx="9" cy="10" r="2" />
                                    <path d="M15 8h2m-2 4h2m-2 4h2" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-playfair font-black italic">Elite Verification</h3>
                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 leading-relaxed">
                                Upload your ID to unlock "Charge-to-Room" privileges and exclusive VIP pricing.
                            </p>
                            <button
                                onClick={() => setFormData({ ...formData, isVerified: true })}
                                className={`w-full py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${formData.isVerified ? 'bg-green-600 text-white' : 'bg-black text-white hover:bg-[#D43425]'}`}
                            >
                                {formData.isVerified ? 'Verification Complete √' : 'Verify ID Now (Optional)'}
                            </button>
                        </div>

                        {/* Table Assignment */}
                        <div className="bg-black text-white p-8 rounded-[3rem] space-y-6">
                            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-playfair font-black italic">Table Assignment</h3>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Enter Table No."
                                    className="w-full bg-white/5 border border-white/20 rounded-full px-6 py-3 text-center font-bold outline-none focus:border-[#D43425] transition-all"
                                    value={formData.tableNo}
                                    onChange={(e) => setFormData({ ...formData, tableNo: e.target.value })}
                                />
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={!formData.tableNo}
                                    className="w-full py-4 bg-[#D43425] rounded-full font-black text-[10px] uppercase tracking-[0.3em] disabled:opacity-30 disabled:grayscale transition-all active:scale-95"
                                >
                                    Proceed to Menu
                                </button>
                                <button className="w-full text-[9px] uppercase font-bold tracking-[0.4em] opacity-40 hover:opacity-100 transition-opacity">
                                    Auto-Detect via QR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Choice of Path */}
            {step === 3 && (
                <div className="w-full max-w-5xl animate-in zoom-in duration-700 space-y-16">
                    <header className="text-center space-y-4">
                        <h1 className="text-5xl md:text-8xl font-playfair font-black italic text-[#D43425] leading-none">
                            The Path Choice.
                        </h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">Welcome, {formData.name}. How shall we serve you?</p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <button
                            onClick={() => router.push('/menu')}
                            className="group relative h-[400px] border-2 border-black rounded-[4rem] overflow-hidden transition-all hover:border-[#D43425] hover:scale-[1.02]"
                        >
                            <div className="absolute inset-0 bg-white group-hover:bg-[#F2EDE9] transition-colors" />
                            <div className="absolute bottom-12 left-12 right-12 text-left space-y-4">
                                <div className="w-16 h-1 bg-black group-hover:bg-[#D43425] transition-colors" />
                                <h3 className="text-4xl font-playfair font-black italic">Traditional Dining</h3>
                                <p className="text-xs font-bold uppercase tracking-widest opacity-40 leading-relaxed">
                                    Browse our curated editorial menu and order at your own pace.
                                </p>
                            </div>
                            <div className="absolute top-12 right-12 w-12 h-12 border border-black rounded-full flex items-center justify-center group-hover:bg-[#D43425] group-hover:border-[#D43425] group-hover:text-white transition-all">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline>
                                </svg>
                            </div>
                        </button>

                        <button
                            onClick={() => router.push('/ai-assistant')}
                            className="group relative h-[400px] bg-[#D43425] rounded-[4rem] overflow-hidden transition-all hover:scale-[1.02] shadow-2xl"
                        >
                            <div className="absolute inset-0 bg-linear-to-br from-[#D43425] to-[#8B0000]" />
                            <div className="absolute bottom-12 left-12 right-12 text-left text-white space-y-4">
                                <div className="w-16 h-1 bg-white" />
                                <h3 className="text-4xl font-playfair font-black italic">A.I. Concierge</h3>
                                <p className="text-xs font-bold uppercase tracking-widest opacity-60 leading-relaxed">
                                    Experience personalized recommendations via our interactive AI Avatar.
                                </p>
                            </div>
                            <div className="absolute top-12 right-12 w-16 h-16 bg-white/10 rounded-full flex items-center justify-center animate-pulse">
                                <div className="w-8 h-8 rounded-full bg-white/20 animate-ping" />
                            </div>
                            <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all" />
                        </button>
                    </div>
                </div>
            )}

            {/* Footer Branding Overlay */}
            <div className="fixed bottom-12 right-12 text-right opacity-20 hidden md:block">
                <div className="text-[#D43425] font-black text-2xl tracking-tighter">HOTELPRO</div>
                <p className="text-[9px] uppercase font-bold tracking-[0.4em]">Integrated Hospitality</p>
            </div>
        </main>
    );
}
