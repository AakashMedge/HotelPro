'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// Types
type TableData = {
    id: string; // Short code
    code: string; // Full code e.g. T-01
    realId: string;
    status: string;
    waiter: string;
    items: number;
    itemSummary: { name: string, qty: number }[];
    lastUpdate: string;
    orderId?: string | null;
};

type AuditEntry = {
    time: string;
    msg: string;
    tableId: string | null;
    tableCode: string | null;
    orderId?: string | null;
};

interface ManagerData {
    stats: {
        active: number;
        ready: number;
        payment: number;
        kitchen: number;
        revenue: number;
        maxWait: string;
        lowStockCount: number;
    };
    floorMonitor: TableData[];
    auditFeed: AuditEntry[];
    topItems: { name: string; count: number }[];
    degraded?: boolean;
}

const FLOW_STEPS = [
    { key: 'NEW', label: 'Ordered', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /><path d="M13 2v7h7" /></svg> },
    { key: 'PREPARING', label: 'In Kitchen', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg> },
    { key: 'READY', label: 'Ready', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /></svg> },
    { key: 'SERVED', label: 'Served', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg> },
    { key: 'BILL_REQUESTED', label: 'Billing', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg> }
];

export default function ManagerDashboard() {
    const router = useRouter();
    const [data, setData] = useState<ManagerData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [feedbackStats, setFeedbackStats] = useState({ averageRating: 0, totalFeedbacks: 0 });
    const [complaintAlerts, setComplaintAlerts] = useState<{ id: string; tableCode: string; type: string; guestName: string; timestamp: number }[]>([]);


    const fetchManagerData = useCallback(async () => {
        try {
            const res = await fetch('/api/manager', { cache: 'no-store' });
            const result = await res.json();

            if (!res.ok || !result.success) {
                const message = result?.error || 'Service currently unavailable.';
                setError(message);
                if (result?.code === 'AUTH_REQUIRED') router.replace('/login?redirect=/manager&error=AUTH_REQUIRED');
                return;
            }

            setData(result);
            setError(null);

            // Fetch Feedback stats too
            const fbRes = await fetch('/api/customer/feedback');
            const fbData = await fbRes.json();
            if (fbData.success) setFeedbackStats(fbData.stats);

        } catch (err) {
            console.error(err);
            setError('Connection failure.');
        } finally {
            setLoading(false);
        }
    }, [router]);


    useEffect(() => {
        fetchManagerData();
        const interval = setInterval(fetchManagerData, 5000);

        // Real-time Complaint Alerts for Manager
        const es = new EventSource('/api/events');
        es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.event === 'COMPLAINT_RAISED') {
                    const newAlert = {
                        id: Date.now().toString(),
                        tableCode: data.payload.tableCode,
                        type: data.payload.type,
                        guestName: data.payload.guestName || 'Guest',
                        timestamp: Date.now()
                    };
                    setComplaintAlerts(prev => [newAlert, ...prev]);

                    // Auto-remove alert after 10 seconds
                    setTimeout(() => {
                        setComplaintAlerts(prev => prev.filter(a => a.id !== newAlert.id));
                    }, 10000);
                }
            } catch (err) { /* ignore */ }
        };

        return () => {
            clearInterval(interval);
            es.close();
        };
    }, [fetchManagerData]);


    const selectedTable = useMemo(() =>
        data?.floorMonitor.find(t => t.realId === selectedTableId),
        [data, selectedTableId]);

    const tableJourney = useMemo(() => {
        if (!selectedTableId || !data?.auditFeed || !selectedTable) return [];

        // Only show logs for the ACTIVE session
        if (selectedTable.orderId) {
            return data.auditFeed.filter(log =>
                log.tableId === selectedTableId &&
                log.orderId === selectedTable.orderId
            );
        }

        // If vacant, show nothing or maybe last few? sticking to "Active Session" logic: show nothing.
        return [];
    }, [selectedTableId, data, selectedTable]);

    const currentStepIdx = useMemo(() => {
        if (!selectedTable) return -1;
        const idx = FLOW_STEPS.findIndex(s => s.key === selectedTable.status);
        if (selectedTable.status === 'VACANT') return -1;
        return idx === -1 ? 0 : idx;
    }, [selectedTable]);

    if (loading && !data) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-zinc-50 font-sans">
                <div className="w-8 h-8 rounded-full border-2 border-zinc-200 border-t-zinc-900 animate-spin mb-4" />
                <span className="text-xs font-semibold text-zinc-400 tracking-wide">Syncing Roster...</span>
            </div>
        );
    }

    const stats = data?.stats || { active: 0, ready: 0, payment: 0, kitchen: 0, revenue: 0, maxWait: '0m', lowStockCount: 0 };

    return (
        <div className="h-full overflow-y-auto bg-[#FBFBFB] p-6 lg:p-12 scroll-smooth selection:bg-zinc-900 selection:text-white">
            <div className="max-w-[1400px] mx-auto space-y-16">

                {/* 1. SOPHISTICATED HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-zinc-100 pb-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-100/50">
                                System Online
                            </div>
                            <span className="text-xs font-medium text-zinc-400">Wednesday, 11 Feb 2026</span>
                        </div>
                        <h1 className="text-4xl font-semibold text-zinc-900 tracking-tight">Director Overview</h1>
                        <p className="text-sm text-zinc-500 max-w-md leading-relaxed">A refined perspective on real-time operational metrics and floor performance intelligence.</p>
                    </div>

                    <div className="flex flex-col items-start md:items-end">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Today's Revenue</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xs font-medium text-zinc-400 mb-1">INR</span>
                            <span className="text-5xl font-bold text-zinc-900 tabular-nums">
                                {stats.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. ELEGANT KPI TILES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    <MetricTile label="Active Floor" value={stats.active} sub="Current Occupancy" color="bg-zinc-900" icon={<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></>} />
                    <MetricTile
                        label="Guest Pulse"
                        value={`${feedbackStats.averageRating}⭐`}
                        sub={`${feedbackStats.totalFeedbacks} Reviews`}
                        color="bg-white"
                        onClick={() => router.push('/manager/hub')}
                        icon={<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />}
                    />
                    <MetricTile label="Pending Bills" value={stats.payment} sub="Awaiting Settlement" color="bg-white" icon={<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>} />
                    <MetricTile
                        label="Active Issues"
                        value={complaintAlerts.length}
                        sub="Raised via Hub"
                        color="bg-white"
                        alert={complaintAlerts.length > 0}
                        onClick={() => router.push('/manager/hub')}
                        icon={<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />}
                    />
                </div>


                {/* 3. CORE MANAGEMENT INTERFACE */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-8">

                    {/* LEFT: REFINED FLOOR MATRIX */}
                    <div className="lg:col-span-7 space-y-10">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-zinc-900">Floor Architecture</h3>
                            <button onClick={() => router.push('/manager/floor')} className="text-xs font-semibold text-zinc-400 hover:text-zinc-900 transition-colors">Manage Full Map</button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
                            {data?.floorMonitor.map((table) => {
                                const isSelected = selectedTableId === table.realId;
                                return (
                                    <button
                                        key={table.realId}
                                        onClick={() => setSelectedTableId(isSelected ? null : table.realId)}
                                        className={`group relative h-40 rounded-3xl border transition-all duration-300 flex flex-col justify-between p-6 ${isSelected ? 'bg-zinc-900 border-zinc-900 shadow-xl' : 'bg-white border-zinc-100 hover:border-zinc-300'}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className={`text-[10px] font-bold tracking-widest ${isSelected ? 'text-zinc-500' : 'text-zinc-300'}`}>T-{table.id}</span>
                                            <div className={`w-2 h-2 rounded-full ${table.status === 'ACTIVE' ? 'bg-amber-400' :
                                                table.status === 'READY' ? 'bg-emerald-500' :
                                                    table.status === 'BILL_REQUESTED' ? 'bg-indigo-500' :
                                                        'bg-zinc-100'
                                                }`} />
                                        </div>

                                        <div className="text-left space-y-1">
                                            <h4 className={`text-3xl font-bold tracking-tight ${isSelected ? 'text-white' : 'text-zinc-900'}`}>{table.id}</h4>
                                            <p className={`text-[10px] font-medium truncate ${isSelected ? 'text-zinc-400' : 'text-zinc-400'}`}>{table.waiter}</p>
                                        </div>

                                        <div className={`text-[9px] font-bold uppercase tracking-widest ${isSelected ? 'text-zinc-200' : 'text-zinc-900'}`}>
                                            {table.items > 0 ? `${table.items} Items` : 'Vacant'}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT: ELEGANT JOURNEY PANEL */}
                    <div className="lg:col-span-5 h-full">
                        <AnimatePresence mode="wait">
                            {selectedTable ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-2xl p-10 flex flex-col min-h-[600px] h-full"
                                >
                                    <div className="flex justify-between items-start mb-10">
                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-semibold text-zinc-900">Table {selectedTable.id}</h3>
                                            <p className="text-xs text-zinc-500 font-medium">Active Session Detail</p>
                                        </div>
                                        <button onClick={() => setSelectedTableId(null)} className="w-10 h-10 flex items-center justify-center bg-zinc-50 hover:bg-zinc-100 text-zinc-400 rounded-full transition-colors">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                        </button>
                                    </div>

                                    {/* Journey Stepper */}
                                    <div className="space-y-10 mb-12">
                                        <div className="flex justify-between relative px-2">
                                            <div className="absolute top-4 left-0 w-full h-px bg-zinc-100 -z-1" />
                                            {FLOW_STEPS.map((step, i) => {
                                                const isActive = i === currentStepIdx;
                                                const isDone = i < currentStepIdx;
                                                return (
                                                    <div key={step.key} className="flex flex-col items-center gap-3 relative z-10 w-1/5">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-500 ${isActive ? 'bg-zinc-900 text-white border-zinc-900' : isDone ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-white text-zinc-200 border-zinc-100'}`}>
                                                            {step.icon}
                                                        </div>
                                                        <span className={`text-[8px] font-bold uppercase tracking-widest text-center ${isActive ? 'text-zinc-900' : 'text-zinc-300'}`}>{step.label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-zinc-50">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Assigned Staff</span>
                                                <p className="text-sm font-semibold text-zinc-900">{selectedTable.waiter}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Active Tableware</span>
                                                <p className="text-sm font-semibold text-zinc-900">{selectedTable.items} Items</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Order Content */}
                                    <div className="grow space-y-8">
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-50 pb-2">Session Payload</h4>
                                            <div className="space-y-3">
                                                {selectedTable.itemSummary.length > 0 ? selectedTable.itemSummary.map((item, i) => (
                                                    <div key={i} className="flex justify-between items-center group">
                                                        <span className="text-xs font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">{item.name}</span>
                                                        <span className="text-xs font-bold text-zinc-400 tabular-nums">×{item.qty}</span>
                                                    </div>
                                                )) : (
                                                    <p className="text-xs text-zinc-300 italic py-4">No items ordered yet.</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-50 pb-2">Operational Log</h4>
                                            <div className="space-y-4 max-h-[200px] overflow-y-auto no-scrollbar">
                                                {tableJourney.map((log, i) => (
                                                    <div key={i} className="flex gap-4">
                                                        <div className="flex flex-col items-center gap-1 pt-1">
                                                            <div className={`w-1 h-1 rounded-full ${i === 0 ? 'bg-zinc-900' : 'bg-zinc-200'}`} />
                                                            {i !== tableJourney.length - 1 && <div className="w-px grow bg-zinc-50" />}
                                                        </div>
                                                        <div className="grow space-y-0.5 pb-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[9px] font-semibold text-zinc-300 tabular-nums">{log.time}</span>
                                                            </div>
                                                            <p className={`text-[10px] font-semibold uppercase tracking-tight ${i === 0 ? 'text-zinc-900' : 'text-zinc-400'}`}>{log.msg}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => router.push(`/manager/floor?table=${selectedTable.realId}`)}
                                        className="mt-10 w-full py-4 bg-zinc-900 text-white rounded-2xl text-xs font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 shadow-lg shadow-zinc-200"
                                    >
                                        Live Intervention
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                    </button>
                                </motion.div>
                            ) : (
                                <div className="bg-white rounded-[2.5rem] border border-zinc-100 border-dashed p-12 h-full min-h-[600px] flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center mb-6">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-200"><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /><circle cx="12" cy="12" r="3" /></svg>
                                    </div>
                                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Select a table node</p>
                                    <p className="text-[10px] text-zinc-300 mt-2 max-w-[200px]">Synchronize with a specific table to view its current live operational flow.</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* 4. REFINED PERFORMANCE FOOTER */}
                <div className="bg-white rounded-3xl p-10 border border-zinc-100">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-xl font-semibold text-zinc-900 tracking-tight">Product Velocity</h3>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            <span>Analysis Period: Today</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {data?.topItems.slice(0, 3).map((item, i) => (
                            <div key={item.name} className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-xs font-semibold text-zinc-900">{item.name}</span>
                                    <span className="text-sm font-bold text-zinc-400">#{i + 1}</span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-50 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(item.count / (data.topItems[0].count || 1)) * 100}%` }}
                                        className={`h-full rounded-full ${i === 0 ? 'bg-zinc-900' : 'bg-zinc-200'}`}
                                    />
                                </div>
                                <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                                    {item.count} Units Dispatched
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            <AnimatePresence>
                {complaintAlerts.length > 0 && (
                    <div className="fixed top-24 right-8 z-100 space-y-3 max-w-sm">
                        {complaintAlerts.map(alert => (
                            <motion.div
                                key={alert.id}
                                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={() => router.push('/manager/hub')}
                                className="bg-white border-2 border-red-500 rounded-2xl p-4 shadow-2xl cursor-pointer flex items-start gap-4"
                            >
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                    <span className="text-xl">🚨</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-none mb-1">Live Alert: Table {alert.tableCode}</p>
                                    <h4 className="text-sm font-bold text-zinc-900">{alert.type.replace('_', ' ')}</h4>
                                    <p className="text-[11px] text-zinc-500 mt-1">Reported by {alert.guestName} · Click to resolve</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setComplaintAlerts(prev => prev.filter(a => a.id !== alert.id)); }}
                                    className="ml-auto text-zinc-300 hover:text-zinc-500"
                                >
                                    ✕
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}

function MetricTile({ label, value, sub, color, icon, alert, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className={`p-8 rounded-4xl border transition-all h-40 flex flex-col justify-between shadow-sm hover:shadow-lg ${alert ? 'bg-red-50 border-red-100' : 'bg-white border-zinc-100'} ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
        >
            <div className="flex justify-between items-start">
                <div className={`p-2.5 rounded-xl ${color === 'bg-zinc-900' ? 'bg-zinc-900 text-white shadow-md shadow-zinc-200' : 'bg-zinc-50 text-zinc-400'}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">{icon}</svg>
                </div>
                {alert && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
            </div>
            <div>
                <div className={`text-3xl md:text-4xl font-bold tracking-tight mb-2 ${alert ? 'text-red-600' : 'text-zinc-900'}`}>{value}</div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
                    <span className="text-[8px] font-medium text-zinc-300 italic uppercase tracking-tighter mt-1">{sub}</span>
                </div>
            </div>
        </div>
    );
}
