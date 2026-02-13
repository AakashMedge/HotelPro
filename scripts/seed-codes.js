require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function seed() {
    const prisma = new PrismaClient();

    try {
        const clients = await prisma.client.findMany({
            where: { accessCode: null }
        });

        console.log(`Found ${clients.length} clients without access codes.`);

        for (const client of clients) {
            const prefix = client.slug.substring(0, 3).toUpperCase();
            const suffix = Math.floor(1000 + Math.random() * 9000);
            const code = `${prefix}${suffix}`;

            await prisma.client.update({
                where: { id: client.id },
                data: { accessCode: code }
            });
            console.log(`Assigned code ${code} to ${client.name}`);
        }

        console.log('Seeding completed successfully.');
    } catch (error) {
        console.error('Error seeding access codes:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seed();
