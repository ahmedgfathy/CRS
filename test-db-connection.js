const { createClient } = require('@supabase/supabase-js');

// Using the same credentials as the mobile app
const supabaseUrl = 'https://cqylpwdcwrssttrtvtov.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxeWxwd2Rjd3Jzc3R0cnR2dG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDc0MTcsImV4cCI6MjA2OTkyMzQxN30.-SjQmiFNoDhExLOA_lBz4J57vqbTUryg186uf5h7TWM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabase() {
  console.log('🔄 Testing database connection...');
  
  try {
    // Test properties table
    const { data: properties, error: propError, count: propCount } = await supabase
      .from('properties')
      .select('id, title, created_at', { count: 'exact' })
      .limit(5);
    
    console.log('📊 Properties:');
    console.log(`   Count: ${propCount}`);
    console.log(`   Sample data:`, properties?.slice(0, 2));
    if (propError) console.log(`   Error: ${propError.message}`);
    
    // Test areas table
    const { data: areas, error: areaError, count: areaCount } = await supabase
      .from('areas')
      .select('id, area_name, status', { count: 'exact' })
      .limit(5);
    
    console.log('📍 Areas:');
    console.log(`   Count: ${areaCount}`);
    console.log(`   Sample data:`, areas?.slice(0, 2));
    if (areaError) console.log(`   Error: ${areaError.message}`);
    
    // Test property_types table
    const { data: types, error: typesError, count: typesCount } = await supabase
      .from('property_types')
      .select('id, type_name', { count: 'exact' })
      .limit(5);
    
    console.log('🏢 Property Types:');
    console.log(`   Count: ${typesCount}`);
    console.log(`   Sample data:`, types?.slice(0, 2));
    if (typesError) console.log(`   Error: ${typesError.message}`);
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testDatabase();
