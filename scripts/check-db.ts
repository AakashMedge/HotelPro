
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const items = await prisma.menuItem.count();
    const categories = await prisma.category.count();
    const modifiers = await prisma.modifierGroup.count();
    console.log({ items, categories, modifiers });

    if (items > 0) {
        const firstItems = await prisma.menuItem.findMany({ take: 3, include: { category: true } });
        console.log('Sample Items:', JSON.stringify(firstItems, null, 2));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
