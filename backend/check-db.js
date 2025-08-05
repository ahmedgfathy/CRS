const { Client } = require('pg');

const client = new Client({
  host: process.env.POSTGRES_HOST || 'aws-0-eu-central-1.pooler.supabase.com',
  database: process.env.POSTGRES_DATABASE || 'postgres', 
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.POSTGRES_PORT || '6543'),
  ssl: { rejectUnauthorized: false }
});async function checkDatabase() {
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
