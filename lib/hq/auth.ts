/**
 * Super Admin (HQ) Authentication Utilities
 * 
 * This is SEPARATE from normal user auth because Super Admins
 * are platform-level operators, not tenant users.
 */

import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '@/lib/db';
import * as bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const HQ_JWT_SECRET = new TextEncoder().encode(
    process.env.HQ_JWT_SECRET || 'hotelpro-super-admin-secret-key-change-in-production'
);

const HQ_TOKEN_EXPIRY = '24h';

export interface HQTokenPayload {
    sub: string; // SuperAdmin ID
    email: string;
    iat: number;
    exp: number;
}

/**
 * Sign a JWT for Super Admin
 */
export async function signHQToken(superAdminId: string, email: string): Promise<string> {
    return new SignJWT({
        sub: superAdminId,
        email
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(HQ_TOKEN_EXPIRY)
        .sign(HQ_JWT_SECRET);
}

/**
 * Verify and decode a Super Admin token
 */
export async function verifySuperAdminToken(token: string): Promise<{ id: string; email: string } | null> {
    try {
        const { payload } = await jwtVerify(token, HQ_JWT_SECRET);

        if (!payload.sub || !payload.email) {
            return null;
        }

        // Verify Super Admin still exists in database
        const superAdmin = await prisma.superAdmin.findUnique({
            where: { id: payload.sub as string }
        });

        if (!superAdmin || !superAdmin.isActive) {
            return null;
        }

        return {
            id: superAdmin.id,
            email: superAdmin.email
        };
    } catch (error) {
        console.error('[HQ_AUTH] Token verification failed:', error);
        return null;
    }
}

/**
 * Server-side protection helper for API routes
 * Throws an error or returns the super admin if valid
 */
export async function requireSuperAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('hq-token')?.value;

    if (!token) {
        throw new Error('Super Admin access required');
    }

    const superAdmin = await verifySuperAdminToken(token);
    if (!superAdmin) {
        throw new Error('Invalid or expired Super Admin session');
    }

    return superAdmin;
}

/**
 * Validate Super Admin credentials and return user if valid
 */
export async function validateSuperAdminCredentials(
    email: string,
    password: string
): Promise<{ id: string; email: string } | null> {
    const superAdmin = await prisma.superAdmin.findUnique({
        where: { email }
    });

    if (!superAdmin || !superAdmin.isActive) {
        return null;
    }

    const isValid = await bcrypt.compare(password, superAdmin.passwordHash);
    if (!isValid) {
        return null;
    }

    // Update last login
    await prisma.superAdmin.update({
        where: { id: superAdmin.id },
        data: { lastLogin: new Date() }
    });

    return {
        id: superAdmin.id,
        email: superAdmin.email
    };
}

/**
 * Hash a password for Super Admin
 */
export async function hashHQPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}
