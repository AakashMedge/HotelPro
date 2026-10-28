// Web Hardware Direct Thermal Printing Engine (USB & Bluetooth)
// Directly communicates with Thermal Printers without browser print dialogs.

export type PrinterType = 'bluetooth' | 'usb' | null;

interface ActivePrinterState {
    type: PrinterType;
    name: string;
    connected: boolean;
}

// Bluetooth GATT characteristic for writing
let activeBleCharacteristic: any = null;
let activeBleDevice: any = null;

// Serial / USB port writer
let activeSerialPort: any = null;
let activeSerialWriter: any = null;

const STORAGE_KEY = 'hotelpro_paired_printer';

export const HardwarePrinting = {
    // 1. Get current paired printer info from localStorage
    getPairedPrinter(): ActivePrinterState {
        if (typeof window === 'undefined') {
            return { type: null, name: '', connected: false };
        }
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    ...parsed,
                    connected: (parsed.type === 'bluetooth' && !!activeBleCharacteristic) ||
                               (parsed.type === 'usb' && !!activeSerialWriter)
                };
            }
        } catch { /* ignore */ }
        return { type: null, name: '', connected: false };
    },

    // 2. Connect to Bluetooth Thermal Printer (BLE / SPP GATT)
    async connectBluetooth(): Promise<{ success: boolean; name?: string; error?: string }> {
        if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
            return {
                success: false,
                error: 'Web Bluetooth is not supported in this browser. Please use Google Chrome or Edge.'
            };
        }

        try {
            // Standard Thermal Printer 16-bit and 128-bit Service UUIDs (Epson, POS-58, POS-80, PT-210, etc.)
            const device = await (navigator as any).bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'POS' },
                    { namePrefix: 'MPT' },
                    { namePrefix: 'RPP' },
                    { namePrefix: 'BlueTooth' },
                    { namePrefix: 'Printer' },
                    { namePrefix: 'Thermal' },
                    { namePrefix: 'Inner' },
                    { namePrefix: 'EP' }
                ],
                optionalServices: [
                    '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS
                    'e7810a71-73ae-499d-8c15-44aab9f336f0', // Everycom / Xprinter
                    '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC
                    '0000ff00-0000-1000-8000-00805f9b34fb',
                    '0000ae00-0000-1000-8000-00805f9b34fb',
                    '0000af00-0000-1000-8000-00805f9b34fb'
                ],
                acceptAllDevices: false
            }).catch(async () => {
                // Fallback to acceptAllDevices if filtered scan does not show the printer
                return await (navigator as any).bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: [
                        '000018f0-0000-1000-8000-00805f9b34fb',
                        'e7810a71-73ae-499d-8c15-44aab9f336f0',
                        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
                        '0000ff00-0000-1000-8000-00805f9b34fb',
                        '0000ae00-0000-1000-8000-00805f9b34fb',
                        '0000af00-0000-1000-8000-00805f9b34fb'
                    ]
                });
            });

            if (!device) return { success: false, error: 'No device selected' };

            const server = await device.gatt?.connect();
            if (!server) return { success: false, error: 'Could not connect to printer GATT server' };

            // Find write characteristic across available services
            const services = await server.getPrimaryServices().catch(() => []);
            let writeChar: any = null;

            for (const s of services) {
                const chars = await s.getCharacteristics().catch(() => []);
                for (const c of chars) {
                    if (c.properties.write || c.properties.writeWithoutResponse) {
                        writeChar = c;
                        break;
                    }
                }
                if (writeChar) break;
            }

            if (!writeChar) {
                return { success: false, error: 'Connected to device, but no writable print service found.' };
            }

            activeBleDevice = device;
            activeBleCharacteristic = writeChar;

            const name = device.name || 'Bluetooth Thermal Printer';
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ type: 'bluetooth', name, connected: true }));

            return { success: true, name };
        } catch (err: any) {
            console.error('Bluetooth Connect Error:', err);
            return { success: false, error: err.message || 'Bluetooth connection failed' };
        }
    },

    // 3. Connect to USB Thermal Printer (Web Serial / USB COM)
    async connectUsb(): Promise<{ success: boolean; name?: string; error?: string }> {
        if (typeof navigator === 'undefined' || !(navigator as any).serial) {
            return {
                success: false,
                error: 'Web Serial is not supported in this browser. Please use Chrome/Edge on Desktop.'
            };
        }

        try {
            const port = await (navigator as any).serial.requestPort();
            await port.open({ baudRate: 9600 }); // standard thermal baud rate: 9600 or 115200

            activeSerialPort = port;
            activeSerialWriter = port.writable.getWriter();

            const name = 'USB Thermal Printer';
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ type: 'usb', name, connected: true }));

            return { success: true, name };
        } catch (err: any) {
            console.error('USB Connect Error:', err);
            return { success: false, error: err.message || 'USB connection failed' };
        }
    },

    // 4. Send Raw ESC/POS bytes directly (0.1s instant hardware print)
    async printDirect(bytes: Uint8Array): Promise<{ success: boolean; printedDirectly: boolean; error?: string }> {
        // Try Bluetooth first if active
        if (activeBleCharacteristic) {
            try {
                // Send in chunks of 100 bytes (standard BLE MTU safe limit)
                const chunkSize = 100;
                for (let i = 0; i < bytes.length; i += chunkSize) {
                    const chunk = bytes.slice(i, i + chunkSize);
                    if (activeBleCharacteristic.writeValueWithoutResponse) {
                        await activeBleCharacteristic.writeValueWithoutResponse(chunk);
                    } else {
                        await activeBleCharacteristic.writeValue(chunk);
                    }
                    // Tiny 15ms pause between packets for printer buffer
                    await new Promise(r => setTimeout(r, 15));
                }
                return { success: true, printedDirectly: true };
            } catch (err: any) {
                console.error('Bluetooth Write Error:', err);
                activeBleCharacteristic = null; // reset
            }
        }

        // Try USB Serial if active
        if (activeSerialWriter) {
            try {
                await activeSerialWriter.write(bytes);
                return { success: true, printedDirectly: true };
            } catch (err: any) {
                console.error('USB Serial Write Error:', err);
                activeSerialWriter = null;
            }
        }

        // If neither direct channel is active
        return { success: false, printedDirectly: false, error: 'No active direct printer' };
    },

    // 5. Disconnect current hardware
    disconnect() {
        if (activeBleDevice?.gatt?.connected) {
            activeBleDevice.gatt.disconnect();
        }
        activeBleCharacteristic = null;
        activeBleDevice = null;

        if (activeSerialWriter) {
            try { activeSerialWriter.releaseLock(); } catch { /* ignore */ }
        }
        if (activeSerialPort) {
            try { activeSerialPort.close(); } catch { /* ignore */ }
        }
        activeSerialWriter = null;
        activeSerialPort = null;

        if (typeof window !== 'undefined') {
            localStorage.removeItem(STORAGE_KEY);
        }
    }
};
