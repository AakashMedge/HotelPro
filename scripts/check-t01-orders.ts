
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

async function checkOrders() {
    if (!connectionString) return;
    const adapter = new PrismaNeon({ connectionString });
    const prisma = new PrismaClient({ adapter });

    try {
        const table = await prisma.table.findFirst({
            where: { tableCode: 'T-01' },
            include: { orders: { orderBy: { createdAt: 'desc' }, take: 5 } }
        });
        console.log("Table T-01 and its orders:", JSON.stringify(table, null, 2));
    } catch (err: any) {
        console.error("Query failed:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkOrders();
