'use client';

import { useState, useEffect } from 'react';
import {
    BarChart3, TrendingUp, TrendingDown, Target, BrainCircuit,
    Zap, AlertCircle, Sparkles, PieChart,
    Layers, ZapOff, CheckCircle2, ChevronRight
} from 'lucide-react';

export default function AdminAnalyticsPage() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => setLoading(false), 800);
    }, []);

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-slate-400">Loading Analytics...</p>
            </div>
        </div>
    );

    return (
        <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto">

            {/* Header Section - Clean & Vibrant */}
            <div className="p-10 rounded-[2.5rem] bg-indigo-600 shadow-xl shadow-indigo-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                    <PieChart className="w-48 h-48" />
                </div>
                <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">Menu Insights</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Menu Science & Analytics</h1>
                    <p className="text-indigo-100 font-medium max-w-lg text-sm leading-relaxed">
                        Data-driven insights to help you optimize price points and menu placement.
                    </p>
                </div>
            </div>

            {/* Performance Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* THE MATRIX (Minimalist version) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-4">
                        <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-slate-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Popularity v Margin Matrix</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <MatrixCard
                            title="Stars"
                            percent="42%"
                            desc="Keep these items exactly as they are."
                            color="emerald"
                            stats="+8.2%"
                        />
                        <MatrixCard
                            title="Plowhorses"
                            percent="31%"
                            desc="High volume but low profit margin."
                            color="blue"
                            stats="+14.1%"
                        />
                        <MatrixCard
                            title="Puzzles"
                            percent="18%"
                            desc="High profit but low sales volume."
                            color="amber"
                            stats="Stable"
                        />
                        <MatrixCard
                            title="Dogs"
                            percent="09%"
                            desc="Low profit and low sales volume."
                            color="rose"
                            stats="-4.5%"
                        />
                    </div>
                </div>

                {/* RECOMMENDATIONS SIDEBAR */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-4xl shadow-sm border border-slate-100 flex flex-col justify-between h-full">
                        <div>
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                                    <Zap className="w-4 h-4" />
                                </div>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">System Recommendation</h4>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-xl font-bold text-slate-900 leading-tight">Price Point Optimization</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    "Cold Coffee" is currently a <b>Plowhorse</b>. Increasing price by <span className="text-indigo-600 font-semibold">₹25</span> can shift it to a Star.
                                </p>
                            </div>
                        </div>
                        <div className="mt-10 pt-6 border-t border-slate-50">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2 tracking-widest">Yield Projection</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-emerald-600 tracking-tight">+₹14,200</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">per month</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PERFORMANCE HUD (Colorful Minimalist) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ModernHudCard
                    label="Kitchen Efficiency"
                    value="94%"
                    color="text-emerald-500"
                    bg="bg-emerald-50"
                    icon={CheckCircle2}
                    note="Average prep: 14m"
                />
                <ModernHudCard
                    label="Waste Tracking"
                    value="2.4%"
                    color="text-rose-500"
                    bg="bg-rose-50"
                    icon={ZapOff}
                    note="Lower than last week"
                />
                <ModernHudCard
                    label="Guest Sentiment"
                    value="4.8/5.0"
                    color="text-indigo-500"
                    bg="bg-indigo-50"
                    icon={Sparkles}
                    note="Based on 124 reviews"
                />
            </div>

        </div>
    );
}

function MatrixCard({ title, percent, desc, color, stats }: { title: string, percent: string, desc: string, color: string, stats: string }) {
    const themes = {
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
    } as any;

    const theme = themes[color];

    return (
        <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-center mb-6">
                <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.text}`}>{title}</h4>
                <div className={`px-2 py-0.5 rounded-lg ${theme.bg} ${theme.text} text-[10px] font-bold`}>{stats}</div>
            </div>
            <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold text-slate-900 tracking-tight">{percent}</p>
            </div>
            <p className="mt-4 text-[11px] font-medium text-slate-500 leading-relaxed">
                {desc}
            </p>
        </div>
    );
}

function ModernHudCard({ label, value, color, bg, icon: Icon, note }: any) {
    return (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-6">
                <div className={`w-10 h-10 ${bg} ${color} rounded-xl flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-200" />
            </div>
            <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                <p className={`text-3xl font-bold ${color} tracking-tight`}>{value}</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pt-2 border-t border-slate-50 mt-4">{note}</p>
            </div>
        </div>
    );
}
