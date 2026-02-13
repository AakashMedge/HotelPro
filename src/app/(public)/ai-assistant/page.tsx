'use client';
// Force re-compile

import { useState, useEffect, useRef, useCallback } from 'react';
import MobileNav from '@/components/public/MobileNav';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

// ============================================
// Types
// ============================================

interface CartItem {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    category: string;
    isVeg: boolean;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

type AiPhase = 'idle' | 'listening' | 'thinking' | 'speaking';

// ============================================
// Component
// ============================================

export default function AIAssistantPage() {
    const router = useRouter();

    // ── State ──
    const [phase, setPhase] = useState<AiPhase>('idle');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [recommendedItems, setRecommendedItems] = useState<any[]>([]);
    const [guestName, setGuestName] = useState('');
    const [tableCode, setTableCode] = useState('');
    const [tableId, setTableId] = useState('');
    const [activeOrderId, setActiveOrderId] = useState('');
    const [liveTranscript, setLiveTranscript] = useState('');
    const [isExecutingOrder, setIsExecutingOrder] = useState(false);

    // ── Refs ──
    const recognitionRef = useRef<any>(null);
    const abortRef = useRef<AbortController | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const phaseRef = useRef<AiPhase>('idle');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const silenceTimer = useRef<NodeJS.Timeout | null>(null);
    const retryCount = useRef<number>(0);

    // Keep phaseRef in sync
    useEffect(() => { phaseRef.current = phase; }, [phase]);

    // ── Init ──
    useEffect(() => {
        if (typeof window === 'undefined') return;
        setGuestName(localStorage.getItem('hp_guest_name') || 'Guest');
        setTableCode(localStorage.getItem('hp_table_code') || '');
        setTableId(localStorage.getItem('hp_table_id') || '');
        setActiveOrderId(localStorage.getItem('hp_active_order_id') || '');

        // Sync cart
        try {
            const raw = localStorage.getItem('hp_cart');
            if (raw) {
                const parsed = JSON.parse(raw);
                setCart(parsed.map((i: any) => ({
                    menuItemId: i.menuItemId || i.id,
                    name: i.title || i.name,
                    price: i.price,
                    quantity: i.quantity,
                    category: i.category || '',
                    isVeg: i.isVeg || false,
                })));
            }
        } catch { /* ignore */ }

        return () => {
            // Full cleanup on unmount
            killAllAudio();
            killMic();
            if (abortRef.current) abortRef.current.abort();
        };
    }, []);

    // Sync cart to localStorage whenever it changes
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mapped = cart.map(item => ({
            id: item.menuItemId,
            menuItemId: item.menuItemId,
            title: item.name,
            price: item.price,
            quantity: item.quantity,
            category: item.category,
            isVeg: item.isVeg,
            imageUrl: null
        }));
        localStorage.setItem('hp_cart', JSON.stringify(mapped));
    }, [cart]);

    // Auto-scroll messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);



    // ============================================
    // Audio Control (CRITICAL: No overlap)
    // ============================================

    /** Kill ALL audio output immediately */
    const killAllAudio = useCallback(() => {
        if (typeof window === 'undefined') return;
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
    }, []);

    /** Kill microphone immediately */
    const killMic = useCallback(() => {
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch { /* safe */ }
            recognitionRef.current = null;
        }
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
        setLiveTranscript('');
    }, []);

    // ============================================
    // Speech Synthesis (TTS) — NEVER overlaps STT
    // ============================================

    // State to hint the TTS language from user input
    const [langHint, setLangHint] = useState<'en' | 'hi' | 'mr'>('en');
    const [listeningLang, setListeningLang] = useState<'en-IN' | 'hi-IN' | 'mr-IN'>('en-IN');

    const speak = useCallback((text: string) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        // RULE: Kill mic before speaking
        killMic();

        // Clean text
        const clean = text
            .replace(/[\u{1F600}-\u{1F9FF}]/gu, '')
            .replace(/[✨🍽️👨‍🍳🙏💫🎉🛒🤵🍷📋💳]/g, '')
            .replace(/₹/g, 'rupees ')
            .replace(/[•]/g, '')
            .trim();

        if (!clean) { setPhase('idle'); return; }

        // Cancel any previous speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(clean);

        // Devanagari detection (Marathi + Hindi)
        const devanagariPattern = /[\u0900-\u097F]/;
        const marathiSpecialPattern = /[ळ]/; // Character unique to Marathi in Devanagari

        if (marathiSpecialPattern.test(clean) || langHint === 'mr') {
            utterance.lang = 'mr-IN';
        } else if (devanagariPattern.test(clean) || langHint === 'hi') {
            utterance.lang = 'hi-IN';
        } else {
            utterance.lang = 'en-IN';
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            setPhase('speaking');
        };
        utterance.onend = () => {
            utteranceRef.current = null;
            setPhase('idle');
            // Auto-listen after speaking? (Optional: could be annoying)
            // startListening(); 
        };
        utterance.onerror = () => {
            utteranceRef.current = null;
            setPhase('idle');
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [killMic, langHint]);

    // ── Real-time Status Polling (Moved here to access 'speak') ──
    const [lastKnownStatus, setLastKnownStatus] = useState<string>('');

    useEffect(() => {
        if (!activeOrderId) return;

        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/orders/${activeOrderId}`);
                const data = await res.json();
                if (data.success && data.order) {
                    const newStatus = data.order.status;

                    // If status changed, notify
                    if (lastKnownStatus && lastKnownStatus !== newStatus) {
                        let notification = '';
                        if (newStatus === 'PREPARING') notification = "👨‍🍳 The kitchen has started preparing your order.";
                        else if (newStatus === 'READY') notification = "🍽️ Your food is ready! It will be served shortly.";
                        else if (newStatus === 'SERVED') notification = "😋 Your food has been served. Enjoy your meal!";
                        else if (newStatus === 'BILL_REQUESTED') notification = "🧾 Bill requested. The cashier has been notified.";
                        else if (newStatus === 'PAID') notification = "✅ Payment received. Thank you for visiting!";

                        if (notification) {
                            const sysMsg: Message = {
                                id: `sys-${Date.now()}`,
                                role: 'assistant',
                                content: notification,
                                timestamp: Date.now()
                            };
                            setMessages(prev => [...prev, sysMsg]);
                            speak(notification);
                        }
                    }
                    setLastKnownStatus(newStatus);
                }
            } catch { /* silent fail */ }
        };

        // Initial check
        checkStatus();

        // Poll every 5s
        const interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
    }, [activeOrderId, lastKnownStatus, speak]);

    // ============================================
    // Order Execution (Backend API)
    // ============================================

    const placeOrder = useCallback(async () => {
        if (cart.length === 0 || isExecutingOrder) return;
        setIsExecutingOrder(true);

        try {
            const currentTableId = tableId || localStorage.getItem('hp_table_id');
            const currentTableCode = tableCode || localStorage.getItem('hp_table_code');
            const guest = guestName || localStorage.getItem('hp_guest_name') || 'Guest';

            const items = cart.map((item) => ({
                menuItemId: item.menuItemId,
                quantity: item.quantity,
            }));

            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tableId: currentTableId,
                    tableCode: currentTableCode,
                    customerName: guest,
                    sessionId: localStorage.getItem('hp_session_id'),
                    items
                }),
            });

            const data = await res.json();
            if (data.success) {
                localStorage.setItem('hp_active_order_id', data.order.id);
                setActiveOrderId(data.order.id);
                localStorage.setItem('hp_cart', '[]');
                setCart([]);
                router.push(`/order-status?id=${data.order.id}`);
            } else {
                throw new Error(data.error || 'Failed to place order');
            }
        } catch (err) {
            console.error('Order placement failed:', err);
            setIsExecutingOrder(false);
            alert('I apologize Sir, I could not send the order to the kitchen. Please try again.');
        }
    }, [cart, isExecutingOrder, tableId, tableCode, guestName, router]);

    /** Add items to an existing active order */
    const addToExistingOrder = useCallback(async (menuItemId: string, name: string, quantity: number) => {
        const orderId = activeOrderId || localStorage.getItem('hp_active_order_id');
        if (!orderId) return;

        try {
            const res = await fetch(`/api/orders/${orderId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: [{ menuItemId, quantity }]
                }),
            });

            const data = await res.json();
            if (data.success) {
                console.log(`[AI] Added ${quantity}× ${name} to active order ${orderId}`);
                const aiMsg: Message = {
                    id: `sys-${Date.now()}`,
                    role: 'assistant',
                    content: `✅ ${quantity}× ${name} has been added to your active order. The kitchen has been notified.`,
                    timestamp: Date.now(),
                };
                setMessages(prev => [...prev, aiMsg]);
                speak(aiMsg.content);
            } else {
                console.error('[AI] Failed to add to order:', data.error);
            }
        } catch (err) {
            console.error('[AI] Error adding to existing order:', err);
        }
    }, [activeOrderId, speak]);

    // ============================================
    // Send Message to AI
    // ============================================

    const handleSend = useCallback(async (text: string) => {
        if (!text.trim() || isLoading) return;

        // Detect language for TTS hint
        const hasMarathi = /[ळ]/.test(text);
        const hasDevanagari = /[\u0900-\u097F]/.test(text);
        if (hasMarathi) setLangHint('mr');
        else if (hasDevanagari) setLangHint('hi');
        else setLangHint('en');

        // Kill audio/mic before processing
        killAllAudio();
        killMic();

        const userMsg: Message = {
            id: `u-${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, userMsg]);
        setPhase('thinking');
        setIsLoading(true);
        setRecommendedItems([]);

        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        try {
            const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));

            const res = await fetch('/api/ai/concierge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: abortRef.current.signal,
                body: JSON.stringify({
                    message: text,
                    guestName,
                    tableCode,
                    tableId,
                    cart,
                    conversationHistory: history,
                    activeOrderId,
                }),
            });

            const data = await res.json();

            if (data.success) {
                const aiMsg: Message = {
                    id: `a-${Date.now()}`,
                    role: 'assistant',
                    content: data.message,
                    timestamp: Date.now(),
                };
                setMessages(prev => [...prev, aiMsg]);

                // Process UI commands
                if (data.uiCommands) {
                    for (const cmd of data.uiCommands) {
                        if (cmd.type === 'UPDATE_CART') {
                            setCart(cmd.data || []);
                        } else if (cmd.type === 'SHOW_ITEMS') {
                            setRecommendedItems(cmd.data || []);
                        } else if (cmd.type === 'ADD_TO_EXISTING_ORDER') {
                            // Directly push to the existing order via API
                            if (cmd.data) {
                                addToExistingOrder(cmd.data.menuItemId, cmd.data.name, cmd.data.quantity);
                            }
                        } else if (cmd.type === 'NAVIGATE_ORDER_STATUS') {
                            if (cart.length > 0) {
                                placeOrder();
                                return;
                            } else if (activeOrderId) {
                                router.push(`/order-status?id=${activeOrderId}`);
                                return;
                            }
                        } else if (cmd.type === 'ORDER_STATUS_NARRATION') {
                            // Status is already in the AI message, nothing extra needed
                        }
                    }
                }

                // Speak the response (TTS will set phase to 'speaking')
                speak(data.message);
            } else {
                setPhase('idle');
            }
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                console.error('AI Error:', e);
                const errMsg: Message = {
                    id: `e-${Date.now()}`,
                    role: 'assistant',
                    content: 'I apologize, something went wrong. Please try again.',
                    timestamp: Date.now(),
                };
                setMessages(prev => [...prev, errMsg]);
            }
            setPhase('idle');
            setIsLoading(false);
        }
    }, [isLoading, messages, guestName, tableCode, tableId, cart, activeOrderId, killAllAudio, killMic, speak, placeOrder, addToExistingOrder, router]);

    // ============================================
    // Speech Recognition (STT)
    // ============================================

    const startListening = useCallback(() => {
        // RULE 1: Kill any playing audio FIRST
        killAllAudio();

        // RULE 2: Kill any existing mic session
        killMic();

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true; // KEEP LISTENING
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = listeningLang;

        recognition.onstart = () => {
            setPhase('listening');
            setLiveTranscript('');
        };

        recognition.onresult = (event: any) => {
            // Clear existing silence timer on every result
            if (silenceTimer.current) clearTimeout(silenceTimer.current);
            retryCount.current = 0; // Reset retry on success

            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            const currentText = finalTranscript || interimTranscript;
            setLiveTranscript(currentText);

            // Set a timer: If no new speech for 2.5 seconds, assume done
            silenceTimer.current = setTimeout(() => {
                if (currentText.trim()) {
                    recognition.stop();
                    setPhase('idle');
                    handleSend(currentText.trim());
                }
            }, 2500);
        };

        recognition.onerror = (event: any) => {
            console.warn('STT Error:', event.error);

            // Handle 'network' error with a retry
            if (event.error === 'network' && retryCount.current < 1) {
                retryCount.current += 1;
                console.log('Retrying STT due to network error...');
                setTimeout(() => {
                    try { recognition.start(); } catch { /* safe */ }
                }, 500);
                return;
            }

            // Don't kill on 'no-speech' error, just ignore
            if (event.error !== 'no-speech') {
                recognitionRef.current = null;
                setPhase('idle');
                setLiveTranscript('');
            }
        };

        recognition.onend = () => {
            // Only reset if we are not actively sending
            if (phaseRef.current === 'listening') {
                setPhase('idle');
            }
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {
            console.error('Failed to start STT:', e);
            setPhase('idle');
        }
    }, [killAllAudio, killMic, listeningLang, handleSend]);

    const stopListening = useCallback(() => {
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { /* safe */ }
        }
    }, []);

    // ============================================
    // Mic Toggle (tap to start/stop)
    // ============================================

    const toggleMic = useCallback(() => {
        if (phase === 'listening') {
            stopListening();
        } else if (phase === 'idle' || phase === 'speaking') {
            startListening();
        }
    }, [phase, startListening, stopListening]);

    // ============================================
    // Quick Action Pills
    // ============================================

    const quickActions = [
        { label: 'What do you recommend?', icon: '🍷' },
        { label: 'Show me the menu', icon: '📋' },
        { label: 'Check my order status', icon: '🔥' },
        { label: 'Add more dishes', icon: '➕' },
        { label: "I'm ready for the bill", icon: '💳' },
    ];

    // ============================================
    // Phase Colors
    // ============================================

    const auraColor = phase === 'listening' ? 'bg-red-500'
        : phase === 'thinking' ? 'bg-amber-700'
            : phase === 'speaking' ? 'bg-amber-500'
                : 'bg-transparent';

    const statusText = phase === 'listening' ? 'Listening...'
        : phase === 'thinking' ? 'Thinking...'
            : phase === 'speaking' ? 'Speaking...'
                : 'Tap to Speak';

    // ============================================
    // Render
    // ============================================

    return (
        <div className="fixed inset-0 bg-[#FAF7F2] flex flex-col overflow-hidden">

            {/* ─── Top Bar ─── */}
            <header className="shrink-0 px-5 pt-12 sm:pt-16 pb-3 relative z-10 flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-[8px] font-black uppercase tracking-[0.5em] text-[#D43425]/40">
                        HotelPro Premium Suite
                    </p>
                    <h1 className="text-xl font-serif font-black text-[#1A1A1A] italic -mt-0.5">
                        The Master Waiter
                    </h1>
                </div>

                {/* Language Selector */}
                <div className="bg-white/50 backdrop-blur-xl p-1 rounded-full border border-[#D43425]/10 flex gap-1 shadow-sm shrink-0 scale-90 sm:scale-100">
                    {[
                        { code: 'en-IN', label: 'EN' },
                        { code: 'hi-IN', label: 'हिं' },
                        { code: 'mr-IN', label: 'मरा' }
                    ].map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => {
                                setListeningLang(lang.code as any);
                                killMic(); // Force restart with new lang
                            }}
                            className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${listeningLang === lang.code
                                ? 'bg-[#1A1A1A] text-white shadow-md scale-105'
                                : 'text-zinc-400 hover:text-zinc-600 active:scale-95'
                                }`}
                        >
                            {lang.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* ─── Main Content (Scrollable) ─── */}
            <div className="flex-1 overflow-y-auto px-5 pb-24">

                {/* ─── Avatar + Aura ─── */}
                <div className="relative flex items-center justify-center py-6">
                    {/* Glow */}
                    <AnimatePresence>
                        {phase !== 'idle' && (
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                transition={{ repeat: Infinity, duration: 2.5 }}
                                className={`absolute w-48 h-48 rounded-full blur-[60px] ${auraColor}`}
                            />
                        )}
                    </AnimatePresence>

                    {/* Avatar */}
                    <motion.button
                        onClick={toggleMic}
                        disabled={phase === 'thinking'}
                        animate={{
                            scale: phase === 'listening' ? [1, 1.06, 1] : 1,
                            y: phase === 'idle' ? [0, -3, 0] : 0,
                        }}
                        transition={{
                            repeat: Infinity,
                            duration: phase === 'listening' ? 1.5 : 4,
                        }}
                        className="relative w-44 h-44 flex items-center justify-center"
                    >
                        <img
                            src="/images/waiter.png"
                            alt="Master Waiter"
                            className={`w-full h-full object-contain transition-all duration-700 ${phase === 'thinking' ? 'grayscale brightness-75 blur-[1px]' : ''
                                }`}
                        />

                        {/* Thinking spinner */}
                        {phase === 'thinking' && (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                                className="absolute inset-0 m-auto w-14 h-14 border-2 border-amber-600/20 border-t-amber-600 rounded-full"
                            />
                        )}

                        {/* Listening waveform */}
                        {phase === 'listening' && (
                            <div className="absolute -bottom-2 flex gap-[3px]">
                                {[0, 1, 2, 3, 4].map(i => (
                                    <motion.div
                                        key={i}
                                        animate={{ height: [3, 14, 3] }}
                                        transition={{ repeat: Infinity, duration: 0.45, delay: i * 0.08 }}
                                        className="w-[3px] bg-red-500 rounded-full"
                                    />
                                ))}
                            </div>
                        )}

                        {/* Idle mic icon */}
                        {phase === 'idle' && (
                            <div className="absolute bottom-1 right-1 w-9 h-9 bg-white rounded-full shadow-lg border border-[#D43425]/10 flex items-center justify-center">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D43425" strokeWidth="2.5">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                </svg>
                            </div>
                        )}
                    </motion.button>
                </div>

                {/* ─── Status Label ─── */}
                <p className={`text-center text-[9px] font-black uppercase tracking-[0.4em] mb-5 transition-colors duration-300 ${phase === 'listening' ? 'text-red-500' :
                    phase === 'thinking' ? 'text-amber-700' :
                        phase === 'speaking' ? 'text-amber-500' :
                            'text-[#D43425]/50 animate-pulse'
                    }`}>
                    {statusText}
                </p>

                {/* ─── Live Transcript (while listening) ─── */}
                <AnimatePresence>
                    {liveTranscript && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mb-4 text-center"
                        >
                            <p className="text-sm text-zinc-500 italic">"{liveTranscript}"</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ─── Conversation Transcript ─── */}
                <div className="bg-[#F5F0EA] rounded-2xl p-5 min-h-[120px] border border-[#D43425]/5 relative overflow-hidden mb-6">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-linear-to-r from-transparent via-[#D43425]/15 to-transparent" />

                    {messages.length === 0 ? (
                        <p className="text-center text-[11px] text-zinc-400 italic leading-relaxed py-4 tracking-wide">
                            "Good afternoon sir. I am listening...
                            <br />
                            Tell me what your heart desires
                            <br />
                            or ask for my humble recommendations."
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {messages.slice(-4).map((m) => (
                                <motion.div
                                    key={m.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={m.role === 'user' ? 'text-right' : 'text-left'}
                                >
                                    {m.role === 'user' ? (
                                        <span className="inline-block bg-[#1A1A1A] text-white text-[13px] px-4 py-2 rounded-2xl rounded-br-md max-w-[85%]">
                                            {m.content}
                                        </span>
                                    ) : (
                                        <div className="text-[13px] text-[#3D2329] leading-relaxed font-serif italic max-w-[90%]">
                                            {m.content}
                                            <div className="w-6 h-px bg-[#D43425]/15 mt-2" />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex items-center gap-1 pt-3">
                            <span className="text-[8px] font-black text-[#D43425]/30 uppercase tracking-[0.3em] mr-2">
                                Consulting Ledger
                            </span>
                            {[0, 1, 2].map(i => (
                                <motion.div
                                    key={i}
                                    animate={{ opacity: [0.2, 1, 0.2] }}
                                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                                    className="w-1.5 h-1.5 rounded-full bg-[#D43425]"
                                />
                            ))}
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* ─── Confirmation Section (The "Humble Confirmation") ─── */}
                <AnimatePresence>
                    {cart.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-4 border border-[#D43425]/10 shadow-xl mb-6 flex flex-col gap-3 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-3 opacity-20 pointer-events-none">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D43425" strokeWidth="1">
                                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                                    <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
                                </svg>
                            </div>

                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D43425]/60 mb-1">Current Selection</h3>
                                <div className="space-y-1">
                                    {cart.map(item => (
                                        <div key={item.menuItemId} className="flex justify-between items-center text-xs">
                                            <span className="text-[#3D2329] font-medium">{item.quantity}× {item.name}</span>
                                            <span className="text-zinc-400 font-bold tabular-nums">₹{item.price * item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="h-px bg-zinc-50 my-2" />
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-300">Total Selection Value</span>
                                    <span className="text-sm font-black text-[#1A1A1A] tracking-tighter">₹{cart.reduce((s, i) => s + i.price * i.quantity, 0)}</span>
                                </div>
                            </div>

                            <button
                                onClick={placeOrder}
                                disabled={isExecutingOrder}
                                className="w-full bg-[#D43425] hover:bg-[#B72A1E] text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-red-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                            >
                                {isExecutingOrder ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Summoning Kitchen Staff...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Confirm & Send to Kitchen</span>
                                        <svg className="transition-transform group-hover:translate-x-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ─── Recommended Items (horizontal scroll) ─── */}
                <AnimatePresence>
                    {recommendedItems.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="mb-6"
                        >
                            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-[#D43425]/40 mb-2 px-1">
                                Chef's Selection
                            </p>
                            <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
                                {recommendedItems.map((item: any) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSend(`Add 1 ${item.name}`)}
                                        className="shrink-0 w-[130px] bg-white border border-zinc-100 rounded-xl p-3 text-left active:scale-[0.97] transition-transform shadow-sm"
                                    >
                                        <div className="flex items-center gap-1 mb-1">
                                            <span className={`w-2 h-2 rounded-sm ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                                            {item.isChefSpecial && (
                                                <span className="text-[7px] font-bold text-amber-600 bg-amber-50 px-1 rounded">★</span>
                                            )}
                                        </div>
                                        <p className="text-[11px] font-bold text-zinc-800 line-clamp-2 leading-tight">{item.name}</p>
                                        <p className="text-[11px] font-black text-[#D43425] mt-1">₹{item.price}</p>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ─── Quick Action Pills ─── */}
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {quickActions.map((action) => (
                        <button
                            key={action.label}
                            onClick={() => handleSend(action.label)}
                            disabled={isLoading}
                            className="px-4 py-2.5 bg-white rounded-full border border-[#D43425]/15 text-[10px] font-black uppercase tracking-[0.15em] text-[#D43425] active:scale-95 active:bg-[#D43425] active:text-white transition-all shadow-sm disabled:opacity-40"
                        >
                            <span className="mr-1">{action.icon}</span> {action.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── Bottom Nav ─── */}
            <MobileNav />

            {/* ─── Global Styles ─── */}
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
