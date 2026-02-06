import { prisma } from "./lib/db";

async function test() {
    try {
        const count = await prisma.client.count();
        console.log("SUCCESS: Client count is", count);
        process.exit(0);
    } catch (err) {
        console.error("FAILURE:", err);
        process.exit(1);
    }
}

test();
