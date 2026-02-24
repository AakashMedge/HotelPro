
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    MessageSquare, Send, Clock,
    Shield, Zap, AlertCircle,
    Lock, Mail, Star
} from 'lucide-react';

interface Props {
    clientId: string;
    hotelName: string;
    plan: string;
}

export default function AdminHubClient({ clientId, hotelName, plan }: Props) {
    const [messages, setMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    const isStarter = plan === 'STARTER';

    useEffect(() => {
        if (isStarter) {
            setIsFetching(false);
            return;
        }

        const fetchMessages = async () => {
            try {
                const res = await fetch(`/api/hq/concierge/conversations/${clientId}`);
                const data = await res.json();
                if (data.success && data.data) {
                    setMessages(data.data.messages || []);
                }
            } catch (err) {
                console.error("Chat fetch error:", err);
            } finally {
                setIsFetching(false);
            }
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, [clientId, isStarter]);

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
            // Include metadata for smarter support
            const metadataSnapshot = {
                plan,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            };

            const res = await fetch('/api/hq/concierge/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId,
                    content,
                    senderRole: 'HOTEL_ADMIN',
                    metadataSnapshot
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

    if (isStarter) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-6">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-12 text-center space-y-6">
                        <div className="w-20 h-20 bg-slate-50 rounded-4xl flex items-center justify-center mx-auto mb-6 border border-slate-100 italic font-black text-slate-300 text-2xl">
                            HQ
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Platform Concierge</h1>
                        <p className="text-slate-500 font-medium max-w-md mx-auto">
                            Direct HQ communication is reserved for Growth and Elite partners.
                            As a Starter plan member, you can reach our architecture team via email.
                        </p>
                        <div className="pt-8">
                            <a
                                href="mailto:architecture@hotelpro.com"
                                className="inline-flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                            >
                                <Mail className="w-4 h-4" />
                                Email Architecture Team
                            </a>
                        </div>
                        <div className="pt-12 border-t border-slate-50 flex items-center justify-center gap-8">
                            <div className="text-center">
                                <p className="text-xs font-black text-slate-900">Growth Plan</p>
                                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">Unlock Standard Chat</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-black text-slate-900">Elite Plan</p>
                                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1">Unlock Priority Line</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 italic font-black">
                        HQ
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">HQ Concierge</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Direct Command Line Active
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${plan === 'ELITE' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                        }`}>
                        {plan === 'ELITE' ? 'Priority Access' : 'Standard Access'}
                    </span>
                    {plan === 'ELITE' && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#FBFBFB]"
            >
                {isFetching ? (
                    <div className="h-full flex items-center justify-center text-slate-300 font-bold uppercase tracking-widest text-xs animate-pulse">
                        Synchronizing Mesh...
                    </div>
                ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10">
                        <MessageSquare className="w-12 h-12 text-slate-100 mb-4" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose max-w-xs">
                            Welcome to the Platform Concierge.<br />
                            Send a message to our architect team for custom requests and priority support.
                        </p>
                    </div>
                ) : messages.map((msg) => {
                    const isSystem = msg.senderRole === 'SUPER_ADMIN';
                    return (
                        <div key={msg.id} className={`flex flex-col ${isSystem ? 'items-start' : 'items-end'}`}>
                            <div className={`max-w-[75%] p-4 rounded-2xl shadow-sm text-sm font-medium ${!isSystem
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none'
                                }`}>
                                {msg.messageContent}
                            </div>
                            <div className="mt-1.5 flex items-center gap-2 px-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">
                                    {isSystem ? 'HotelPro HQ' : 'Me'} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <div className="p-8 border-t border-slate-100 bg-white">
                <form
                    onSubmit={handleSendMessage}
                    className="relative flex items-center gap-4"
                >
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Describe your requirement or issue..."
                        className="flex-1 bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-medium outline-none focus:ring-2 ring-indigo-500/10 transition-all font-sans"
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl shadow-slate-200 hover:bg-black active:scale-95 transition-all disabled:opacity-50"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
                <div className="mt-6 flex items-center gap-8 justify-center text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
                    <span className="flex items-center gap-2">
                        <Shield className="w-3 h-3" />
                        Encrypted Tunnel
                    </span>
                    <span className="flex items-center gap-2">
                        <Zap className="w-3 h-3" />
                        {plan === 'ELITE' ? 'SLA: 10 MINS' : 'SLA: 2 HOURS'}
                    </span>
                </div>
            </div>
        </div>
    );
}
