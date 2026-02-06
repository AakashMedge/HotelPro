import React from 'react';
import {
    ShieldAlert,
    Activity,
    History,
    Search,
    Filter,
    ArrowUpRight,
    ShieldCheck,
    Lock,
    Eye
} from 'lucide-react';
import { getGlobalAuditLogs, getSecurityEvents } from '@/lib/services/admin';

export default async function SecurityLogsPage() {
    const [allLogs, securityAlerts] = await Promise.all([
        getGlobalAuditLogs(20),
        getSecurityEvents()
    ]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* HEADER */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Platform Security Bureau</h1>
                <p className="text-slate-500 text-sm mt-1">Real-time surveillance across all hotel nodes and platform actions.</p>
            </div>

            {/* SECURITY KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border-l-4 border-l-emerald-500 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">ACTIVE</span>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Active Watchdog</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">No Breaches</h3>
                    <p className="text-[10px] text-slate-400 mt-2 italic">Last 24 hours: 142 blocked attempts</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border-l-4 border-l-amber-500 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                            <Lock className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">MEDIUM</span>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Login Failures</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{(securityAlerts as any[]).length} Alerts</h3>
                    <p className="text-[10px] text-slate-400 mt-2 italic">Possible brute-force detection enabled</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border-l-4 border-l-blue-500 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                            <Activity className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">LIVE</span>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Global Events</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">4.2k / hr</h3>
                    <p className="text-[10px] text-slate-400 mt-2 italic">System load is optimal</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* GLOBAL AUDIT TRAIL */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <History className="w-5 h-5 text-blue-500" />
                            Live Audit Trail
                        </h2>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                <input type="text" placeholder="Search logs..." className="bg-slate-50 border-none rounded-lg py-1.5 pl-8 pr-3 text-xs outline-none" />
                            </div>
                            <button className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400">
                                <Filter className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-bold tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Tenant</th>
                                        <th className="px-6 py-4">Action</th>
                                        <th className="px-6 py-4">Actor</th>
                                        <th className="px-6 py-4">Time</th>
                                        <th className="px-6 py-4 text-right">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-[11px]">
                                    {allLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">No activity recorded yet.</td>
                                        </tr>
                                    ) : (allLogs as any[]).map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-slate-700">
                                                {log.client?.name || 'Platform'}
                                                <p className="text-[9px] font-mono text-slate-400 group-hover:text-blue-500 transition-colors uppercase">
                                                    {log.client?.slug || 'HQ'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider ${log.action.includes('CANCELLED') || log.action.includes('FAILURE')
                                                        ? 'bg-red-50 text-red-600'
                                                        : log.action.includes('CREATED')
                                                            ? 'bg-blue-50 text-blue-600'
                                                            : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-slate-800 font-medium">{log.actor?.name || 'System'}</p>
                                                <p className="text-[9px] text-slate-400 uppercase font-black">{log.actor?.role || 'AUTO'}</p>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                                                {new Date(log.createdAt).toLocaleTimeString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-1.5 hover:bg-white border border-transparent hover:border-slate-200 rounded-md text-slate-400 hover:text-blue-600 transition-all">
                                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* CRITICAL ALERTS SIDEBAR */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                        Critical Alerts
                    </h2>

                    <div className="space-y-3">
                        {securityAlerts.length === 0 ? (
                            <div className="p-8 text-center bg-emerald-50 border border-emerald-100 rounded-2xl">
                                <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-50" />
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest leading-tight">All systems secure</p>
                                <p className="text-[10px] text-emerald-500 mt-1 italic">No security incidents detected.</p>
                            </div>
                        ) : (securityAlerts as any[]).map(alert => (
                            <div key={alert.id} className="bg-red-50/50 border border-red-100 p-4 rounded-2xl relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-1 bg-white border border-red-200 rounded text-red-400 hover:text-red-600">
                                        <Eye className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-red-600 mt-1.5 animate-pulse shrink-0" />
                                    <div>
                                        <p className="text-xs font-black text-red-900 uppercase tracking-tight">{alert.action}</p>
                                        <p className="text-[10px] text-red-700 font-medium">Hotel: {alert.client?.name}</p>
                                        <p className="text-[9px] text-slate-500 mt-2 font-mono">
                                            {JSON.stringify(alert.metadata)}
                                        </p>
                                        <p className="text-[8px] text-slate-400 mt-3 font-bold uppercase tracking-widest">
                                            {new Date(alert.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
