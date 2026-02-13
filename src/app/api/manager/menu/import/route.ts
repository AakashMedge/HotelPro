
import { NextRequest, NextResponse } from "next/server";
import { prisma, getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";

/**
 * POST /api/manager/menu/import
 * Bulk upload menu items from CSV data
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const { clientId } = user;
        const db = getDb();

        const { csvData } = await request.json();
        if (!csvData) {
            return NextResponse.json({ success: false, error: "No data received" }, { status: 400 });
        }

        // Simple CSV Parser
        const lines = csvData.trim().split("\n");
        if (lines.length < 2) {
            return NextResponse.json({ success: false, error: "Empty or invalid CSV" }, { status: 400 });
        }

        const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase());
        const dataRows = lines.slice(1);

        let createdCount = 0;
        let categoryCount = 0;

        // Process rows
        for (const row of dataRows) {
            const values = row.split(",").map((v: string) => v.trim());
            const item: any = {};
            headers.forEach((h: string, i: number) => {
                item[h] = values[i];
            });

            // Required basic: Category, Name, Price
            if (!item.name || !item.price || !item.category) continue;

            // 1. Find or Create Category
            let category = await (db.category as any).findFirst({
                where: {
                    name: { equals: item.category, mode: 'insensitive' },
                    clientId
                }
            });

            if (!category) {
                category = await (db.category as any).create({
                    data: {
                        name: item.category,
                        clientId
                    }
                });
                categoryCount++;
            }

            // 2. Create MenuItem
            await (db.menuItem as any).create({
                data: {
                    clientId,
                    categoryId: category.id,
                    name: item.name,
                    description: item.description || "",
                    price: parseFloat(item.price) || 0,
                    isVeg: (item.type || item.veg || "").toLowerCase().includes("veg") || (item.type || item.veg || "").toLowerCase() === "yes",
                    isChefSpecial: (item.chefspecial || "").toLowerCase() === "yes" || (item.chefspecial || "").toLowerCase() === "true",
                    isAvailable: true
                }
            });
            createdCount++;
        }

        return NextResponse.json({
            success: true,
            message: "Import Complete",
            itemsCreated: createdCount,
            categoriesCreated: categoryCount
        });

    } catch (error: any) {
        console.error("[MENU_IMPORT_ERROR]", error);
        return NextResponse.json({ success: false, error: "Import Failed", details: error.message }, { status: 500 });
    }
}
