'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WaxSeal = () => (
    <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center animate-in zoom-in-50 duration-1000">
        <div className="absolute inset-0 bg-[#D43425] rounded-full opacity-90 shadow-[0_8px_30px_rgba(212,52,37,0.4)] flex items-center justify-center drop-shadow-2xl">
            {/* Wax Edge SVG */}
            <svg viewBox="0 0 100 100" className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] text-[#B2251A] fill-current rotate-45 z-0">
                <path d="M50 0 L55 5 L65 2 L68 10 L78 9 L78 19 L88 22 L84 32 L94 38 L88 48 L96 55 L86 62 L90 70 L80 75 L78 85 L68 85 L62 94 L52 90 L45 98 L35 92 L28 100 L22 90 L12 92 L14 82 L4 78 L10 68 L2 58 L12 50 L5 42 L15 35 L12 25 L22 22 L25 12 L35 15 L42 5 Z" />
            </svg>
            <div className="text-[#FDFBF7] font-playfair italic text-4xl sm:text-5xl z-10 relative drop-shadow-md">H&P</div>
            <div className="absolute inset-2 border border-white/20 rounded-full z-10" />
            <div className="absolute inset-3 border border-black/10 rounded-full z-10" />
        </div>
    </div>
);

export default function BookDemoPage() {
    const [isBookOpen, setIsBookOpen] = useState(false);

    // Dynamic Calendar State
    const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<number | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        businessName: ''
    });

    const times = ["09:00 AM", "10:30 AM", "01:00 PM", "02:30 PM", "04:00 PM", "05:30 PM"];

    // Open the book shortly after mounting
    useEffect(() => {
        const timer = setTimeout(() => setIsBookOpen(true), 800);
        return () => clearTimeout(timer);
    }, []);

    // Date Calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today for comparison

    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    // JS days: 0 = Sun, 1 = Mon ... We want Monday = 0
    const startingDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const monthNameShort = currentMonthDate.toLocaleString('default', { month: 'short' });
    const isPrevDisabled = year === today.getFullYear() && month === today.getMonth();

    const handlePrevMonth = () => {
        if (!isPrevDisabled) {
            setCurrentMonthDate(new Date(year, month - 1, 1));
            setSelectedDate(null);
            setSelectedTime(null);
        }
    };

    const handleNextMonth = () => {
        setCurrentMonthDate(new Date(year, month + 1, 1));
        setSelectedDate(null);
        setSelectedTime(null);
    };

    const handleConfirmBooking = (e: React.FormEvent) => {
        e.preventDefault();
        // Close the book for the success animation
        setIsBookOpen(false);
        setStep(3);
    };

    return (
        <main className="min-h-screen bg-[#EFE7D9] text-[#3D2329] font-sans py-12 px-4 sm:px-6 lg:px-12 flex flex-col items-center justify-center relative overflow-hidden">

            {/* Background Details */}
            <div className="absolute top-12 left-12 opacity-30 pointer-events-none hidden md:block">
                <span className="font-playfair italic text-6xl text-[#C9A227]/20">H&P</span>
            </div>

            <div className="w-full max-w-6xl mx-auto mb-6 flex justify-between items-center z-10">
                <Link href="/home" className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3D2329]/60 hover:text-[#D43425] transition-colors inline-flex items-center gap-2">
                    <ChevronLeft className="w-4 h-4" />
                    Back to Selection
                </Link>
                {step < 3 && (
                    <span className="text-[9px] uppercase tracking-widest text-[#3D2329]/40 font-bold hidden sm:block">
                        The HotelPro Ledger
                    </span>
                )}
            </div>

            {/* The Book Container */}
            <div className="w-full max-w-5xl relative perspective-2000 shrink-0 min-h-[500px] flex items-center justify-center">

                <div className={`relative w-full max-w-4xl mx-auto shadow-2xl transition-all duration-[1500ms] preserve-3d flex items-stretch ${!isBookOpen ? 'rotate-y-0 scale-100' : 'rotate-y-0 scale-[1.02]'}`}>

                    {/* CLOSING COVER (Visible heavily on Step 3 or before load) */}
                    <div
                        className={`absolute inset-0 md:w-1/2 md:right-auto bg-gradient-to-br from-[#4A2C32] via-[#3D2329] to-[#2A181B] rounded-r-2xl rounded-l-sm border border-[#D43425]/20 shadow-2xl z-50 origin-left preserve-3d transition-all duration-[1500ms] ease-in-out ${isBookOpen ? 'rotate-y-[-180deg] opacity-0 pointer-events-none' : 'rotate-y-0 opacity-100'
                            }`}
                    >
                        {/* Spine Edge */}
                        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#1a0f11] to-[#2A181B] rounded-l-sm" />

                        {/* Cover Design */}
                        <div className="absolute inset-6 sm:inset-8 border border-[#C9A227]/30 rounded-sm flex flex-col items-center justify-center">
                            <div className="absolute inset-2 sm:inset-3 border border-[#C9A227]/10 rounded-sm" />

                            {step === 3 ? (
                                <div className="flex flex-col items-center gap-12 -translate-y-8 animate-in fade-in zoom-in duration-1000 delay-500">
                                    <WaxSeal />
                                    <div className="text-center px-8">
                                        <p className="text-[#C9A227] font-playfair italic text-xl sm:text-2xl mb-4">Your private walkthrough is scheduled.</p>
                                        <div className="w-12 h-px bg-[#C9A227]/40 mx-auto mb-4" />
                                        <p className="text-[#EFE7D9]/60 text-xs sm:text-sm leading-relaxed font-light">
                                            The invitation has been delivered to your quarters at<br />
                                            <span className="text-[#EFE7D9] font-medium">{formData.email}</span>
                                        </p>
                                    </div>
                                    <Link
                                        href="/home"
                                        className="mt-4 px-8 py-3 bg-transparent border border-[#C9A227]/50 text-[#C9A227] text-[10px] uppercase font-bold tracking-[0.2em] hover:bg-[#C9A227]/10 transition-colors rounded-full"
                                    >
                                        Return to Foyer
                                    </Link>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <span className="text-[#C9A227] font-playfair italic text-4xl sm:text-5xl">H&P</span>
                                    <div className="w-12 h-px bg-[#C9A227]/50 mt-6 mx-auto" />
                                    <p className="text-[#C9A227]/70 text-[8px] sm:text-[10px] uppercase tracking-[0.4em] mt-4 font-bold">The Ledger</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* INNER PAGES */}
                    <div className={`w-full flex-col md:flex-row bg-[#FDFBF7] rounded-xl overflow-hidden shadow-inner border border-[#8B7355]/20 flex transition-opacity duration-700 ease-in ${isBookOpen ? 'opacity-100' : 'opacity-0'}`}>

                        {/* LEFT PAGE (Static Typography Context) */}
                        <div className="w-full md:w-1/2 p-8 sm:p-12 md:p-16 flex flex-col justify-center relative bg-gradient-to-r from-[#F5F0EC]/50 to-[#FDFBF7]">
                            <div className="mb-auto">
                                <p className="text-[#D43425] text-[9px] font-bold uppercase tracking-[0.3em] mb-6">Concierge Desk</p>

                                <h1 className="text-4xl sm:text-5xl font-playfair font-medium text-[#3D2329] leading-[1.1] mb-6 animate-in slide-in-from-bottom-8 duration-1000 delay-300">
                                    Get Started with<br />
                                    <span className="italic">HotelPro Community.</span>
                                </h1>

                                <div className="w-16 h-[2px] bg-[#C9A227] mb-8 animate-in expand-x duration-1000 delay-500 origin-left" />

                                <p className="text-[#3D2329]/70 text-sm leading-relaxed mb-10 max-w-sm animate-in fade-in duration-1000 delay-700">
                                    Schedule a personalized walkthrough of the HotelPro system with our technical experts. We invite you to explore the architecture of luxury operations.
                                </p>

                                <div className="space-y-4 animate-in fade-in duration-1000 delay-1000">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full border border-[#8B7355]/30 flex items-center justify-center">
                                            <span className="text-[#8B7355] text-[10px] font-bold">30</span>
                                        </div>
                                        <span className="text-[#3D2329]/80 text-xs font-medium uppercase tracking-widest">Minutes Allocated</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full border border-[#8B7355]/30 flex items-center justify-center">
                                            <svg className="w-3.5 h-3.5 text-[#8B7355]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <span className="text-[#3D2329]/80 text-xs font-medium uppercase tracking-widest">Google Meet</span>
                                    </div>
                                </div>
                            </div>

                            {/* Page corner shadow/texture */}
                            <div className="absolute inset-0 pointer-events-none shadow-[inset_-20px_0_40px_rgba(139,115,85,0.03)]" />
                        </div>

                        {/* CENTER CREASE (Spine interior visible only on desktop) */}
                        <div className="hidden md:block w-12 shrink-0 bg-gradient-to-r from-[rgba(139,115,85,0.08)] via-transparent to-[rgba(139,115,85,0.05)] border-x border-[#8B7355]/10 shadow-[inset_0_0_10px_rgba(0,0,0,0.02)]" />

                        {/* RIGHT PAGE (Interactive Ledger) */}
                        <div className="w-full md:w-1/2 p-8 sm:p-12 md:p-16 flex flex-col justify-center relative bg-gradient-to-l from-[#F5F0EC]/30 to-[#FDFBF7]">

                            {step === 1 && (
                                <div className="animate-in fade-in slide-in-from-right-8 duration-1000 delay-500">
                                    <div className="flex items-end justify-between border-b border-[#3D2329]/10 pb-4 mb-8">
                                        <h3 className="text-xl font-playfair font-medium italic text-[#3D2329]">Select Date</h3>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={handlePrevMonth}
                                                disabled={isPrevDisabled}
                                                className={`transition-colors ${isPrevDisabled ? 'text-[#3D2329]/20 cursor-not-allowed' : 'text-[#3D2329]/40 hover:text-[#3D2329]'}`}
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <span className="text-[10px] w-12 text-center font-bold uppercase tracking-widest text-[#3D2329]">
                                                {monthNameShort} {year}
                                            </span>
                                            <button
                                                onClick={handleNextMonth}
                                                className="text-[#3D2329]/40 hover:text-[#3D2329] transition-colors"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Minimalist Calendar Design */}
                                    <div className="grid grid-cols-7 gap-y-4 gap-x-1 mb-8">
                                        {/* Day Headers (Mon-Sun) */}
                                        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => (
                                            <div key={d} className="text-center text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-[#3D2329]/40 font-bold mb-2">{d}</div>
                                        ))}

                                        {/* Empty Cells for starting day of the month */}
                                        {[...Array(startingDayIndex)].map((_, i) => (
                                            <div key={`empty-${i}`} />
                                        ))}

                                        {/* Real Calendar Dates */}
                                        {[...Array(daysInMonth)].map((_, i) => {
                                            const date = i + 1;
                                            const currentDateObj = new Date(year, month, date);
                                            // Disallow dates in the past
                                            const isPast = currentDateObj < today;
                                            const isSelected = selectedDate === date;

                                            return (
                                                <div key={`date-${i}`} className="flex justify-center">
                                                    <button
                                                        onClick={() => !isPast && setSelectedDate(date)}
                                                        disabled={isPast}
                                                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-playfair transition-all duration-300 ${isPast ? 'text-[#3D2329]/20 cursor-not-allowed' :
                                                                isSelected ? 'bg-[#3D2329] text-[#FDFBF7] shadow-lg transform scale-110 border border-[#C9A227]/50' :
                                                                    'text-[#3D2329] hover:bg-[#3D2329]/5 border border-transparent hover:border-[#3D2329]/10'
                                                            }`}
                                                    >
                                                        {date}
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    <div className={`transition-all duration-500 ${selectedDate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#3D2329]/60 mb-4 text-center">Available Allocations</h4>
                                        <div className="grid grid-cols-3 gap-3">
                                            {times.map((time) => (
                                                <button
                                                    key={time}
                                                    onClick={() => setSelectedTime(time)}
                                                    className={`py-2 text-[11px] font-medium tracking-wide rounded-sm border transition-all ${selectedTime === time
                                                            ? 'border-[#D43425] bg-[#D43425]/5 text-[#D43425]'
                                                            : 'border-[#3D2329]/10 hover:border-[#3D2329]/30 text-[#3D2329]/70'
                                                        }`}
                                                >
                                                    {time}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-8 flex justify-end">
                                        <button
                                            onClick={() => setStep(2)}
                                            disabled={!selectedDate || !selectedTime}
                                            className="group flex items-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3D2329] group-hover:text-[#D43425] transition-colors">Turn Page</span>
                                            <div className="w-8 h-8 rounded-full border border-[#3D2329]/20 flex items-center justify-center group-hover:border-[#D43425]/50 group-hover:bg-[#D43425]/5 transition-all">
                                                <ChevronRight className="w-3 h-3 text-[#3D2329] group-hover:text-[#D43425]" />
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="animate-in fade-in slide-in-from-right-8 duration-700">
                                    <button onClick={() => setStep(1)} className="text-[10px] font-bold uppercase tracking-widest text-[#3D2329]/40 hover:text-[#D43425] mb-8 inline-flex items-center gap-1 transition-colors">
                                        <ChevronLeft className="w-3 h-3" /> Previous
                                    </button>

                                    <div className="border-b border-[#3D2329]/10 pb-4 mb-10 flex justify-between items-end">
                                        <h3 className="text-xl font-playfair font-medium italic text-[#3D2329]">Guest Details</h3>
                                        <div className="text-right">
                                            <p className="text-[#3D2329] text-sm font-playfair font-medium">{monthNameShort} {selectedDate}, {year}</p>
                                            <p className="text-[#3D2329]/50 text-[10px] uppercase tracking-widest font-bold">{selectedTime}</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleConfirmBooking} className="space-y-8">
                                        {/* Ledger-style inputs */}
                                        <div className="relative group">
                                            <input
                                                required
                                                type="text"
                                                id="name"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="block w-full px-0 py-3 bg-transparent border-0 border-b border-[#3D2329]/20 text-[#3D2329] focus:ring-0 focus:border-[#D43425] placeholder-transparent peer transition-colors text-sm font-medium"
                                                placeholder="Name"
                                            />
                                            <label htmlFor="name" className="absolute left-0 -top-3.5 text-[9px] font-bold uppercase tracking-widest text-[#3D2329]/50 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:font-playfair peer-placeholder-shown:italic peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:not-italic peer-focus:uppercase peer-focus:text-[#D43425]">
                                                Guest's Full Name
                                            </label>
                                        </div>

                                        <div className="relative group">
                                            <input
                                                required
                                                type="email"
                                                id="email"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className="block w-full px-0 py-3 bg-transparent border-0 border-b border-[#3D2329]/20 text-[#3D2329] focus:ring-0 focus:border-[#D43425] placeholder-transparent peer transition-colors text-sm font-medium"
                                                placeholder="Email"
                                            />
                                            <label htmlFor="email" className="absolute left-0 -top-3.5 text-[9px] font-bold uppercase tracking-widest text-[#3D2329]/50 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:font-playfair peer-placeholder-shown:italic peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:not-italic peer-focus:uppercase peer-focus:text-[#D43425]">
                                                Contact Email
                                            </label>
                                        </div>

                                        <div className="relative group">
                                            <input
                                                required
                                                type="text"
                                                id="businessName"
                                                value={formData.businessName}
                                                onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                                                className="block w-full px-0 py-3 bg-transparent border-0 border-b border-[#3D2329]/20 text-[#3D2329] focus:ring-0 focus:border-[#D43425] placeholder-transparent peer transition-colors text-sm font-medium"
                                                placeholder="Business"
                                            />
                                            <label htmlFor="businessName" className="absolute left-0 -top-3.5 text-[9px] font-bold uppercase tracking-widest text-[#3D2329]/50 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:font-playfair peer-placeholder-shown:italic peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:not-italic peer-focus:uppercase peer-focus:text-[#D43425]">
                                                Hotel / Establishment Name
                                            </label>
                                        </div>

                                        <div className="pt-8">
                                            <button
                                                type="submit"
                                                className="w-full relative overflow-hidden group/btn px-8 py-4 bg-[#3D2329] text-[#FDFBF7] rounded-sm transition-all shadow-md hover:shadow-lg"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                                                <span className="relative text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em]">Confirm Appointment</span>
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
