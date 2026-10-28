import { NextRequest, NextResponse } from 'next/server';
import { generateEscPosReceipt, ReceiptData } from '@/lib/printing/escpos';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import util from 'util';

const execFileAsync = util.promisify(execFile);

export async function POST(req: NextRequest) {
    try {
        const body: ReceiptData = await req.json();

        // 1. Generate standard ESC/POS binary data
        const bytes = generateEscPosReceipt({
            ...body,
            paperWidth: body.paperWidth || '58mm',
            qrLink: body.qrLink || 'https://hotel-pro-devionx.vercel.app'
        });

        const base64Data = Buffer.from(bytes).toString('base64');

        const exePath = path.join(process.cwd(), 'scripts', 'RawPrinter.exe');
        const scriptPath = path.join(process.cwd(), 'scripts', 'raw-print.ps1');

        let stdout = '';
        let stderr = '';

        // 2. High-Speed Direct Spooler Execution (0.05s)
        if (fs.existsSync(exePath)) {
            const res = await execFileAsync(exePath, [base64Data, 'auto']);
            stdout = res.stdout;
            stderr = res.stderr;
        } else {
            // Fallback to PowerShell script
            const res = await execFileAsync('powershell.exe', [
                '-ExecutionPolicy', 'Bypass',
                '-File', scriptPath,
                '-Base64Data', base64Data
            ]);
            stdout = res.stdout;
            stderr = res.stderr;
        }

        const output = (stdout || '').trim();

        if (output.includes('SUCCESS:')) {
            const printerMatch = output.match(/Printed to (.+)$/);
            const printerName = printerMatch ? printerMatch[1] : 'Thermal Printer';

            return NextResponse.json({
                success: true,
                printerName,
                message: `Bill printed directly to ${printerName} in 0.05s (Zero Dialogs)`
            });
        }

        return NextResponse.json({
            success: false,
            error: output || stderr || 'Could not write raw data to printer'
        }, { status: 500 });

    } catch (err: any) {
        console.error('[SILENT_PRINT_ERROR]', err);
        return NextResponse.json({
            success: false,
            error: err.message || 'Internal server error while printing'
        }, { status: 500 });
    }
}
