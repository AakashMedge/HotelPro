'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare,
    ChefHat,
    Star,
    AlertTriangle,
    Shield,
    ChevronDown,
    RefreshCw,
    Menu as MenuIcon,
    Bell,
    Send,
    User,
    Clock,
    CheckCircle,
    CheckCircle2,
    Activity,
    X,
    ChevronLeft,
    ChevronRight,
    Search,
    Filter,
    ArrowUpRight,
    PlusCircle,
    Lock,
    Inbox,
    Mail
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface ChatChannel {
    id: string;
    name: string;
    type: string;
    createdAt: string;
}

interface ChatMessage {
    id: string;
    channelId: string;
    senderId: string;
    content: string;
    severity: string;
    orderId?: string;
    complaintId?: string;
    feedbackId?: string;
    attachmentUrl?: string;
    attachmentType?: string;
    createdAt: string;
    sender: { id: string; name: string; role: string };
    acks: { userId: string }[];
}

interface Complaint {
    id: string;
    orderId: string;
    tableCode: string;
    type: string;
    description?: string;
    status: string;
    guestName?: string;
    resolvedNote?: string;
    createdAt: string;
    updatedAt: string;
    order?: { id: string; status: string; grandTotal: number; customerName?: string };
}

interface Feedback {
    id: string;
    orderId: string;
    rating: number;
    comment?: string;
    guestName?: string;
    tableCode?: string;
    staffReply?: string;
    repliedAt?: string;
    createdAt: string;
    order?: { id: string; grandTotal: number; customerName?: string };
}

interface SharedHubProps {
    role: 'ADMIN' | 'MANAGER' | 'WAITER' | 'KITCHEN' | 'CASHIER';
    clientId?: string;
    plan?: string;
}

// ============================================
// Helpers & Constants
// ============================================

const STATUS_COLORS: Record<string, string> = {
    SUBMITTED: 'bg-orange-100 text-orange-700 border-orange-200',
    ACKNOWLEDGED: 'bg-blue-100 text-blue-700 border-blue-200',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    RESOLVED: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    DISMISSED: 'bg-zinc-50 text-zinc-400 border-zinc-100',
    VERIFIED: 'bg-zinc-100 text-zinc-600 border-zinc-200', // New Style for Verified
};

const ROLE_COLORS: Record<string, string> = {
    ADMIN: 'bg-red-50 text-red-700 border-red-100',
    MANAGER: 'bg-purple-50 text-purple-700 border-purple-100',
    WAITER: 'bg-blue-50 text-blue-700 border-blue-100',
    KITCHEN: 'bg-orange-50 text-orange-700 border-orange-100',
    CASHIER: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const SEVERITY_STYLES: Record<string, string> = {
    INFO: 'bg-white border-zinc-100',
    WARN: 'bg-amber-50 border-amber-100',
    URGENT: 'bg-red-50 border-red-100 ring-1 ring-red-200',
    STOCK_OUT: 'bg-orange-50 border-orange-100',
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
}

// ============================================
// Main Component
// ============================================

export default function SharedHub({ role, clientId, plan }: SharedHubProps) {
    const [activeTab, setActiveTab] = useState<'chat' | 'complaints' | 'feedback' | 'concierge'>('chat');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [channels, setChannels] = useState<ChatChannel[]>([]);
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [mounted, setMounted] = useState(false);

    // HQ Concierge States
    const [hqMessages, setHqMessages] = useState<any[]>([]);
    const [hqLoading, setHqLoading] = useState(false);
    const [hqFetching, setHqFetching] = useState(true);
    const [hqMessageInput, setHqMessageInput] = useState('');
    const conciergeScrollRef = useRef<HTMLDivElement>(null);

    // Complaints & Feedback States
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [feedbackStats, setFeedbackStats] = useState({ averageRating: 0, totalFeedbacks: 0 });
    const [complaintsLoading, setComplaintsLoading] = useState(false);
    const [activeComplaintFilter, setActiveComplaintFilter] = useState<string>('ALL');
    const [resolvingId, setResolvingId] = useState<string | null>(null);
    const [resolveNote, setResolveNote] = useState('');

    const [replyingToFbId, setReplyingToFbId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [hasNewFeedback, setHasNewFeedback] = useState(false);
    const [user, setUser] = useState<{ name: string; role: string } | null>(null);
    const [isReportingTicket, setIsReportingTicket] = useState(false);
    const [ticketData, setTicketData] = useState({ type: 'QUALITY_ISSUE', description: '', tableCode: '' });

    const chatEndRef = useRef<HTMLDivElement>(null);
    const isManagerOrAdmin = ['ADMIN', 'MANAGER'].includes(role);

    // ============================================
    // Core Data Sync
    // ============================================

    const fetchChannels = useCallback(async () => {
        try {
            const res = await fetch('/api/chat/channels');
            const data = await res.json();
            if (data.success) {
                setChannels(data.channels);
                if (data.channels.length > 0 && !activeChannelId) {
                    setActiveChannelId(data.channels[0].id);
                }
            }
        } catch (err) {
            process.env.NODE_ENV === 'development' && console.error('Channels fetch fail');
        } finally {
            setLoading(false);
        }
    }, [activeChannelId]);

    const fetchMessages = useCallback(async () => {
        if (!activeChannelId) return;
        try {
            const res = await fetch(`/api/chat/messages?channelId=${activeChannelId}`);
            const data = await res.json();
            if (data.success) setMessages(data.messages);
        } catch (err) {
            process.env.NODE_ENV === 'development' && console.error('Messages fetch fail');
        }
    }, [activeChannelId]);

    const fetchComplaints = useCallback(async () => {
        setComplaintsLoading(true);
        try {
            const res = await fetch('/api/admin/complaints');
            const data = await res.json();
            if (data.success) setComplaints(data.complaints);
        } catch (err) {
            process.env.NODE_ENV === 'development' && console.error('Complaints fetch fail');
        } finally {
            setComplaintsLoading(false);
        }
    }, []);

    const fetchFeedback = useCallback(async () => {
        try {
            const res = await fetch('/api/customer/feedback');
            const data = await res.json();
            if (data.success) {
                setFeedbacks(data.feedbacks);
                setFeedbackStats(data.stats);
            }
        } catch (err) {
            process.env.NODE_ENV === 'development' && console.error('Feedback fetch fail');
        }
    }, []);

    const fetchHqMessages = useCallback(async () => {
        if (!clientId) return;
        try {
            const res = await fetch(`/api/hq/concierge/conversations/${clientId}`);
            const data = await res.json();
            if (data.success && data.data) {
                setHqMessages(data.data.messages || []);
            }
        } catch (err) {
            console.error('HQ fetch fail');
        } finally {
            setHqFetching(false);
        }
    }, [clientId]);

    const syncAll = useCallback(() => {
        fetchChannels();
        fetchMessages();
        fetchComplaints();
        fetchFeedback();
        fetchHqMessages();
    }, [fetchChannels, fetchMessages, fetchComplaints, fetchFeedback, fetchHqMessages]);

    useEffect(() => {
        setMounted(true);
        syncAll();
        fetch('/api/auth/me').then(r => r.json()).then(d => {
            if (d.success) setUser(d.user);
        });
    }, [syncAll]);

    // Role-based redirect support
    useEffect(() => {
        if (activeTab === 'concierge' && !['ADMIN', 'MANAGER'].includes(role)) {
            setActiveTab('chat');
        }
    }, [activeTab, role]);

    // SSE & Polling
    useEffect(() => {
        const es = new EventSource('/api/events');
        es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (['COMPLAINT_RAISED', 'COMPLAINT_UPDATED', 'FEEDBACK_SUBMITTED', 'CHAT_MESSAGE_RECEIVED'].includes(data.event)) {
                    syncAll();
                    if (data.event === 'COMPLAINT_RAISED' || data.event === 'FEEDBACK_SUBMITTED') {
                        setHasNewFeedback(true);
                    }
                }
            } catch { /* ignore */ }
        };
        const interval = setInterval(syncAll, 10000);
        return () => { es.close(); clearInterval(interval); };
    }, [syncAll]);

    // Auto-scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ============================================
    const handleRaiseTicket = async () => {
        if (!ticketData.description) return;

        try {
            const res = await fetch('/api/admin/complaints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: ticketData.type,
                    description: ticketData.description,
                    tableCode: ticketData.tableCode || 'INTERNAL',
                    status: 'SUBMITTED'
                })
            });

            if (res.ok) {
                setIsReportingTicket(false);
                setTicketData({ type: 'DAMAGE', description: '', tableCode: '' });
                syncAll(); // Refresh the ledger immediately
            }
        } catch (err) {
            console.error("Ticket submission failed", err);
        }
    };
    // ============================================

    // ============================================
    // Action Handlers
    // ============================================

    const sendMessage = async () => {
        if (!messageInput.trim() || !activeChannelId || sending) return;
        const content = messageInput.trim();
        setMessageInput('');
        setSending(true);
        try {
            await fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channelId: activeChannelId, content })
            });
            fetchMessages();
        } finally {
            setSending(false);
        }
    };

    const handleAcknowledge = async (messageId: string) => {
        try {
            await fetch('/api/chat/ack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId })
            });
            fetchMessages();
            fetchComplaints();
        } catch (err) {
            console.error('Ack fail:', err);
        }
    };

    const handleResolveFromChat = async (messageId: string) => {
        const note = prompt("Please provide a resolution note for the guest:");
        if (note === null) return;

        try {
            const res = await fetch('/api/chat/resolve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId, resolvedNote: note })
            });
            if (res.ok) {
                syncAll();
            }
        } catch (err) {
            console.error('Resolve fail:', err);
        }
    };

    const handleComplaintAction = async (complaintId: string, status: string) => {
        let note = '';
        if (status === 'RESOLVED') {
            const prompted = prompt("Enter resolution details for this ticket:");
            if (prompted === null) return; // Cancelled
            note = prompted;
        }

        try {
            const res = await fetch('/api/admin/complaints', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ complaintId, status, resolvedNote: note || undefined })
            });
            if (res.ok) {
                setResolvingId(null);
                setResolveNote('');
                fetchComplaints();
                fetchMessages();
            }
        } catch (err) {
            console.error('Action fail:', err);
        }
    };

    const handleFeedbackReply = async (feedbackId: string) => {
        if (!replyText.trim() || sending) return;
        setSending(true);
        try {
            const res = await fetch('/api/customer/feedback', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feedbackId, staffReply: replyText.trim() })
            });
            if (res.ok) {
                setReplyingToFbId(null);
                setReplyText('');
                fetchFeedback();
            }
        } catch (err) {
            console.error('Reply fail:', err);
        } finally {
            setSending(false);
        }
    };

    const handleSendHqMessage = async (content: string) => {
        if (!content.trim() || hqLoading || !clientId) return;
        setHqLoading(true);
        try {
            const metadataSnapshot = {
                plan,
                timestamp: new Date().toISOString(),
                userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'Server'
            };

            const res = await fetch('/api/hq/concierge/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId,
                    content: content.trim(),
                    senderRole: 'HOTEL_ADMIN',
                    metadataSnapshot
                })
            });
            const data = await res.json();
            if (data.success) {
                setHqMessages(prev => [...prev, data.data]);
            } else {
                alert(data.error || "Failed to send message to HQ");
            }
        } catch (err) {
            console.error("Failed to send HQ message");
        } finally {
            setHqLoading(false);
        }
    };

    // ============================================
    // Computed Values
    // ============================================

    const activeChannel = useMemo(() => channels.find(c => c.id === activeChannelId), [channels, activeChannelId]);
    const unresolvedCount = useMemo(() => complaints.filter((c: Complaint) => !['RESOLVED', 'DISMISSED', 'VERIFIED'].includes(c.status)).length, [complaints]);
    const filteredComplaints = useMemo(() => {
        if (activeComplaintFilter === 'ALL') {
            if (role === 'ADMIN') return complaints.filter((c: Complaint) => !['VERIFIED', 'DISMISSED'].includes(c.status));
            return complaints.filter((c: Complaint) => !['RESOLVED', 'VERIFIED', 'DISMISSED'].includes(c.status));
        }
        return complaints.filter((c: Complaint) => c.status === activeComplaintFilter);
    }, [complaints, activeComplaintFilter, role]);

    const guestIncidents = useMemo(() => filteredComplaints.filter((c: Complaint) => !c.tableCode.startsWith('INTERNAL')), [filteredComplaints]);
    const operationalTickets = useMemo(() => filteredComplaints.filter((c: Complaint) => c.tableCode.startsWith('INTERNAL')), [filteredComplaints]);

    if (!mounted) return null;

    // ============================================
    // UI Components
    // ============================================

    const ChannelIcon = ({ type }: { type: string }) => {
        switch (type) {
            case 'GENERAL': return <MessageSquare size={16} />;
            case 'SERVICE': return <ChefHat size={16} />;
            case 'CUSTOMER_FEEDBACK': return <Star size={16} />;
            case 'ADMIN_ONLY': return <Lock size={16} />;
            default: return <Inbox size={16} />;
        }
    };

    return (
        <div className="h-full w-full bg-[#F9F9F9] flex flex-col md:flex-row overflow-hidden font-sans select-none relative">

            {/* ─── MOBILE SIDEBAR DRAWER ─── */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* ─── SIDEBAR / NAVIGATION ─── */}
            <aside className={`
                fixed inset-y-0 left-0 bg-[#F8FAFC] border-r border-zinc-200 z-50 transition-all duration-300 md:relative md:translate-x-0 h-full
                ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
                ${isCollapsed ? 'w-20' : 'w-72'}
            `}>
                <div className="h-full flex flex-col">
                    {/* Header - More subtle sub-header */}
                    <div className="p-6 pb-2">
                        <div className="flex items-center justify-between">
                            {!isCollapsed ? (
                                <div className="flex items-center gap-2 text-zinc-400">
                                    <Activity size={14} className="animate-pulse text-indigo-500" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Operational Hub</span>
                                </div>
                            ) : (
                                <div className="mx-auto">
                                    <Activity size={18} className="animate-pulse text-indigo-500" />
                                </div>
                            )}

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsCollapsed(!isCollapsed)}
                                    className="hidden md:flex p-1.5 hover:bg-zinc-200/50 rounded-lg text-zinc-400 transition-colors"
                                    title={isCollapsed ? "Expand Hub" : "Collapse Hub"}
                                >
                                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                                </button>
                                <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 text-zinc-400">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Operational Tabs */}
                    <div className={`flex-1 overflow-y-auto space-y-10 no-scrollbar ${isCollapsed ? 'p-3' : 'p-5'}`}>

                        {/* 1. Main Sections */}
                        <div className="space-y-1.5">
                            {!isCollapsed && (
                                <div className="px-3 flex items-center justify-between mb-4">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Command Console</p>
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                </div>
                            )}
                            <button
                                onClick={() => { setActiveTab('chat'); setSidebarOpen(false); }}
                                className={`w-full flex items-center gap-3 rounded-2xl transition-all group ${isCollapsed ? 'p-3 justify-center' : 'px-4 py-3.5'} ${activeTab === 'chat' ? 'bg-white shadow-sm ring-1 ring-zinc-200 text-indigo-600' : 'text-zinc-500 hover:bg-zinc-100/50'}`}
                                title={isCollapsed ? "Staff Protocol" : ""}
                            >
                                <MessageSquare size={18} className={activeTab === 'chat' ? 'text-indigo-600' : 'text-zinc-400 group-hover:text-zinc-600'} />
                                {!isCollapsed && <span className="text-[13px] font-bold">Staff Protocol</span>}
                            </button>
                            <button
                                onClick={() => { setActiveTab('complaints'); setSidebarOpen(false); }}
                                className={`w-full flex items-center rounded-2xl transition-all group ${isCollapsed ? 'p-3 justify-center' : 'px-4 py-3.5 justify-between'} ${activeTab === 'complaints' ? 'bg-white shadow-sm ring-1 ring-zinc-200 text-red-600' : 'text-zinc-500 hover:bg-red-50/50'}`}
                                title={isCollapsed ? "Active Incidents" : ""}
                            >
                                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                                    <AlertTriangle size={18} className={activeTab === 'complaints' ? 'text-red-600' : 'text-zinc-400 group-hover:text-red-400'} />
                                    {!isCollapsed && <span className="text-[13px] font-bold">Active Incidents</span>}
                                </div>
                                {!isCollapsed && unresolvedCount > 0 && <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-lg shadow-red-100">{unresolvedCount}</span>}
                                {isCollapsed && unresolvedCount > 0 && <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />}
                            </button>
                            <button
                                onClick={() => { setActiveTab('feedback'); setSidebarOpen(false); }}
                                className={`w-full flex items-center rounded-2xl transition-all group ${isCollapsed ? 'p-3 justify-center' : 'px-4 py-3.5 justify-between'} ${activeTab === 'feedback' ? 'bg-white shadow-sm ring-1 ring-zinc-200 text-amber-600' : 'text-zinc-500 hover:bg-amber-50/50'}`}
                                title={isCollapsed ? "Guest Intelligence" : ""}
                            >
                                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                                    <Star size={18} className={activeTab === 'feedback' ? 'text-amber-600' : 'text-zinc-400 group-hover:text-amber-400'} />
                                    {!isCollapsed && <span className="text-[13px] font-bold">Guest Intelligence</span>}
                                </div>
                                {hasNewFeedback && <div className={`bg-amber-500 rounded-full animate-pulse ${isCollapsed ? 'absolute top-2 right-2 w-2 h-2' : 'w-2 h-2 mr-1'}`} />}
                            </button>

                            {/* 1.1 Private HQ Portal - ADMIN & MANAGER ONLY */}
                            {['ADMIN', 'MANAGER'].includes(role) && (
                                <div className="pt-2">
                                    <button
                                        onClick={() => { setActiveTab('concierge'); setSidebarOpen(false); }}
                                        className={`w-full flex items-center rounded-2xl transition-all group relative overflow-hidden ${isCollapsed ? 'p-3 justify-center' : 'px-4 py-4 gap-3'} ${activeTab === 'concierge' ? 'bg-zinc-900 text-white shadow-xl shadow-zinc-200' : 'bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100/50'}`}
                                        title={isCollapsed ? "HQ Concierge" : ""}
                                    >
                                        <Shield size={18} className={activeTab === 'concierge' ? 'text-indigo-300' : 'text-indigo-600'} />
                                        {!isCollapsed && <span className="text-[13px] font-black uppercase tracking-widest text-nowrap">HQ Concierge</span>}
                                        {!isCollapsed && activeTab !== 'concierge' && <ChevronDown size={14} className="ml-auto opacity-30 -rotate-90" />}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 2. Chat Channels */}
                        <div className="space-y-1.5">
                            {!isCollapsed && (
                                <div className="px-3 mb-4">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Service Channels</p>
                                </div>
                            )}
                            <div className="space-y-1">
                                {channels.map(ch => (
                                    <button
                                        key={ch.id}
                                        onClick={() => {
                                            setActiveChannelId(ch.id);
                                            setActiveTab('chat');
                                            setSidebarOpen(false);
                                            if (ch.type === 'CUSTOMER_FEEDBACK') setHasNewFeedback(false);
                                        }}
                                        className={`w-full rounded-xl text-left transition-all flex items-center group ${isCollapsed ? 'p-3 justify-center' : 'px-4 py-2.5 gap-3'} ${activeChannelId === ch.id && activeTab === 'chat'
                                            ? 'bg-zinc-900 text-white shadow-lg'
                                            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                                            }`}
                                        title={isCollapsed ? ch.name.replace(/-/g, ' ') : ""}
                                    >
                                        <div className={`transition-colors ${activeChannelId === ch.id && activeTab === 'chat' ? 'text-indigo-400' : 'text-zinc-400 group-hover:text-zinc-600'}`}>
                                            <ChannelIcon type={ch.type} />
                                        </div>
                                        {!isCollapsed && <span className="text-[12px] font-bold capitalize truncate">{ch.name.replace(/-/g, ' ')}</span>}
                                        {!isCollapsed && activeChannelId === ch.id && activeTab === 'chat' && <div className="w-1 h-1 bg-white rounded-full ml-auto animate-pulse" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer / Role */}
                    <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 space-y-4">
                        {/* New Ticket Trigger for Staff/Managers */}
                        {!isCollapsed && (
                            <button
                                onClick={() => setIsReportingTicket(true)}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-dashed border-zinc-300 text-zinc-500 hover:border-indigo-400 hover:text-indigo-600 transition-all text-[10px] font-black uppercase tracking-widest"
                            >
                                <PlusCircle size={14} /> Raise Ticket
                            </button>
                        )}
                        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border shrink-0 ${ROLE_COLORS[role]}`}>
                                {user?.name?.[0] || role[0]}
                            </div>
                            {!isCollapsed && (
                                <div>
                                    <p className="text-[11px] font-bold text-zinc-900 leading-none capitalize truncate max-w-[120px]">{user?.name || role.toLowerCase()}</p>
                                    <p className="text-[9px] font-bold text-zinc-400 mt-1 uppercase tracking-tighter">Verified Access</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {/* ─── MAIN CONTENT AREA ─── */}
            <main className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">

                {/* 1. Universal Header */}
                <header className="h-20 shrink-0 border-b border-zinc-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur-xl sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 -ml-2 text-zinc-600 hover:bg-zinc-50 rounded-xl">
                            <MenuIcon size={24} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base font-black text-zinc-900 tracking-tight uppercase">
                                    {activeTab === 'chat' ? (activeChannel?.name || 'Loading...') : activeTab === 'complaints' ? 'Complaints Board' : 'Intelligence Stream'}
                                </h1>
                                {loading && <RefreshCw size={12} className="animate-spin text-zinc-300" />}
                            </div>
                            <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">
                                {activeTab === 'chat' ? 'Live Operational Stream' : 'Resolution Desk'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={syncAll} className="p-2.5 rounded-xl hover:bg-zinc-100 text-zinc-400 transition-colors">
                            <RefreshCw size={18} />
                        </button>
                        <div className="h-6 w-px bg-zinc-100 mx-1 hidden sm:block" />
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Secure Live</span>
                        </div>
                        <button className="p-2.5 rounded-xl hover:bg-zinc-100 text-zinc-400 relative">
                            <Bell size={18} />
                            {unresolvedCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />}
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-hidden">
                    <AnimatePresence mode="wait">

                        {/* ═══════════════ CHAT VIEW ═══════════════ */}
                        {activeTab === 'chat' && (
                            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 no-scrollbar pb-32">

                                    {messages.length === 0 && !loading && (
                                        <div className="h-full flex flex-col items-center justify-center opacity-30 px-8 text-center max-w-sm mx-auto">
                                            <div className="p-6 bg-zinc-50 rounded-[40px] mb-4">
                                                <MessageSquare size={48} className="text-zinc-400" />
                                            </div>
                                            <p className="text-sm font-bold text-zinc-900 italic">"The room is silent..."</p>
                                            <p className="text-[11px] font-medium text-zinc-400 mt-2 tracking-tight">Sync with your team here. All messages are ephemeral and secure.</p>
                                        </div>
                                    )}

                                    {messages.map((msg, idx) => {
                                        const isStaff = ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN'].includes(msg.sender.role);
                                        const isUrgent = msg.severity === 'URGENT';
                                        const isAcknowledgeByMe = msg.acks?.some(a => a.userId === 'current-user-placeholder'); // Need real user ID

                                        return (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`group relative flex flex-col max-w-[95%] md:max-w-[85%] ${msg.sender.role === role ? 'ml-auto items-end' : 'items-start'}`}
                                            >
                                                <div className={`flex items-center gap-2 mb-1.5 px-1 ${msg.sender.role === role ? 'flex-row-reverse' : ''}`}>
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${ROLE_COLORS[msg.sender.role]}`}>
                                                        {msg.sender.role}
                                                    </span>
                                                    <span className="text-[11px] font-bold text-zinc-800">{msg.sender.name}</span>
                                                    <span className="text-[9px] text-zinc-400 font-medium opacity-60">{timeAgo(msg.createdAt)}</span>
                                                </div>

                                                {msg.complaintId ? (() => {
                                                    const ticket = complaints.find(c => c.id === msg.complaintId);
                                                    const isResolved = ticket?.status === 'RESOLVED' || msg.content.includes('(RESOLVED');
                                                    const isVerified = ticket?.status === 'VERIFIED';

                                                    return (
                                                        <div className={`
                                                            w-full relative overflow-hidden rounded-[32px] p-0.5 transition-all shadow-2xl
                                                            ${isVerified ? 'bg-zinc-100 shadow-zinc-200/50' :
                                                                isResolved ? 'bg-emerald-500 shadow-emerald-200/50' :
                                                                    'bg-indigo-600 shadow-indigo-200/50'}
                                                        `}>
                                                            <div className={`bg-white rounded-[30px] p-6 lg:p-8 ${isVerified ? 'opacity-80' : ''}`}>
                                                                {/* Header */}
                                                                <div className="flex items-center justify-between mb-6">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isVerified ? 'bg-zinc-100 text-zinc-400' : isResolved ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                                                            {isVerified ? <CheckCircle2 size={20} /> : isResolved ? <CheckCircle size={20} /> : <AlertTriangle size={20} className="animate-pulse" />}
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Operational Ticket</h4>
                                                                            <p className={`text-[9px] font-bold uppercase tracking-widest ${isVerified ? 'text-zinc-600' : isResolved ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                                                                {isVerified ? 'Protocol Verified' : isResolved ? 'Awaiting Verification' : 'Action Required'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${isVerified ? 'bg-zinc-50 border-zinc-200 text-zinc-400' : isResolved ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600 animate-pulse'}`}>
                                                                        {ticket?.status || (isResolved ? 'RESOLVED' : 'ACTIVE')}
                                                                    </div>
                                                                </div>

                                                                {/* Content */}
                                                                <div className="space-y-4">
                                                                    <div>
                                                                        <p className="text-sm lg:text-base font-black text-zinc-900 leading-tight mb-2">
                                                                            {msg.content.split('(RESOLVED')[0].replace('[OPERATIONAL TICKET]', '').trim()}
                                                                        </p>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[10px] font-bold text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded-md border border-zinc-100">
                                                                                {ticket?.type?.replace(/_/g, ' ') || 'Internal Incident'}
                                                                            </span>
                                                                            <span className="text-[10px] font-black text-indigo-500">#{msg.id.slice(0, 6)}</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Resolution Details */}
                                                                    {(ticket?.resolvedNote || msg.content.includes('(RESOLVED')) && (
                                                                        <div className={`p-4 rounded-2xl border ${isVerified ? 'bg-zinc-50 border-zinc-100' : 'bg-emerald-50/50 border-emerald-100/50'}`}>
                                                                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1 flex items-center gap-2">
                                                                                <Activity size={12} /> Resolution Protocol
                                                                            </p>
                                                                            <p className="text-[12px] font-bold text-zinc-700 italic">
                                                                                {ticket?.resolvedNote || msg.content.match(/\(RESOLVED: (.*?)\)/)?.[1] || "Issue resolved by staff."}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Actions */}
                                                                <div className="mt-8 pt-6 border-t border-zinc-100 flex items-center justify-between gap-4">
                                                                    <div className="flex items-center gap-2">
                                                                        {!msg.acks?.length && !isResolved && !isVerified && (
                                                                            <button
                                                                                onClick={() => handleAcknowledge(msg.id)}
                                                                                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-zinc-200"
                                                                            >
                                                                                <Clock size={14} /> Acknowledge
                                                                            </button>
                                                                        )}
                                                                        {isManagerOrAdmin && !isResolved && !isVerified && (
                                                                            <button
                                                                                onClick={() => handleResolveFromChat(msg.id)}
                                                                                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-100"
                                                                            >
                                                                                <CheckCircle size={14} /> Resolve
                                                                            </button>
                                                                        )}
                                                                        {role === 'ADMIN' && isResolved && !isVerified && (
                                                                            <button
                                                                                onClick={() => handleComplaintAction(msg.complaintId!, 'VERIFIED')}
                                                                                className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-zinc-900 text-white text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-zinc-300"
                                                                            >
                                                                                <Shield size={16} /> Verify & Archive Ticket
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[9px] font-black text-zinc-300 uppercase tracking-[0.2em]">
                                                                        {isVerified ? 'System Archived' : isResolved ? 'Pending Check' : 'Live Incident'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })() : (
                                                    <div className={`
                                                        relative px-5 py-3.5 rounded-3xl text-sm leading-relaxed border shadow-sm transition-all
                                                        ${isUrgent ? 'bg-red-50 border-red-100 text-red-900 ring-2 ring-red-100 ring-offset-2' :
                                                            msg.sender.role === role ? 'bg-indigo-600 border-indigo-700 text-white shadow-indigo-100 rounded-tr-none' : 'bg-white border-zinc-100 text-zinc-700 rounded-tl-none'}
                                                    `}>
                                                        <p className="font-semibold">{msg.content}</p>
                                                    </div>
                                                )}

                                                {/* Audio Attachments */}
                                                {msg.attachmentUrl && msg.attachmentType === 'AUDIO' && (
                                                    <div className="mt-3 w-full max-w-sm">
                                                        <audio controls className="w-full h-10 rounded-xl" src={msg.attachmentUrl} />
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                    <div ref={chatEndRef} className="h-4" />
                                </div>

                                {/* INPUT AREA */}
                                <div className="p-4 md:p-8 bg-white border-t border-zinc-100 z-20">
                                    <div className="max-w-4xl mx-auto relative group">
                                        <div className="relative bg-zinc-50 border border-zinc-200 rounded-[32px] px-6 py-4 flex items-center gap-4 transition-all focus-within:bg-white focus-within:shadow-xl focus-within:shadow-indigo-100/50 focus-within:border-indigo-200">
                                            <input
                                                value={messageInput}
                                                onChange={(e) => setMessageInput(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                                placeholder={`Type in #${activeChannel?.name || 'chat'}...`}
                                                className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-zinc-800 placeholder:text-zinc-400"
                                            />
                                            <button
                                                onClick={sendMessage}
                                                disabled={!messageInput.trim() || sending}
                                                className="w-10 h-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center hover:bg-indigo-600 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
                                            >
                                                <Send size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ═══════════════ COMPLAINTS VIEW ═══════════════ */}
                        {activeTab === 'complaints' && (
                            <motion.div key="complaints" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full flex flex-col p-4 md:p-8">
                                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Active Resolution Board</h2>
                                        <p className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-widest">Address critical guest concerns instantly</p>
                                    </div>
                                    <div className="flex bg-zinc-100 p-1 rounded-2xl overflow-x-auto no-scrollbar">
                                        {(role === 'ADMIN'
                                            ? ['ALL', 'SUBMITTED', 'ACKNOWLEDGED', 'RESOLVED', 'VERIFIED']
                                            : ['ALL', 'SUBMITTED', 'ACKNOWLEDGED', 'RESOLVED']
                                        ).map(f => (
                                            <button
                                                key={f}
                                                onClick={() => setActiveComplaintFilter(f)}
                                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeComplaintFilter === f ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                                            >
                                                {f === 'VERIFIED' ? 'ARCHIVE' : f.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-12 no-scrollbar pb-20">
                                    {filteredComplaints.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center py-20 opacity-30">
                                            <div className="p-8 bg-zinc-50 rounded-[50%] mb-6">
                                                <CheckCircle2 size={64} className="text-zinc-400" />
                                            </div>
                                            <p className="text-lg font-black text-zinc-900">Protocol Ledger Clear</p>
                                            <p className="text-xs font-medium text-zinc-400 mt-2 uppercase tracking-widest leading-loose">The floor is running perfectly.</p>
                                        </div>
                                    )}

                                    {/* SECTION 1: GUEST INCIDENTS */}
                                    {guestIncidents.length > 0 && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 px-2">
                                                <div className="w-1.5 h-6 bg-red-500 rounded-full" />
                                                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Guest Priority Alerts</h3>
                                                <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md">{guestIncidents.length}</span>
                                            </div>

                                            <div className="grid grid-cols-1 gap-3">
                                                {guestIncidents.map(complaint => (
                                                    <div key={complaint.id} className={`p-6 bg-white border rounded-[32px] shadow-sm flex items-center justify-between group hover:border-red-200 transition-all ${complaint.status === 'RESOLVED' ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                                                        <div className="flex items-center gap-6">
                                                            <div className={`p-4 rounded-2xl ${STATUS_COLORS[complaint.status]} bg-opacity-10 border-none`}>
                                                                <AlertTriangle size={20} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Table {complaint.tableCode}</span>
                                                                    <span className="text-zinc-300">•</span>
                                                                    <span className="text-[10px] font-bold text-zinc-400">{timeAgo(complaint.createdAt)}</span>
                                                                </div>
                                                                <h4 className="text-sm font-black text-zinc-900 leading-tight mb-1">{complaint.description}</h4>
                                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{complaint.type.replace(/_/g, ' ')}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            {/* ROLE LOGIC FOR GUEST ALERTS */}
                                                            {['SUBMITTED', 'ACKNOWLEDGED'].includes(complaint.status) && isManagerOrAdmin && (
                                                                <button
                                                                    onClick={() => handleComplaintAction(complaint.id, 'RESOLVED')}
                                                                    className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
                                                                >
                                                                    Resolve
                                                                </button>
                                                            )}
                                                            {complaint.status === 'RESOLVED' && role === 'ADMIN' && (
                                                                <button
                                                                    onClick={() => handleComplaintAction(complaint.id, 'VERIFIED')}
                                                                    className="px-6 py-2.5 rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl"
                                                                >
                                                                    Verify & Close
                                                                </button>
                                                            )}
                                                            <div className={`px-4 py-2 rounded-xl border text-[9px] font-black tracking-widest uppercase ${STATUS_COLORS[complaint.status]}`}>
                                                                {complaint.status}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* SECTION 2: OPERATIONAL TICKETS (INTERNAL) */}
                                    {operationalTickets.length > 0 && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 px-2">
                                                <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                                                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Protocol Tickets</h3>
                                                <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md">{operationalTickets.length}</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {operationalTickets.map(complaint => (
                                                    <div key={complaint.id} className={`group relative bg-white border border-zinc-100 rounded-[40px] p-8 transition-all hover:shadow-2xl hover:shadow-indigo-100/50 hover:border-indigo-100 ${complaint.status === 'VERIFIED' ? 'opacity-60 grayscale' : ''}`}>
                                                        <div className="flex flex-col h-full">
                                                            <div className="flex items-center justify-between mb-8">
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`p-3 rounded-2xl ${complaint.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                                                        <Shield size={20} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-0.5">Internal Terminal</p>
                                                                        <p className="text-[11px] font-black text-zinc-900 uppercase tracking-widest italic">{timeAgo(complaint.createdAt)} ago</p>
                                                                    </div>
                                                                </div>
                                                                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${STATUS_COLORS[complaint.status]}`}>
                                                                    {complaint.status}
                                                                </div>
                                                            </div>

                                                            <div className="flex-1 space-y-6">
                                                                <div>
                                                                    <p className="text-sm font-black text-zinc-900 leading-snug mb-3">{complaint.description}</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="px-3 py-1 bg-zinc-50 border border-zinc-100 rounded-xl text-[9px] font-black text-zinc-400 uppercase tracking-tighter">
                                                                            {complaint.type.replace(/_/g, ' ')}
                                                                        </span>
                                                                        <span className="text-[9px] font-black text-indigo-500 tracking-widest">#INC-{complaint.id.slice(0, 4)}</span>
                                                                    </div>
                                                                </div>

                                                                {complaint.resolvedNote && (
                                                                    <div className="p-5 rounded-[24px] bg-emerald-50/50 border border-emerald-100/50">
                                                                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                                            <Activity size={12} /> Resolution Protocol
                                                                        </p>
                                                                        <p className="text-[12px] font-bold text-zinc-700 italic leading-relaxed">
                                                                            {complaint.resolvedNote}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="mt-8 pt-6 border-t border-zinc-100 flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200">
                                                                        <User size={12} className="text-zinc-400" />
                                                                    </div>
                                                                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none">Reported by Staff</span>
                                                                </div>

                                                                <div className="flex gap-2">
                                                                    {['SUBMITTED', 'ACKNOWLEDGED'].includes(complaint.status) && isManagerOrAdmin && (
                                                                        <button
                                                                            onClick={() => handleComplaintAction(complaint.id, 'RESOLVED')}
                                                                            className="px-6 py-2.5 rounded-2xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-zinc-200"
                                                                        >
                                                                            Execute Resolve
                                                                        </button>
                                                                    )}
                                                                    {complaint.status === 'RESOLVED' && role === 'ADMIN' && (
                                                                        <button
                                                                            onClick={() => handleComplaintAction(complaint.id, 'VERIFIED')}
                                                                            className="px-6 py-2.5 rounded-2xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-emerald-100"
                                                                        >
                                                                            Finalize
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* ═══════════════ FEEDBACK VIEW ═══════════════ */}
                        {activeTab === 'feedback' && (
                            <motion.div key="feedback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col p-4 md:p-8 overflow-y-auto no-scrollbar pb-32">
                                <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
                                    <div>
                                        <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Guest Sentiment Insight</h2>
                                        <p className="text-xs font-bold text-zinc-400 mt-2 uppercase tracking-widest">Real-time satisfaction metrics</p>
                                    </div>
                                    <div className="flex gap-8">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Average Hub Rating</p>
                                            <div className="flex items-center gap-2 justify-end">
                                                <span className="text-4xl font-black text-zinc-900 tracking-tighter">{feedbackStats.averageRating}</span>
                                                <Star className="text-amber-400 fill-amber-400" size={24} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {feedbacks.map(fb => (
                                        <motion.div
                                            key={fb.id}
                                            className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-xl shadow-zinc-200/30 flex flex-col"
                                        >
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4, 5].map(s => (
                                                        <Star key={s} size={14} className={s <= fb.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-100'} />
                                                    ))}
                                                </div>
                                                <span className="text-[10px] font-bold text-zinc-400">{timeAgo(fb.createdAt)}</span>
                                            </div>

                                            <p className="flex-1 text-sm font-medium text-zinc-700 leading-relaxed italic mb-8">
                                                {fb.comment ? `"${fb.comment}"` : "Rated without specific comment."}
                                            </p>

                                            <div className="pt-6 border-t border-zinc-50 flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-black text-zinc-900 uppercase tracking-tight">{fb.guestName || 'Anonymous'}</p>
                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Table {fb.tableCode}</p>
                                                </div>
                                                {isManagerOrAdmin && (
                                                    <button
                                                        onClick={() => setReplyingToFbId(fb.id)}
                                                        className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors"
                                                    >
                                                        {fb.staffReply ? 'View Reply' : 'Send Protocol Reply'}
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* ═══════════════ HQ CONCIERGE VIEW ═══════════════ */}
                        {activeTab === 'concierge' && role === 'ADMIN' && (
                            <motion.div
                                key="concierge"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="h-full flex flex-col bg-[#F9F9F9]"
                            >
                                <div className="p-8 border-b border-zinc-100 bg-white flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-zinc-200 italic font-black">
                                            HQ
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-black text-zinc-900 tracking-tight uppercase">Platform Concierge</h2>
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 mt-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                Direct Architecture Line
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${plan === 'ELITE' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                                            {plan === 'ELITE' ? 'Elite Priority' : plan === 'GROWTH' ? 'Growth Standard' : 'Starter Support'}
                                        </span>
                                    </div>
                                </div>

                                {plan === 'STARTER' ? (
                                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                        <div className="w-20 h-20 bg-white rounded-[40px] shadow-sm border border-zinc-100 flex items-center justify-center mb-8">
                                            <Mail className="text-zinc-300" size={32} />
                                        </div>
                                        <h3 className="text-xl font-black text-zinc-900 mb-4 tracking-tight">Support via Protocol</h3>
                                        <p className="text-sm font-medium text-zinc-500 max-w-sm leading-relaxed mb-8">
                                            Direct HQ chat is reserved for Growth and Elite partners.
                                            Contact our architecture team via email for custom requirements.
                                        </p>
                                        <a
                                            href="mailto:architecture@hotelpro.com"
                                            className="bg-zinc-900 text-white px-10 py-4 rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-zinc-200 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            Email HQ Support
                                        </a>
                                    </div>
                                ) : (
                                    <>
                                        {/* Messages Area */}
                                        <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar" ref={conciergeScrollRef}>
                                            {hqFetching ? (
                                                <div className="h-full flex items-center justify-center text-zinc-300 font-bold uppercase tracking-widest text-[10px] animate-pulse">
                                                    Establishing Secure Mesh...
                                                </div>
                                            ) : hqMessages.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 px-12">
                                                    <Shield size={48} className="text-zinc-400 mb-6" />
                                                    <p className="text-xs font-bold text-zinc-900 uppercase tracking-widest">HQ Private Channel</p>
                                                    <p className="text-[11px] font-medium text-zinc-400 mt-2 max-w-[240px]">This is an encrypted line between your hotel and HotelPro HQ. Use this for specific requests or issues.</p>
                                                </div>
                                            ) : (
                                                hqMessages.map((msg) => {
                                                    const isHQ = msg.senderRole === 'SUPER_ADMIN';
                                                    return (
                                                        <div key={msg.id} className={`flex flex-col ${isHQ ? 'items-start' : 'items-end'}`}>
                                                            <div className={`
                                                                max-w-[80%] p-5 rounded-[32px] text-sm font-medium shadow-sm border
                                                                ${isHQ ? 'bg-white border-zinc-100 text-zinc-800 rounded-bl-none' : 'bg-indigo-600 border-indigo-700 text-white rounded-br-none shadow-indigo-100'}
                                                            `}>
                                                                {msg.messageContent}
                                                            </div>
                                                            <div className="mt-2 px-1 flex items-center gap-2">
                                                                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">
                                                                    {isHQ ? 'HOTELPRO HQ' : 'MY BOARD'} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>

                                        {/* Input area */}
                                        <div className="p-8 bg-white border-t border-zinc-100">
                                            <div className="max-w-4xl mx-auto flex items-center gap-4">
                                                <div className="flex-1 relative">
                                                    <input
                                                        value={hqMessageInput}
                                                        onChange={(e) => setHqMessageInput(e.target.value)}
                                                        onKeyPress={(e) => e.key === 'Enter' && (handleSendHqMessage(hqMessageInput), setHqMessageInput(''))}
                                                        placeholder="Message HQ Architecture Team..."
                                                        className="w-full bg-zinc-50 border border-zinc-100 rounded-[28px] py-4 px-6 text-sm font-medium outline-none focus:border-indigo-500 transition-all font-sans"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => { handleSendHqMessage(hqMessageInput); setHqMessageInput(''); }}
                                                    disabled={!hqMessageInput.trim() || hqLoading}
                                                    className="w-14 h-14 bg-zinc-900 text-white rounded-[28px] flex items-center justify-center shadow-xl shadow-zinc-200 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all"
                                                >
                                                    <Send size={20} />
                                                </button>
                                            </div>
                                            <div className="mt-6 flex items-center justify-center gap-8 opacity-40">
                                                <div className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                                                    <Shield size={10} />
                                                    Peer-to-Peer Secure
                                                </div>
                                                <div className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                                                    <Clock size={10} />
                                                    {plan === 'ELITE' ? 'SLA: 15min' : 'SLA: 4h'}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Modal Components (Reply) */}
            <AnimatePresence>
                {replyingToFbId && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-100 flex items-center justify-center p-6">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-lg rounded-[40px] p-8 shadow-2xl">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black text-zinc-900 tracking-tight">Staff Protocol Reply</h3>
                                <button onClick={() => setReplyingToFbId(null)} className="p-2 text-zinc-400"><X size={20} /></button>
                            </div>
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Your thoughtful response to the guest..."
                                className="w-full h-40 bg-zinc-50 rounded-3xl p-6 mb-6 text-sm font-medium border border-zinc-200 outline-none focus:border-indigo-500 transition-all resize-none"
                            />
                            <button
                                onClick={() => handleFeedbackReply(replyingToFbId)}
                                className="w-full bg-zinc-900 text-white py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-zinc-200 active:scale-95 transition-all"
                            >
                                Dispatch Reply to Guest
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* RAISE TICKET MODAL */}
            {/* Assuming Dialog and DialogContent are imported from a UI library like shadcn/ui */}
            {/* import { Dialog, DialogContent } from "@/components/ui/dialog"; // Example import */}
            <AnimatePresence>
                {isReportingTicket && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-100 flex items-center justify-center p-6">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-lg rounded-[40px] p-8 shadow-2xl">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-3 bg-red-50 rounded-2xl text-red-600">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-zinc-900 tracking-tight">Report Incident</h3>
                                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Operational Safety Protocol</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-2">Issue Category</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { label: 'Quality', value: 'QUALITY_ISSUE' },
                                            { label: 'Delay', value: 'DELAY' },
                                            { label: 'Wrong Item', value: 'WRONG_ITEM' },
                                            { label: 'Missing', value: 'MISSING_ITEM' }
                                        ].map(item => (
                                            <button
                                                key={item.value}
                                                onClick={() => setTicketData({ ...ticketData, type: item.value })}
                                                className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${ticketData.type === item.value ? 'bg-zinc-900 text-white border-zinc-900 shadow-lg' : 'bg-zinc-50 text-zinc-500 border-zinc-100 hover:border-zinc-200'}`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-2">Location / Table (Opt.)</label>
                                    <input
                                        type="text"
                                        value={ticketData.tableCode}
                                        onChange={(e) => setTicketData({ ...ticketData, tableCode: e.target.value })}
                                        className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        placeholder="e.g. Table 04, Kitchen B"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-2">Protocol Details</label>
                                    <textarea
                                        value={ticketData.description}
                                        onChange={(e) => setTicketData({ ...ticketData, description: e.target.value })}
                                        className="w-full h-32 bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                                        placeholder="Describe the issue in detail..."
                                    />
                                </div>
                            </div>

                            <div className="mt-10 flex gap-3">
                                <button
                                    onClick={handleRaiseTicket}
                                    className="flex-1 bg-zinc-900 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-zinc-200 active:scale-95 transition-all"
                                >
                                    Submit Operational Ticket
                                </button>
                                <button
                                    onClick={() => setIsReportingTicket(false)}
                                    className="px-8 bg-zinc-100 text-zinc-600 rounded-2xl text-xs font-black uppercase active:scale-95 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div >
    );
}
