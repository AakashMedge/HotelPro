'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { QrCode, X, Camera, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QRScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending');

    useEffect(() => {
        const startScanner = async () => {
            // Check for Secure Context (HTTPS requirement for mobile cameras)
            if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
                setError('Camera access requires a secure connection (HTTPS). Please access the site via HTTPS or localhost.');
                return;
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError('Your browser does not support camera access or it is blocked by security settings.');
                return;
            }

            try {
                const scanner = new Html5Qrcode('qr-reader', {
                    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                    verbose: false
                });
                scannerRef.current = scanner;

                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                };

                await scanner.start(
                    { facingMode: 'environment' },
                    config,
                    (decodedText) => {
                        // Success!
                        scanner.stop().then(() => {
                            onScan(decodedText);
                        });
                    },
                    undefined // On scan failure (ignored for noise)
                );

                setIsScanning(true);
                setCameraPermission('granted');
            } catch (err: any) {
                console.error('[SCANNER] Error starting:', err);
                const errorStr = err?.toString() || '';

                if (errorStr.includes('NotFoundException')) {
                    setError('Camera not found. Ensure your device has a camera operational.');
                } else if (errorStr.includes('NotAllowedError') || errorStr.includes('PermissionDenied')) {
                    setCameraPermission('denied');
                    setError('Camera permission denied.');
                } else if (errorStr.includes('NotSupportedError')) {
                    setError('Camera access not supported on this browser/connection.');
                } else {
                    setError('Failed to start camera. If on mobile, ensure you are using HTTPS.');
                }
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, [onScan]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6"
        >
            <div className="w-full max-w-sm flex flex-col items-center gap-8">
                {/* Header */}
                <div className="w-full flex justify-between items-center text-white/60">
                    <div className="flex items-center gap-2">
                        <Camera size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Active Scanner</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-all text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scanner Frame */}
                <div className="relative w-full aspect-square bg-zinc-900 rounded-4xl overflow-hidden border-2 border-white/10 shadow-2xl">
                    <div id="qr-reader" className="w-full h-full" />

                    {/* Overlay UI */}
                    <div className="absolute inset-0 pointer-events-none z-10">
                        {/* Scanning Line */}
                        {isScanning && (
                            <motion.div
                                animate={{ top: ['10%', '90%', '10%'] }}
                                transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                                className="absolute left-0 right-0 h-[2px] bg-[#D43425] shadow-[0_0_15px_rgba(212,52,37,0.8)]"
                            />
                        )}

                        {/* Corners */}
                        <div className="absolute top-12 left-12 w-8 h-8 border-t-4 border-l-4 border-white/40 rounded-tl-xl" />
                        <div className="absolute top-12 right-12 w-8 h-8 border-t-4 border-r-4 border-white/40 rounded-tr-xl" />
                        <div className="absolute bottom-12 left-12 w-8 h-8 border-b-4 border-l-4 border-white/40 rounded-bl-xl" />
                        <div className="absolute bottom-12 right-12 w-8 h-8 border-b-4 border-r-4 border-white/40 rounded-br-xl" />
                    </div>

                    {/* Permissions/Error States */}
                    <AnimatePresence>
                        {cameraPermission === 'denied' && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center text-center p-8 gap-4"
                            >
                                <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center text-rose-500">
                                    <Camera size={32} />
                                </div>
                                <h3 className="text-white font-black uppercase tracking-widest text-sm text-ink-light">Camera Restricted</h3>
                                <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest leading-relaxed">
                                    Please enable camera access in your <br /> browser settings to scan.
                                </p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="mt-4 px-6 py-3 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest"
                                >
                                    Try Again
                                </button>
                            </motion.div>
                        )}

                        {error && cameraPermission !== 'denied' && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center text-center p-8 gap-4"
                            >
                                <RefreshCcw size={32} className="text-rose-500" />
                                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{error}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Instructions */}
                <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2">
                        <QrCode size={16} className="text-[#D43425]" />
                        <p className="text-white text-[12px] font-black uppercase tracking-[0.2em]">Align QR Code</p>
                    </div>
                    <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest leading-relaxed max-w-[200px] mx-auto">
                        Place the table QR code within the frame for automatic detection.
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

export default QRScanner;
