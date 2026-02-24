
require('dotenv').config();
const { Client } = require('pg');

async function getUrls() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not set. Please check your .env file.');
    }
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });
    await client.connect();
    const res = await client.query('SELECT name, "databaseUrl" FROM "Client" WHERE "isolationLevel" = \'DEDICATED\'');
    console.log(JSON.stringify(res.rows));
    await client.end();
}

getUrls();
