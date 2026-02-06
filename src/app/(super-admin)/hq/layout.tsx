import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySuperAdminToken } from '@/lib/hq/auth';
import {
    LayoutDashboard,
    Building2,
    CreditCard,
    ShieldCheck,
    Settings,
    LogOut,
    Search,
    Bell,
} from 'lucide-react';

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
        <div className="flex min-h-screen bg-[#F8FAFC]">
            {/* SIDEBAR */}
            <aside className="w-64 bg-[#0F172A] text-slate-300 flex flex-col fixed inset-y-0 left-0 z-50">
                {/* Logo Area */}
                <div className="p-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold italic">H</div>
                    <span className="text-white font-bold tracking-tight text-lg">HotelPro <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-md uppercase ml-1">HQ</span></span>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 px-4 py-4 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">Main Menu</div>

                    <Link href="/hq/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-all text-sm group">
                        <LayoutDashboard className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
                        Command Center
                    </Link>

                    <Link href="/hq/clients" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-all text-sm group">
                        <Building2 className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
                        Client Management
                    </Link>

                    <Link href="/hq/subscriptions" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-all text-sm group">
                        <CreditCard className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
                        Plans & Billing
                    </Link>

                    <Link href="/hq/security" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-all text-sm group">
                        <ShieldCheck className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
                        Security & Logs
                    </Link>

                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mt-6 mb-2">System</div>

                    <Link href="/hq/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-all text-sm group">
                        <Settings className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
                        Global Settings
                    </Link>
                </nav>

                {/* Footer User Profile */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3 px-2 py-2">
                        <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 overflow-hidden border border-slate-600 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{superAdmin.email.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{superAdmin.email.split('@')[0]}</p>
                            <p className="text-[10px] text-slate-500 truncate">Platform Owner</p>
                        </div>
                        <a href="/api/hq/logout" className="text-slate-500 hover:text-red-400 transition-colors">
                            <LogOut className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 pl-64 flex flex-col min-h-screen">
                {/* TOP HEADER */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
                    <div className="flex items-center gap-4 text-slate-600">
                        <Search className="w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search clients, transactions, logs..."
                            className="text-sm bg-transparent border-none outline-none w-64 focus:w-80 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="h-4 w-px bg-slate-200 mx-2"></div>
                        <div className="flex items-center gap-4 text-slate-600">
                            <span className="text-xs font-medium">Status: <span className="text-emerald-500 font-bold uppercase">Healthy</span></span>
                        </div>
                    </div>
                </header>

                {/* PAGE CONTENT */}
                <div className="p-8 grow">
                    {children}
                </div>
            </main>
        </div>
    );
}
