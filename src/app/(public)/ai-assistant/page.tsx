'use client';

import { useState, useEffect, useRef } from 'react';

import MobileNav from '@/components/public/MobileNav';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIAssistantPage() {
    const [isListening, setIsListening] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [tableCode, setTableCode] = useState('');
    const [lastResponse, setLastResponse] = useState('');
    const currentAudioRef = useRef<HTMLAudioElement | null>(null); // For interruption handling


    // AI State Machine
    const [aiState, setAiState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
    const [visualContext, setVisualContext] = useState<any>(null); // For Product Cards / Status

    // UI Trigger Parser
    const parseUITriggers = (content: string) => {
        const itemMatch = content.match(/\[UI:ITEM_CARD:(.*?)\]/);
        if (itemMatch) {
            setVisualContext({ type: 'ITEM_CARD', id: itemMatch[1] });
        }

        const statusMatch = content.match(/\[UI:STATUS_TRACKER\]/);
        if (statusMatch) {
            setVisualContext({ type: 'STATUS_TRACKER' });
        }

        const summaryMatch = content.match(/\[UI:ORDER_SUMMARY\]/);
        if (summaryMatch) {
            setVisualContext({ type: 'ORDER_SUMMARY' });
        }
    };

    // Simplified Interaction Logic (No SDK)
    const [messages, setMessages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSendMessage = async (text: string) => {
        if (!text.trim()) return;

        // INTERRUPTION LOGIC: If AI is speaking, shut him up immediately.
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }
        window.speechSynthesis.cancel(); // Also kill browser TTS if active

        const newMsg = { id: Date.now(), role: 'user', content: text };
        setMessages(prev => [...prev, newMsg]);
        setAiState('thinking');
        setIsLoading(true);

        try {
            const res = await fetch('/api/ai/concierge', {
                method: 'POST',
                body: JSON.stringify({
                    messages: [...messages, newMsg],
                    guestName,
                    tableCode
                })
            });

            const reply = await res.text();

            const aiMsg = { id: Date.now() + 1, role: 'assistant', content: reply };
            setMessages(prev => [...prev, aiMsg]);

            setAiState('speaking');
            parseUITriggers(reply);
            speakText(reply);

        } catch (e) {
            console.error(e);
            setAiState('idle');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setGuestName(localStorage.getItem('hp_guest_name') || '');
            setTableCode(localStorage.getItem('hp_table_code') || '');
        }
    }, []);

    // Layer 4: Senses (Speech Recognition)
    const recognitionRef = useRef<any>(null);

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window) && !('speechRecognition' in window)) {
            alert('Voice recognition is not supported in this browser.');
            return;
        }

        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).speechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
            setIsListening(true);
            setAiState('listening');
        };

        recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            handleSendMessage(transcript);
        };

        recognitionRef.current.onerror = () => {
            setIsListening(false);
            setAiState('idle');
        };

        recognitionRef.current.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current.start();
    };

    // Layer 4: Senses (Text to Speech - Hybrid Engine)
    const speakText = async (text: string) => {
        if (!text) return;

        // Clean text for speech (remove UI tags)
        const cleanText = text.replace(/\[UI:.*?\]/g, '').replace(/\[ tool_call .*? \]/g, '').trim();
        if (!cleanText) return;

        console.log("Speaking:", cleanText.slice(0, 30) + "...");

        try {
            // 1. Try ElevenLabs API (The "Royal" Voice)
            const response = await fetch('/api/ai/voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: cleanText }),
            });

            if (response.ok) {
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                currentAudioRef.current = audio;

                audio.onplay = () => {
                    setAiState('speaking');
                    // MAGIC: Start listening AGAIN immediately (Barge-In)
                    // We add a small delay to let AEC (Echo and Noise Cancellation) settle
                    setTimeout(() => startListening(), 500);
                };

                audio.onended = () => {
                    // Only go to idle if we aren't already listening/interrupted
                    setAiState(prev => prev === 'listening' ? 'listening' : 'idle');
                };
                audio.play();
                return; // Success! Exit function.
            }
        } catch (err) {
            console.warn("ElevenLabs failed, falling back to Browser TTS", err);
        }

        // 2. Fallback: Browser Native TTS (Reinforced)
        if (!('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel();

        const SynthesisUtterance = (window as any).SpeechSynthesisUtterance || (window as any).webkitSpeechSynthesisUtterance;
        const utterance = new SynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const butlerVoice = voices.find(v => v.name.includes('Google UK English Male')) ||
            voices.find(v => v.name.includes('Daniel')) ||
            voices.find(v => v.lang.startsWith('en-GB'));

        if (butlerVoice) utterance.voice = butlerVoice;

        utterance.onstart = () => setAiState('speaking');
        utterance.onend = () => setAiState('idle');
        utterance.onerror = () => setAiState('idle');

        window.speechSynthesis.speak(utterance);
    };

    // Chrome/Safari voice loading workaround
    useEffect(() => {
        const loadVoices = () => {
            window.speechSynthesis.getVoices();
        };

        if ('speechSynthesis' in window) {
            loadVoices();
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = loadVoices;
            }
        }

        const handleInteraction = () => {
            console.log("Audio context primed via interaction");
            if ('speechSynthesis' in window) {
                window.speechSynthesis.resume();
                const SynthesisUtterance = (window as any).SpeechSynthesisUtterance || (window as any).webkitSpeechSynthesisUtterance;
                const v = new SynthesisUtterance("");
                window.speechSynthesis.speak(v);
            }
            window.removeEventListener('click', handleInteraction);
        };
        window.addEventListener('click', handleInteraction);

        return () => {
            window.removeEventListener('click', handleInteraction);
            // Cleanup: Stop all speech when leaving the page
            if (typeof window !== 'undefined') {
                window.speechSynthesis.cancel();
                if (currentAudioRef.current) {
                    currentAudioRef.current.pause();
                    currentAudioRef.current = null;
                }
            }
        };
    }, []);

    return (
        <main className="min-h-screen bg-[#FBF8F3] overflow-hidden flex flex-col items-center justify-between py-10 px-6 safe-area-bottom relative">
            {/* Background Watermark (Crest) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none overflow-hidden">
                <svg width="600" height="600" viewBox="0 0 400 400" fill="none" className="rotate-12 scale-150">
                    <path
                        d="M200 10 C240 10 280 30 300 60 C340 40 390 70 390 120 C390 160 370 190 340 200 C370 210 390 240 390 280 C390 330 340 360 300 340 C280 370 240 390 200 390 C160 390 120 370 100 340 C60 360 10 330 10 280 C10 240 30 210 60 200 C30 190 10 160 10 120 C10 70 60 40 100 60 C120 30 160 10 200 10 Z"
                        stroke="#D43425"
                        strokeWidth="2"
                    />
                </svg>
            </div>

            {/* Header Branding */}
            <div className="relative z-10 text-center space-y-1 mt-2">
                <h2 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] text-[#D43425]/40 italic">HotelPro Premium Suite</h2>
                <h1 className="text-xl sm:text-2xl font-playfair font-black text-[#1A1A1A] italic">The Master Waiter</h1>
            </div>

            {/* LAYER 5: THE FACE (Generative Aura Avatar) */}
            <div className="relative z-10 flex items-center justify-center w-full max-w-[280px] sm:max-w-sm aspect-square my-4 sm:my-0">
                {/* Outer Glows */}
                <AnimatePresence>
                    {aiState !== 'idle' && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{
                                opacity: [0.1, 0.25, 0.1],
                                scale: [1, 1.2, 1],
                            }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                            className={`absolute w-64 h-64 rounded-full blur-[80px] transition-colors duration-1000 ${aiState === 'listening' ? 'bg-[#D43425]' :
                                aiState === 'thinking' ? 'bg-[#3D2329]' :
                                    'bg-[#C9A227]'
                                }`}
                        />
                    )}
                </AnimatePresence>

                {/* Main Avatar Container */}
                <motion.div
                    onClick={startListening}
                    animate={{
                        scale: aiState === 'listening' ? [1, 1.05, 1] : 1,
                    }}
                    transition={{
                        repeat: aiState === 'listening' ? Infinity : 0,
                        duration: 2,
                        ease: "easeInOut"
                    }}
                    className="relative w-56 h-56 sm:w-72 sm:h-72 flex items-center justify-center cursor-pointer group"
                >
                    {/* The Waiter Image */}
                    <div className="relative z-10 w-full h-full flex items-center justify-center">
                        <motion.img
                            src="/images/waiter.png"
                            alt="Master Waiter"
                            animate={{
                                scale: aiState === 'idle' ? [1, 1.03, 1] : 1,
                                y: aiState === 'idle' ? [0, -4, 0] : 0
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: 4,
                                ease: "easeInOut"
                            }}
                            className={`w-full h-full object-contain transition-all duration-1000 ${aiState === 'thinking' ? 'grayscale brightness-75 blur-[1px]' : 'grayscale-0'
                                }`}
                        />

                        {/* Status Overlay (Subtle Loading Spinner) */}
                        {aiState === 'thinking' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                    className="w-16 h-16 border-2 border-[#C9A227]/20 border-t-[#C9A227] rounded-full"
                                />
                            </div>
                        )}

                        {/* Audio Waveform (Only when listening) */}
                        {aiState === 'listening' && (
                            <div className="absolute -bottom-4 flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <motion.div
                                        key={i}
                                        animate={{ height: [4, 16, 4] }}
                                        transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                                        className="w-1 bg-[#D43425] rounded-full opacity-60"
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Interaction Indicator (Floating Mic) */}
                    {aiState === 'idle' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.1 }}
                            className="absolute bottom-4 right-4 bg-white rounded-full p-3 shadow-xl border border-[#D43425]/10 z-20"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D43425" strokeWidth="2.5">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            </svg>
                        </motion.div>
                    )}
                </motion.div>

                {/* Tap Label */}
                {aiState === 'idle' && (
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -bottom-8 text-[8px] font-black uppercase tracking-[0.4em] text-[#D43425]/60 animate-pulse"
                    >
                        Tap to Speak
                    </motion.p>
                )}
            </div>

            {/* VISUAL UI LAYER (Product Cards & Status) */}
            <AnimatePresence>
                {visualContext && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-32 z-50 w-full max-w-sm px-4 pointer-events-none"
                    >
                        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-[#D43425]/10 pointer-events-auto">
                            {visualContext.type === 'ITEM_CARD' && (
                                <div className="flex gap-4 items-center">
                                    <div className="w-16 h-16 bg-[#FBF8F3] rounded-lg flex items-center justify-center border border-[#D43425]/10">
                                        <span className="text-2xl">🍽️</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-playfair font-bold text-[#1A1A1A]">Chef's Recommendation</h3>
                                        <p className="text-xs text-ink/60">An excellent choice for your palate.</p>
                                    </div>
                                    <button
                                        onClick={() => handleSendMessage(`Yes, please order the item ${visualContext.id}`)}
                                        className="bg-[#D43425] text-white px-3 py-2 rounded-lg text-xs font-bold shadow-lg shadow-[#D43425]/30 active:scale-95 transition-transform"
                                    >
                                        ORDER
                                    </button>
                                </div>
                            )}

                            {visualContext.type === 'STATUS_TRACKER' && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-[#D43425]/60">Kitchen Live Link</h3>
                                    <div className="h-1 w-full bg-[#FAF7F2] rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: "0%" }}
                                            animate={{ width: "60%" }}
                                            className="h-full bg-[#D43425]"
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-ink/40 uppercase">
                                        <span>Received</span>
                                        <span className="text-[#D43425]">Preparing</span>
                                        <span>Served</span>
                                    </div>
                                </div>
                            )}

                            {visualContext.type === 'ORDER_SUMMARY' && (
                                <div className="text-center space-y-3">
                                    <div className="w-8 h-8 mx-auto bg-[#D43425]/10 rounded-full flex items-center justify-center">
                                        <span className="text-sm">🧾</span>
                                    </div>
                                    <h3 className="text-sm font-playfair font-bold text-[#1A1A1A]">Digital Bill Generated</h3>
                                    <p className="text-xs text-ink/60 px-4">Your order has been summarized. Shall I proceed to charge this to Table {tableCode}?</p>
                                    <div className="flex gap-2 justify-center pt-1">
                                        <button
                                            onClick={() => setVisualContext(null)} // Dismiss
                                            className="px-4 py-2 rounded-lg text-xs font-bold text-ink/40 hover:bg-black/5"
                                        >
                                            Review
                                        </button>
                                        <button
                                            onClick={() => handleSendMessage("Yes, finalize the payment.")}
                                            className="bg-[#1A1A1A] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg active:scale-95 transition-transform"
                                        >
                                            Pay Now
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Close Button */}
                            <button
                                onClick={() => setVisualContext(null)}
                                className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md border border-gray-100 hover:scale-110 transition-transform"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D43425" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Transcript Area (Vellum Ledger) */}
            <div className="relative z-10 w-full max-w-md mt-4 mb-28">
                {/* Vellum Texture Container */}
                <div className="bg-[#FAF7F2] rounded-xl p-6 min-h-[140px] border border-[#D43425]/10 shadow-[inner_0_2px_4px_rgba(0,0,0,0.05)] relative overflow-hidden">
                    {/* Paper Texture Overlay */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/parchment.png')]" />

                    {/* Top Ledger Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-[#D43425]/20 to-transparent" />

                    <div className="space-y-4 relative z-10">
                        <AnimatePresence mode="wait">
                            {messages.length === 0 ? (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center text-[10px] sm:text-[11px] font-medium text-ink/40 italic leading-relaxed uppercase tracking-wider pt-4"
                                >
                                    "Good afternoon sir. I am listening... Tell me what your heart desires or ask for my humble recommendations."
                                </motion.p>
                            ) : (
                                <div className="space-y-4">
                                    {messages.slice(-2).map((m: any) => (
                                        <motion.div
                                            key={m.id}
                                            initial={{ opacity: 0, x: m.role === 'user' ? 10 : -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={`text-sm ${m.role === 'user' ? 'text-ink/60 text-right font-medium' : 'text-[#3D2329] font-playfair italic font-bold'}`}
                                        >
                                            <div className="leading-relaxed">
                                                {m.role === 'user' ? `“${m.content}”` : m.content.replace(/\[UI:.*?\]/g, '')}
                                            </div>
                                            {m.role !== 'user' && <div className="w-8 h-px bg-[#D43425]/20 mt-2" />}
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </AnimatePresence>

                        {isLoading && aiState === 'thinking' && (
                            <div className="flex justify-start gap-1 items-center pt-2">
                                <span className="text-[8px] font-bold text-[#D43425]/40 uppercase tracking-widest mr-2">Consulting Ledger</span>
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 rounded-full bg-[#D43425]" />
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 rounded-full bg-[#D43425]" />
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 rounded-full bg-[#D43425]" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Floating Query Pills (Final Wind-up UX) */}
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {[
                        "What do you recommend?",
                        "Check my order",
                        "I'm ready for the bill"
                    ].map((pill, idx) => (
                        <motion.button
                            key={idx}
                            whileHover={{ scale: 1.05, backgroundColor: "#D43425", color: "white" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSendMessage(pill)}
                            className="px-4 py-2 rounded-full border border-[#D43425]/20 text-[9px] font-black uppercase tracking-widest text-[#D43425] transition-colors"
                        >
                            {pill}
                        </motion.button>
                    ))}
                </div>
            </div>

            <MobileNav />
        </main>
    );
}
