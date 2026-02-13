'use client';

import { useState, useEffect } from 'react';
import {
    LayoutGrid, QrCode, Download, Printer, Plus, Maximize,
    Map, Trash2, Edit3, Settings2, Box, ChevronRight, Layers
} from 'lucide-react';

type Section = {
    id: string;
    name: string;
    tableCount: number;
    prefix: string;
};

export default function AdminArchitecturePage() {
    const [loading, setLoading] = useState(true);
    const [sections, setSections] = useState<Section[]>([]);

    useEffect(() => {
        setTimeout(() => {
            setSections([
                { id: '1', name: 'Main Hall', tableCount: 12, prefix: 'MH' },
                { id: '2', name: 'Open Patio', tableCount: 8, prefix: 'PT' },
                { id: '3', name: 'Private VIP', tableCount: 4, prefix: 'VIP' },
                { id: '4', name: 'Rooftop Bar', tableCount: 15, prefix: 'RT' },
            ]);
            setLoading(false);
        }, 500);
    }, []);

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Property Architecture</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Design zones, assign table nodes, and generate QR identities.</p>
                </div>
                <div className="flex gap-3">
                    <button className="bg-white border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                        <Plus className="w-4 h-4" />
                        Add Zone
                    </button>
                    <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm">
                        <QrCode className="w-4 h-4" />
                        Batch QR Factory
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Zones</p>
                    <p className="text-2xl font-bold text-slate-900">{sections.length}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Nodes</p>
                    <p className="text-2xl font-bold text-slate-900">{sections.reduce((acc, s) => acc + s.tableCount, 0)}</p>
                </div>
                <div className="bg-emerald-50 text-emerald-700 p-6 rounded-3xl border border-emerald-100/50">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1">QR Coverage</p>
                    <p className="text-2xl font-bold">100.0%</p>
                </div>
                <div className="bg-indigo-50 text-indigo-700 p-6 rounded-3xl border border-indigo-100/50">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1">Mapping Mode</p>
                    <p className="text-2xl font-bold italic lowercase">geometric</p>
                </div>
            </div>

            {/* Zone Registry */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 px-2">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Zone Deployment Registry</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {sections.map(section => (
                        <div key={section.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 group hover:shadow-xl transition-all relative overflow-hidden">
                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors">
                                    <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div className="space-y-6 relative z-10">
                                <div>
                                    <div className={`w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-sm mb-4`}>
                                        {section.prefix}
                                    </div>
                                    <h4 className="text-xl font-bold text-slate-900 tracking-tight">{section.name}</h4>
                                    <div className="flex items-baseline gap-1 mt-1">
                                        <span className="text-sm font-bold text-slate-400">{section.tableCount}</span>
                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Active Tables</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <button className="w-full py-3 bg-slate-50 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white transition-all">
                                        <Printer className="w-3.5 h-3.5" />
                                        Print QR Cards
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    <button className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-4 group hover:border-indigo-300 hover:bg-white transition-all min-h-[220px]">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-indigo-600 transition-colors">
                            <Plus className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 group-hover:text-indigo-600">Initialize Zone</span>
                    </button>
                </div>
            </div>

            {/* Global Settings Asset */}
            <div className="bg-slate-900 rounded-[3rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:scale-[1.7]">
                    <Settings2 className="w-48 h-48" />
                </div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                        <Box className="w-7 h-7 text-indigo-300" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-lg font-bold tracking-tight">QR Factory Settings</h4>
                        <p className="text-xs font-medium text-slate-400 max-w-sm leading-relaxed">
                            Configure landing domains, fallback behaviors, and PDF typography branding.
                        </p>
                    </div>
                </div>
                <button className="shrink-0 bg-white text-slate-900 px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-2 relative z-10 shadow-xl shadow-black/20">
                    <Download className="w-4 h-4" />
                    Asset Pack
                </button>
            </div>

        </div>
    );
}
