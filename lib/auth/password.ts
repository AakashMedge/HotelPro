/**
 * Password Hashing Utilities
 * 
 * Provides secure password hashing and verification using bcrypt.
 * This module is used during user creation and login verification.
 * 
 * Security notes:
 * - Uses bcryptjs (pure JS implementation, works in all environments)
 * - Cost factor of 12 provides good security/performance balance
 * - Each hash includes a unique salt automatically
 * - Timing-safe comparison prevents timing attacks
 */

import bcrypt from "bcryptjs";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "42b0c9f1a2384e567d890a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f"; // Fallback for local dev
const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;


/**
 * Cost factor for bcrypt hashing.
 * Higher = more secure but slower.
 * 12 is recommended for production (2025 standards).
 */
const BCRYPT_COST = 12;

/**
 * Hash a plaintext password for secure storage.
 * 
 * @param plainPassword - The user's plaintext password
 * @returns The hashed password (includes salt, ~60 characters)
 * 
 * @example
 * const hash = await hashPassword("mySecurePassword123");
 * // Store hash in User.passwordHash
 */
export async function hashPassword(plainPassword: string): Promise<string> {
    if (!plainPassword || plainPassword.length < 1) {
        throw new Error("Password cannot be empty");
    }

    const hash = await bcrypt.hash(plainPassword, BCRYPT_COST);
    return hash;
}

/**
 * Verify a plaintext password against a stored hash.
 * 
 * @param plainPassword - The password attempt from login
 * @param storedHash - The hash stored in User.passwordHash
 * @returns True if the password matches, false otherwise
 * 
 * @example
 * const user = await prisma.user.findUnique({ where: { username } });
 * const isValid = await verifyPassword(inputPassword, user.passwordHash);
 */
export async function verifyPassword(
    plainPassword: string,
    storedHash: string
): Promise<boolean> {
    if (!plainPassword || !storedHash) {
        return false;
    }

    const isMatch = await bcrypt.compare(plainPassword, storedHash);
    return isMatch;
}

/**
 * Reversible Vault: Encrypt a plaintext password for Admin viewing.
 * 
 * Uses AES-256-CBC encryption for secure storage that the Admin can unlock.
 */
export function encryptPassword(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Reversible Vault: Decrypt a stored password for Admin viewing.
 */
export function decryptPassword(text: string): string {
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift()!, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        console.error("[DECRYPTION_ERROR]", e);
        return "Decryption Error";
    }
}

