'use client';

import { useEffect } from 'react';

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[DASHBOARD_ERROR_BOUNDARY]', error);
    }, [error]);

    return (
        <div className="min-h-screen w-full bg-[#F8F7F4] text-[#111] flex items-center justify-center p-6">
            <div className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">HotelPro Recovery Layer</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight uppercase">System Connecting</h1>
                <p className="mt-4 text-sm text-zinc-600">
                    The dashboard hit a temporary fault boundary. Data and tenant isolation remain safe.
                </p>
                <div className="mt-6 flex gap-3">
                    <button
                        onClick={reset}
                        className="px-5 py-3 rounded-xl bg-[#111] text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-colors"
                    >
                        Retry Dashboard
                    </button>
                    <a
                        href="/login"
                        className="px-5 py-3 rounded-xl border border-zinc-300 text-xs font-black uppercase tracking-widest text-zinc-700 hover:bg-zinc-50 transition-colors"
                    >
                        Re-authenticate
                    </a>
                </div>
            </div>
        </div>
    );
}
