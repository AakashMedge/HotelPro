/**
 * HQ - Edit Client Page
 * 
 * Super Admin page for modifying hotel configuration
 * Path: /hq/clients/[clientId]/edit
 */

import React from 'react';
import { notFound } from 'next/navigation';
import HQClientForm from '@/components/hq/HQClientForm';
import { getClientById } from '@/lib/hq/client-actions';

interface PageProps {
    params: Promise<{ clientId: string }>;
}

export default async function EditClientPage({ params }: PageProps) {
    const { clientId } = await params;
    const client = await getClientById(clientId);

    if (!client) {
        notFound();
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <HQClientForm
                mode="edit"
                initialData={{
                    id: client.id,
                    name: client.name,
                    slug: client.slug,
                    domain: client.domain,
                    plan: client.plan as any
                }}
            />
        </div>
    );
}
