/**
 * Seed Access Codes for Existing Hotels
 * 
 * Run: npx ts-node scripts/seed-access-codes.ts
 * 
 * Sets access codes for all hotels that don't have one yet.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedAccessCodes() {
    console.log("🔑 Seeding access codes for existing hotels...\n");

    const clients = await prisma.client.findMany({
        where: { accessCode: null },
        select: { id: true, name: true, slug: true },
    });

    if (clients.length === 0) {
        console.log("✓ All hotels already have access codes.");
        return;
    }

    for (const client of clients) {
        // Generate a readable code based on slug + random suffix
        const prefix = client.slug.toUpperCase().slice(0, 3);
        const suffix = Math.floor(Math.random() * 900 + 100); // 100-999
        const code = `${prefix}${suffix}`;

        await prisma.client.update({
            where: { id: client.id },
            data: {
                accessCode: code,
                accessCodeUpdatedAt: new Date(),
            },
        });

        console.log(`  ✓ ${client.name} (${client.slug}) → Access Code: ${code}`);
    }

    console.log(`\n🎉 Done! ${clients.length} hotel(s) updated with access codes.`);
}

seedAccessCodes()
    .catch((e) => {
        console.error("❌ Error seeding access codes:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
