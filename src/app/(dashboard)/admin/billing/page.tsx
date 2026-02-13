'use client';

import { useState, useEffect } from 'react';
import {
    CreditCard, History, CheckCircle2, AlertCircle,
    Download, ExternalLink, ShieldCheck, Box, ChevronRight,
    Zap, Calendar
} from 'lucide-react';

type BillingHistory = {
    id: string;
    date: string;
    amount: number;
    plan: string;
    status: 'PAID' | 'PENDING' | 'FAILED';
    invoiceNo: string;
};

export default function AdminBillingPage() {
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<BillingHistory[]>([]);

    useEffect(() => {
        setTimeout(() => {
            setHistory([
                { id: '1', date: 'Feb 01, 2026', amount: 4999, plan: 'PREMIUM', status: 'PAID', invoiceNo: 'INV/26/0201' },
                { id: '2', date: 'Jan 01, 2026', amount: 4999, plan: 'PREMIUM', status: 'PAID', invoiceNo: 'INV/26/0101' },
                { id: '3', date: 'Dec 01, 2025', amount: 4999, plan: 'PREMIUM', status: 'PAID', invoiceNo: 'INV/25/1201' },
            ]);
            setLoading(false);
        }, 800);
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
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Billing & subscription</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Manage your service plan, view invoice history, and verify legal standing.</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 pr-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Next Bill</p>
                        <p className="text-sm font-bold text-slate-800 leading-none">March 01, 2026</p>
                    </div>
                </div>
            </div>

            {/* Plan Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Active Plan Card */}
                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-1000">
                        <Zap className="w-40 h-40 text-indigo-400" />
                    </div>
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Active Protocol</span>
                            <h2 className="text-4xl font-black mt-2 tracking-tighter italic uppercase">Premium</h2>
                        </div>
                        <div className="mt-12 space-y-3">
                            <div className="flex items-center gap-3 text-sm font-bold">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>Unlimited Nodes</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm font-bold">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>Priority AI Thread</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Card */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm flex flex-col justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ledger Status</span>
                        <div className="flex items-center gap-3 mt-4">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <h2 className="text-xl font-bold text-slate-900">Account Verified</h2>
                        </div>
                        <p className="mt-4 text-sm font-medium text-slate-500 leading-relaxed">
                            Your property is in good standing. All core modules and legal frameworks are synchronized.
                        </p>
                    </div>
                </div>

                {/* Support/Update Card */}
                <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-[2.5rem] p-10 flex flex-col justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Support Level</span>
                        <h2 className="text-xl font-bold text-indigo-900 mt-4">Priority HQ Access</h2>
                    </div>
                    <button className="w-full bg-white border border-indigo-100 text-indigo-600 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                        <ExternalLink className="w-4 h-4" />
                        Contact Support
                    </button>
                </div>

            </div>

            {/* Invoicing Table */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 px-2">
                    <History className="w-4 h-4 text-slate-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Financial History</h3>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <th className="px-8 py-5">Invoice #</th>
                                <th className="px-8 py-5">Date</th>
                                <th className="px-8 py-5">Tier</th>
                                <th className="px-8 py-5 text-right">Amount</th>
                                <th className="px-8 py-5 text-center">Status</th>
                                <th className="px-8 py-5 w-20"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {history.map((invoice) => (
                                <tr key={invoice.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-8 py-5 font-bold text-slate-400 group-hover:text-slate-900 transition-colors uppercase text-sm">
                                        {invoice.invoiceNo}
                                    </td>
                                    <td className="px-8 py-5 text-sm font-semibold text-slate-600">{invoice.date}</td>
                                    <td className="px-8 py-5">
                                        <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold tracking-widest">{invoice.plan}</span>
                                    </td>
                                    <td className="px-8 py-5 text-right font-bold text-slate-900 text-sm">
                                        ₹{invoice.amount.toLocaleString()}
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold">
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="p-2 hover:bg-indigo-50 text-slate-300 hover:text-indigo-600 rounded-xl transition-all">
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Global Legal Compliance Footer */}
            <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-4 text-slate-400">
                    <ShieldCheck className="w-8 h-8 opacity-20" />
                    <p className="text-[10px] font-semibold uppercase leading-relaxed max-w-xs tracking-tight">
                        billing operates under standard indian gst protocols and digital transaction safety layers. all ledger entries are immutable.
                    </p>
                </div>
                <div className="flex gap-12">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1">Legal Identity</p>
                        <p className="text-xs font-bold text-slate-700 uppercase">27AAACH0001Z1Z</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1">Status</p>
                        <p className="text-xs font-bold text-emerald-600 uppercase">Verified</p>
                    </div>
                </div>
            </div>

        </div>
    );
}
