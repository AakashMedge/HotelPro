import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        console.log("Checking database connection...");
        await prisma.$connect();
        console.log("Connected successfully.");

        process.stdout.write("Checking 'Plan' table... ");
        const plan = await (prisma as any).plan.findFirst();
        console.log("Found:", plan ? "Yes" : "No (Empty)");

        process.stdout.write("Checking 'Client' table... ");
        const client = await (prisma as any).client.findFirst();
        console.log("Found:", client ? "Yes" : "No (Empty)");

        process.stdout.write("Checking 'SaaSPayment' model... ");
        const payments = await (prisma as any).saaSPayment.count();
        console.log("Count:", payments);

    } catch (error: any) {
        console.error("\n[DIAGNOSTIC FAILED]");
        console.error("Error Message:", error.message);
        if (error.code) console.error("Error Code:", error.code);
    } finally {
        await prisma.$disconnect();
    }
}

main();
