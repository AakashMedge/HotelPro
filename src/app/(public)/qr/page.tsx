'use client';

/**
 * QR Scanner Landing Page
 * 
 * This page catches direct /qr navigation and redirects
 * to the welcome-guest flow where QR validation happens.
 * 
 * In the real flow, QR codes link directly to /welcome-guest?qr=...
 * so this page serves as a fallback/manual-scan option.
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, Camera, AlertTriangle, ArrowRight } from 'lucide-react';
import Image from 'next/image';

export default function QRPage() {
    const router = useRouter();
    const [manualCode, setManualCode] = useState('');
    const [error, setError] = useState('');

    const handleManualEntry = () => {
        if (!manualCode.trim()) {
            setError('Please enter a table code');
            return;
        }
        // Redirect to welcome-guest with table code
        router.push(`/welcome-guest?table=${encodeURIComponent(manualCode.trim())}`);
    };

    return (
        <main className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md space-y-10 text-center">
                {/* Hero */}
                <div className="space-y-4">
                    <div className="w-20 h-20 bg-[#D43425]/10 rounded-full flex items-center justify-center mx-auto">
                        <QrCode size={40} className="text-[#D43425]" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-playfair font-black text-[#1A1A1A]">
                        Scan Your <span className="text-[#D43425]">Table QR</span>
                    </h1>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-400 max-w-xs mx-auto leading-relaxed">
                        Scan the QR code on your table to view the menu and place orders instantly.
                    </p>
                </div>

                {/* Camera CTA */}
                <div className="bg-white rounded-[3rem] border-2 border-zinc-100 p-10 space-y-6 shadow-sm">
                    <div className="w-32 h-32 bg-zinc-50 rounded-3xl flex items-center justify-center mx-auto border border-zinc-200">
                        <Camera size={48} className="text-zinc-300" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        Point your phone camera at the QR code on your table
                    </p>
                </div>

                {/* Manual Entry */}
                <div className="space-y-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-300">Or enter table code manually</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="e.g. T-01"
                            value={manualCode}
                            onChange={e => { setManualCode(e.target.value.toUpperCase()); setError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleManualEntry()}
                            className="flex-1 px-6 py-4 bg-white border-2 border-zinc-100 rounded-2xl text-sm font-bold uppercase tracking-widest text-center outline-none focus:border-[#D43425] transition-all"
                        />
                        <button
                            onClick={handleManualEntry}
                            className="px-6 py-4 bg-[#D43425] text-white rounded-2xl font-black text-xs hover:bg-black transition-all active:scale-95"
                        >
                            <ArrowRight size={18} />
                        </button>
                    </div>
                    {error && (
                        <p className="text-xs font-bold text-rose-500 flex items-center justify-center gap-1">
                            <AlertTriangle size={12} /> {error}
                        </p>
                    )}
                </div>

                {/* Access Code Link */}
                <button
                    onClick={() => router.push('/welcome-guest')}
                    className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest hover:text-[#D43425] transition-colors"
                >
                    Have an access code? Enter here →
                </button>
            </div>
        </main>
    );
}
