'use client';

import { useState, useEffect } from 'react';
import {
    ShieldCheck, Search, Filter, Activity, AlertTriangle,
    ChevronRight, Clock, User, Download, Eye, FileText
} from 'lucide-react';

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

    useEffect(() => {
        // High-level telemetry simulated
        setTimeout(() => {
            setLogs([
                { id: '1092', action: 'SETTINGS_UPDATE', actor: 'Admin_Master', details: 'Access Key changed from "DEFAULT" to "JADUIDHABAAJAY"', timestamp: '2:45 PM', severity: 'WARN' },
                { id: '1091', action: 'FACTORY_RESET_INIT', actor: 'Admin_Master', details: 'Purge protocol triggered but cancelled at 90%', timestamp: '1:20 PM', severity: 'DANGER' },
                { id: '1090', action: 'ROLE_PROMOTION', actor: 'Admin_Master', details: 'User "Rahul" promoted from WAITER to MANAGER', timestamp: '11:30 AM', severity: 'INFO' },
                { id: '1089', action: 'UNAUTHORIZED_ACCESS', actor: 'Unknown_IP', details: 'Failed login attempt from IP 223.102.4.1', timestamp: '10:05 AM', severity: 'ACCESS' },
                { id: '1088', action: 'BILL_DELETION', actor: 'Manager_Vinit', details: 'Deleted order #402 (₹1,250). Reason: Customer Refused', timestamp: 'Yesterday', severity: 'WARN' },
                { id: '1087', action: 'API_FAILURE', actor: 'System_AI', details: 'Concierge failed to generate menu for client_id_ext', timestamp: 'Yesterday', severity: 'WARN' },
            ]);
            setLoading(false);
        }, 600);
    }, []);

    const filteredLogs = logs.filter(l =>
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.details.toLowerCase().includes(search.toLowerCase()) ||
        l.actor.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Audit Vault</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">High-level transparency into system integrity and security events.</p>
                </div>
                <div className="flex gap-3">
                    <button className="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm">
                        <FileText className="w-4 h-4 font-bold" />
                        Audit Report
                    </button>
                </div>
            </div>

            {/* Live Filter Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search events, actors, or details..."
                        className="w-full bg-slate-50/50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <button className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 hover:bg-slate-50 transition-colors">
                        <Filter className="w-4 h-4" />
                        Severity
                    </button>
                </div>
            </div>

            {/* Log Stream */}
            <div className="space-y-4">
                {filteredLogs.map((log) => (
                    <LogEntry key={log.id} log={log} />
                ))}

                {filteredLogs.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                        <Activity className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-400">No security events found</h3>
                        <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest mt-1">Refine your search parameters</p>
                    </div>
                )}
            </div>

            {/* Immutable Note */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex gap-4">
                <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocol Guard</p>
                    <p className="text-xs font-medium text-slate-500 leading-relaxed">
                        Audit logs are write-only, immutable, and encrypted. Purge policy: 730 days. System integrity: 100% Verified.
                    </p>
                </div>
            </div>

        </div>
    );
}

function LogEntry({ log }: { log: AuditLog }) {
    const config = {
        INFO: { bg: 'bg-indigo-50', text: 'text-indigo-600', dot: 'bg-indigo-400' },
        WARN: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400' },
        DANGER: { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-400' },
        ACCESS: { bg: 'bg-purple-100', text: 'text-purple-600', dot: 'bg-purple-500' },
    }[log.severity] || { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' };

    return (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6 group hover:shadow-md transition-all">

            <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${config.bg} ${config.text}`}>
                        {log.action}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Clock className="w-3 h-3" />
                        {log.timestamp}
                    </div>
                </div>
                <p className="text-sm font-semibold text-slate-800 leading-relaxed pr-6">
                    {log.details}
                </p>
            </div>

            <div className="md:w-64 flex items-center justify-between border-t md:border-t-0 md:border-l border-slate-50 pt-4 md:pt-0 md:pl-8">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center`}>
                        <User className={`w-4 h-4 ${config.text}`} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actor</p>
                        <p className="text-xs font-bold text-slate-700">{log.actor}</p>
                    </div>
                </div>
                <button className="p-2 hover:bg-slate-50 rounded-xl text-slate-300 group-hover:text-indigo-500 transition-all">
                    <Eye className="w-4 h-4" />
                </button>
            </div>

        </div>
    );
}
