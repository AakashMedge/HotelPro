import { prisma } from '../lib/db';
import bcrypt from 'bcryptjs';

async function createInitialAdmin() {
    const email = 'admin@hotelpro.com';
    const password = 'SuperSecretAccess2026!'; // Change this immediately!
    const name = 'HotelPro Global Admin';

    console.log('--- Super Admin Provisioning Tool ---');

    try {
        const passwordHash = await bcrypt.hash(password, 12);

        const admin = await prisma.superAdmin.upsert({
            where: { email },
            update: {
                passwordHash,
                isActive: true,
            },
            create: {
                email,
                name,
                passwordHash,
                isActive: true,
            },
        });

        console.log(`✨ Super Admin created successfully!`);
        console.log(`📧 Email: ${admin.email}`);
        console.log(`🔑 Access confirmed.`);
    } catch (err) {
        console.error('❌ Failed to create admin. Make sure the database schema is pushed first.');
        console.error(err);
    }
}

createInitialAdmin();
