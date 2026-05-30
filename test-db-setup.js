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
    
    const res = await client.query("SELECT datname FROM pg_database WHERE datname = 'cortex'");
    if (res.rows.length === 0) {
      console.log("Database 'cortex' does not exist. Creating...");
      await client.query("CREATE DATABASE cortex");
      console.log("Database 'cortex' created successfully.");
    } else {
      console.log("Database 'cortex' already exists. Dropping and re-creating...");
      await client.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = 'cortex'
          AND pid <> pg_backend_pid();
      `);
      await client.query("DROP DATABASE cortex");
      await client.query("CREATE DATABASE cortex");
      console.log("Database 'cortex' reset successfully.");
    }
  } catch (err) {
    console.error('Error connecting or resetting database:', err);
  } finally {
    await client.end();
  }
}

main();
