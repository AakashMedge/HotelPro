
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import 'dotenv/config';

neonConfig.webSocketConstructor = ws;
const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const IMAGE_MAP: Record<string, string> = {
    'Wagyu Beef Tenderloin': '/images/menu/wagyu.png',
    'Perigord Black Truffle Risotto': '/images/menu/risotto.png',
    'Luxury Tandoori Lobster': '/images/menu/lobster.png',
    'Burrata di Puglia': '/images/menu/burrata.png',
    'Saffron Paneer Tikka': '/images/menu/paneer.png',
    'Wild-Caught Sea Bass': '/images/menu/wagyu.png',
    'Grand Cru Chocolate Fondant': '/images/menu/fondant.png',
    'Royal Chai Panna Cotta': '/images/menu/chai.png',
    'Vintage Reserve Red': '/images/menu/wine.png',
    'Imperial Masala Chai': '/images/menu/chai.png'
};

async function main() {
    console.log('--- ROBUST BACKFILLING IMAGES ---');
    const items = await prisma.menuItem.findMany();

    for (const item of items) {
        // Try exact match or case-insensitive match
        const match = Object.entries(IMAGE_MAP).find(([name]) => name.toLowerCase() === item.name.toLowerCase());

        if (match) {
            const imageUrl = match[1];
            await prisma.menuItem.update({
                where: { id: item.id },
                data: { imageUrl }
            });
            console.log(`Updated ${item.name} with ${imageUrl}`);
        }
    }
    console.log('--- DONE ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
