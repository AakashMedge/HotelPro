
const { Client } = require('pg');

async function getUrls() {
    const client = new Client({
        connectionString: "postgresql://neondb_owner:npg_8J2ofznDNhxc@ep-green-forest-a1lxj9cv-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    });
    await client.connect();
    const res = await client.query('SELECT name, "databaseUrl" FROM "Client" WHERE "isolationLevel" = \'DEDICATED\'');
    console.log(JSON.stringify(res.rows));
    await client.end();
}

getUrls();
