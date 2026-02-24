/**
 * HotelPro POS Seed Script (Multi-Tenant Edition)
 */

import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

// 1. Configure Neon for Node.js
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('--- SEEDING MULTI-TENANT DATABASE ---');

    // 1. Create a Platform Admin Client (The HQ)
    console.log('Creating Platform Management Client...');
    const hq = await prisma.client.upsert({
        where: { slug: 'hq' },
        update: {},
        create: {
            name: "HotelPro HQ",
            slug: "hq",
            plan: "ELITE",
            status: "ACTIVE"
        }
    });

    // 2. Create the Super Admin User
    console.log('Creating Super Admin User...');
    const superAdminPassword = await bcrypt.hash('password123', 10);
    await prisma.user.upsert({
        where: { username: "superadmin" },
        update: {},
        create: {
            clientId: hq.id,
            username: "superadmin",
            name: "Platform Master",
            passwordHash: superAdminPassword,
            role: "SUPER_ADMIN" as any,
        }
    });

    // 2.1 Create the Real Super Admin (for HQ Login)
    console.log('Creating HQ Super Admin (Email Login)...');
    await prisma.superAdmin.upsert({
        where: { email: "superadmin@hotelpro.com" },
        update: { passwordHash: superAdminPassword },
        create: {
            email: "superadmin@hotelpro.com",
            name: "Super Admin",
            passwordHash: superAdminPassword,
            isActive: true
        }
    });

    // 3. Create a Demo Tenant (Hotel Taj)
    console.log('Creating Demo Tenant: Taj Hotel...');
    const taj = await prisma.client.upsert({
        where: { slug: 'taj' },
        update: {},
        create: {
            name: "The Taj Residency",
            slug: "taj",
            plan: "GROWTH",
            status: "ACTIVE"
        }
    });

    // 4. Create Taj Admin & Staff
    console.log('Creating Taj Staff...');
    const staffPassword = await bcrypt.hash('password123', 10);

    const tajUsers = [
        { username: "admin", name: "Taj Administrator", role: "ADMIN" },
        { username: "manager", name: "Executive Manager", role: "MANAGER" },
        { username: "waiter1", name: "Senior Waiter", role: "WAITER" },
        { username: "kitchen1", name: "Head Chef Gordon", role: "KITCHEN" },
        { username: "cashier1", name: "Main Cashier", role: "CASHIER" },
        { username: "taj_manager", name: "Taj Manager", role: "MANAGER" },
        { username: "taj_waiter", name: "Taj Waiter", role: "WAITER" },
    ];

    for (const u of tajUsers) {
        await prisma.user.upsert({
            where: { username: u.username },
            update: { passwordHash: staffPassword, isActive: true },
            create: {
                clientId: taj.id,
                username: u.username,
                name: u.name,
                passwordHash: staffPassword,
                role: u.role as any,
            }
        });
    }

    // 5. Taj Settings
    console.log('Seeding Taj settings...');
    await prisma.restaurantSettings.upsert({
        where: { clientId: taj.id },
        update: {},
        create: {
            clientId: taj.id,
            businessName: "The Taj Residency",
            gstRate: 5.0,
            serviceChargeRate: 10.0,
            currency: "INR",
            currencySymbol: "₹",
            primaryColor: "#D43425"
        }
    });

    // 6. Taj Tables
    console.log('Seeding Taj tables...');
    const tables = ["T-01", "T-02", "T-03", "T-04", "T-05", "T-06"];
    for (const t of tables) {
        await prisma.table.upsert({
            where: { clientId_tableCode: { clientId: taj.id, tableCode: t } },
            update: {},
            create: {
                clientId: taj.id,
                tableCode: t,
                capacity: 4,
                status: "VACANT"
            }
        });
    }

    // 7. Taj Menu
    console.log('Seeding Taj Premium Menu...');

    const categories = [
        {
            name: "Signature", items: [
                { name: "Wagyu Beef Tenderloin", price: 5400, desc: "A5 Grade Wagyu with perigord truffle jus.", isVeg: false, isChefSpecial: true },
                { name: "Perigord Black Truffle Risotto", price: 3200, desc: "Acquerello rice with 24-month parmesan.", isVeg: true, isChefSpecial: true }
            ]
        },
        {
            name: "Appetizers", items: [
                { name: "Burrata di Puglia", price: 1800, desc: "Creamy burrata with heirloom tomatoes.", isVeg: true, isChefSpecial: false },
                { name: "Luxury Tandoori Lobster", price: 4200, desc: "Atlantic lobster with saffron marinade.", isVeg: false, isChefSpecial: false }
            ]
        },
        {
            name: "Main Course", items: [
                { name: "Wild-Caught Sea Bass", price: 3800, desc: "Pan-seared with champagne beurre blanc.", isVeg: false, isChefSpecial: false },
                { name: "Saffron Paneer Tikka", price: 2100, desc: "Handcrafted paneer with Kashmiri saffron.", isVeg: true, isChefSpecial: false }
            ]
        },
        {
            name: "Desserts", items: [
                { name: "Grand Cru Chocolate Fondant", price: 1200, desc: "Valrhona 70% dark chocolate center.", isVeg: true, isChefSpecial: false },
                { name: "Royal Chai Panna Cotta", price: 950, desc: "Spiced panna cotta with gold leaf.", isVeg: true, isChefSpecial: false }
            ]
        },
        {
            name: "Wine & Drinks", items: [
                { name: "Vintage Reserve Red", price: 15000, desc: "Special selection from the cellar.", isVeg: true, isChefSpecial: false },
                { name: "Imperial Masala Chai", price: 450, desc: "Brewed with fresh ginger and cardamom.", isVeg: true, isChefSpecial: false }
            ]
        }
    ];

    for (const catData of categories) {
        const cat = await prisma.category.upsert({
            where: { clientId_name: { clientId: taj.id, name: catData.name } },
            update: { isActive: true },
            create: { clientId: taj.id, name: catData.name, isActive: true }
        });

        for (const item of catData.items) {
            await prisma.menuItem.upsert({
                where: { id: `demo-${item.name.replace(/\s+/g, '-').toLowerCase()}` }, // Stable ID for demo
                update: {
                    price: item.price,
                    description: item.desc,
                    isAvailable: true,
                    isVeg: item.isVeg,
                    isChefSpecial: !!item.isChefSpecial
                },
                create: {
                    id: `demo-${item.name.replace(/\s+/g, '-').toLowerCase()}`,
                    clientId: taj.id,
                    name: item.name,
                    categoryId: cat.id,
                    price: item.price,
                    description: item.desc,
                    isAvailable: true,
                    isVeg: item.isVeg,
                    isChefSpecial: !!item.isChefSpecial
                }
            });
        }
    }

    console.log('--- SEEDING COMPLETE ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
