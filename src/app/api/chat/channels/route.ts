import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        // ADMIN_ONLY channels are restricted to ADMIN and MANAGER roles only
        const isPrivilegedRole = ['ADMIN', 'MANAGER'].includes(user.role);

        const channels = await (prisma as any).chatChannel.findMany({
            where: {
                clientId: user.clientId,
                // Waiter, Kitchen, Cashier cannot see ADMIN_ONLY channels
                ...(isPrivilegedRole ? {} : { type: { not: 'ADMIN_ONLY' } })
            },
            orderBy: { createdAt: 'asc' }
        });

        // Ensure guest-feedback channel exists
        const feedbackChannel = channels.find((c: any) => c.type === 'CUSTOMER_FEEDBACK');
        if (!feedbackChannel) {
            await (prisma as any).chatChannel.create({
                data: { name: 'guest-feedback', type: 'CUSTOMER_FEEDBACK', clientId: user.clientId }
            });
            // Refresh channels list
            const updatedChannels = await (prisma as any).chatChannel.findMany({
                where: { clientId: user.clientId },
                orderBy: { createdAt: 'asc' }
            });
            return NextResponse.json({ success: true, channels: updatedChannels });
        }

        return NextResponse.json({ success: true, channels });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: "Only admins can create channels" }, { status: 403 });
        }

        const { name, type } = await req.json();
        const channel = await (prisma as any).chatChannel.create({
            data: {
                clientId: user.clientId,
                name: name.toLowerCase().replace(/\s+/g, '-'),
                type: type || 'GENERAL'
            }
        });

        return NextResponse.json({ success: true, channel });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to create channel" }, { status: 500 });
    }
}
