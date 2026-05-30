const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
  });

  try {
    await client.connect();
    console.log('Successfully connected to PostgreSQL');
    
    const res = await client.query("SELECT datname FROM pg_database WHERE datname = 'tenantkit'");
    if (res.rows.length === 0) {
      console.log("Database 'tenantkit' does not exist. Creating...");
      await client.query("CREATE DATABASE tenantkit");
      console.log("Database 'tenantkit' created successfully.");
    } else {
      console.log("Database 'tenantkit' already exists. Dropping and re-creating...");
      await client.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = 'tenantkit'
          AND pid <> pg_backend_pid();
      `);
      await client.query("DROP DATABASE tenantkit");
      await client.query("CREATE DATABASE tenantkit");
      console.log("Database 'tenantkit' reset successfully.");
    }
  } catch (err) {
    console.error('Error connecting or resetting database:', err);
  } finally {
    await client.end();
  }
}

main();
