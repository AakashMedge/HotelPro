
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

async function checkTenant() {
    if (!connectionString) return;
    const adapter = new PrismaNeon({ connectionString });
    const prisma = new PrismaClient({ adapter });

    try {
        const tenant = await prisma.client.findFirst({
            where: { id: "dc3646da-ed16-4410-9db5-bdb811a6d864" }
        });
        console.log("Tenant Plan:", tenant?.plan || "Unknown");
    } catch (err: any) {
        console.error("Query failed:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkTenant();
