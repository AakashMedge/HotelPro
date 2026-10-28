// Unified Printing Engine for HotelPro
// Priority 1: Direct Backend Windows Spooler (/api/print/silent) -> 0.05s Instant print, ZERO Chrome dialogs!
// Priority 2: Direct Web Hardware (Web Bluetooth / WebUSB)
// Priority 3: Fallback browser print (only if hardware & backend both unavailable)

import { EscPosBuilder, generateEscPosReceipt, ReceiptData, ReceiptItem } from './escpos';
import { HardwarePrinting, PrinterType } from './hardware';

export { EscPosBuilder, generateEscPosReceipt, HardwarePrinting };
export type { ReceiptData, ReceiptItem, PrinterType };

export const PrintingService = {
    // Unified 1-Click Print Receipt
    async printReceipt(data: ReceiptData): Promise<{ success: boolean; method: 'backend-spooler' | 'hardware' | 'browser'; message?: string }> {
        // 1. PRIMARY: Call Backend Silent Print (Windows Spooler)
        try {
            const res = await fetch('/api/print/silent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                const result = await res.json();
                if (result.success) {
                    return {
                        success: true,
                        method: 'backend-spooler',
                        message: result.message || `Printed directly to ${result.printerName}`
                    };
                }
            }
        } catch (backendErr) {
            console.warn('[BACKEND_SPOOLER] Not reachable, checking Web Hardware:', backendErr);
        }

        // 2. SECONDARY: Direct Web Hardware (Web Bluetooth / WebUSB)
        try {
            const rawBytes = generateEscPosReceipt(data);
            const hwResult = await HardwarePrinting.printDirect(rawBytes);
            if (hwResult.success && hwResult.printedDirectly) {
                return { success: true, method: 'hardware' };
            }
        } catch (hwErr) {
            console.warn('[WEB_HARDWARE] Not paired:', hwErr);
        }

        // 3. TERTIARY FALLBACK: Only if both direct methods fail
        if (typeof window !== 'undefined') {
            window.print();
        }
        return { success: true, method: 'browser' };
    },

    // Hardware printer pairing helpers
    pairBluetooth: () => HardwarePrinting.connectBluetooth(),
    pairUsb: () => HardwarePrinting.connectUsb(),
    disconnectPrinter: () => HardwarePrinting.disconnect(),
    getPairedPrinter: () => HardwarePrinting.getPairedPrinter()
};
