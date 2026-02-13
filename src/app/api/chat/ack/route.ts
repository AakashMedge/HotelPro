import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const { messageId } = await req.json();

        const ack = await (prisma as any).chatAck.upsert({
            where: {
                messageId_userId: {
                    messageId,
                    userId: user.id
                }
            },
            update: {}, // If already exists, do nothing
            create: {
                messageId,
                userId: user.id
            }
        });

        return NextResponse.json({ success: true, ack });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to acknowledge message" }, { status: 500 });
    }
}
