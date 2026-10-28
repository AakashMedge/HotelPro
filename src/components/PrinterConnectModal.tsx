'use client';

import { useState, useEffect } from 'react';
import { Printer, Bluetooth, Usb, CheckCircle2, AlertCircle, X, Zap } from 'lucide-react';
import { PrintingService } from '@/lib/printing/service';

interface PrinterConnectModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PrinterConnectModal({ isOpen, onClose }: PrinterConnectModalProps) {
    const [pairedInfo, setPairedInfo] = useState<{ type: string | null; name: string; connected: boolean }>({
        type: null,
        name: '',
        connected: false
    });
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setPairedInfo(PrintingService.getPairedPrinter());
            setStatusMessage(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConnectBluetooth = async () => {
        setIsConnecting(true);
        setStatusMessage('Scanning for Bluetooth thermal printers...');
        const res = await PrintingService.pairBluetooth();
        setIsConnecting(false);
        if (res.success) {
            setStatusMessage(` Connected to ${res.name}! 1-Click printing is now active.`);
            setPairedInfo(PrintingService.getPairedPrinter());
        } else {
            setStatusMessage(`❌ ${res.error}`);
        }
    };

    const handleConnectUsb = async () => {
        setIsConnecting(true);
        setStatusMessage('Selecting USB thermal printer port...');
        const res = await PrintingService.pairUsb();
        setIsConnecting(false);
        if (res.success) {
            setStatusMessage(` Connected to USB Printer! 1-Click printing is now active.`);
            setPairedInfo(PrintingService.getPairedPrinter());
        } else {
            setStatusMessage(`❌ ${res.error}`);
        }
    };

    const handleTestPrint = async () => {
        setStatusMessage('Sending test slip to printer...');
        const testBill = {
            businessName: 'HOTELPRO TEST',
            tagline: '1-Click Direct Thermal Print',
            invoiceNo: 'TEST-001',
            tableNo: 'T-1',
            items: [
                { name: 'Hardware Direct Print Test', qty: 1, price: 0 }
            ],
            subtotal: 0,
            grandTotal: 0,
            paymentMethod: 'TEST'
        };

        const res = await PrintingService.printReceipt(testBill);
        if (res.method === 'hardware') {
            setStatusMessage(' Test print sent directly to thermal hardware! (Zero popups)');
        } else {
            setStatusMessage('ℹ️ Sent via browser print (Pair USB or Bluetooth for instant silent printing).');
        }
    };

    const handleDisconnect = () => {
        PrintingService.disconnectPrinter();
        setPairedInfo({ type: null, name: '', connected: false });
        setStatusMessage('Printer disconnected.');
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-6">
                
                {/* Header */}
                <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                            <Zap size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-zinc-900 dark:text-white text-base">Direct 1-Click Printing</h3>
                            <p className="text-xs text-zinc-500">Zero Popups • ESC/POS Hardware</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Current Status Banner */}
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                    pairedInfo.connected 
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
                        : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                }`}>
                    {pairedInfo.connected ? (
                        <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle size={20} className="text-zinc-400 shrink-0 mt-0.5" />
                    )}
                    <div className="text-xs space-y-1">
                        <p className="font-bold uppercase tracking-wider text-[10px]">
                            {pairedInfo.connected ? 'Hardware Connected' : 'No Hardware Printer Connected'}
                        </p>
                        <p className="font-medium">
                            {pairedInfo.name || 'Pair your thermal printer once for 0.1s instant printing without browser dialogs.'}
                        </p>
                    </div>
                </div>

                {/* Connection Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handleConnectUsb}
                        disabled={isConnecting}
                        className="p-4 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-white flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-all group"
                    >
                        <Usb size={24} className="text-zinc-600 dark:text-zinc-300 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">Connect USB</span>
                        <span className="text-[10px] text-zinc-400">Desktop / POS</span>
                    </button>

                    <button
                        onClick={handleConnectBluetooth}
                        disabled={isConnecting}
                        className="p-4 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-white flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-all group"
                    >
                        <Bluetooth size={24} className="text-blue-500 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">Connect Bluetooth</span>
                        <span className="text-[10px] text-zinc-400">Wireless / Mobile</span>
                    </button>
                </div>

                {/* Status or Error Message */}
                {statusMessage && (
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 font-medium text-center">
                        {statusMessage}
                    </div>
                )}

                {/* Actions: Test Print & Disconnect */}
                <div className="flex gap-2 pt-2">
                    <button
                        onClick={handleTestPrint}
                        className="flex-1 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Printer size={16} /> Test Print Slip
                    </button>

                    {pairedInfo.name && (
                        <button
                            onClick={handleDisconnect}
                            className="px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl text-xs font-bold transition-colors"
                        >
                            Disconnect
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
