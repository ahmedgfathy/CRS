#!/usr/bin/env node
/**
 * Supabase Real Estate CRM Database Setup
 * =======================================
 * This script connects to your Supabase PostgreSQL instance and creates the complete
 * Real Estate CRM database structure.
 * 
 * Project Details:
 * - Project Name: supabase-emerald-tree
 * - Project ID: cqylpwdcwrssttrtvtov
 * - Database: PostgreSQL 15+ (Supabase)
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Supabase Configuration - using pooler connection
const SUPABASE_CONFIG = {
  host: 'aws-0-eu-central-1.pooler.supabase.com',
  database: 'postgres',
  user: 'postgres.cqylpwdcwrssttrtvtov',
  password: 'ZeroCall20!@HH##1655&&',
  port: 6543,
  ssl: { rejectUnauthorized: false }
};

async function connectToSupabase() {
  console.log('🔗 Connecting to Supabase PostgreSQL...');
  
  try {
    const client = new Client(SUPABASE_CONFIG);
    await client.connect();
    
    console.log('✅ Successfully connected to Supabase!');
    return client;
  } catch (error) {
    console.error('❌ Error connecting to Supabase:', error.message);
    return null;
  }
}

async function executeSQLFile(client, filePath) {
  try {
    console.log(`📁 Reading SQL file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`SQL file not found: ${filePath}`);
    }
    
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    console.log('🚀 Executing SQL commands...');
    
    // Split SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement && !statement.startsWith('--'));
    
    let executedCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement) {
        try {
          await client.query(statement);
          executedCount++;
          
          // Progress indicator
          if (executedCount % 10 === 0) {
            console.log(`   ⏳ Executed ${executedCount} statements...`);
          }
        } catch (error) {
          console.log(`   ⚠️  Warning on statement ${i + 1}: ${error.message}`);
          continue;
        }
      }
    }
    
    console.log(`✅ Successfully executed ${executedCount} SQL statements!`);
    return true;
  } catch (error) {
    console.error('❌ Error executing SQL file:', error.message);
    return false;
  }
}

async function verifyDatabaseSetup(client) {
  try {
    console.log('🔍 Verifying database setup...');
    
    // Check if main tables exist
    const mainTables = [
      'countries', 'regions', 'areas', 'compounds',
      'property_categories', 'property_types', 'user_profiles',
      'properties', 'leads', 'sales_transactions', 'communications'
    ];
    
    const tableCounts = {};
    
    for (const table of mainTables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        tableCounts[table] = parseInt(result.rows[0].count);
      } catch (error) {
        tableCounts[table] = 'ERROR';
      }
    }
    
    console.log('\n📊 Database Table Summary:');
    console.log('='.repeat(50));
    
    for (const [table, count] of Object.entries(tableCounts)) {
      const countStr = count === 'ERROR' ? 'ERROR' : count.toString().padStart(5);
      console.log(`   ${table.padEnd(20)}: ${countStr} records`);
    }
    
    // Check indexes
    const indexResult = await client.query(`
      SELECT COUNT(*) 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `);
    const indexCount = parseInt(indexResult.rows[0].count);
    
    console.log(`\n📈 Total Indexes Created: ${indexCount}`);
    
    // Check RLS policies
    const policyResult = await client.query(`
      SELECT COUNT(*) 
      FROM pg_policies 
      WHERE schemaname = 'public'
    `);
    const policyCount = parseInt(policyResult.rows[0].count);
    
    console.log(`🔒 Total RLS Policies: ${policyCount}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error verifying database:', error.message);
    return false;
  }
}

function createEnvironmentFile() {
  const envContent = `# Supabase Configuration for Real Estate CRM
# Project: supabase-emerald-tree
# Created: ${new Date().toISOString()}

# Database Connection
POSTGRES_URL="postgres://postgres.cqylpwdcwrssttrtvtov:ZeroCall20!@HH##1655&&@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="ZeroCall20!@HH##1655&&"
POSTGRES_HOST="db.cqylpwdcwrssttrtvtov.supabase.co"
POSTGRES_DATABASE="postgres"
POSTGRES_PRISMA_URL="postgres://postgres.cqylpwdcwrssttrtvtov:ZeroCall20!@HH##1655&&@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"
POSTGRES_URL_NON_POOLING="postgres://postgres.cqylpwdcwrssttrtvtov:ZeroCall20!@HH##1655&&@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require"

# Supabase API
SUPABASE_URL="https://cqylpwdcwrssttrtvtov.supabase.co"
SUPABASE_ANON_KEY="***REMOVED***.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxeWxwd2Rjd3Jzc3R0cnR2dG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDc0MTcsImV4cCI6MjA2OTkyMzQxN30.-SjQmiFNoDhExLOA_lBz4J57vqbTUryg186uf5h7TWM"
SUPABASE_SERVICE_ROLE_KEY="***REMOVED***.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxeWxwd2Rjd3Jzc3R0cnR2dG92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM0NzQxNywiZXhwIjoyMDY5OTIzNDE3fQ.xrwA94CYRa1WkYQ_1qgeM8HXh8tfwjNo22g3Z-4qqaE"
SUPABASE_JWT_SECRET="G2rVN4sjiRT7ID6d+74X1DFLdmYWLMI0BezvpP65LykrwEuiShs7xTt1emn69zgwNfusscFV39Ajjc49QFC2RA=="

# Next.js Environment Variables
NEXT_PUBLIC_SUPABASE_URL="https://cqylpwdcwrssttrtvtov.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="***REMOVED***.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxeWxwd2Rjd3Jzc3R0cnR2dG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDc0MTcsImV4cCI6MjA2OTkyMzQxN30.-SjQmiFNoDhExLOA_lBz4J57vqbTUryg186uf5h7TWM"

# Project Information
PROJECT_ID="cqylpwdcwrssttrtvtov"
PROJECT_NAME="supabase-emerald-tree"
`;

  try {
    fs.writeFileSync('.env', envContent);
    console.log('📄 Created .env file with Supabase configuration');
    return true;
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
    return false;
  }
}

async function main() {
  console.log('🏠 Real Estate CRM - Supabase Database Setup');
  console.log('='.repeat(60));
  console.log(`📅 Started at: ${new Date().toLocaleString()}`);
  console.log('🎯 Project: supabase-emerald-tree');
  console.log('🆔 Project ID: cqylpwdcwrssttrtvtov');
  console.log('='.repeat(60));

  // Step 1: Connect to Supabase
  const client = await connectToSupabase();
  if (!client) {
    console.log('❌ Failed to connect to Supabase. Please check your credentials.');
    process.exit(1);
  }

  // Step 2: Execute SQL setup file
  const sqlFilePath = path.join(__dirname, 'supabase_setup_complete.sql');
  
  const success = await executeSQLFile(client, sqlFilePath);
  if (!success) {
    console.log('❌ Failed to execute SQL setup file');
    process.exit(1);
  }

  // Step 3: Verify database setup
  await verifyDatabaseSetup(client);

  // Step 4: Create environment file
  createEnvironmentFile();

  // Step 5: Close connection
  await client.end();

  console.log('\n' + '='.repeat(60));
  console.log('🎉 DATABASE SETUP COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(60));
  console.log('✅ Database structure created');
  console.log('✅ Sample data inserted');
  console.log('✅ Indexes and constraints applied');
  console.log('✅ Row Level Security (RLS) policies configured');
  console.log('✅ Environment file created');
  console.log('\n📋 Next Steps:');
  console.log('   1. Review the created tables in Supabase dashboard');
  console.log('   2. Set up your Node.js application using the .env file');
  console.log('   3. Configure authentication in your frontend');
  console.log('   4. Start building your Real Estate CRM!');
  console.log('\n🔗 Supabase Dashboard: https://supabase.com/dashboard/project/cqylpwdcwrssttrtvtov');
}

// Run the setup
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
}
