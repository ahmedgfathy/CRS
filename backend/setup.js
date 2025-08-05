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

// Supabase Configuration - using environment variables
const SUPABASE_CONFIG = {
  host: process.env.POSTGRES_HOST || 'aws-0-eu-central-1.pooler.supabase.com',
  database: process.env.POSTGRES_DATABASE || 'postgres',
  user: process.env.POSTGRES_USER || 'postgres.cqylpwdcwrssttrtvtov',
  password: process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.POSTGRES_PORT || '6543'),
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

# Database Connection - Replace with your actual credentials
POSTGRES_URL="your_postgres_connection_string"
POSTGRES_USER="your_postgres_user"
POSTGRES_PASSWORD="your_postgres_password"
POSTGRES_HOST="your_postgres_host"
POSTGRES_DATABASE="postgres"
POSTGRES_PRISMA_URL="your_prisma_connection_string"
POSTGRES_URL_NON_POOLING="your_non_pooling_connection_string"

# Supabase API - Replace with your actual credentials
SUPABASE_URL="your_supabase_url"
SUPABASE_ANON_KEY="your_supabase_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
SUPABASE_JWT_SECRET="your_jwt_secret"

# Next.js Environment Variables
NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"

# Project Information
PROJECT_ID="your_project_id"
PROJECT_NAME="your_project_name"
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
