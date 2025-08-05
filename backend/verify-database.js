#!/usr/bin/env node
/**
 * Database Verification Script
 * ============================
 * Check what tables and structures were created in Supabase
 */

const { Client } = require('pg');

const config = {
  host: 'aws-0-eu-central-1.pooler.supabase.com',
  database: 'postgres',
  user: 'postgres.cqylpwdcwrssttrtvtov',
  password: 'ZeroCall20!@HH##1655&&',
  port: 6543,
  ssl: { rejectUnauthorized: false }
};

async function verifyDatabase() {
  console.log('🔍 Verifying Supabase Database Structure');
  console.log('='.repeat(50));

  try {
    const client = new Client(config);
    await client.connect();

    // Check all tables
    const tablesResult = await client.query(`
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log(`📋 Created Tables (${tablesResult.rows.length}):`);
    tablesResult.rows.forEach(table => {
      console.log(`   ✅ ${table.table_name} (${table.table_type})`);
    });

    // Check columns for main tables
    const mainTables = ['countries', 'regions', 'areas', 'properties', 'leads'];
    
    for (const tableName of mainTables) {
      if (tablesResult.rows.find(t => t.table_name === tableName)) {
        const columnsResult = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);

        console.log(`\n📊 ${tableName.toUpperCase()} table columns (${columnsResult.rows.length}):`);
        columnsResult.rows.slice(0, 5).forEach(col => {
          console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });
        if (columnsResult.rows.length > 5) {
          console.log(`   ... and ${columnsResult.rows.length - 5} more columns`);
        }
      }
    }

    // Check indexes
    const indexResult = await client.query(`
      SELECT 
        indexname,
        tablename
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    console.log(`\n📈 Created Indexes (${indexResult.rows.length}):`);
    const indexesByTable = {};
    indexResult.rows.forEach(idx => {
      if (!indexesByTable[idx.tablename]) {
        indexesByTable[idx.tablename] = [];
      }
      indexesByTable[idx.tablename].push(idx.indexname);
    });

    Object.entries(indexesByTable).forEach(([table, indexes]) => {
      console.log(`   ${table}: ${indexes.length} indexes`);
    });

    // Check RLS policies
    const policyResult = await client.query(`
      SELECT 
        tablename,
        policyname,
        cmd
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`\n🔒 RLS Policies (${policyResult.rows.length}):`);
    const policiesByTable = {};
    policyResult.rows.forEach(policy => {
      if (!policiesByTable[policy.tablename]) {
        policiesByTable[policy.tablename] = [];
      }
      policiesByTable[policy.tablename].push(`${policy.cmd}: ${policy.policyname}`);
    });

    Object.entries(policiesByTable).forEach(([table, policies]) => {
      console.log(`   ${table}: ${policies.length} policies`);
      policies.forEach(policy => console.log(`     - ${policy}`));
    });

    await client.end();

    console.log('\n✅ Database verification completed!');
    console.log('\n🎯 Your Real Estate CRM database is ready to use!');
    console.log('🔗 Access Supabase Dashboard: https://supabase.com/dashboard/project/cqylpwdcwrssttrtvtov');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

if (require.main === module) {
  verifyDatabase();
}
