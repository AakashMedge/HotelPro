import { prisma } from "./lib/db";

async function check() {
    try {
        const clients = await prisma.client.findMany({
            include: {
                _count: {
                    select: { tables: true }
                }
            }
        });

        console.log("--- CLIENTS & TABLES ---");
        clients.forEach(c => {
            console.log(`Client: ${c.name} (${c.slug})`);
            console.log(`Plan: ${c.plan}`);
            console.log(`Tables: ${c._count.tables}`);
            console.log("-------------------");
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
