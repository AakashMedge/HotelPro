'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    actions?: any[];
    uiCommands?: any[];
    meta?: any;
}

interface RecommendedItem {
    id: string;
    name: string;
    price: number;
    category: string;
    isVeg: boolean;
    isChefSpecial?: boolean;
}

interface AiConciergeWidgetProps {
    cart?: any[];
    onCartUpdate?: (cart: CartItem[]) => void;
    onPlaceOrder?: () => void;
    onNavigateToStatus?: (orderId?: string) => void;
}

// ============================================
// Voice Hooks
// ============================================

function useSpeechRecognition() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            setIsSupported(!!SpeechRecognition);
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = true;
                recognition.maxAlternatives = 1;
                // Support Hindi, English, Marathi
                recognition.lang = 'hi-IN'; // Default Hindi, auto-detects English too

                recognition.onresult = (event: any) => {
                    const result = event.results[event.results.length - 1];
                    setTranscript(result[0].transcript);
                };

                recognition.onend = () => {
                    setIsListening(false);
                };

                recognition.onerror = (event: any) => {
                    console.error('Speech recognition error:', event.error);
                    setIsListening(false);
                };

                recognitionRef.current = recognition;
            }
        }
    }, []);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            setTranscript('');
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error('Failed to start recognition:', e);
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, [isListening]);

    return { isListening, transcript, isSupported, startListening, stopListening };
}

function useSpeechSynthesis() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        setIsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);

        // CLEANUP: Stop talking if we leave the page
        return () => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const speak = useCallback((text: string) => {
        if (!isSupported) return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        // Clean text: remove emojis and special chars for better TTS
        const cleanText = text
            .replace(/[\u{1F600}-\u{1F9FF}]/gu, '')
            .replace(/[✨🍽️👨‍🍳🙏💫🎉🛒]/g, '')
            .replace(/[₹]/g, 'rupees ')
            .replace(/[•]/g, '')
            .trim();

        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);

        // Try to detect language
        const hindiPattern = /[\u0900-\u097F]/;
        if (hindiPattern.test(cleanText)) {
            utterance.lang = 'hi-IN';
        } else {
            utterance.lang = 'en-IN';
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, [isSupported]);

    const stop = useCallback(() => {
        if (isSupported) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    }, [isSupported]);

    return { isSpeaking, isSupported, speak, stop };
}

// ============================================
// Main Component
// ============================================

export default function AiConciergeWidget({
    cart: externalCart = [],
    onCartUpdate,
    onPlaceOrder,
    onNavigateToStatus,
}: AiConciergeWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [aiCart, setAiCart] = useState<CartItem[]>([]);
    const [recommendedItems, setRecommendedItems] = useState<RecommendedItem[]>([]);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [providerInfo, setProviderInfo] = useState({ provider: '', model: '' });
    const [showPulse, setShowPulse] = useState(true);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const stt = useSpeechRecognition();
    const tts = useSpeechSynthesis();

    // Abort pending requests on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Sync external cart
    useEffect(() => {
        if (externalCart.length > 0) {
            setAiCart(externalCart.map((item: any) => ({
                menuItemId: item.menuItemId || item.id,
                name: item.title || item.name,
                price: item.price,
                quantity: item.quantity,
                category: item.category || '',
                isVeg: item.isVeg || false,
            })));
        }
    }, [externalCart]);

    // Auto-submit voice transcript
    useEffect(() => {
        if (!stt.isListening && stt.transcript.trim()) {
            setInputValue(stt.transcript);
            // Auto-send after voice stops
            setTimeout(() => {
                handleSend(stt.transcript);
            }, 300);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stt.isListening, stt.transcript]);

    // Greeting on first open
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            const greeting = `Good afternoon Sir. I am listening... Tell me what your heart desires or ask for my humble recommendations.`;

            setMessages([{
                id: 'greeting',
                role: 'assistant',
                content: greeting,
                timestamp: Date.now(),
            }]);

            if (voiceEnabled && tts.isSupported) {
                const timer = setTimeout(() => tts.speak(greeting), 500);
                return () => clearTimeout(timer);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Hide pulse after first open
    useEffect(() => {
        if (isOpen) setShowPulse(false);
    }, [isOpen]);

    // ============================================
    // Send Message
    // ============================================

    const handleSend = async (overrideMessage?: string) => {
        const msg = overrideMessage || inputValue.trim();
        if (!msg || isLoading) return;

        // Add user message
        const userMsg: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: msg,
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);
        setRecommendedItems([]);

        // Cancel any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            const tableId = localStorage.getItem('hp_table_id') || '';
            const tableCode = localStorage.getItem('hp_table_code') || '';
            const guestName = localStorage.getItem('hp_guest_name') || 'Guest';
            const activeOrderId = localStorage.getItem('hp_active_order_id') || '';

            // Build conversation history for context
            const conversationHistory = messages
                .filter(m => m.role !== 'system')
                .slice(-8)
                .map(m => ({ role: m.role, content: m.content }));

            const res = await fetch('/api/ai/concierge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: abortControllerRef.current.signal,
                body: JSON.stringify({
                    message: msg,
                    guestName,
                    tableCode,
                    tableId,
                    cart: aiCart,
                    conversationHistory,
                    activeOrderId,
                }),
            });

            const data = await res.json();

            if (data.success) {
                // AI Message
                const aiMsg: Message = {
                    id: `ai-${Date.now()}`,
                    role: 'assistant',
                    content: data.message,
                    timestamp: Date.now(),
                    actions: data.actions,
                    uiCommands: data.uiCommands,
                    meta: data.meta,
                };
                setMessages(prev => [...prev, aiMsg]);

                // Update provider info
                if (data.meta?.provider) {
                    setProviderInfo({
                        provider: data.meta.provider,
                        model: data.meta.model,
                    });
                }

                // Process UI commands
                if (data.uiCommands) {
                    for (const cmd of data.uiCommands) {
                        switch (cmd.type) {
                            case 'UPDATE_CART':
                                setAiCart(cmd.data || []);
                                onCartUpdate?.(cmd.data || []);
                                break;
                            case 'SHOW_ITEMS':
                                setRecommendedItems(cmd.data || []);
                                break;
                            case 'NAVIGATE_ORDER_STATUS':
                                if (aiCart.length > 0) {
                                    onPlaceOrder?.();
                                }
                                break;
                            case 'SHOW_BILL':
                                onNavigateToStatus?.();
                                break;
                        }
                    }
                }

                // Speak response if voice enabled
                if (voiceEnabled && tts.isSupported) {
                    tts.speak(data.message);
                }
            } else {
                const errorMsg: Message = {
                    id: `error-${Date.now()}`,
                    role: 'assistant',
                    content: data.error || 'Something went wrong. Please try again.',
                    timestamp: Date.now(),
                };
                setMessages(prev => [...prev, errorMsg]);
            }
        } catch (error) {
            console.error('Concierge error:', error);
            const errorMsg: Message = {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: "I'm having trouble connecting. Please check your connection and try again. 🙏",
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================
    // Quick Actions
    // ============================================

    const quickActions = [
        { label: '🍷 What do you recommend?', message: 'What do you recommend?' },
        { label: '📋 Check my order', message: 'Check my order status' },
        { label: '💳 I\'m ready for the bill', message: 'I am ready for the bill' },
    ];

    // ============================================
    // Render
    // ============================================

    return (
        <>
            {/* ─── Floating Button ─── */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-28 right-4 z-40 group"
                aria-label="AI Dining Assistant"
            >
                <div className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen
                    ? 'bg-zinc-800 rotate-0 scale-95'
                    : 'bg-linear-to-br from-violet-500 via-indigo-500 to-purple-600 shadow-lg shadow-indigo-400/30 hover:shadow-xl hover:shadow-indigo-400/40 hover:scale-105'
                    }`}>
                    {isOpen ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    ) : (
                        <div className="relative">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.93 9.93 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
                                <circle cx="8" cy="12" r="1" fill="white" />
                                <circle cx="12" cy="12" r="1" fill="white" />
                                <circle cx="16" cy="12" r="1" fill="white" />
                            </svg>
                            {showPulse && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
                            )}
                        </div>
                    )}
                </div>
                {!isOpen && showPulse && (
                    <div className="absolute -top-8 right-0 bg-zinc-800 text-white text-[10px] font-medium px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        AI Assistant
                    </div>
                )}
            </button>

            {/* ─── Chat Panel ─── */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex flex-col bg-white"
                    style={{ animation: 'fadeSlideUp 0.3s ease' }}
                >
                    {/* Header */}
                    <div className="bg-zinc-950 px-5 py-5 flex items-center justify-between shrink-0 safe-area-top border-b border-zinc-800/50">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                                <span className="text-xl">🤵</span>
                            </div>
                            <div>
                                <h4 className="text-amber-500/60 font-black text-[9px] uppercase tracking-[0.3em] mb-1">HotelPro Premium Suite</h4>
                                <h3 className="text-white font-black text-base tracking-tight">The Master Waiter</h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                                        At Your Service
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Voice Status Badge (Mobile optimized) */}
                            {providerInfo.provider && (
                                <div className="hidden md:flex px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[8px] font-mono text-zinc-500 uppercase">
                                    {providerInfo.provider}
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                {/* Voice Toggle */}
                                <button
                                    onClick={() => {
                                        setVoiceEnabled(!voiceEnabled);
                                        if (tts.isSpeaking) tts.stop();
                                    }}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${voiceEnabled ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'
                                        }`}
                                    title={voiceEnabled ? 'Mute voice' : 'Enable voice'}
                                >
                                    {voiceEnabled ? (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                                        </svg>
                                    ) : (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
                                        </svg>
                                    )}
                                </button>
                                {/* Close */}
                                <button
                                    onClick={() => { setIsOpen(false); tts.stop(); }}
                                    className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-linear-to-b from-slate-50 to-white">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] ${msg.role === 'user'
                                        ? 'bg-linear-to-br from-violet-500 to-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 shadow-sm'
                                        : 'bg-white border border-zinc-100 text-zinc-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm'
                                        }`}>
                                        <p className={`text-[13px] leading-relaxed whitespace-pre-line ${msg.role === 'user' ? 'text-white' : 'text-zinc-700'
                                            }`}>
                                            {msg.content}
                                        </p>
                                        {/* Latency badge */}
                                        {msg.meta?.latencyMs && (
                                            <p className="text-[9px] mt-1.5 opacity-40 font-mono">
                                                {msg.meta.provider} · {msg.meta.latencyMs}ms
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Recommended Items Carousel */}
                            {recommendedItems.length > 0 && (
                                <div className="pl-2">
                                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Suggested Dishes</p>
                                    <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
                                        {recommendedItems.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleSend(`Add 1 ${item.name}`)}
                                                className="shrink-0 w-[140px] bg-white border border-zinc-100 rounded-xl p-3 text-left hover:border-indigo-200 hover:shadow-sm transition-all active:scale-[0.97]"
                                            >
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <span className={`w-2.5 h-2.5 rounded-sm border ${item.isVeg ? 'border-green-500 bg-green-500' : 'border-red-500 bg-red-500'}`}>
                                                        <span className="block w-1 h-1 bg-white rounded-full m-auto mt-[2px]" />
                                                    </span>
                                                    {item.isChefSpecial && (
                                                        <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1 rounded">★</span>
                                                    )}
                                                </div>
                                                <h4 className="text-xs font-semibold text-zinc-800 line-clamp-2 leading-tight">{item.name}</h4>
                                                <p className="text-[11px] font-bold text-indigo-600 mt-1">₹{item.price}</p>
                                                <p className="text-[9px] text-zinc-400 mt-0.5">{item.category}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* AI Cart Preview */}
                            {aiCart.length > 0 && messages.some(m => m.uiCommands?.some((c: any) => c.type === 'UPDATE_CART')) && (
                                <div className="bg-linear-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-2">🛒 Your Order via AI</p>
                                    {aiCart.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center py-1">
                                            <span className="text-xs text-zinc-700">{item.quantity}× {item.name}</span>
                                            <span className="text-xs font-semibold text-zinc-800">₹{item.price * item.quantity}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-indigo-100 mt-2 pt-2 flex justify-between">
                                        <span className="text-xs font-bold text-zinc-700">Total</span>
                                        <span className="text-sm font-bold text-indigo-600">₹{aiCart.reduce((s, c) => s + c.price * c.quantity, 0)}</span>
                                    </div>
                                    <button
                                        onClick={() => handleSend('Place my order')}
                                        className="w-full mt-2 py-2 bg-linear-to-r from-violet-500 to-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-wide active:scale-[0.98] transition-transform"
                                    >
                                        Confirm & Send to Kitchen →
                                    </button>
                                </div>
                            )}

                            {/* Loading indicator */}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-zinc-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                                        <div className="flex gap-1.5 items-center">
                                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={chatEndRef} />
                        </div>

                        {/* Quick Actions */}
                        {messages.length <= 1 && (
                            <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar bg-white border-t border-zinc-50 shrink-0">
                                {quickActions.map((action) => (
                                    <button
                                        key={action.label}
                                        onClick={() => handleSend(action.message)}
                                        className="shrink-0 px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-full text-[11px] font-medium text-zinc-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all active:scale-95"
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="px-4 py-3 border-t border-zinc-100 bg-white shrink-0 safe-area-bottom">
                            {/* Voice Listening Indicator */}
                            {stt.isListening && (
                                <div className="flex items-center justify-center gap-2 py-2 mb-2 bg-red-50 rounded-xl border border-red-100">
                                    <div className="relative">
                                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                        <div className="absolute inset-0 w-3 h-3 bg-red-400 rounded-full animate-ping" />
                                    </div>
                                    <span className="text-xs font-semibold text-red-600">Listening...</span>
                                    {stt.transcript && (
                                        <span className="text-xs text-red-400 italic ml-1 truncate max-w-[150px]">{stt.transcript}</span>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                {/* Voice Button */}
                                {stt.isSupported && (
                                    <button
                                        onTouchStart={(e) => { e.preventDefault(); stt.startListening(); }}
                                        onTouchEnd={(e) => { e.preventDefault(); stt.stopListening(); }}
                                        onMouseDown={() => stt.startListening()}
                                        onMouseUp={() => stt.stopListening()}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${stt.isListening
                                            ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-300/40'
                                            : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 active:scale-95'
                                            }`}
                                        title="Hold to speak"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                                            <path d="M19 10v2a7 7 0 01-14 0v-2" />
                                            <line x1="12" y1="19" x2="12" y2="23" />
                                            <line x1="8" y1="23" x2="16" y2="23" />
                                        </svg>
                                    </button>
                                )}

                                {/* Text Input */}
                                <div className="flex-1 flex items-center bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                                        placeholder={stt.isListening ? 'Speak now...' : 'Type or hold 🎤 to speak...'}
                                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400 text-zinc-800"
                                        disabled={isLoading}
                                    />
                                </div>

                                {/* Send Button */}
                                <button
                                    onClick={() => handleSend()}
                                    disabled={!inputValue.trim() || isLoading}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${inputValue.trim() && !isLoading
                                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 active:scale-90 font-bold'
                                        : 'bg-zinc-100 text-zinc-300'
                                        }`}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7Z" />
                                    </svg>
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .safe-area-top { padding-top: env(safe-area-inset-top, 0); }
                .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0); }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </>
    );
}
