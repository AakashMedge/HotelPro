'use client';

import { useState } from 'react';
import Link from 'next/link';

const mockTables = [
    { id: '12', status: 'ACTIVE', items: 4, lastUpdate: '4m', seats: '2/4' },
    { id: '04', status: 'READY', items: 2, lastUpdate: '12m', seats: '4/4' },
    { id: '09', status: 'ATTENTION', items: 6, lastUpdate: '1m', seats: '1/2' },
    { id: '15', status: 'ACTIVE', items: 3, lastUpdate: '22m', seats: '3/6' },
    { id: '02', status: 'ACTIVE', items: 1, lastUpdate: '5m', seats: '2/2' },
    { id: '21', status: 'VACANT', items: 0, lastUpdate: '--', seats: '0/4' },
];

export default function WaiterDashboard() {
    const getStatusTheme = (status: string) => {
        switch (status) {
            case 'READY': return {
                accent: 'bg-green-500',
                bg: 'bg-white',
                border: 'border-green-500/20',
                label: 'READY',
                pulse: true
            };
            case 'ATTENTION': return {
                accent: 'bg-[#D43425]',
                bg: 'bg-white',
                border: 'border-[#D43425]/20',
                label: 'BILL',
                pulse: true
            };
            case 'VACANT': return {
                accent: 'bg-zinc-200',
                bg: 'bg-zinc-50/50',
                border: 'border-zinc-200/50',
                label: 'VACANT',
                pulse: false
            };
            default: return {
                accent: 'bg-blue-500',
                bg: 'bg-white',
                border: 'border-blue-500/10',
                label: 'ACTIVE',
                pulse: false
            };
        }
    };

    return (
        <div className="h-full overflow-y-auto p-4 md:p-10 hide-scrollbar bg-[#F8F9FA]">
            <div className="max-w-7xl mx-auto space-y-6 md:space-y-10">
                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <h1 className="text-2xl md:text-4xl font-black tracking-tight flex items-baseline gap-2 md:gap-3">
                            FLOOR_OVERVIEW <span className="text-[10px] md:text-sm font-bold text-zinc-300">v1.2</span>
                        </h1>
                        <p className="text-[8px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-[0.4em]">Section: Main Hall</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-400">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-black text-white flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                    {mockTables.map((table) => {
                        const theme = getStatusTheme(table.status);
                        return (
                            <Link
                                key={table.id}
                                href={table.status === 'VACANT' ? '#' : `/waiter/table/${table.id}`}
                                className={`group relative flex flex-col p-4 md:p-6 rounded-xl md:rounded-2xl border ${theme.border} ${theme.bg} shadow-[0_2px_8px_rgba(0,0,0,0.02)] active:scale-[0.96] transition-all overflow-hidden`}
                            >
                                {/* Status Top Bar */}
                                <div className={`absolute top-0 left-0 w-full h-1 md:h-1.5 ${theme.accent}`} />

                                <div className="flex justify-between items-start mb-4 md:mb-8">
                                    <div className="flex flex-col">
                                        <span className="text-2xl md:text-4xl font-black tabular-nums tracking-tighter text-[#1D1D1F]">
                                            T_{table.id}
                                        </span>
                                        <span className="text-[7px] md:text-[9px] font-black text-zinc-300 uppercase tracking-widest mt-0.5 md:mt-1">HP-{table.id}</span>
                                    </div>
                                    <div className={`text-[8px] md:text-[10px] font-black px-1.5 md:px-3 py-0.5 md:py-1 rounded-full border border-black/5 flex items-center gap-1 md:gap-2 ${table.status === 'VACANT' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                        {table.seats}
                                    </div>
                                </div>

                                <div className="mt-auto space-y-2 md:space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[7px] md:text-[9px] font-black tracking-[0.2em] px-2 py-1 md:py-1.5 rounded-md ${theme.accent} text-white`}>
                                            {theme.label}
                                        </span>
                                        <span className="text-[8px] md:text-[10px] font-bold text-zinc-300 uppercase tabular-nums">{table.lastUpdate}</span>
                                    </div>

                                    <div className="hidden md:flex items-center gap-4 pt-4 border-t border-zinc-50">
                                        <div className="flex -space-x-2">
                                            {[...Array(Math.min(table.items, 3))].map((_, i) => (
                                                <div key={i} className="w-6 h-6 rounded-full bg-zinc-100 border-2 border-white flex items-center justify-center text-[8px] font-bold">
                                                    {i === 2 && table.items > 3 ? `+${table.items - 2}` : ''}
                                                </div>
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                            {table.items} ITEMS
                                        </span>
                                    </div>

                                    {/* Mobile Mobile Compact Items Info */}
                                    <div className="md:hidden flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-zinc-300">
                                        <span>{table.items} ITEMS</span>
                                        {theme.pulse && <div className={`w-1.5 h-1.5 rounded-full ${theme.accent} animate-pulse`} />}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* REFINED LEGEND */}
                <div className="pt-6 md:pt-12 flex flex-wrap gap-4 md:gap-8 items-center border-t border-zinc-200/60 opacity-60">
                    <span className="text-[8px] md:text-[10px] font-black text-zinc-300 uppercase tracking-[0.4em]">Legend</span>
                    {[
                        { label: 'Active', color: 'bg-blue-500' },
                        { label: 'Ready', color: 'bg-green-500' },
                        { label: 'Bill', color: 'bg-[#D43425]' },
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${item.color}`} />
                            <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
