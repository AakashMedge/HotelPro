
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

async function checkTables() {
    if (!connectionString) return;
    const adapter = new PrismaNeon({ connectionString });
    const prisma = new PrismaClient({ adapter });

    try {
        const tables = await prisma.table.findMany({
            select: { id: true, tableCode: true, status: true }
        });
        console.log("Current Tables:", JSON.stringify(tables, null, 2));
    } catch (err: any) {
        console.error("Query failed:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkTables();
