import React from 'react';
import {
    Search,
    Plus,
    Filter,
    MoreHorizontal,
    ExternalLink,
    Settings2,
    ShieldAlert,
    BarChart3,
    Hotel,
    Globe,
    Shield,
    Database
} from 'lucide-react';
import { getAllClients } from '@/lib/services/admin';
import Link from 'next/link';

export default async function ClientsManagementPage() {
    const clients = await getAllClients();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'TRIAL': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'SUSPENDED': return 'bg-red-50 text-red-600 border-red-100';
            case 'ARCHIVED': return 'bg-slate-100 text-slate-500 border-slate-200';
            case 'PROVISIONING': return 'bg-blue-50 text-blue-600 border-blue-100 animate-pulse';
            case 'PROVISIONING_FAILED': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-slate-50 text-slate-400 border-slate-100';
        }
    };

    const getStatusDotColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-emerald-500';
            case 'TRIAL': return 'bg-amber-500';
            case 'SUSPENDED': return 'bg-red-500';
            case 'PROVISIONING': return 'bg-blue-500';
            default: return 'bg-slate-400';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Hotel Portfolio</h1>
                    <p className="text-slate-500 text-sm mt-1">Managing {clients.length} hotels across the platform infrastructure.</p>
                </div>
                <Link
                    href="/hq/clients/new"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-100 active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    Expand Network
                </Link>
            </div>

            {/* FILTERS & SEARCH */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by hotel name, slug, or domain..."
                        className="w-full bg-slate-50 border-none rounded-xl py-2.5 pl-11 pr-4 text-sm outline-none focus:ring-2 ring-indigo-500/10 transition-all font-medium"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
                        <Filter className="w-4 h-4" />
                        Status
                    </button>
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
                        <BarChart3 className="w-4 h-4" />
                        Plan
                    </button>
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
                        <Hotel className="w-4 h-4" />
                        Type
                    </button>
                </div>
            </div>

            {/* CLIENT LIST TABLE */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-5">Hotel Identity</th>
                                <th className="px-6 py-5">Subscription</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5 text-right font-black">Commands</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm">
                            {clients.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center text-slate-400 italic font-medium">
                                        The network is empty. Awaiting the first hotel...
                                    </td>
                                </tr>
                            ) : clients.map((client: any) => (
                                <tr key={client.id} className={`hover:bg-slate-50/50 transition-colors group ${client.status === 'ARCHIVED' ? 'opacity-50 grayscale' : ''}`}>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors bg-slate-50 border-slate-200 text-slate-400`}>
                                                <Hotel className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 flex items-center gap-2">
                                                    {client.name}
                                                    {client.domain && <Globe className="w-3 h-3 text-slate-300" />}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-mono tracking-tight flex items-center gap-1">
                                                    {client.slug}.hotelpro.com
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div>
                                            <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${client.plan === 'ELITE' ? 'bg-indigo-100 text-indigo-700' :
                                                client.plan === 'GROWTH' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {client.plan}
                                            </span>
                                            <p className="text-[9px] text-slate-400 mt-1 font-black uppercase tracking-widest">
                                                {client.subscription?.billingCycle || 'MONTHLY'} Renewal
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-5">
                                            <div className="text-center group-hover:scale-105 transition-transform">
                                                <p className="text-xs font-black text-slate-800">{client._count.users}</p>
                                                <p className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">Users</p>
                                            </div>
                                            <div className="text-center group-hover:scale-105 transition-transform">
                                                <p className="text-xs font-black text-slate-800">{client._count.orders}</p>
                                                <p className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">Orders</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wide ${getStatusColor(client.status)}`}>
                                            <span className={`w-1 h-1 rounded-full ${getStatusDotColor(client.status)}`}></span>
                                            {client.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/hq/clients/${client.id}`}
                                                className="p-2 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-lg text-slate-400 transition-all active:scale-90"
                                                title="Environment Settings"
                                            >
                                                <Settings2 className="w-4 h-4" />
                                            </Link>
                                            <Link
                                                href={`/hq/clients/${client.id}`}
                                                className="p-2 bg-slate-50 hover:bg-red-600 hover:text-white rounded-lg text-slate-400 transition-all active:scale-90"
                                                title="Security Core"
                                            >
                                                <ShieldAlert className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PAGINATION / FOOTER */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-2 font-black uppercase tracking-[0.2em]">
                <span>Active Nodes: {clients.length}</span>
                <div className="flex items-center gap-6">
                    <button className="opacity-30 cursor-not-allowed">Previous Page</button>
                    <span className="text-slate-800 bg-slate-100 px-2 py-1 rounded">01</span>
                    <button className="opacity-30 cursor-not-allowed">Next Page</button>
                </div>
            </div>
        </div>
    );
}
