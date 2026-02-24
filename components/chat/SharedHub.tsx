'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Send, Hash, Users, Bell, Shield, Coffee, ChevronRight,
    MessageSquare, AlertTriangle, CheckCheck, Clock, Search,
    MoreVertical, Info, Zap, Trash2, ArrowRight, User, Loader2,
    Mic, Image as ImageIcon, X
} from 'lucide-react';

type Channel = {
    id: string;
    name: string;
    type: 'GENERAL' | 'SERVICE' | 'ADMIN_ONLY';
};

type Message = {
    id: string;
    sender: { name: string, role: string };
    content: string;
    createdAt: string;
    severity: 'INFO' | 'WARN' | 'URGENT' | 'STOCK_OUT';
    orderId?: string;
    attachmentUrl?: string;
    attachmentType?: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE';
    acks?: { userId: string }[];
};

export default function SharedHub({ role }: { role: string }) {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Media State
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch Channels
    useEffect(() => {
        fetch('/api/chat/channels')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setChannels(data.channels);
                    setActiveChannel(data.channels[0]);
                }
                setLoading(false);
            });
    }, []);

    // Fetch Messages & Poll
    useEffect(() => {
        if (!activeChannel) return;

        const fetchMessages = () => {
            fetch(`/api/chat/messages?channelId=${activeChannel.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setMessages(data.messages);
                    }
                });
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [activeChannel]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // -------------------------------------------------------------------------
    // SENDING LOGIC
    // -------------------------------------------------------------------------

    const sendMessage = async (content: string, attachmentUrl?: string, attachmentType?: string) => {
        if (!activeChannel || sending) return;
        setSending(true);
        try {
            const res = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelId: activeChannel.id,
                    content,
                    severity: 'INFO',
                    attachmentUrl,
                    attachmentType
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setMessages(prev => [...prev, data.message]);
                setNewMessage('');
            } else {
                alert(data.error || 'Failed to send payload');
            }
        } catch (err) {
            console.error(err);
            alert('Communication link disrupted');
        } finally {
            setSending(false);
        }
    };

    const handleSendText = () => {
        if (!newMessage.trim()) return;
        sendMessage(newMessage);
    };

    // -------------------------------------------------------------------------
    // MEDIA LOGIC
    // -------------------------------------------------------------------------

    const handleFileUpload = async (file: File, type: 'IMAGE' | 'AUDIO') => {
        setSending(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadRes.json();

            if (uploadData.success) {
                await sendMessage('', uploadData.url, type);
            } else {
                alert('Media upload failed');
            }
        } catch (e) {
            console.error(e);
            alert('Upload error');
        } finally {
            setSending(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], 'voice_note.webm', { type: 'audio/webm' });
                handleFileUpload(audioFile, 'AUDIO');

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Mic access denied:', err);
            alert('Could not access microphone.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0], 'IMAGE');
        }
    };

    const handleAck = async (messageId: string) => {
        try {
            await fetch('/api/chat/ack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId })
            });
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return (
        <div className="h-full flex flex-col items-center justify-center bg-white min-h-[400px]">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Synchronizing Pulse...</p>
        </div>
    );

    return (
        <div className="h-full flex flex-col md:flex-row bg-[#F8FAFC] overflow-hidden">

            {/* 1. CHANNEL SIDEBAR - Simplified for non-admin */}
            <aside className="w-full md:w-64 bg-white md:border-r border-b md:border-b-0 border-slate-200 flex md:flex-col flex-row h-auto md:h-full shadow-sm relative z-30 shrink-0">
                <div className="hidden md:block p-6">
                    <h2 className={`text-xl font-bold ${role === 'ADMIN' ? 'text-indigo-600' : 'text-slate-800'}`}>Pulse_Hub</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Operational Sync</p>
                </div>

                <div className="flex-1 md:overflow-y-auto overflow-x-auto p-2 md:p-4 no-scrollbar">
                    <div className="flex md:flex-col gap-2 md:gap-1">
                        {channels.map((ch) => {
                            // Hide admin only channels from staff
                            if (ch.type === 'ADMIN_ONLY' && !['ADMIN', 'MANAGER'].includes(role)) return null;

                            return (
                                <button
                                    key={ch.id}
                                    onClick={() => setActiveChannel(ch)}
                                    className={`md:w-full shrink-0 flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-full md:rounded-xl transition-all border md:border-none ${activeChannel?.id === ch.id
                                        ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                        : 'text-slate-500 hover:bg-slate-50 border-slate-100'
                                        }`}
                                >
                                    <Hash className="w-3 h-3 md:w-4 md:h-4 opacity-50" />
                                    <span className="text-xs font-bold tracking-tight whitespace-nowrap">{ch.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </aside>

            {/* 2. CHAT AREA */}
            <main className="flex-1 flex flex-col h-full bg-slate-50/10 relative overflow-hidden">

                {/* Chat Header */}
                <header className="h-14 md:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Hash className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase">#{activeChannel?.name}</h3>
                    </div>
                </header>

                {/* Message Stream */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 no-scrollbar"
                >
                    {messages.map((msg) => {
                        const date = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const isStockOut = msg.severity === 'STOCK_OUT';

                        return (
                            <div key={msg.id} className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{msg.sender.role}</span>
                                    <span className="text-xs font-bold text-slate-900">{msg.sender.name}</span>
                                    <span className="text-[9px] font-bold text-slate-300">{date}</span>
                                </div>
                                <div className={`p-4 md:p-5 rounded-3xl border shadow-sm transition-all max-w-2xl ${isStockOut ? 'border-rose-300 bg-rose-50' : 'border-slate-100 bg-white'
                                    }`}>

                                    {/* Content (Text / Image / Audio) */}
                                    {msg.attachmentType === 'IMAGE' ? (
                                        <img src={msg.attachmentUrl} alt="Attachment" className="rounded-lg max-h-60 mb-2 border border-slate-200" />
                                    ) : msg.attachmentType === 'AUDIO' ? (
                                        <audio controls src={msg.attachmentUrl} className="mb-2 w-full max-w-[240px]" />
                                    ) : (
                                        <p className={`text-xs font-semibold leading-relaxed ${isStockOut ? 'text-rose-700' : 'text-slate-600'}`}>
                                            {msg.content}
                                        </p>
                                    )}

                                    {/* Footer Actions */}
                                    <div className="flex items-center gap-3 mt-4">
                                        {msg.orderId && (
                                            <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-500">
                                                <span>#ORDER_{msg.orderId.replace('#', '')}</span>
                                            </div>
                                        )}
                                        {msg.severity !== 'INFO' && (
                                            <button
                                                onClick={() => handleAck(msg.id)}
                                                className="px-4 py-1.5 bg-[#111111] text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:scale-105 transition-all w-fit"
                                            >
                                                ACK
                                            </button>
                                        )}
                                    </div>

                                    {msg.acks && msg.acks.length > 0 && (
                                        <div className="mt-4 flex items-center gap-1.5 opacity-40">
                                            <CheckCheck className="w-3 h-3 text-emerald-500" />
                                            <span className="text-[9px] font-bold uppercase tracking-widest">{msg.acks.length} Seen</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Message Input */}
                <footer className="p-3 md:p-6 bg-white border-t border-slate-100 shrink-0">
                    <div className="max-w-2xl mx-auto flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 shadow-sm relative">

                        {/* Hidden File Input */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={onFileSelected}
                        />

                        {/* Text Input */}
                        <input
                            type="text"
                            disabled={sending || isRecording}
                            placeholder={isRecording ? 'Listening...' : (activeChannel ? `Pulse to #${activeChannel.name}...` : 'Select channel...')}
                            className="flex-1 bg-transparent border-none py-3 px-4 text-xs font-bold text-slate-800 focus:ring-0 placeholder:text-slate-400"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                        />

                        {/* Image Button */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={sending || isRecording}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                        >
                            <ImageIcon className="w-5 h-5" />
                        </button>

                        {/* Mic Button (Hold / Toggle) */}
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={sending}
                            className={`p-2 rounded-lg transition-all ${isRecording
                                ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-200'
                                : 'text-slate-400 hover:text-rose-500 hover:bg-white'
                                }`}
                        >
                            {isRecording ? <X className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>

                        {/* Send Button */}
                        <button
                            onClick={handleSendText}
                            disabled={sending || !newMessage.trim() || !activeChannel || isRecording}
                            className={`p-2.5 rounded-xl transition-all ${newMessage.trim()
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:scale-105'
                                : 'bg-slate-200 text-slate-400'
                                }`}
                        >
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                </footer>
            </main>

        </div>
    );
}
