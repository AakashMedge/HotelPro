
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    MessageSquare, Send, X, Clock,
    CheckCheck, Shield, Zap, AlertCircle
} from 'lucide-react';

interface Props {
    clientId: string;
    hotelName: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function HQConciergeChatPane({ clientId, hotelName, isOpen, onClose }: Props) {
    const [messages, setMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const fetchMessages = async () => {
            try {
                const res = await fetch(`/api/hq/concierge/conversations/${clientId}`);
                const data = await res.json();
                if (data.success && data.data) {
                    setMessages(data.data.messages || []);
                }
            } catch (err) {
                console.error("Chat fetch error:", err);
            }
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, [clientId, isOpen]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const content = inputValue.trim();
        setInputValue('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/hq/concierge/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId,
                    content,
                    senderRole: 'SUPER_ADMIN'
                })
            });
            const data = await res.json();
            if (data.success) {
                setMessages(prev => [...prev, data.data]);
            }
        } catch (err) {
            console.error("Failed to send message");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-white shadow-2xl z-[100] border-l border-slate-100 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 italic font-black">
                        HQ
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Platform Concierge</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Direct line to {hotelName}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-[#FBFBFB]"
            >
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10">
                        <MessageSquare className="w-12 h-12 text-slate-100 mb-4" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose">
                            Initialize communication channel<br />with {hotelName} admin.
                        </p>
                    </div>
                ) : messages.map((msg, i) => {
                    const isSystem = msg.senderRole === 'SUPER_ADMIN';
                    return (
                        <div key={msg.id} className={`flex flex-col ${isSystem ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm text-sm font-medium ${isSystem
                                ? 'bg-indigo-600 text-white rounded-br-none'
                                : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none'
                                }`}>
                                {msg.messageContent}
                            </div>
                            <div className="mt-1.5 flex items-center gap-2 px-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isSystem && (
                                    <CheckCheck className={`w-3 h-3 ${msg.isRead ? 'text-indigo-400' : 'text-slate-200'}`} />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-slate-100 bg-white">
                <form
                    onSubmit={handleSendMessage}
                    className="relative flex items-center"
                >
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type a command or message..."
                        className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-6 pr-16 text-sm font-medium outline-none focus:ring-2 ring-indigo-500/10 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="absolute right-2 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
                <div className="mt-4 flex items-center gap-6 justify-center text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
                    <span className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> Secure Line</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Edge Latency Check</span>
                </div>
            </div>
        </div>
    );
}
