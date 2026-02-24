
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    const password = await hash('123456', 12);

    const users = [
        // SUPER ADMIN
        { username: 'admin', name: 'System Admin', role: 'ADMIN' },

        // MANAGERS
        { username: 'manager', name: 'Manager Boss', role: 'MANAGER' },

        // WAITERS
        { username: 'john', name: 'John Wick', role: 'WAITER' },
        { username: 'sarah', name: 'Sarah Connor', role: 'WAITER' },
        { username: 'neo', name: 'Thomas Anderson', role: 'WAITER' },

        // CHEFS
        { username: 'gordon', name: 'Gordon Ramsay', role: 'KITCHEN' },
        { username: 'remy', name: 'Remy Rat', role: 'KITCHEN' },

        // CASHIERS
        { username: 'money', name: 'Mr. Krabs', role: 'CASHIER' },
    ];

    // Ensure we have a client to associate users with
    let client = await prisma.client.findFirst({
        where: { slug: 'taj' }
    });

    if (!client) {
        client = await prisma.client.create({
            data: {
                name: "The Taj Residency",
                slug: "taj",
                plan: "GROWTH",
                status: "ACTIVE"
            }
        });
    }

    for (const user of users) {
        const existing = await prisma.user.findUnique({
            where: { username: user.username },
        });

        if (!existing) {
            await prisma.user.create({
                data: {
                    clientId: client.id,
                    username: user.username,
                    name: user.name,
                    passwordHash: password,
                    role: user.role as any,
                    isActive: true
                }
            });
            console.log(`✅ Created user: ${user.name} (${user.role})`);
        } else {
            console.log(`⏩ Skipped: ${user.name} (Exists)`);
        }
    }

    console.log('✅ Seeding complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
