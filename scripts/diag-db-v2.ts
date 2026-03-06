
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

async function testConnection() {
    console.log("Testing connection to Neon...");
    if (!connectionString) {
        console.error("DATABASE_URL not found");
        return;
    }

    const adapter = new PrismaNeon({ connectionString });
    const prisma = new PrismaClient({ adapter });

    const start = Date.now();
    try {
        const result = await prisma.$queryRaw`SELECT 1 as connected`;
        console.log("Connection successful:", result);
        console.log("Latency:", Date.now() - start, "ms");

        const tableCount = await prisma.table.count();
        console.log("Table count:", tableCount);
    } catch (err: any) {
        console.error("Connection failed:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
