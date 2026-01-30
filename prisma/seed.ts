/**
 * HotelPro POS Seed Script
 * 
 * Sets up initial data for the system:
 * 1. Roles and Users
 * 2. Tables with capacities
 * 3. Menu Items with categories and descriptions
 */

import { PrismaClient } from '../src/generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

// Configure Neon for Node.js environment
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

/**
 * Test Users
 */
const TEST_USERS = [
    { username: "admin", name: "Administrator", role: "ADMIN", password: "password123" },
    { username: "manager", name: "Floor Manager", role: "MANAGER", password: "password123" },
    { username: "waiter1", name: "Rajesh Waiter", role: "WAITER", password: "password123" },
    { username: "kitchen1", name: "Chef Khanna", role: "KITCHEN", password: "password123" },
    { username: "cashier1", name: "Amit Cashier", role: "CASHIER", password: "password123" },
];

/**
 * Test Tables
 */
const TEST_TABLES = [
    { tableCode: "T-01", capacity: 2 },
    { tableCode: "T-02", capacity: 2 },
    { tableCode: "T-03", capacity: 4 },
    { tableCode: "T-04", capacity: 4 },
    { tableCode: "T-05", capacity: 4 },
    { tableCode: "T-06", capacity: 6 },
    { tableCode: "T-07", capacity: 6 },
    { tableCode: "T-08", capacity: 8 },
    { tableCode: "T-09", capacity: 2 },
    { tableCode: "T-10", capacity: 2 },
    { tableCode: "T-11", capacity: 4 },
    { tableCode: "T-12", capacity: 4 },
];

/**
 * Test Menu Items
 */
const TEST_MENU_ITEMS = [
    {
        name: 'Wagyu Beef Tenderloin',
        category: 'Signature',
        description: 'Gold-grade Wagyu served with truffle-infused marrow and seasonal baby vegetables.',
        price: 6800,
    },
    {
        name: 'Perigord Black Truffle Risotto',
        category: 'Signature',
        description: 'Acquerello rice slow-cooked with aged parmesan and fresh truffle shavings.',
        price: 4900,
    },
    {
        name: 'Luxury Tandoori Lobster',
        category: 'Signature',
        description: 'Fresh lobster tails marinated in royal spices with an edible gold leaf garnish.',
        price: 7500,
    },
    {
        name: 'Burrata di Puglia',
        category: 'Appetizers',
        description: 'Creamy burrata paired with heirloom tomatoes, aged balsamic, and basil oil.',
        price: 2200,
    },
    {
        name: 'Saffron Paneer Tikka',
        category: 'Appetizers',
        description: 'Charcoal-grilled paneer cubes marinated in premium Kashmiri saffron and yogurt.',
        price: 1800,
    },
    {
        name: 'Wild-Caught Sea Bass',
        category: 'Main Course',
        description: 'Pan-seared Chilean sea bass with lemon-caper reduction and saffron potatoes.',
        price: 4300,
    },
    {
        name: 'Grand Cru Chocolate Fondant',
        category: 'Desserts',
        description: 'Warm dark chocolate souffle center served with Tahitian vanilla bean gelato.',
        price: 1900,
    },
    {
        name: 'Royal Chai Panna Cotta',
        category: 'Desserts',
        description: 'Masala Chai infused cream with cardamom dust and pistachio nut crumble.',
        price: 1500,
    },
    {
        name: 'Vintage Reserve Red',
        category: 'Wine & Drinks',
        description: 'Château de l’Ouest 1995. A full-bodied masterpiece aged in oak barrels.',
        price: 12000,
    },
    {
        name: 'Imperial Masala Chai',
        category: 'Wine & Drinks',
        description: 'Hand-picked tea leaves brewed with royal spices and gold dust.',
        price: 450,
    }
];

async function main() {
    console.log('--- SEEDING DATABASE ---');

    // 1. Seed Users
    console.log('Seeding users...');
    for (const userData of TEST_USERS) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        await prisma.user.upsert({
            where: { username: userData.username },
            update: {
                name: userData.name,
                role: userData.role as any,
                passwordHash: hashedPassword,
            },
            create: {
                username: userData.username,
                name: userData.name,
                role: userData.role as any,
                passwordHash: hashedPassword,
            },
        });
    }

    // 2. Seed Tables
    console.log('Seeding tables...');
    for (const tableData of TEST_TABLES) {
        await prisma.table.upsert({
            where: { tableCode: tableData.tableCode },
            update: {
                capacity: tableData.capacity,
            },
            create: {
                tableCode: tableData.tableCode,
                capacity: tableData.capacity,
                status: "VACANT",
            },
        });
    }

    // 3. Seed Menu Items
    console.log('Seeding menu items...');
    for (const itemData of TEST_MENU_ITEMS) {
        // Find existing by name to get ID
        const existing = await prisma.menuItem.findFirst({ where: { name: itemData.name } });

        await prisma.menuItem.upsert({
            where: {
                id: existing?.id || '00000000-0000-0000-0000-000000000000'
            },
            update: {
                category: itemData.category,
                description: itemData.description,
                price: itemData.price,
                isAvailable: true,
                deletedAt: null,
            },
            create: {
                name: itemData.name,
                category: itemData.category,
                description: itemData.description,
                price: itemData.price,
                isAvailable: true,
            },
        });
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
