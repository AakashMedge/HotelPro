import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySuperAdminToken } from '@/lib/hq/auth';
import {
    LogOut,
    Search,
    Bell,
    Fingerprint
} from 'lucide-react';
import { HQNavigation } from '@/components/hq/navigation';
import { HQProfileArea } from '@/components/hq/HQProfileArea';

// Server Component - checks authentication for ALL pages under /hq
export default async function HQLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // 🔒 AUTHENTICATION CHECK
    const cookieStore = await cookies();
    const token = cookieStore.get('hq-token')?.value;

    if (!token) {
        redirect('/hq-login');
    }

    // Verify the Super Admin token is valid
    const superAdmin = await verifySuperAdminToken(token);
    if (!superAdmin) {
        redirect('/hq-login');
    }

    return (
        <div className="flex min-h-screen bg-[#FBFBFB]">
            {/* MINIMALIST SIDEBAR WITH COLOR ACCENTS */}
            <aside className="w-72 border-r border-zinc-100 flex flex-col fixed inset-y-0 left-0 z-50 bg-[#FBFBFB]">
                {/* Logo Area */}
                <div className="h-24 flex items-center px-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Fingerprint className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-zinc-950 font-black tracking-tighter text-xl uppercase italic">HQ <span className="text-indigo-600 font-light">PRO</span></span>
                    </div>
                </div>

                {/* Nav Links (Client Component for active states) */}
                <HQNavigation />

                {/* Profile Area with Change Password Modal */}
                <HQProfileArea email={superAdmin.email} />
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 pl-72 flex flex-col min-h-screen">
                {/* TOP HEADER */}
                <header className="h-20 bg-[#FBFBFB]/90 backdrop-blur-xl flex items-center justify-between px-16 sticky top-0 z-40 border-b border-zinc-100">
                    <div className="flex items-center gap-6 text-zinc-400">
                        <Search className="w-4 h-4 text-indigo-600/50" />
                        <input
                            type="text"
                            placeholder="System query..."
                            className="text-xs bg-transparent border-none outline-none w-64 focus:w-80 transition-all font-bold placeholder:text-zinc-300 tracking-wide text-zinc-900"
                        />
                    </div>

                    <div className="flex items-center gap-10">
                        <div className="flex items-center gap-8">
                            <button className="relative p-2.5 bg-white border border-zinc-100 rounded-xl text-zinc-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm group">
                                <Bell className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-indigo-600 rounded-full ring-2 ring-white"></span>
                            </button>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100 shadow-sm shadow-emerald-500/10">
                            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Core Protected</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                    </div>
                </header>

                {/* PAGE CONTENT */}
                <div className="p-16 grow pt-20">
                    {children}
                </div>
            </main>
        </div>
    );
}
