import React from 'react';

/**
 * Basic layout for Super Admin group
 * The actual protected layout is at (super-admin)/hq/layout.tsx
 */
export default function SuperAdminRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
