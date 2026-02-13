
const { neon } = require('@neondatabase/serverless');
const { execSync } = require('child_process');
const path = require('path');

function sanitizeDbUrl(url) {
    let clean = url.trim();
    if (clean.startsWith('psql "') || clean.startsWith("psql '")) {
        clean = clean.substring(6, clean.length - 1);
    }
    clean = clean.replace(/^['"]|['"]$/g, '');
    return clean;
}

async function run() {
    const sql = neon("postgresql://neondb_owner:npg_8J2ofznDNhxc@ep-green-forest-a1lxj9cv-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

    const clients = await sql`SELECT name, "databaseUrl" FROM "Client" WHERE "isolationLevel" = 'DEDICATED'`;

    console.log(`Found ${clients.length} dedicated databases.`);

    const tenantSchemaPath = path.join(process.cwd(), "prisma", "tenant.prisma");

    for (const client of clients) {
        if (!client.databaseUrl) continue;
        const sanitizedUrl = sanitizeDbUrl(client.databaseUrl);

        console.log(`\n📦 SYNCING: ${client.name}`);
        console.log(`🔗 Target: ${sanitizedUrl.split('@')[1].split('/')[0]}`);

        try {
            execSync(`npx prisma db push --accept-data-loss`, {
                stdio: 'inherit',
                env: {
                    ...process.env,
                    DATABASE_URL: sanitizedUrl,
                    PRISMA_SCHEMA: tenantSchemaPath
                }
            });
            console.log(`✅ ${client.name} updated.`);
        } catch (e) {
            console.error(`❌ Failed ${client.name}`);
        }
    }
}

run();
