'use client';

import { useState, useEffect } from 'react';

// Unified types for Manager view
type TableData = {
    id: string;
    status: 'ACTIVE' | 'READY' | 'WAITING_FOR_PAYMENT' | 'VACANT';
    waiter: string;
    items: number;
    lastUpdate: string;
};

const MOCK_FLOOR: TableData[] = [
    { id: '12', status: 'ACTIVE', waiter: 'Rohit S.', items: 4, lastUpdate: '4m' },
    { id: '04', status: 'READY', waiter: 'Anjali P.', items: 2, lastUpdate: '12m' },
    { id: '09', status: 'WAITING_FOR_PAYMENT', waiter: 'Rohit S.', items: 6, lastUpdate: '1m' },
    { id: '15', status: 'ACTIVE', waiter: 'Vikram K.', items: 3, lastUpdate: '22m' },
    { id: '02', status: 'ACTIVE', waiter: 'Anjali P.', items: 1, lastUpdate: '5m' },
    { id: '21', status: 'VACANT', waiter: '---', items: 0, lastUpdate: '--' },
];

export default function ManagerDashboard() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const stats = {
        active: MOCK_FLOOR.filter(t => t.status === 'ACTIVE').length,
        ready: MOCK_FLOOR.filter(t => t.status === 'READY').length,
        payment: MOCK_FLOOR.filter(t => t.status === 'WAITING_FOR_PAYMENT').length,
        kitchen: 4,
        maxWait: '18m'
    };

    return (
        <div className="h-full overflow-y-auto p-4 md:p-8 lg:p-10 hide-scrollbar bg-[#FDFCF9]">
            <div className="max-w-7xl mx-auto space-y-8 md:space-y-12 pb-32">

                {/* 1. OPERATIONS SNAPSHOT GRID (Optimized for all screens) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                    {[
                        { label: 'Active', value: stats.active, color: 'text-blue-600', sub: 'Tables' },
                        { label: 'Ready', value: stats.ready, color: 'text-green-600', sub: 'Orders' },
                        { label: 'Pay_Wait', value: stats.payment, color: 'text-[#D43425]', sub: 'Bills' },
                        { label: 'Kitchen', value: stats.kitchen, color: 'text-amber-600', sub: 'Preparing' }
                    ].map(stat => (
                        <div key={stat.label} className="bg-white border border-zinc-100 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm flex flex-col items-center text-center group active:scale-95 transition-all">
                            <span className="text-[7px] md:text-[9px] font-black text-zinc-300 uppercase tracking-[0.4em] mb-2 md:mb-4">{stat.label}</span>
                            <span className={`text-4xl md:text-5xl lg:text-7xl font-black tabular-nums tracking-tighter ${stat.color}`}>{stat.value}</span>
                            <span className="text-[7px] md:text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1 italic">{stat.sub}</span>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">

                    {/* 2. FLOOR OPERATIONS MONITOR (Main section) */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="flex justify-between items-end border-b border-zinc-100 pb-4">
                            <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase">Floor_Operations_Monitor</h2>
                            <span className="text-[8px] md:text-[10px] font-black text-zinc-300 uppercase tracking-widest">Real-time Stream</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            {MOCK_FLOOR.map(table => (
                                <div key={table.id} className="bg-white border border-zinc-100 p-4 md:p-6 rounded-xl md:rounded-2xl flex items-center justify-between group active:scale-98 transition-all">
                                    <div className="flex items-center gap-4 md:gap-6">
                                        <div className="text-3xl md:text-4xl font-black tracking-tighter text-zinc-900 leading-none">T_{table.id}</div>
                                        <div className="flex flex-col">
                                            <span className={`text-[7px] md:text-[8px] font-black px-1.5 md:px-2 py-0.5 rounded-full uppercase tracking-widest w-fit mb-1 ${table.status === 'READY' ? 'bg-green-50 text-green-600 border border-green-100' :
                                                    table.status === 'WAITING_FOR_PAYMENT' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                        table.status === 'VACANT' ? 'bg-zinc-50 text-zinc-400 border border-zinc-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                }`}>
                                                {table.status.replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-[9px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">{table.waiter}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs md:text-sm font-black text-zinc-900 tabular-nums">{table.items} <span className="text-[8px] md:text-[10px] text-zinc-300">PCS</span></span>
                                        <div className="text-[7px] md:text-[8px] font-bold text-zinc-300 uppercase tracking-widest mt-1">{table.lastUpdate} ago</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3. KITCHEN LOAD VITAL INDICATORS (Responsive sidebar/bottom) */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="flex justify-between items-end border-b border-zinc-100 pb-4">
                            <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase">Kitchen_Vitals</h2>
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        </div>

                        <div className="bg-[#111111] text-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] space-y-6 md:space-y-10 shadow-xl relative overflow-hidden">
                            <div className="relative z-10 flex flex-col items-center">
                                <span className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] mb-4 md:mb-6">Max_Wait_Current</span>
                                <span className="text-6xl md:text-8xl font-black tracking-tighter text-[#D43425] tabular-nums leading-none">{stats.maxWait}</span>
                                <p className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-2 md:mt-4">Stressed Ticket Duration</p>
                            </div>

                            <div className="relative z-10 grid grid-cols-2 gap-4 pt-4 md:pt-6 border-t border-white/5">
                                <div className="flex flex-col items-center">
                                    <span className="text-xl md:text-2xl font-black text-white">{stats.kitchen}</span>
                                    <span className="text-[7px] md:text-[8px] font-bold text-zinc-500 uppercase tracking-widest">In_Prep</span>
                                </div>
                                <div className="flex flex-col items-center border-l border-white/5">
                                    <span className="text-xl md:text-2xl font-black text-white">12.4m</span>
                                    <span className="text-[7px] md:text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Avg_Time</span>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#D43425]/10 rounded-full blur-3xl -mr-12 -mt-12" />
                        </div>

                        {/* SERVICE LOG (Responsive layout) */}
                        <div className="bg-white border border-zinc-100 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] space-y-4 md:space-y-6">
                            <span className="text-[8px] md:text-[9px] font-black text-zinc-300 uppercase tracking-[0.4em]">Audit_Feed</span>
                            <div className="space-y-3 md:space-y-4">
                                {[
                                    { time: '18:12', msg: 'T_12 Committed' },
                                    { time: '18:05', msg: 'T_04 Settled' },
                                    { time: '17:58', msg: 'Shift In: ROHIT' }
                                ].map((log, i) => (
                                    <div key={i} className="flex gap-3 md:gap-4 items-center">
                                        <span className="text-[8px] md:text-[10px] font-black tabular-nums text-zinc-300 shrink-0">{log.time}</span>
                                        <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-wide text-zinc-600 truncate">{log.msg}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

                {/* 4. STAFF ROSTER (Auto-responsive grid) */}
                <div className="space-y-6 border-t border-zinc-100 pt-10 md:pt-12">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">Service_Personal_Roster</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                        {[
                            { name: 'ROHIT SANKAL', role: 'WAITER', status: 'ONLINE', shift: '04:22:15' },
                            { name: 'ANJALI PRASAD', role: 'WAITER', status: 'ONLINE', shift: '02:12:00' },
                            { name: 'CHEF VIKRAM', role: 'KITCHEN', status: 'BUSY', shift: '08:45:30' }
                        ].map(staff => (
                            <div key={staff.name} className="bg-white border border-zinc-100 p-4 md:p-6 rounded-xl md:rounded-2xl flex items-center justify-between group active:scale-98 transition-all">
                                <div className="flex flex-col">
                                    <span className="font-black text-base md:text-lg text-zinc-900 leading-none mb-1">{staff.name}</span>
                                    <span className="text-[8px] md:text-[9px] font-black text-zinc-300 uppercase tracking-widest">{staff.role} • {staff.shift}</span>
                                </div>
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className={`px-2 py-0.5 rounded text-[7px] md:text-[8px] font-black tracking-widest border ${staff.status === 'ONLINE' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                        {staff.status}
                                    </div>
                                    <div className="w-8 h-4 bg-zinc-100 rounded-full relative cursor-pointer group-hover:bg-zinc-200 transition-colors">
                                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-all ${staff.status === 'ONLINE' ? 'bg-[#D43425] left-4.5' : 'bg-zinc-300'}`} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
        </div>
    );
}
