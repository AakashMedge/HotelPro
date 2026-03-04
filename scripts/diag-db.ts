
import { prisma } from './lib/db';

async function testConnection() {
    console.log("Testing connection...");
    const start = Date.now();
    try {
        const result = await prisma.$queryRaw`SELECT 1`;
        console.log("Connection successful:", result);
        console.log("Latency:", Date.now() - start, "ms");

        const tableCount = await (prisma.table as any).count();
        console.log("Table count:", tableCount);
    } catch (err: any) {
        console.error("Connection failed:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
