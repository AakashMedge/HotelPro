import "dotenv/config";
import { defineConfig } from "prisma/config";
import path from "node:path";

export default defineConfig({
  schema: process.env.PRISMA_SCHEMA || path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});