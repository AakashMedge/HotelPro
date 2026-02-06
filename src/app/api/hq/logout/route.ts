import { NextResponse } from 'next/server';

/**
 * Super Admin (HQ) Logout
 */
export async function GET() {
    const response = NextResponse.redirect(new URL('/hq-login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));

    // Clear the hq-token cookie
    response.cookies.set('hq-token', '', {
        httpOnly: true,
        expires: new Date(0),
        path: '/',
    });

    return response;
}
