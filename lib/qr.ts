import { randomBytes, createHmac } from "crypto";

export function generateSecretToken(): string {
    return randomBytes(32).toString('hex'); // 64-char hex = 256-bit
}

export function generateShortCode(prefix: string, tableCode: string): string {
    const cleanTable = tableCode.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    return `QR-${prefix}-${cleanTable}`;
}

export function signPayload(secretToken: string, shortCode: string, version: number): string {
    const hmacSecret = process.env.JWT_SECRET || 'hotelpro-qr-default';
    const payload = `${shortCode}:${version}:${secretToken}`;
    return createHmac('sha256', hmacSecret).update(payload).digest('hex').slice(0, 16);
}

export function buildQrUrl(baseUrl: string, shortCode: string, secret: string, version: number, signature: string): string {
    return `${baseUrl}/welcome-guest?qr=${encodeURIComponent(shortCode)}&s=${secret.slice(0, 16)}&v=${version}&sig=${signature}`;
}
