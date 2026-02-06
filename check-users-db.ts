import { prisma } from "./lib/db";

async function listUsers() {
    try {
        const users = await prisma.user.findMany({
            select: { username: true, role: true }
        });
        const superAdmins = await prisma.superAdmin.findMany({
            select: { email: true }
        });

        console.log("--- USERS ---");
        console.table(users);
        console.log("--- SUPER ADMINS ---");
        console.table(superAdmins);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listUsers();
