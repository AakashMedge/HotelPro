import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
    try {
        // @ts-ignore
        const dmmf = prisma._dmmf;
        const orderModel = dmmf.datamodel.models.find(m => m.name === 'Order');
        if (orderModel) {
            console.log("Fields in Order model:", orderModel.fields.map(f => f.name).join(", "));
        } else {
            console.log("Order model not found in DMMF");
        }
    } catch (err) {
        console.error("Error checking DMMF:", err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
