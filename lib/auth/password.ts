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
