
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    ShieldCheck, Search, Filter, Activity, AlertTriangle,
    ChevronLeft, ChevronRight, Clock, User, Download, Eye, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type AuditLog = {
    id: string;
    action: string;
    actor: string;
    details: string;
    timestamp: string;
    severity: 'INFO' | 'WARN' | 'DANGER' | 'ACCESS';
};

export default function AdminLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<any>(null);

    const fetchLogs = useCallback(async () => {
        try {
            const query = new URLSearchParams({
                page: page.toString(),
                search,
                limit: '15'
            });
            const res = await fetch(`/api/admin/logs?${query}`);
            const data = await res.json();
            if (data.success) {
                setLogs(data.logs);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs();
        }, search ? 500 : 0);
        return () => clearTimeout(timer);
    }, [fetchLogs, search]);

    const formatTimestamp = (ts: string) => {
        const date = new Date(ts);
        const now = new Date();
        const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));

        if (diffInDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInDays === 1) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto h-full overflow-y-auto no-scrollbar pb-32 font-sans tracking-tight">

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Audit Vault</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Immutable system integrity & hotel activity logs</p>
                </div>
                <div className="flex gap-3">
                    <button className="bg-white border border-slate-200 text-slate-500 px-5 py-2.5 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                        <Download className="w-4 h-4" />
                        Export Data
                    </button>
                    <button className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-slate-200">
                        <FileText className="w-4 h-4" />
                        Generate Report
                    </button>
                </div>
            </div>

            {/* Live Filter Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                        type="text"
                        placeholder="Filter by event name, staff, or details..."
                        className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pl-14 pr-4 text-xs font-bold uppercase tracking-tight placeholder:text-slate-300 focus:ring-2 focus:ring-slate-100 transition-all outline-none"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
                <button className="px-6 py-3.5 bg-slate-50 border-none rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 hover:bg-slate-100 transition-colors">
                    <Filter className="w-4 h-4" />
                    Latest First
                </button>
            </div>

            {/* Log Stream */}
            <div className="space-y-4">
                {loading ? (
                    Array(5).fill(0).map((_, i) => (
                        <div key={i} className="h-24 bg-white rounded-3xl border border-slate-100 animate-pulse" />
                    ))
                ) : (
                    <>
                        <AnimatePresence mode="popLayout">
                            {logs.map((log) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={log.id}
                                >
                                    <LogEntry log={log} formatTimestamp={formatTimestamp} />
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {logs.length === 0 && (
                            <div className="py-24 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                                <Activity className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">No matching logs found</h3>
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2">All systems are operational and quiet</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-4 py-8">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all shadow-sm"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Page {page} of {pagination.pages}</span>
                    <button
                        disabled={page === pagination.pages}
                        onClick={() => setPage(p => p + 1)}
                        className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all shadow-sm"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}

            {/* Security Protocol Footer */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <ShieldCheck size={160} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start justify-between">
                    <div className="space-y-4 max-w-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400">Security Protocol Alpha</p>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic">Data Integrity Guaranteed</h2>
                        <p className="text-xs font-medium text-slate-400 leading-relaxed uppercase tracking-wide">
                            These logs are cryptographically hashed and linked to your hotel's unique subscription ID.
                            Entries are immutable and strictly for audit trails and security monitoring.
                            Retention period: 2 Years.
                        </p>
                    </div>
                    <div className="flex gap-6">
                        <div className="text-center">
                            <p className="text-[8px] font-bold text-slate-500 uppercase mb-2 tracking-widest">System Status</p>
                            <span className="text-sm font-black text-emerald-400">ENCRYPTED</span>
                        </div>
                        <div className="text-center">
                            <p className="text-[8px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Network</p>
                            <span className="text-sm font-black text-blue-400">SECURE</span>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}

function LogEntry({ log, formatTimestamp }: { log: AuditLog, formatTimestamp: (ts: string) => string }) {
    const config = {
        INFO: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100', icon: Activity },
        WARN: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', icon: AlertTriangle },
        DANGER: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', icon: AlertTriangle },
        ACCESS: { bg: 'bg-indigo-50/50', text: 'text-indigo-600', border: 'border-indigo-100', icon: ShieldCheck },
    }[log.severity] || { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100', icon: Activity };

    const Icon = config.icon;

    return (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-10 flex flex-col md:flex-row items-stretch md:items-center gap-6 group hover:shadow-xl hover:shadow-slate-200/40 transition-all border-l-4" style={{ borderColor: `var(--color-${log.severity.toLowerCase()})` }}>

            {/* Action Meta */}
            <div className="md:w-56 shrink-0 space-y-2">
                <div className={`w-fit px-3 py-1.5 rounded-xl ${config.bg} ${config.text} flex items-center gap-2`}>
                    <Icon size={12} />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">{log.action.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest pl-1">
                    <Clock size={12} />
                    {formatTimestamp(log.timestamp)}
                </div>
            </div>

            {/* Details Content */}
            <div className="flex-1">
                <p className="text-sm font-bold text-slate-800 leading-snug">
                    {log.details}
                </p>
            </div>

            {/* Actor Profile */}
            <div className="md:w-64 flex items-center justify-between md:pl-10 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-10 bg-slate-100 hidden md:block" />
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-[1.25rem] ${config.bg} flex items-center justify-center transition-transform group-hover:scale-110 duration-500`}>
                        <User className={`w-5 h-5 ${config.text}`} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Actor</p>
                        <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{log.actor}</p>
                    </div>
                </div>
                <button className="p-3 bg-slate-50 rounded-2xl text-slate-300 group-hover:text-slate-900 group-hover:bg-white border border-transparent group-hover:border-slate-100 transition-all shadow-sm">
                    <Eye className="w-4 h-4" />
                </button>
            </div>

        </div>
    );
}
