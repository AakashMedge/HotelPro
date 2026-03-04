'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import MobileNav from '@/components/public/MobileNav';
import {
    Clock, AlertTriangle, CheckCircle2, QrCode, PlusCircle,
    UserPlus, Users, RotateCcw, Sparkles, ChefHat,
    BookOpen, Keyboard, ChevronRight, Utensils, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import QRScanner from '@/components/public/QRScanner';

function WelcomeGuestContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const queryTable = searchParams.get('table');
    const msg = searchParams.get('msg');
    const isExpiredSession = searchParams.get('expired') === 'true' || msg === 'expired';
    const isResetSession = msg === 'reset';
    const isCancelledSession = msg === 'cancelled';

    // ─── QR Scan Detection ───
    const qrShortCode = searchParams.get('qr');
    const qrSecret = searchParams.get('s');
    const qrVersion = searchParams.get('v');
    const qrSignature = searchParams.get('sig');
    const hasQRParams = !!(qrShortCode && qrSecret && qrVersion && qrSignature);

    /**
     * STEPS:
     * -1: QR Auto-Validation
     *  0: Welcome Landing ("Begin Journey")
     *  1: Identity Portal (Scan or Type Table ID)
     *  2: Table Discovery / Configuration (Party Size)
     *  3: Ordering Flow Choice (AI vs Manual)
     */
    const [step, setStep] = useState(hasQRParams ? -1 : 0);
    const [manualCode, setManualCode] = useState('');
    const [lookupLoading, setLookupLoading] = useState(false);
    const [accessCode, setAccessCode] = useState('');
    const [hotelData, setHotelData] = useState<{ id: string; name: string; slug: string; plan: string } | null>(null);
    const [isStarter, setIsStarter] = useState(false);
    const [verifyingCode, setVerifyingCode] = useState(false);
    const [codeError, setCodeError] = useState('');
    const [qrValidating, setQrValidating] = useState(hasQRParams);
    const [qrError, setQrError] = useState('');
    const [qrSessionData, setQrSessionData] = useState<{ token: string; expiresAt: string } | null>(null);

    const [entryType, setEntryType] = useState<'SCAN' | 'BOOK' | null>(queryTable || hasQRParams ? 'SCAN' : null);
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
    const [orderingMode, setOrderingMode] = useState<'ai' | 'manual'>('manual');

    // ─── QR Auto-Validation Logic ───
    const validateQRData = useCallback(async (params: {
        qr: string;
        s: string;
        v: number;
        sig: string
    }) => {
        setQrValidating(true);
        try {
            const res = await fetch('/api/qr/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });

            const data = await res.json();

            if (data.success) {
                setHotelData(data.hotel);
                localStorage.setItem('hp_hotel_plan', data.hotel.plan);
                localStorage.setItem('hp_hotel_id', data.hotel.id);
                localStorage.setItem('hp_hotel_name', data.hotel.name);

                setTableStatus({
                    id: data.table.id,
                    status: data.table.status,
                    activeOrder: data.activeOrder || null,
                    tableCode: data.table.tableCode,
                    capacity: data.table.capacity,
                });
                localStorage.setItem('hp_table_id', data.table.id);
                localStorage.setItem('hp_table_code', data.table.tableCode);

                setEntryType('SCAN');
                setStep(2); // Go to Party Size selection
            } else {
                setQrError(data.error || 'Invalid QR code');
                setStep(1);
            }
        } catch (err) {
            setQrError('Connection error. Please try again.');
            setStep(1);
        } finally {
            setQrValidating(false);
        }
    }, []);

    const [showScanner, setShowScanner] = useState(false);

    const handleScan = async (decodedText: string) => {
        setShowScanner(false);
        try {
            // Check if it is a full URL with params
            const url = new URL(decodedText);
            const params = url.searchParams;
            const qr = params.get('qr');
            const s = params.get('s');
            const v = params.get('v');
            const sig = params.get('sig');

            if (qr && s && v && sig) {
                await validateQRData({ qr, s, v: Number(v), sig });
            } else {
                // If it's just a code, try manual lookup
                setManualCode(decodedText);
                handleManualLookupInternal(decodedText);
            }
        } catch (e) {
            // Not a URL, try treating as a manual code
            setManualCode(decodedText);
            handleManualLookupInternal(decodedText);
        }
    };

    // ─── QR Param Effect ───
    useEffect(() => {
        if (hasQRParams && qrValidating) {
            validateQRData({
                qr: qrShortCode!,
                s: qrSecret!,
                v: Number(qrVersion!),
                sig: qrSignature!,
            });
        }
    }, [hasQRParams, qrValidating, validateQRData, qrShortCode, qrSecret, qrVersion, qrSignature]);

    // ─── Manual Table Lookup ───
    const handleManualLookupInternal = async (code: string) => {
        if (!code || code.length < 2) {
            setCodeError('Please enter a valid table ID');
            return;
        }

        setLookupLoading(true);
        setCodeError('');

        try {
            const res = await fetch('/api/auth/table-lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code.trim() }),
            });

            const data = await res.json();

            if (data.success) {
                setHotelData(data.hotel);
                localStorage.setItem('hp_hotel_plan', data.hotel.plan);
                localStorage.setItem('hp_hotel_id', data.hotel.id);
                localStorage.setItem('hp_hotel_name', data.hotel.name);

                setTableStatus({
                    id: data.table.id,
                    status: 'VACANT', // Result of lookup
                    activeOrder: data.activeOrder || null,
                    tableCode: data.table.tableCode,
                });
                localStorage.setItem('hp_table_id', data.table.id);
                localStorage.setItem('hp_table_code', data.table.tableCode);

                setEntryType('SCAN');
                setStep(2);
            } else {
                setCodeError(data.error);
            }
        } catch {
            setCodeError('Connection error.');
        } finally {
            setLookupLoading(false);
        }
    };

    const handleManualLookup = () => handleManualLookupInternal(manualCode);

    // ─── Setup ───
    useEffect(() => {
        setIsStarter(localStorage.getItem('hp_hotel_plan') === 'STARTER');
    }, []);

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
                // Save plan for UI filtering across pages
                localStorage.setItem('hp_hotel_plan', data.hotel.plan);

                if (queryTable) {
                    setEntryType('SCAN');
                    setStep(3);
                } else {
                    setStep(2);
                }
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
    const claimTable = async (tableCode: string, mode: 'NEW' | 'JOIN' = 'NEW', orderingPref?: 'ai' | 'manual') => {
        setLoadingTable(true);
        setClaimError('');
        const sessionId = localStorage.getItem('hp_session_id') || Math.random().toString(36).substring(7);

        try {
            // Atomic logic: If table is already occupied, the API will tell us
            // Check if user ALREADY has an active order at this table (Re-entry)
            if (tableStatus?.activeOrder && !queryTable) {
                // Re-entry sync
                localStorage.setItem('hp_active_order_id', tableStatus.activeOrder.id);
                localStorage.setItem('hp_session_id', tableStatus.activeOrder.sessionId || sessionId);
                if (hotelData) {
                    localStorage.setItem('hp_hotel_id', hotelData.id);
                    localStorage.setItem('hp_hotel_name', hotelData.name);
                    localStorage.setItem('hp_hotel_plan', hotelData.plan);
                }
                localStorage.removeItem('hp_guest_name');
                const finalMode = orderingPref || orderingMode;
                if (finalMode === 'ai') router.push('/ai-assistant');
                else router.push(`/order-status?id=${tableStatus.activeOrder.id}`);
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
                    localStorage.setItem('hp_hotel_plan', hotelData.plan);
                }
                localStorage.removeItem('hp_guest_name');
                localStorage.removeItem('hp_active_order_id');

                const finalMode = orderingPref || orderingMode;

                if (data.action === 'JOIN' && data.activeOrder) {
                    localStorage.setItem('hp_active_order_id', data.activeOrder.id);
                    localStorage.setItem('hp_session_id', data.activeOrder?.sessionId || sessionId);
                    // Even if joining, if they specifically chose AI, send them there
                    if (finalMode === 'ai') router.push('/ai-assistant');
                    else router.push(`/order-status?id=${data.activeOrder.id}`);
                } else {
                    if (finalMode === 'ai') router.push('/ai-assistant');
                    else router.push('/menu');
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

            <AnimatePresence mode='wait'>
                {/* Step -1: QR Validation Loading */}
                {step === -1 && (
                    <motion.div
                        key="validating"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center text-center gap-8"
                    >
                        <div className="relative">
                            <div className="w-24 h-24 bg-[#D43425]/10 rounded-full flex items-center justify-center">
                                <QrCode size={40} className="text-[#D43425] animate-pulse" />
                            </div>
                            <div className="absolute inset-0 border-4 border-[#D43425]/20 border-t-[#D43425] rounded-full animate-spin" />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-2xl font-playfair font-black text-ink">Verifying Identity</h2>
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Authenticating table...</p>
                        </div>
                    </motion.div>
                )}

                {/* Step 0: Indian Welcome Landing */}
                {step === 0 && (
                    <motion.div
                        key="landing"
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col items-center text-center w-full"
                    >
                        <div className="mb-8 relative w-48 h-48 md:w-64 md:h-64">
                            <Image
                                src="/images/namaste_hands.png"
                                alt="Namaste"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <h1 className="text-6xl md:text-8xl font-playfair font-black italic text-[#D43425] leading-tight">Namaste.</h1>

                        {(isExpiredSession || isResetSession || isCancelledSession) && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="mt-8 px-8 py-4 bg-white/90 backdrop-blur-md border border-[#D43425]/10 rounded-[40px] flex items-center gap-4 shadow-2xl shadow-[#D43425]/10"
                            >
                                <AlertTriangle size={20} className="text-[#D43425]" />
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Status Notification</p>
                                    <p className="text-xs font-black text-zinc-900 uppercase tracking-widest">
                                        {isExpiredSession ? 'Session Timed Out' : (isResetSession ? 'Table Reset' : 'Order Cancelled')}
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        <p className="text-sm font-bold mt-4 uppercase tracking-[0.4em] opacity-40">A Royal Welcome Awaits</p>

                        <button
                            onClick={() => setStep(1)}
                            className="mt-16 w-full max-w-xs py-6 bg-zinc-900 text-white rounded-4xl font-black uppercase text-xs tracking-[0.4em] shadow-2xl hover:bg-[#D43425] transition-all group flex items-center justify-center gap-3 active:scale-95"
                        >
                            Begin Journey
                            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                )}

                {/* Step 1: Identity Portal (Scan or Type) */}
                {step === 1 && (
                    <motion.div
                        key="identity"
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-sm flex flex-col items-center"
                    >
                        <header className="text-center mb-10">
                            <p className="text-[#D43425] text-[10px] font-black tracking-[0.5em] uppercase mb-4">Identification</p>
                            <h1 className="text-4xl font-playfair font-black text-ink">Find Your Table</h1>
                        </header>

                        <div className="w-full bg-white rounded-5xl p-4 shadow-2xl border border-zinc-100 flex flex-col gap-4">
                            {!showScanner ? (
                                <div className="space-y-6 p-4">
                                    <button
                                        onClick={() => setShowScanner(true)}
                                        className="w-full p-8 bg-zinc-900 text-white rounded-4xl flex flex-col items-center gap-4 group hover:bg-[#D43425] transition-all relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                                            <QrCode size={80} />
                                        </div>
                                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                                            <QrCode size={24} />
                                        </div>
                                        <div className="text-center">
                                            <span className="text-[10px] font-black uppercase tracking-widest block">Scan Table QR</span>
                                            <p className="text-[8px] opacity-40 uppercase tracking-widest mt-1">Instant Recognition</p>
                                        </div>
                                    </button>

                                    <div className="relative py-2">
                                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100" /></div>
                                        <div className="relative flex justify-center"><span className="px-4 bg-white text-[8px] font-black text-zinc-300 uppercase tracking-widest">Or Entry Code</span></div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="relative">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400"><Keyboard size={16} /></div>
                                            <input
                                                type="text"
                                                placeholder="MH-T01 or Table No"
                                                value={manualCode}
                                                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                                className="w-full pl-14 pr-6 py-5 bg-zinc-50 border-none rounded-2xl focus:ring-2 focus:ring-[#D43425] font-black text-sm tracking-widest placeholder:text-zinc-300 transition-all"
                                            />
                                        </div>
                                        {codeError && <p className="text-[10px] font-bold text-rose-500 text-center uppercase tracking-widest">{codeError}</p>}
                                        <button
                                            onClick={handleManualLookup}
                                            disabled={lookupLoading || !manualCode}
                                            className="w-full py-5 bg-zinc-900 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-[#D43425] transition-all disabled:opacity-50"
                                        >
                                            {lookupLoading ? 'Finding table...' : 'Verify Table'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative">
                                    <AnimatePresence>
                                        {showScanner && (
                                            <QRScanner
                                                onScan={handleScan}
                                                onClose={() => setShowScanner(false)}
                                            />
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Step 2: Table Identified + Party Size */}
                {step === 2 && hotelData && tableStatus && (
                    <motion.div
                        key="confirm"
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                        className="w-full max-w-xl flex flex-col items-center"
                    >
                        <header className="text-center mb-10">
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100 mx-auto text-emerald-500">
                                <CheckCircle2 size={32} />
                            </div>
                            <h2 className="text-[9px] font-black uppercase tracking-[0.4em] text-[#D43425] mb-2">{hotelData.name}</h2>
                            <h1 className="text-4xl font-playfair font-black">Table {tableStatus.tableCode} Identified</h1>
                        </header>

                        <div className="w-full max-w-xs bg-white rounded-5xl p-8 shadow-2xl border border-zinc-100 space-y-8">
                            <div className="text-center space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Guests joining you?</p>
                                <div className="flex items-center justify-center gap-8">
                                    <button onClick={() => setPartySize(Math.max(1, partySize - 1))} className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center text-xl font-black text-zinc-400 border border-zinc-100">-</button>
                                    <span className="text-5xl font-black text-ink tabular-nums">{partySize}</span>
                                    <button onClick={() => setPartySize(Math.min(10, partySize + 1))} className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center text-xl font-black text-zinc-400 border border-zinc-100">+</button>
                                </div>
                            </div>

                            <button
                                onClick={() => setStep(3)}
                                className="w-full py-5 bg-[#D43425] text-white rounded-3xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl hover:bg-zinc-900 transition-all active:scale-95"
                            >
                                Confirm & Continue
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Step 3: Choice Page (AI Waiter vs Menu) */}
                {step === 3 && (
                    <motion.div
                        key="choice"
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-xl flex flex-col items-center"
                    >
                        <header className="text-center mb-12">
                            <p className="text-[#D43425] text-[10px] font-black tracking-[0.5em] uppercase mb-4">Table Ready</p>
                            <h1 className="text-4xl md:text-6xl font-playfair font-black text-ink">Choose Your Flow</h1>
                        </header>

                        <div className="grid grid-cols-1 gap-6 w-full max-w-sm">
                            <button
                                onClick={() => {
                                    setOrderingMode('ai');
                                    claimTable(tableStatus?.tableCode || '', 'NEW', 'ai');
                                }}
                                className="bg-zinc-900 text-white rounded-5xl p-8 flex flex-col items-center gap-6 group hover:bg-[#D43425] transition-all shadow-2xl relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform">
                                    <Sparkles size={100} />
                                </div>
                                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white group-hover:bg-white group-hover:text-[#D43425] transition-all">
                                    <Sparkles size={32} />
                                </div>
                                <div className="text-center">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] block mb-1">AI Waiter Concierge</span>
                                    <p className="text-[8px] font-bold opacity-50 uppercase tracking-widest">Chat, Recommend, Order</p>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    setOrderingMode('manual');
                                    claimTable(tableStatus?.tableCode || '', 'NEW', 'manual');
                                }}
                                className="bg-white border-2 border-zinc-100 rounded-5xl p-8 flex flex-col items-center gap-6 group hover:border-[#D43425] transition-all shadow-sm"
                            >
                                <div className="w-16 h-16 bg-vellum rounded-2xl flex items-center justify-center text-ink group-hover:bg-[#D43425] group-hover:text-white transition-all">
                                    <Utensils size={32} />
                                </div>
                                <div className="text-center">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] block mb-1 text-ink group-hover:text-[#D43425]">Visual Digital Menu</span>
                                    <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Browse, Filter, Personalize</p>
                                </div>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Security Badge */}
            <div className="fixed bottom-8 opacity-20 flex items-center gap-2">
                <Shield size={10} />
                <span className="text-[8px] font-bold uppercase tracking-widest">Secure Dining Protocol</span>
            </div>

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
