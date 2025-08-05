const { Client } = require('pg');

const client = new Client({
  host: 'aws-0-eu-central-1.pooler.supabase.com',
  database: 'postgres',
  user: 'postgres.cqylpwdcwrssttrtvtov',
  password: 'ZeroCall20!@HH##1655&&',
  port: 6543,
  ssl: { rejectUnauthorized: false }
});

async function checkDatabase() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase');
    
    // Check areas table structure
    const areasColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'areas'
      ORDER BY ordinal_position
    `);
    
    console.log(`📋 Areas table structure:`);
    areasColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

    // Check properties table structure
    const propsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'properties'
      ORDER BY ordinal_position
    `);
    
    console.log(`📋 Properties table structure:`);
    propsColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabase();
