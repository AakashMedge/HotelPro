
'use client';

import React, { useState, useEffect } from 'react';
import {
    MessageSquare, Search, Filter, Clock,
    AlertCircle, CheckCircle2, MoreHorizontal,
    ArrowRight, Star, Shield, Zap
} from 'lucide-react';
import Link from 'next/link';

export default function HQConciergeHub() {
    const [conversations, setConversations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState({ status: 'OPEN', priority: '', plan: '' });

    useEffect(() => {
        const fetchConversations = async () => {
            setIsLoading(true);
            try {
                const params = new URLSearchParams(filter as any);
                const res = await fetch(`/api/hq/concierge/conversations?${params.toString()}`);
                const data = await res.json();
                if (data.success) setConversations(data.data);
            } catch (err) {
                console.error("Failed to fetch conversations");
            } finally {
                setIsLoading(false);
            }
        };
        fetchConversations();
        const interval = setInterval(fetchConversations, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [filter]);

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'HIGH': return 'text-red-600 bg-red-50 border-red-100';
            case 'NORMAL': return 'text-amber-600 bg-amber-50 border-amber-100';
            case 'LOW': return 'text-slate-500 bg-slate-50 border-slate-100';
            default: return 'text-slate-400';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <MessageSquare className="w-8 h-8 text-indigo-600" />
                        Concierge Hub
                    </h1>
                    <p className="text-slate-500 font-medium">Direct architecture & support lines for all tenants.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white border border-slate-100 rounded-xl px-4 py-2 flex items-center gap-3 shadow-sm">
                        <div className="text-center border-r border-slate-100 pr-4">
                            <p className="text-xs font-black text-slate-900">{conversations.filter(c => c.status === 'OPEN').length}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Active</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-black text-indigo-600">{conversations.reduce((acc, c) => acc + (c._count.messages || 0), 0)}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Unread</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-4 items-center shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by hotel name or message content..."
                        className="w-full bg-slate-50 border-none rounded-xl py-2.5 pl-11 pr-4 text-sm outline-none focus:ring-2 ring-indigo-500/10 transition-all font-medium"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={filter.status}
                        onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 outline-none hover:bg-slate-50 transition-all"
                    >
                        <option value="OPEN">Status: Open</option>
                        <option value="CLOSED">Status: Closed</option>
                        <option value="ESCALATED">Status: Escalated</option>
                    </select>
                    <select
                        value={filter.plan}
                        onChange={(e) => setFilter({ ...filter, plan: e.target.value })}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 outline-none hover:bg-slate-50 transition-all"
                    >
                        <option value="">All Plans</option>
                        <option value="STARTER">Starter</option>
                        <option value="GROWTH">Growth</option>
                        <option value="ELITE">Elite</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {isLoading ? (
                    <div className="py-20 text-center text-slate-400 animate-pulse font-medium">Scanning mesh for communications...</div>
                ) : conversations.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 border-dashed py-20 text-center text-slate-400">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="font-bold">No active conversations found.</p>
                        <p className="text-xs">Channels are clear. Everything is running smooth.</p>
                    </div>
                ) : conversations.map((conv) => (
                    <Link
                        key={conv.id}
                        href={`/hq/clients/${conv.clientId}?chat=true`}
                        className="group bg-white p-5 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all flex items-center justify-between"
                    >
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border font-black text-lg ${conv.client.plan === 'ELITE' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
                                        conv.client.plan === 'GROWTH' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                            'bg-slate-50 border-slate-100 text-slate-400'
                                    }`}>
                                    {conv.client.name.charAt(0)}
                                </div>
                                {conv._count.messages > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full ring-4 ring-white">
                                        {conv._count.messages}
                                    </span>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight text-sm">
                                        {conv.client.name}
                                    </h3>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${getPriorityColor(conv.priority)}`}>
                                        {conv.priority}
                                    </span>
                                    {conv.client.plan === 'ELITE' && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span>•</span>
                                    <span>{conv.planTierSnapshot} Plan</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {conv.slaDeadlineAt && (
                                <div className={`text-right hidden md:block ${new Date(conv.slaDeadlineAt) < new Date() ? 'animate-bounce' : ''}`}>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${new Date(conv.slaDeadlineAt) < new Date() ? 'text-red-500' : 'text-slate-400'}`}>SLA Goal</p>
                                    <p className="text-xs font-bold text-slate-900">
                                        {new Date(conv.slaDeadlineAt) < new Date() ? 'Overdue' : 'Due ' + new Date(conv.slaDeadlineAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            )}
                            <div className="p-3 rounded-xl bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <ArrowRight className="w-5 h-5" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
