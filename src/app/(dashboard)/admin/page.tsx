'use client';

import { useState, useEffect } from 'react';

type AdminTab = 'USERS' | 'TABLES' | 'MENU' | 'SETTINGS';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<AdminTab>('USERS');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const TabButton = ({ id, label }: { id: AdminTab, label: string }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`px-6 md:px-8 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] transition-all relative shrink-0 ${activeTab === id ? 'text-black' : 'text-zinc-300 hover:text-zinc-500'}`}
        >
            {label}
            {activeTab === id && <div className="absolute bottom-0 left-4 right-4 md:left-8 md:right-8 h-0.5 md:h-1 bg-[#D43425] rounded-full shadow-[0_0_10px_rgba(212,52,37,0.3)]" />}
        </button>
    );

    return (
        <div className="h-full flex flex-col bg-[#F9F9F9]">
            {/* 1. CONFIGURATION NAVIGATION (Scrollable on Mobile) */}
            <div className="h-14 md:h-16 bg-white border-b border-zinc-200 flex items-center px-4 md:px-10 shrink-0 overflow-x-auto hide-scrollbar z-20 sticky top-0 md:relative">
                <TabButton id="USERS" label="Personnel" />
                <TabButton id="TABLES" label="Nodes" />
                <TabButton id="MENU" label="Inventory" />
                <TabButton id="SETTINGS" label="Internal" />
            </div>

            <div className="grow overflow-y-auto p-4 md:p-8 lg:p-10 hide-scrollbar pb-32">
                <div className="max-w-5xl mx-auto space-y-8 md:space-y-12">

                    {/* 2. TAB CONTENT ZONE */}
                    {activeTab === 'USERS' && (
                        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-1 duration-300">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                                <div className="space-y-1">
                                    <h3 className="text-xl md:text-3xl font-black tracking-tighter uppercase">Service_Credential_Cloud</h3>
                                    <p className="text-[8px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">Identity Access Management</p>
                                </div>
                                <button className="w-full md:w-auto bg-black text-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#D43425] transition-all shadow-xl active:scale-95"> Provision_Staff </button>
                            </div>

                            {/* Desktop/Tablet Table */}
                            <div className="hidden md:block bg-white border border-zinc-100 rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-zinc-50 border-b border-zinc-100">
                                        <tr>
                                            <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Name / UID</th>
                                            <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Role</th>
                                            <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Status</th>
                                            <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-50">
                                        {[
                                            { name: 'Rohit Sankal', id: 'W-001', role: 'WAITER', status: 'AUTHORIZED' },
                                            { name: 'Chef Vikram', id: 'K-001', role: 'KITCHEN', status: 'AUTHORIZED' },
                                            { name: 'Director_01', id: 'M-001', role: 'MANAGER', status: 'AUTHORIZED' },
                                            { name: 'Anjali Prasad', id: 'W-002', role: 'WAITER', status: 'DEACTIVATED' }
                                        ].map(user => (
                                            <tr key={user.id} className="group hover:bg-zinc-50/50 transition-colors cursor-pointer">
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-zinc-900 uppercase">{user.name}</span>
                                                        <span className="text-[9px] font-bold text-zinc-300 tabular-nums">UUID_{user.id}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="text-[10px] font-bold px-3 py-1 bg-zinc-100 rounded-full tracking-tighter">{user.role}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'AUTHORIZED' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                        <span className="text-[10px] font-black tracking-widest">{user.status}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="text-[#D43425] font-black text-[9px] uppercase tracking-widest">Deauthorize</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-3">
                                {[
                                    { name: 'Rohit Sankal', id: 'W-001', role: 'WAITER', status: 'AUTHORIZED' },
                                    { name: 'Chef Vikram', id: 'K-001', role: 'KITCHEN', status: 'AUTHORIZED' },
                                    { name: 'Director_01', id: 'M-001', role: 'MANAGER', status: 'AUTHORIZED' }
                                ].map(user => (
                                    <div key={user.id} className="bg-white p-5 rounded-2xl border border-zinc-100 flex justify-between items-center active:bg-zinc-50 transition-colors">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[7px] font-black text-zinc-300 uppercase tracking-widest">ID: {user.id}</span>
                                            <span className="font-black text-sm text-zinc-900 uppercase">{user.name}</span>
                                            <span className="text-[9px] font-bold text-zinc-400 tracking-tighter">{user.role}</span>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${user.status === 'AUTHORIZED' ? 'bg-green-500' : 'bg-red-500'}`} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'TABLES' && (
                        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-1 duration-300">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                                <div className="space-y-1">
                                    <h3 className="text-xl md:text-3xl font-black tracking-tighter uppercase">Node_Architecture</h3>
                                    <p className="text-[8px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">Floor Layout Mapping</p>
                                </div>
                                <button className="w-full md:w-auto bg-black text-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#D43425] active:scale-95 transition-all shadow-xl"> Provision_Node </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 lg:gap-6">
                                {[...Array(12)].map((_, i) => (
                                    <div key={i} className="bg-white border border-zinc-100 p-6 md:p-8 rounded-2xl md:rounded-3xl flex flex-col items-center gap-3 md:gap-4 group hover:border-[#D43425]/30 hover:shadow-xl transition-all relative overflow-hidden active:scale-95">
                                        <span className="text-3xl md:text-5xl font-black text-zinc-900 tracking-tighter leading-none">T_{i + 1}</span>
                                        <div className="flex items-center gap-1.5 md:gap-2">
                                            <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-green-500 rounded-full" />
                                            <span className="text-[7px] md:text-[8px] font-black text-zinc-400 uppercase tracking-widest">Active</span>
                                        </div>
                                        <div className="absolute top-0 left-0 w-full h-0.5 bg-zinc-50 group-hover:bg-[#D43425]/20 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'MENU' && (
                        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-1 duration-300">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                                <div className="space-y-1">
                                    <h3 className="text-xl md:text-3xl font-black tracking-tighter uppercase">Inventory_Ledger</h3>
                                    <p className="text-[8px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">Master Product Matrix</p>
                                </div>
                                <button className="w-full md:w-auto bg-black text-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#D43425] active:scale-95 shadow-xl transition-all"> Register_Item </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                {[
                                    { code: 'WAG-01', name: 'Wagyu Beef Tender', price: 8500, stock: 'AVAILABLE' },
                                    { code: 'RIS-02', name: 'Saffron Risotto', price: 2100, stock: 'AVAILABLE' },
                                    { code: 'LOB-03', name: 'Lobster Tail', price: 4200, stock: 'AVAILABLE' },
                                    { code: 'WIN-04', name: 'Reserve Red', price: 1200, stock: 'SOLD_OUT' }
                                ].map(item => (
                                    <div key={item.code} className="bg-white border border-zinc-100 p-5 md:p-8 rounded-2xl md:rounded-[2rem] flex justify-between items-center group active:scale-98 transition-all">
                                        <div className="flex flex-col gap-0.5 md:gap-1">
                                            <span className="text-[7px] md:text-[9px] font-black text-zinc-300 uppercase tracking-widest">{item.code}</span>
                                            <span className="text-base md:text-xl font-black text-zinc-900 leading-tight truncate max-w-[150px] md:max-w-none">{item.name}</span>
                                            <span className="text-xs md:text-sm font-black tabular-nums text-[#D43425]">₹{item.price.toLocaleString()}</span>
                                        </div>
                                        <div className={`px-2 md:px-3 py-1 rounded text-[7px] md:text-[8px] font-black tracking-widest border transition-all ${item.stock === 'AVAILABLE' ? 'text-green-600 border-green-100 bg-green-50' : 'text-red-600 border-red-100 bg-red-50 opacity-40'}`}>
                                            {item.stock}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'SETTINGS' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-1 duration-300 pb-20">
                            <div className="space-y-1">
                                <h3 className="text-xl md:text-3xl font-black tracking-tighter uppercase leading-none">Global_Registry_State</h3>
                                <p className="text-[8px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">Core Transaction Parameters</p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                                <div className="bg-white border border-zinc-100 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] space-y-6 md:space-y-8 shadow-sm">
                                    <span className="text-[8px] md:text-[10px] font-black text-zinc-300 uppercase tracking-[0.4em]">Fiscal_Engine</span>
                                    <div className="space-y-5 md:space-y-6">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-zinc-400">Service Tax (GST %)</label>
                                            <input type="text" defaultValue="18" className="w-full bg-zinc-50 border border-zinc-100 h-12 md:h-14 rounded-xl md:rounded-2xl px-5 md:px-6 font-black text-lg md:text-xl tabular-nums focus:bg-white transition-all outline-none" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-zinc-400">Ledger Currency</label>
                                            <input type="text" defaultValue="INR (₹)" className="w-full bg-zinc-50 border border-zinc-100 h-12 md:h-14 rounded-xl md:rounded-2xl px-5 md:px-6 font-black text-lg focus:bg-white transition-all outline-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white border border-zinc-100 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] space-y-6 md:space-y-8 shadow-sm">
                                    <span className="text-[8px] md:text-[10px] font-black text-zinc-300 uppercase tracking-[0.4em]">Node_Security</span>
                                    <div className="space-y-5 md:space-y-6">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-zinc-400">Legal Name</label>
                                            <input type="text" defaultValue="HOTEL PRO POS" className="w-full bg-zinc-50 border border-zinc-100 h-12 md:h-14 rounded-xl md:rounded-2xl px-5 md:px-6 font-black text-lg focus:bg-white transition-all outline-none uppercase" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-zinc-400">Encryption_Mode</label>
                                            <div className="p-4 bg-zinc-900 rounded-xl md:rounded-2xl flex items-center justify-between">
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">HARDENED_SHA256</span>
                                                <div className="w-1.5 h-1.5 bg-[#D43425] rounded-full animate-pulse" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 md:pt-8 flex lg:justify-end">
                                <button className="w-full lg:w-auto bg-black text-white h-16 md:h-20 px-10 md:px-12 rounded-2xl md:rounded-3xl text-xs font-black uppercase tracking-[0.3em] md:tracking-[0.4em] hover:bg-[#D43425] active:scale-95 transition-all shadow-xl">
                                    COMMIT_MASTER_STATE
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
        </div>
    );
}
