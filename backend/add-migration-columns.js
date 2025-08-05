const { Client } = require('pg');

const client = new Client({
  host: process.env.POSTGRES_HOST || 'aws-0-eu-central-1.pooler.supabase.com',
  database: process.env.POSTGRES_DATABASE || 'postgres',
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.POSTGRES_PORT || '6543'),
  ssl: { rejectUnauthorized: false }
});

async function addMigrationColumns() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase');
    
    // Add appwrite_id and appwrite data columns to properties table
    await client.query(`
      ALTER TABLE properties 
      ADD COLUMN IF NOT EXISTS appwrite_id TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS appwrite_images JSONB,
      ADD COLUMN IF NOT EXISTS appwrite_videos JSONB
    `);
    console.log('✅ Added appwrite columns to properties table');

    // Add appwrite columns to leads table if it exists
    try {
      await client.query(`
        ALTER TABLE leads 
        ADD COLUMN IF NOT EXISTS appwrite_id TEXT UNIQUE,
        ADD COLUMN IF NOT EXISTS appwrite_files JSONB
      `);
      console.log('✅ Added appwrite columns to leads table');
    } catch (err) {
      console.log('ℹ️ Leads table may not exist or columns already exist');
    }

    console.log('🎉 Migration columns added successfully!');
    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addMigrationColumns();
