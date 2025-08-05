#!/usr/bin/env node
/**
 * FAST MIGRATION RUNNER - Complete 3K properties in minutes
 */

const { FastMigrationService } = require('./fast-migrate');

async function runFastMigration() {
  console.log('🚀 STARTING FAST BULK MIGRATION...');
  console.log('This will migrate ALL 3K+ properties with related data');
  
  const migration = new FastMigrationService();
  
  try {
    await migration.fastMigrateAllProperties();
    console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error);
    process.exit(1);
  }
}

runFastMigration();
