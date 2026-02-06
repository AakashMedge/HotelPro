/**
 * HQ - Create New Client Page
 * 
 * Super Admin page for onboarding new hotels
 * Path: /hq/clients/new
 */

import React from 'react';
import HQClientForm from '@/components/hq/HQClientForm';

export default function NewClientPage() {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <HQClientForm mode="create" />
        </div>
    );
}
