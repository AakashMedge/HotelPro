import { NextResponse } from 'next/server';
import { validateSuperAdminCredentials, signHQToken } from '@/lib/hq/auth';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { success: false, message: 'Email and password are required' },
                { status: 400 }
            );
        }

        // 1. Validate Credentials
        const admin = await validateSuperAdminCredentials(email, password);

        if (!admin) {
            return NextResponse.json(
                { success: false, message: 'Invalid credentials or inactive account' },
                { status: 401 }
            );
        }

        // 2. Create Session JWT
        const token = await signHQToken(admin.id, admin.email);

        // 3. Set Cookie
        const response = NextResponse.json({
            success: true,
            message: 'Dashboard access granted'
        });

        // Use 'hq-token' to match the layout check
        response.cookies.set('hq-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 24 hours (matches JWT expiry)
            path: '/',
        });

        return response;

    } catch (error) {
        console.error('[SUPER_ADMIN_LOGIN_ERROR]', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error during authentication' },
            { status: 500 }
        );
    }
}
