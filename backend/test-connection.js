#!/usr/bin/env node
/**
 * Supabase Connection Test Script
 * ===============================
 * Test connection to your Supabase instance before running the full setup.
 */

const { Client } = require('pg');

async function testSupabaseConnection() {
  // Your Supabase configuration - using pooler connection
  const config = {
    host: 'aws-0-eu-central-1.pooler.supabase.com',
    database: 'postgres',
    user: 'postgres.cqylpwdcwrssttrtvtov',
    password: 'ZeroCall20!@HH##1655&&',
    port: 6543,
    ssl: { rejectUnauthorized: false }
  };

  console.log('🧪 Testing Supabase Connection');
  console.log('='.repeat(40));
  console.log(`Host: ${config.host}`);
  console.log(`Database: ${config.database}`);
  console.log(`User: ${config.user}`);
  console.log(`Port: ${config.port}`);
  console.log('='.repeat(40));

  try {
    // Test connection
    console.log('🔗 Attempting to connect...');
    
    const client = new Client(config);
    await client.connect();

    // Test basic queries
    const versionResult = await client.query('SELECT version()');
    const dbVersion = versionResult.rows[0].version;

    const dbResult = await client.query('SELECT current_database()');
    const currentDb = dbResult.rows[0].current_database;

    const userResult = await client.query('SELECT current_user');
    const currentUser = userResult.rows[0].current_user;

    console.log('✅ Connection successful!');
    console.log(`📊 Database Version: ${dbVersion}`);
    console.log(`🗄️  Current Database: ${currentDb}`);
    console.log(`👤 Current User: ${currentUser}`);

    // Check existing tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    const tables = tablesResult.rows;

    if (tables.length > 0) {
      console.log(`\n📋 Existing Tables (${tables.length}):`);
      tables.slice(0, 10).forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
      if (tables.length > 10) {
        console.log(`   ... and ${tables.length - 10} more`);
      }
    } else {
      console.log('\n📋 No existing tables found (fresh database)');
    }

    await client.end();

    console.log('\n🎉 Connection test completed successfully!');
    console.log('   You can now run the full database setup with: npm run setup');

    return true;
  } catch (error) {
    console.error(`❌ Connection failed: ${error.message}`);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your internet connection');
    console.log('   2. Verify Supabase project is active');
    console.log('   3. Confirm password is correct');
    console.log('   4. Ensure your IP is allowed (if restrictions are set)');

    return false;
  }
}

// Run the test
if (require.main === module) {
  testSupabaseConnection().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}
