
import React from 'react';
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import SharedHub from '@/components/chat/SharedHub';

/**
 * Manager Hub Page
 * Server-side data fetching to ensure tenant context is passed.
 */
export default async function ManagerHubPage() {
    const user = await getCurrentUser();

    // Safety check: Ensure only Admin/Manager can reach this dashboard section
    if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
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
