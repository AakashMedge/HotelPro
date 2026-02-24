
import React from 'react';
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import SharedHub from '@/components/chat/SharedHub';

export default async function AdminHubPage() {
    const user = await getCurrentUser();
    if (!user || user.role === 'SUPER_ADMIN') {
        redirect('/login');
    }

    const client = await prisma.client.findUnique({
        where: { id: user.clientId },
        select: {
            id: true,
            name: true,
            plan: true
        }
    });

    if (!client) {
        redirect('/login');
    }

    return (
        <SharedHub
            role={user.role as any}
            clientId={client.id}
            plan={client.plan}
        />
    );
}
