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
    Hotel
} from 'lucide-react';
import { getAllClients } from '@/lib/services/admin';
import Link from 'next/link';

export default async function ClientsManagementPage() {
    const clients = await getAllClients();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Client Directory</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage all {clients.length} hotels currently powered by HotelPro.</p>
                </div>
                <Link
                    href="/hq/clients/new"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm shadow-blue-200 active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    Onboard New Hotel
                </Link>
            </div>

            {/* FILTERS & SEARCH */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by hotel name, slug, or domain..."
                        className="w-full bg-slate-50 border-none rounded-xl py-2.5 pl-11 pr-4 text-sm outline-none focus:ring-2 ring-blue-500/10 transition-all"
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
                </div>
            </div>

            {/* CLIENT LIST TABLE */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-5">Hotel Identity</th>
                                <th className="px-6 py-5">Subscription</th>
                                <th className="px-6 py-5">Internal Stats</th>
                                <th className="px-6 py-5">Health</th>
                                <th className="px-6 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm">
                            {clients.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">
                                        No hotels found. Time to grow!
                                    </td>
                                </tr>
                            ) : clients.map((client) => (
                                <tr key={client.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                                <Hotel className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 flex items-center gap-2">
                                                    {client.name}
                                                    {client.domain && <ExternalLink className="w-3 h-3 text-slate-300" />}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-mono tracking-tight cursor-pointer hover:text-blue-500">
                                                    {client.slug}.hotelpro.com
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div>
                                            <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${client.plan === 'PREMIUM' ? 'bg-indigo-100 text-indigo-700' :
                                                client.plan === 'BUSINESS' ? 'bg-emerald-100 text-emerald-700' :
                                                    client.plan === 'ADVANCE' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {client.plan}
                                            </span>
                                            <p className="text-[10px] text-slate-400 mt-1.5 ml-0.5">Renews: Dec 20, 2026</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-6">
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-slate-800">{client._count.users}</p>
                                                <p className="text-[9px] text-slate-400 uppercase font-medium">Users</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-slate-800">{client._count.orders}</p>
                                                <p className="text-[9px] text-slate-400 uppercase font-medium">Orders</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border ${client.status === 'ACTIVE'
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            : 'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>
                                            <span className={`w-1 h-1 rounded-full ${client.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                            {client.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link
                                                href={`/hq/clients/${client.id}`}
                                                className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
                                            >
                                                <Settings2 className="w-4 h-4" />
                                            </Link>
                                            <Link
                                                href={`/hq/clients/${client.id}`}
                                                className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 hover:text-red-600 transition-all"
                                            >
                                                <ShieldAlert className="w-4 h-4" />
                                            </Link>
                                            <Link
                                                href={`/hq/clients/${client.id}`}
                                                className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
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
            <div className="flex items-center justify-between text-xs text-slate-400 px-2 font-medium uppercase tracking-widest">
                <span>Showing {clients.length} of {clients.length} Hotels</span>
                <div className="flex items-center gap-4">
                    <button className="hover:text-slate-800 transition-colors cursor-not-allowed">Previous</button>
                    <span className="text-slate-800">1</span>
                    <button className="hover:text-slate-800 transition-colors cursor-not-allowed">Next</button>
                </div>
            </div>
        </div>
    );
}
