export default function DashboardLoading() {
    return (
        <div className="min-h-screen w-full bg-[#F8F7F4] text-[#111] flex items-center justify-center p-6">
            <div className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">HotelPro Dashboard</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight uppercase">Syncing Control Plane</h1>
                <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-zinc-900" />
                </div>
                <p className="mt-4 text-sm text-zinc-500">Preparing role context, tenant boundary, and live metrics.</p>
            </div>
        </div>
    );
}
