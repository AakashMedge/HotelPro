import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const channels = await (prisma as any).chatChannel.findMany({
            where: { clientId: user.clientId },
            orderBy: { createdAt: 'asc' }
        });

        // Initialize default channels if none exist
        if (channels.length === 0) {
            const defaults = [
                { name: 'general-ops', type: 'GENERAL', clientId: user.clientId },
                { name: 'kitchen-sync', type: 'SERVICE', clientId: user.clientId },
                { name: 'admin-mod-only', type: 'ADMIN_ONLY', clientId: user.clientId }
            ];
            await (prisma as any).chatChannel.createMany({ data: defaults });
            const freshChannels = await (prisma as any).chatChannel.findMany({
                where: { clientId: user.clientId },
                orderBy: { createdAt: 'asc' }
            });
            return NextResponse.json({ success: true, channels: freshChannels });
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
