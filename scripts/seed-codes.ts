/**
 * Seed script to assign access codes to existing hotels.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import 'dotenv/config';

// 1. Configure Neon for Node.js
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function seed() {
    console.log('--- ASSIGNING ACCESS CODES TO HOTELS ---');

    try {
        const clients = await prisma.client.findMany({
            where: { accessCode: null }
        });

        console.log(`Found ${clients.length} clients without access codes.`);

        for (const client of clients) {
            // Generate a 6-character code based on slug
            const prefix = client.slug.substring(0, 3).toUpperCase();
            // Pad with random numbers to reach 6 chars if needed, or just append random digits
            const suffix = Math.floor(100 + Math.random() * 899); // 3-digit random
            const code = `${prefix}${suffix}`.substring(0, 6).toUpperCase();

            await prisma.client.update({
                where: { id: client.id },
                data: { accessCode: code }
            });
            console.log(`Assigned code ${code} to ${client.name} (${client.slug})`);
        }

        console.log('Seeding completed successfully.');
    } catch (error) {
        console.error('Error seeding access codes:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seed();
