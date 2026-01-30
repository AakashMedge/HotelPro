
'use client';

export default function AdminSettingsPage() {
    return (
        <div className="h-full overflow-y-auto p-8 font-mono bg-[#F2F2F2]">
            <div className="max-w-4xl mx-auto space-y-8 pb-32">
                <div className="border-b-2 border-black pb-4">
                    <h1 className="text-2xl font-black uppercase tracking-tighter">Organization Configuration</h1>
                </div>

                <div className="space-y-8">
                    {/* SECTION 1 */}
                    <div className="bg-white border-2 border-black p-8 space-y-6">
                        <h3 className="font-bold uppercase tracking-widest text-sm border-b border-zinc-200 pb-2">Entity Profile</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase font-bold text-zinc-500">Legal Business Name</label>
                                <input type="text" defaultValue="HOTEL PRO POS" className="h-12 bg-zinc-50 border border-zinc-300 px-4 font-bold outline-none focus:border-black" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase font-bold text-zinc-500">Tax ID / GSTIN</label>
                                <input type="text" defaultValue="GSTIN-29AAACHO" className="h-12 bg-zinc-50 border border-zinc-300 px-4 font-bold outline-none focus:border-black" />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2 */}
                    <div className="bg-white border-2 border-black p-8 space-y-6">
                        <h3 className="font-bold uppercase tracking-widest text-sm border-b border-zinc-200 pb-2">Fiscal Policy</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase font-bold text-zinc-500">Base Currency</label>
                                <select className="h-12 bg-zinc-50 border border-zinc-300 px-4 font-bold outline-none focus:border-black">
                                    <option>INR (₹) - Indian Rupee</option>
                                    <option>USD ($) - US Dollar</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase font-bold text-zinc-500">Default Tax Rate (%)</label>
                                <input type="number" defaultValue="18.0" className="h-12 bg-zinc-50 border border-zinc-300 px-4 font-bold outline-none focus:border-black" />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button className="bg-[#D43425] text-white h-14 px-8 font-black uppercase tracking-widest text-xs hover:bg-black transition-colors shadow-lg">Save Configuration</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
