#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════════
 * APPWRITE TO SUPABASE MIGRATION RUNNER
 * ═══════════════════════════════════════════════════════════════════════════════════
 * Execute the complete migration from Appwrite to Supabase
 * ═══════════════════════════════════════════════════════════════════════════════════
 */

const { MigrationService } = require('./services/migration');

// Command line options
const args = process.argv.slice(2);

// Parse command line arguments
let command = 'full';
let limit = null;

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const flag = args[i].substring(2);
    
    if (flag === 'properties' || flag === 'users' || flag === 'leads' || flag === 'test' || flag === 'analyze') {
      command = flag;
    } else if (flag === 'limit' && i + 1 < args.length) {
      limit = parseInt(args[i + 1], 10);
      i++; // Skip the next argument as it's the limit value
    }
  } else if (!args[i].startsWith('-') && i === 0) {
    // First non-flag argument is the command
    command = args[i];
  }
}

async function runMigration() {
  const migration = new MigrationService();

  try {
    switch (command) {
      case 'analyze':
        console.log('🔍 Analyzing Appwrite data structure...');
        await migration.analyzeAppwriteData();
        break;

      case 'test':
        console.log('🧪 Testing connections...');
        await migration.initialize();
        await migration.testConnections();
        console.log('✅ All connections successful!');
        break;

      case 'users':
        console.log('👤 Migrating users only...');
        await migration.initialize();
        await migration.migrateUsers(limit);
        break;

      case 'properties':
        console.log(`🏠 Migrating properties${limit ? ` (limit: ${limit})` : ''}...`);
        await migration.initialize();
        await migration.migrateProperties(limit);
        break;

      case 'leads':
        console.log('👥 Migrating leads only...');
        await migration.initialize();
        await migration.migrateLeads();
        break;

      case 'full':
      default:
        console.log('🚀 Running full migration...');
        await migration.runFullMigration();
        break;
    }

    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Show usage if help requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════════╗
║                    APPWRITE TO SUPABASE MIGRATION TOOL                          ║
╚══════════════════════════════════════════════════════════════════════════════════╝

Usage: node migrate.js [command]

Commands:
  analyze      🔍 Analyze Appwrite data structure
  test         🧪 Test connections to both Appwrite and Supabase
  users        👤 Migrate users only
  properties   🏠 Migrate properties only  
  leads        👥 Migrate leads only
  full         🚀 Complete migration (default)

Examples:
  node migrate.js                    # Full migration
  node migrate.js analyze           # Analyze data structure
  node migrate.js test              # Test connections
  node migrate.js properties        # Migrate properties only

Features:
  ✅ Intelligent column mapping
  ✅ Relationship preservation
  ✅ Appwrite storage as CDN
  ✅ Duplicate detection
  ✅ Error handling & recovery
  ✅ Progress tracking
  ✅ Batch processing

Notes:
  - Images/videos stay in Appwrite as CDN
  - Supabase stores data + Appwrite file URLs
  - Safe to run multiple times (skips duplicates)
  - Run 'test' command first to verify setup
`);
  process.exit(0);
}

// Run the migration
runMigration();
