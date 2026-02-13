'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import MobileNav from '@/components/public/MobileNav';

function WelcomeGuestContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const queryTable = searchParams.get('table');
    const isExpiredSession = searchParams.get('expired') === 'true';

    // Step 0: Namaste, 1: Access Code Entry, 2: Hotel Confirmed + Choice, 3: Table Resolution
    const [step, setStep] = useState(0);
    const [accessCode, setAccessCode] = useState('');
    const [hotelData, setHotelData] = useState<{ id: string; name: string; slug: string } | null>(null);
    const [verifyingCode, setVerifyingCode] = useState(false);
    const [codeError, setCodeError] = useState('');

    const [entryType, setEntryType] = useState<'SCAN' | 'BOOK' | null>(queryTable ? 'SCAN' : null);
    const [loadingTable, setLoadingTable] = useState(false);
    const [tableStatus, setTableStatus] = useState<{
        id: string;
        status: string;
        activeOrder: any;
        tableCode: string;
        capacity?: number;
    } | null>(null);
    const [vacantTables, setVacantTables] = useState<any[]>([]);
    const [claimError, setClaimError] = useState('');
    const [partySize, setPartySize] = useState(2);
    const [showPartySizeFor, setShowPartySizeFor] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        tableNo: queryTable || '',
    });

    // ─── Step 0: Indian Welcome Animation ───
    useEffect(() => {
        if (step === 0) {
            const timer = setTimeout(() => {
                setStep(1);
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [step]);

    // ─── Access Code Verification (The Digital Key) ───
    const verifyAccessCode = async () => {
        if (!accessCode || accessCode.trim().length < 2) {
            setCodeError('Please enter a valid code');
            return;
        }

        setVerifyingCode(true);
        setCodeError('');

        try {
            const res = await fetch('/api/auth/access-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: accessCode.trim() }),
            });

            const data = await res.json();

            if (data.success) {
                setHotelData(data.hotel);
                setStep(2);
            } else {
                setCodeError(data.error || 'Invalid access code.');
            }
        } catch (err) {
            console.error('[ACCESS-CODE] Verification failed:', err);
            setCodeError('Connection error. Please try again.');
        } finally {
            setVerifyingCode(false);
        }
    };

    // ─── Table Discovery (Vacant Tables for Booking) ───
    const fetchVacantTables = useCallback(async () => {
        setLoadingTable(true);
        try {
            const res = await fetch('/api/tables');
            const data = await res.json();
            if (data.success) {
                setVacantTables(data.tables.filter((t: any) => t.status === 'VACANT'));
            } else if (data.error?.includes('Session expired')) {
                // Session expired — go back to access code
                setStep(1);
                setCodeError('Your session expired. Please re-enter your access code.');
            }
        } catch (err) {
            console.error('[TABLES] Fetch failed:', err);
        } finally {
            setLoadingTable(false);
        }
    }, []);

    useEffect(() => {
        if (entryType === 'BOOK' && step === 3) {
            fetchVacantTables();
        }
    }, [entryType, step, fetchVacantTables]);

    // ─── Table Verification (for QR Scan / Manual Entry) ───
    const verifyTable = useCallback(async (code: string) => {
        if (!code) return;
        setLoadingTable(true);
        setClaimError('');
        try {
            const res = await fetch(`/api/tables?code=${encodeURIComponent(code)}`);
            const data = await res.json();
            if (data.success && data.tables && data.tables.length > 0) {
                const table = data.tables[0];
                setTableStatus(table);
                setFormData(prev => ({ ...prev, tableNo: table.tableCode }));
            } else if (data.error?.includes('Session expired')) {
                setStep(1);
                setCodeError('Your session expired. Please re-enter your access code.');
            } else {
                setTableStatus(null);
                setClaimError('Table not found. Please check the code.');
            }
        } catch (err) {
            console.error('Table verification failed', err);
            setClaimError('Connection error. Please try again.');
        } finally {
            setLoadingTable(false);
        }
    }, []);

    // ─── AUTO-VERIFY: If table code is in URL (QR Scan), verify immediately ───
    useEffect(() => {
        if (queryTable && step === 3 && entryType === 'SCAN') {
            verifyTable(queryTable);
        }
    }, [queryTable, step, entryType, verifyTable]);

    // ─── Atomic Table Claim (uses /api/tables/claim) ───
    const claimTable = async (tableCode: string, joinMode: 'NEW' | 'JOIN' = 'NEW') => {
        setLoadingTable(true);
        setClaimError('');
        const sessionId = Math.random().toString(36).substring(2, 15);

        try {
            // For JOIN mode, skip the claim API and go directly to order
            if (joinMode === 'JOIN' && tableStatus?.activeOrder?.id) {
                localStorage.setItem('hp_table_id', tableStatus.id);
                localStorage.setItem('hp_table_code', tableCode);
                localStorage.setItem('hp_session_id', sessionId);
                localStorage.setItem('hp_active_order_id', tableStatus.activeOrder.id);
                localStorage.setItem('hp_party_size', String(partySize));
                if (hotelData) {
                    localStorage.setItem('hp_hotel_id', hotelData.id);
                    localStorage.setItem('hp_hotel_name', hotelData.name);
                }
                localStorage.removeItem('hp_guest_name');
                router.push(`/order-status?id=${tableStatus.activeOrder.id}`);
                return;
            }

            // NEW claim — use the atomic API
            const res = await fetch('/api/tables/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tableCode,
                    sessionId,
                    customerName: 'Guest',
                    partySize,
                }),
            });

            const data = await res.json();

            if (data.success) {
                // Store session context
                localStorage.setItem('hp_table_id', data.table.id);
                localStorage.setItem('hp_table_code', data.table.tableCode);
                localStorage.setItem('hp_session_id', sessionId);
                localStorage.setItem('hp_party_size', String(partySize));
                if (hotelData) {
                    localStorage.setItem('hp_hotel_id', hotelData.id);
                    localStorage.setItem('hp_hotel_name', hotelData.name);
                }
                localStorage.removeItem('hp_guest_name');
                localStorage.removeItem('hp_active_order_id');

                if (data.action === 'JOIN' && data.activeOrder) {
                    localStorage.setItem('hp_active_order_id', data.activeOrder.id);
                    localStorage.setItem('hp_session_id', data.activeOrder?.sessionId || sessionId);
                    router.push(`/order-status?id=${data.activeOrder.id}`);
                } else {
                    router.push('/menu');
                }
            } else {
                setClaimError(data.error || 'Failed to claim table.');
                if (entryType === 'BOOK') {
                    fetchVacantTables();
                }
            }
        } catch (err) {
            console.error('[CLAIM] Error:', err);
            setClaimError('Connection error. Please try again.');
        } finally {
            setLoadingTable(false);
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

            {/* Expired Session Warning */}
            {isExpiredSession && step === 1 && (
                <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-3 text-center z-50">
                    <p className="text-xs font-bold">⏱️ Your table was released due to inactivity</p>
                    <p className="text-[10px] text-white/70 mt-0.5">Please scan your QR code or select a table again</p>
                </div>
            )}

            {/* Step 1: Access Code Entry (The Digital Key) */}
            {step === 1 && (
                <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-1000 flex flex-col items-center">
                    <div className="relative mb-12 flex flex-col items-center text-center">
                        <div className="absolute inset-0 bg-[#D43425]/5 rounded-full blur-3xl -z-10" />
                        <p className="text-[#D43425] text-[10px] md:text-[12px] font-black tracking-[0.5em] uppercase mb-4">Hotel Access</p>
                        <h1 className="text-5xl md:text-7xl font-playfair font-black text-ink leading-none">Enter Your<br /><span className="text-[#D43425]">Access Code</span></h1>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mt-6 max-w-xs leading-relaxed">
                            Your hotel will provide a unique code to begin your dining experience.
                        </p>
                    </div>

                    <div className="w-full max-w-sm space-y-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-4">Hotel Access Code</label>
                            <input
                                type="text"
                                placeholder="e.g. ROYAL99"
                                className="w-full px-8 py-6 bg-white border-2 border-zinc-100 rounded-4xl text-lg font-black uppercase tracking-widest focus:border-[#D43425] outline-none transition-all shadow-sm text-center"
                                value={accessCode}
                                onChange={(e) => {
                                    setAccessCode(e.target.value.toUpperCase());
                                    setCodeError('');
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && verifyAccessCode()}
                                autoFocus
                            />
                        </div>

                        {codeError && (
                            <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-3 text-center">
                                <p className="text-xs font-bold text-red-600">{codeError}</p>
                            </div>
                        )}

                        <button
                            onClick={verifyAccessCode}
                            disabled={verifyingCode || !accessCode.trim()}
                            className="w-full py-6 bg-zinc-900 text-white rounded-4xl font-black uppercase text-xs tracking-[0.3em] hover:bg-[#D43425] transition-all shadow-xl disabled:opacity-50 active:scale-95"
                        >
                            {verifyingCode ? (
                                <span className="flex items-center justify-center gap-3">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Verifying...
                                </span>
                            ) : (
                                'Enter Hotel'
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Hotel Confirmed + Entrance Choice */}
            {step === 2 && hotelData && (
                <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-1000 flex flex-col items-center">
                    <div className="relative mb-16 flex flex-col items-center text-center">
                        <div className="absolute inset-0 bg-[#D43425]/5 rounded-full blur-3xl -z-10" />

                        {/* Success Badge */}
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 border-2 border-green-200">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>

                        <p className="text-[#D43425] text-[10px] md:text-[12px] font-black tracking-[0.5em] uppercase mb-4">Access Granted</p>
                        <h1 className="text-6xl md:text-8xl font-playfair font-black text-ink leading-none uppercase">{hotelData.name}</h1>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mt-6 italic">Premium Dining Experience</p>
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
                        {hotelData && (
                            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-300 mb-2">{hotelData.name}</p>
                        )}
                        <h2 className="text-[#D43425] text-[10px] font-black tracking-[0.5em] uppercase mb-4">Status &amp; Location</h2>
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

                                    {/* Error Display */}
                                    {claimError && (
                                        <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4 text-center">
                                            <p className="text-xs font-bold text-red-600">{claimError}</p>
                                            {claimError.includes('another guest') && (
                                                <button
                                                    onClick={() => { setEntryType('BOOK'); setClaimError(''); fetchVacantTables(); }}
                                                    className="mt-3 text-[10px] font-black text-[#D43425] uppercase underline"
                                                >
                                                    Browse Available Tables Instead
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {tableStatus && (
                                        <div className="space-y-4">
                                            {tableStatus.status === 'DIRTY' ? (
                                                <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-center space-y-3">
                                                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Preparation in Progress</p>
                                                    <p className="text-[10px] text-amber-600 uppercase font-medium">Please allow our steward a moment to perfect your table.</p>
                                                    <button onClick={() => verifyTable(formData.tableNo || queryTable || '')} className="text-[9px] font-black text-amber-800 uppercase underline">Refresh</button>
                                                </div>
                                            ) : tableStatus.activeOrder ? (
                                                <div className="bg-ink text-[#EFE7D9] p-8 rounded-[2.5rem] space-y-6 shadow-xl border border-[#D43425]/30">
                                                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[7px] font-black uppercase tracking-widest opacity-40">Active Session</span>
                                                            <span className="font-playfair text-xl font-black italic">{tableStatus.activeOrder.customerName || 'Guest'}&apos;s Party</span>
                                                        </div>
                                                        <div className="w-8 h-8 rounded-full bg-[#D43425] flex items-center justify-center text-[10px] font-black border border-white/20 animate-pulse shadow-[0_0_15px_#D43425]">LIVE</div>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        <button onClick={() => claimTable(tableStatus.tableCode, 'JOIN')} className="w-full py-4 bg-[#D43425] rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-[#D43425] transition-all">Join This Party</button>
                                                        <button onClick={() => claimTable(tableStatus.tableCode, 'NEW')} className="w-full py-4 bg-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all shadow-inner">Start New Session</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {/* Party Size Selector */}
                                                    <div className="bg-[#FAF7F2] rounded-2xl p-6 border border-[#D43425]/10">
                                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#D43425]/50 text-center mb-4">How many guests joining today?</p>
                                                        <div className="flex items-center justify-center gap-6">
                                                            <button
                                                                onClick={() => setPartySize(Math.max(1, partySize - 1))}
                                                                className="w-12 h-12 rounded-full bg-white border-2 border-zinc-200 flex items-center justify-center text-xl font-black text-zinc-600 active:scale-90 transition-all shadow-sm hover:border-[#D43425] hover:text-[#D43425]"
                                                            >−</button>
                                                            <div className="text-center">
                                                                <span className="text-5xl font-black text-[#1A1A1A] tabular-nums">{partySize}</span>
                                                                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mt-1">{partySize === 1 ? 'Guest' : 'Guests'}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => setPartySize(Math.min(tableStatus?.capacity || 10, partySize + 1))}
                                                                className="w-12 h-12 rounded-full bg-white border-2 border-zinc-200 flex items-center justify-center text-xl font-black text-zinc-600 active:scale-90 transition-all shadow-sm hover:border-[#D43425] hover:text-[#D43425]"
                                                            >+</button>
                                                        </div>
                                                        {tableStatus?.capacity && partySize > (tableStatus.capacity || 4) && (
                                                            <p className="text-[9px] text-amber-600 font-bold text-center mt-3">⚠️ This table seats {tableStatus.capacity}. Consider a larger table.</p>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => claimTable(tableStatus.tableCode)}
                                                        disabled={loadingTable}
                                                        className="w-full py-6 bg-[#D43425] text-white rounded-2xl font-black text-xs uppercase tracking-[0.4em] shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        {loadingTable ? (
                                                            <span className="flex items-center justify-center gap-3">
                                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                Claiming...
                                                            </span>
                                                        ) : (
                                                            'Claim Table & Enter'
                                                        )}
                                                    </button>
                                                </div>
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

                                    {/* Error Display */}
                                    {claimError && (
                                        <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4 text-center">
                                            <p className="text-xs font-bold text-red-600">{claimError}</p>
                                        </div>
                                    )}

                                    {loadingTable ? (
                                        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#D43425]/10 border-t-[#D43425] rounded-full animate-spin" /></div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-4">
                                            {vacantTables.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => {
                                                        setShowPartySizeFor(t.tableCode);
                                                        setPartySize(2);
                                                    }}
                                                    disabled={loadingTable}
                                                    className={`bg-vellum border-2 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all aspect-square justify-center group disabled:opacity-50 ${showPartySizeFor === t.tableCode ? 'border-[#D43425] bg-[#D43425]/5' : 'border-ink/5 hover:border-[#D43425]'}`}
                                                >
                                                    <span className="text-sm font-black text-ink group-hover:text-[#D43425]">{t.tableCode}</span>
                                                    <span className="text-[7px] font-bold uppercase opacity-30">{t.capacity} Seats</span>
                                                </button>
                                            ))}
                                            {vacantTables.length === 0 && (
                                                <div className="col-span-3 py-10 bg-vellum rounded-2xl text-center space-y-3">
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">All premium tables are occupied.</p>
                                                    <button
                                                        onClick={fetchVacantTables}
                                                        className="text-[9px] font-black text-[#D43425] uppercase underline"
                                                    >
                                                        Refresh Availability
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Party Size + Confirm for Booking Mode */}
                                    {showPartySizeFor && (
                                        <div className="bg-white rounded-2xl p-6 border border-[#D43425]/15 shadow-xl space-y-5 animate-in slide-in-from-bottom duration-300">
                                            <div className="text-center">
                                                <p className="text-[8px] font-black uppercase tracking-[0.4em] text-[#D43425]/40">Table {showPartySizeFor}</p>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mt-2">How many guests?</p>
                                            </div>
                                            <div className="flex items-center justify-center gap-6">
                                                <button onClick={() => setPartySize(Math.max(1, partySize - 1))} className="w-11 h-11 rounded-full bg-zinc-100 flex items-center justify-center text-lg font-black text-zinc-600 active:scale-90 transition-all">−</button>
                                                <span className="text-4xl font-black text-[#1A1A1A] tabular-nums w-12 text-center">{partySize}</span>
                                                <button onClick={() => setPartySize(Math.min(12, partySize + 1))} className="w-11 h-11 rounded-full bg-zinc-100 flex items-center justify-center text-lg font-black text-zinc-600 active:scale-90 transition-all">+</button>
                                            </div>
                                            <button
                                                onClick={() => claimTable(showPartySizeFor)}
                                                disabled={loadingTable}
                                                className="w-full py-5 bg-[#D43425] text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all disabled:opacity-50"
                                            >
                                                {loadingTable ? 'Claiming...' : `Claim Table ${showPartySizeFor}`}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Back Button */}
                    <div className="text-center">
                        <button
                            onClick={() => { setStep(2); setTableStatus(null); setClaimError(''); }}
                            className="text-[9px] font-black text-zinc-400 uppercase tracking-widest hover:text-zinc-600 transition-colors"
                        >
                            ← Back to Entry Options
                        </button>
                    </div>
                </div>
            )}

            {/* Premium Navigation Dock - Only show after access granted */}
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
