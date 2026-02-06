'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import MobileNav from '@/components/public/MobileNav';

function WelcomeGuestContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const queryTable = searchParams.get('table');

    // Step 0: Namaste, 1: Hotel Check, 2: Entrance, 3: Table Check, 4: Choice
    const [step, setStep] = useState(0);
    const [hotelName, setHotelName] = useState('');
    const [hotelData, setHotelData] = useState<any>(null);
    const [verifyingHotel, setVerifyingHotel] = useState(false);

    const [entryType, setEntryType] = useState<'SCAN' | 'BOOK' | null>(queryTable ? 'SCAN' : null);
    const [loadingTable, setLoadingTable] = useState(false);
    const [tableStatus, setTableStatus] = useState<{
        id: string;
        status: string;
        activeOrder: any;
        tableCode: string;
    } | null>(null);
    const [vacantTables, setVacantTables] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        tableNo: queryTable || '',
    });

    useEffect(() => {
        if (step === 0) {
            const timer = setTimeout(() => {
                setStep(1); // Go to Hotel Search first
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [step]);

    const verifyHotel = async () => {
        if (!hotelName) return;
        setVerifyingHotel(true);
        try {
            // We'll call a simple fetch to see if client exists
            // Or just set the cookie and try to fetch tables
            document.cookie = `hp-tenant=${hotelName.toLowerCase()}; path=/; max-age=3600`;

            const res = await fetch('/api/tables'); // This will now use the cookie
            const data = await res.json();

            if (data.success) {
                setHotelData({ name: hotelName }); // Mocking successful detection
                setStep(2); // Proceed to choice
            } else {
                alert("Hotel not found. Please enter a valid name (e.g. taj)");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setVerifyingHotel(false);
        }
    };

    useEffect(() => {
        if (entryType === 'BOOK' && step === 3) {
            fetchVacantTables();
        }
    }, [entryType, step]);

    const fetchVacantTables = async () => {
        setLoadingTable(true);
        try {
            const res = await fetch('/api/tables');
            const data = await res.json();
            if (data.success) {
                setVacantTables(data.tables.filter((t: any) => t.status === 'VACANT'));
            }
        } finally {
            setLoadingTable(false);
        }
    };

    const verifyTable = async (code: string) => {
        if (!code) return;
        setLoadingTable(true);
        try {
            const res = await fetch(`/api/tables?code=${code}`);
            const data = await res.json();
            if (data.success && data.tables && data.tables.length > 0) {
                const table = data.tables[0];
                setTableStatus(table);
                setFormData(prev => ({ ...prev, tableNo: table.tableCode }));

                // CRUCIAL: If the API discovered a hotel for this table, set the cookie 
                // so subsequent calls to /api/menu and /api/orders work.
                if (table.clientSlug) {
                    document.cookie = `hp-tenant=${table.clientSlug}; path=/; max-age=3600`;
                }
            } else {
                setTableStatus(null);
            }
        } catch (err) {
            console.error('Table verification failed', err);
        } finally {
            setLoadingTable(false);
        }
    };

    const proceedToMenu = (joiningType: 'NEW' | 'JOIN' = 'NEW', specificTable?: string) => {
        const tableCode = specificTable || formData.tableNo;
        const sessionId = joiningType === 'JOIN' && tableStatus?.activeOrder?.sessionId
            ? tableStatus.activeOrder.sessionId
            : Math.random().toString(36).substring(2, 15);

        // IMPLICIT GUEST ENTRY - Identity collected at Bill Request
        localStorage.setItem('hp_table_id', tableStatus?.id || '');
        localStorage.setItem('hp_table_code', tableCode);
        localStorage.setItem('hp_session_id', sessionId);

        // Clear any old guest name to ensure we are in anonymous mode
        localStorage.removeItem('hp_guest_name');

        if (joiningType === 'JOIN' && tableStatus?.activeOrder?.id) {
            localStorage.setItem('hp_active_order_id', tableStatus.activeOrder.id);
            router.push(`/order-status?id=${tableStatus.activeOrder.id}`);
        } else {
            localStorage.removeItem('hp_active_order_id');
            router.push('/menu');
        }
    };

    return (
        <main className="min-h-screen bg-vellum text-black font-sans flex flex-col items-center justify-center p-6 overflow-hidden relative">

            {/* Step 0: Indian Welcome Animation */}
            {step === 0 && (
                <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-1000">
                    <div className="-mb-6 relative w-48 h-48 md:w-72 md:h-72">
                        <Image
                            src="/images/namaste_hands.png"
                            alt="Namaste"
                            fill
                            sizes="(max-width: 768px) 192px, 288px"
                            className="object-contain"
                            priority
                        />
                    </div>
                    <h1 className="text-6xl md:text-8xl font-playfair font-black italic text-[#D43425] leading-tight">Namaste.</h1>
                    <p className="text-xl md:text-2xl font-playfair font-bold mt-4 uppercase tracking-[0.4em] opacity-80">Swagaat Hain</p>
                </div>
            )}

            {/* Step 1: Hotel Identification */}
            {step === 1 && (
                <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-1000 flex flex-col items-center">
                    <div className="relative mb-12 flex flex-col items-center text-center">
                        <div className="absolute inset-0 bg-[#D43425]/5 rounded-full blur-3xl -z-10" />
                        <p className="text-[#D43425] text-[10px] md:text-[12px] font-black tracking-[0.5em] uppercase mb-4">Network Activation</p>
                        <h1 className="text-5xl md:text-7xl font-playfair font-black text-ink leading-none">Find Your<br /><span className="text-[#D43425]">Sanctuary</span></h1>
                    </div>

                    <div className="w-full max-w-sm space-y-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-4">Enter Hotel Designation (e.g. taj)</label>
                            <input
                                type="text"
                                placeholder="Identification Code"
                                className="w-full px-8 py-6 bg-white border-2 border-zinc-100 rounded-4xl text-lg font-black uppercase tracking-widest focus:border-[#D43425] outline-none transition-all shadow-sm"
                                value={hotelName}
                                onChange={(e) => setHotelName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && verifyHotel()}
                            />
                        </div>
                        <button
                            onClick={verifyHotel}
                            disabled={verifyingHotel || !hotelName}
                            className="w-full py-6 bg-zinc-900 text-white rounded-4xl font-black uppercase text-xs tracking-[0.3em] hover:bg-[#D43425] transition-all shadow-xl disabled:opacity-50"
                        >
                            {verifyingHotel ? 'Locating...' : 'Authenticate & Enter'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Entrance (Choice) */}
            {step === 2 && (
                <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-1000 flex flex-col items-center">
                    <div className="relative mb-16 flex flex-col items-center text-center">
                        <div className="absolute inset-0 bg-[#D43425]/5 rounded-full blur-3xl -z-10" />
                        <p className="text-[#D43425] text-[10px] md:text-[12px] font-black tracking-[0.5em] uppercase mb-4">Location Established</p>
                        <h1 className="text-6xl md:text-8xl font-playfair font-black text-ink leading-none uppercase">{hotelName}<br /><span className="text-[#D43425]">Pro</span></h1>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mt-6 italic">Premium Suite & Elite Hospitality</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 w-full max-w-sm">
                        <button
                            onClick={() => { setEntryType('SCAN'); setStep(3); }}
                            className="bg-white border-2 border-[#D43425]/10 rounded-[3rem] p-8 aspect-square flex flex-col items-center justify-center gap-6 group hover:border-[#D43425] transition-all shadow-sm hover:shadow-xl"
                        >
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D43425" strokeWidth="1.5">
                                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                                <rect x="7" y="7" width="10" height="10" rx="1" />
                            </svg>
                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-ink group-hover:text-[#D43425]">Scan the QR</div>
                        </button>
                        <button
                            onClick={() => { setEntryType('BOOK'); setStep(3); }}
                            className="bg-[#D43425] rounded-[3rem] p-8 aspect-square flex flex-col items-center justify-center gap-6 group hover:bg-black transition-all shadow-2xl"
                        >
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="16" />
                                <line x1="8" y1="12" x2="16" y2="12" />
                            </svg>
                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white">Book a Table</div>
                        </button>
                    </div>
                </div>
            )}



            {/* Step 3: Table Resolution */}
            {step === 3 && (
                <div className="w-full max-w-2xl animate-in fade-in slide-in-from-right-8 duration-700 space-y-12">
                    <header className="text-center">
                        <h2 className="text-[#D43425] text-[10px] font-black tracking-[0.5em] uppercase mb-4">Status & Location</h2>
                        <h1 className="text-4xl md:text-6xl font-playfair font-black leading-tight">{entryType === 'SCAN' ? 'Table Verification' : 'Assign Your Seat'}</h1>
                    </header>

                    <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-[#D43425]/10">
                        <div className="p-8 md:p-12 space-y-8">
                            {entryType === 'SCAN' ? (
                                <>
                                    <div className="flex flex-col items-center text-center space-y-4">
                                        <div className="w-20 h-20 bg-vellum rounded-full flex items-center justify-center border border-[#D43425]/20 shadow-inner">
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D43425" strokeWidth="1.5">
                                                <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
                                            </svg>
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-playfair font-black text-ink">
                                                {queryTable ? `Welcome to Table ${queryTable}` : "Identify Your Marker"}
                                            </h3>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-ink/40">
                                                {loadingTable ? "Consulting floor plan..." : (tableStatus ? `Found: ${tableStatus.tableCode} (${tableStatus.status})` : "Enter the table code from your marker")}
                                            </p>
                                        </div>
                                    </div>

                                    {!queryTable && (
                                        <input
                                            type="text"
                                            placeholder="e.g. 1 or T-01"
                                            className="w-full bg-vellum border-2 border-ink/5 rounded-2xl px-6 py-4 text-center text-xl font-black uppercase tracking-widest outline-none focus:border-[#D43425] transition-all"
                                            value={formData.tableNo}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFormData({ ...formData, tableNo: val });
                                                if (val.length >= 1) verifyTable(val);
                                            }}
                                        />
                                    )}

                                    {tableStatus && (
                                        <div className="space-y-4">
                                            {tableStatus.status === 'DIRTY' ? (
                                                <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-center space-y-3">
                                                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Preparation in Progress</p>
                                                    <p className="text-[10px] text-amber-600 uppercase font-medium">Please allow our steward a moment to perfect your table.</p>
                                                    <button onClick={() => verifyTable(formData.tableNo)} className="text-[9px] font-black text-amber-800 uppercase underline">Refresh</button>
                                                </div>
                                            ) : tableStatus.activeOrder ? (
                                                <div className="bg-ink text-[#EFE7D9] p-8 rounded-[2.5rem] space-y-6 shadow-xl border border-[#D43425]/30">
                                                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[7px] font-black uppercase tracking-widest opacity-40">Active Session</span>
                                                            <span className="font-playfair text-xl font-black italic">{tableStatus.activeOrder.customerName}'s Party</span>
                                                        </div>
                                                        <div className="w-8 h-8 rounded-full bg-[#D43425] flex items-center justify-center text-[10px] font-black border border-white/20 animate-pulse shadow-[0_0_15px_#D43425]">LIVE</div>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        <button onClick={() => proceedToMenu('JOIN')} className="w-full py-4 bg-[#D43425] rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-[#D43425] transition-all">Join This Party</button>
                                                        <button onClick={() => proceedToMenu('NEW')} className="w-full py-4 bg-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all shadow-inner">Start New Session</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={() => proceedToMenu('NEW')} className="w-full py-6 bg-[#D43425] text-white rounded-2xl font-black text-xs uppercase tracking-[0.4em] shadow-xl hover:bg-black transition-all active:scale-95">Claim Table & Enter</button>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="space-y-8">
                                    <div className="flex flex-col items-center text-center space-y-4">
                                        <div className="w-20 h-20 bg-vellum rounded-full flex items-center justify-center border border-[#D43425]/20 shadow-inner">
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D43425" strokeWidth="1.5">
                                                <path d="M3 11V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2M5 11l-2 6v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2l-2-6M5 11h14" />
                                            </svg>
                                        </div>
                                        <h3 className="text-2xl font-playfair font-black text-ink">Choose Your Sanctuary</h3>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-ink/40 leading-relaxed max-w-[200px]">Select any of our available vacant tables to begin your journey.</p>
                                    </div>

                                    {loadingTable ? (
                                        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#D43425]/10 border-t-[#D43425] rounded-full animate-spin" /></div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-4">
                                            {vacantTables.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => proceedToMenu('NEW', t.tableCode)}
                                                    className="bg-vellum border-2 border-ink/5 rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-[#D43425] transition-all aspect-square justify-center group"
                                                >
                                                    <span className="text-sm font-black text-ink group-hover:text-[#D43425]">{t.tableCode}</span>
                                                    <span className="text-[7px] font-bold uppercase opacity-30">{t.capacity} Seats</span>
                                                </button>
                                            ))}
                                            {vacantTables.length === 0 && (
                                                <div className="col-span-3 py-10 bg-vellum rounded-2xl text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">All premium tables are occupied.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}



            {/* Premium Navigation Dock - Only show after identity check */}
            {step >= 3 && <MobileNav />}
        </main>
    );
}

export default function WelcomeGuest() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-vellum flex items-center justify-center"><div className="w-12 h-12 border-4 border-[#D43425]/20 border-t-[#D43425] rounded-full animate-spin" /></div>}>
            <WelcomeGuestContent />
        </Suspense>
    );
}
