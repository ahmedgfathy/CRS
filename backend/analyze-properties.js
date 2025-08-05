const { AppwriteService, APPWRITE_CONFIG } = require('./config/appwrite');

async function analyzePropertiesInDetail() {
  try {
    console.log('🔍 DETAILED PROPERTIES ANALYSIS');
    console.log('='.repeat(60));
    
    // Get first few properties to analyze all fields
    const response = await AppwriteService.getProperties(5, 0);
    
    if (response.documents.length === 0) {
      console.log('❌ No properties found');
      return;
    }

    console.log(`📊 Found ${response.total} total properties in Appwrite`);
    console.log(`📋 Analyzing first ${response.documents.length} properties for complete schema...\n`);

    // Collect all unique fields across multiple documents
    const allFields = new Set();
    const fieldAnalysis = {};

    response.documents.forEach((property, index) => {
      console.log(`\n🏠 Property ${index + 1} ID: ${property.$id}`);
      
      Object.keys(property).forEach(key => {
        allFields.add(key);
        
        if (!fieldAnalysis[key]) {
          fieldAnalysis[key] = {
            type: typeof property[key],
            isArray: Array.isArray(property[key]),
            samples: [],
            nullCount: 0,
            filledCount: 0
          };
        }

        if (property[key] === null || property[key] === undefined || property[key] === '') {
          fieldAnalysis[key].nullCount++;
        } else {
          fieldAnalysis[key].filledCount++;
          if (fieldAnalysis[key].samples.length < 3) {
            fieldAnalysis[key].samples.push(property[key]);
          }
        }
      });
    });

    console.log(`\n📊 COMPLETE PROPERTIES SCHEMA (${allFields.size} fields):`);
    console.log('='.repeat(60));

    // Sort fields by importance (non-system fields first)
    const sortedFields = Array.from(allFields).sort((a, b) => {
      if (a.startsWith('$') && !b.startsWith('$')) return 1;
      if (!a.startsWith('$') && b.startsWith('$')) return -1;
      return a.localeCompare(b);
    });

    sortedFields.forEach(field => {
      const analysis = fieldAnalysis[field];
      const fillRate = ((analysis.filledCount / response.documents.length) * 100).toFixed(0);
      
      console.log(`\n📋 ${field}:`);
      console.log(`   Type: ${analysis.type}${analysis.isArray ? ' (array)' : ''}`);
      console.log(`   Fill Rate: ${fillRate}% (${analysis.filledCount}/${response.documents.length})`);
      
      if (analysis.samples.length > 0) {
        console.log(`   Samples:`);
        analysis.samples.forEach((sample, i) => {
          let displaySample = sample;
          if (typeof sample === 'string' && sample.length > 100) {
            displaySample = sample.substring(0, 100) + '...';
          } else if (typeof sample === 'object') {
            displaySample = JSON.stringify(sample).substring(0, 100) + '...';
          }
          console.log(`     ${i + 1}. ${displaySample}`);
        });
      }
    });

    console.log('\n🎯 KEY PROPERTY FIELDS FOR MIGRATION:');
    console.log('='.repeat(60));
    
    const keyFields = [
      'building', 'unitFor', 'area', 'finished', 'description', 'rooms', 
      'totalPrice', 'landArea', 'type', 'propertyImage', 'videos', 'mobileNo',
      'propertyNumber', 'theFloors', 'unitFeatures', 'phase', 'note', 
      'inOrOutSideCompound', 'status', 'activity', 'propertyOfferedBy',
      'name', 'unitNo', 'handler', 'sales', 'category', 'compoundName',
      'currency', 'rentFrom', 'rentTo', 'PricePerMeter', 'downPayment',
      'spaceEerth', 'spaceUnit', 'spaceGuard', 'installment', 'payedEvery', 'monthly'
    ];

    keyFields.forEach(field => {
      if (fieldAnalysis[field]) {
        const analysis = fieldAnalysis[field];
        const fillRate = ((analysis.filledCount / response.documents.length) * 100).toFixed(0);
        console.log(`✅ ${field}: ${analysis.type} (${fillRate}% filled)`);
        
        if (analysis.samples.length > 0) {
          const sample = analysis.samples[0];
          let displaySample = sample;
          if (typeof sample === 'string' && sample.length > 50) {
            displaySample = sample.substring(0, 50) + '...';
          }
          console.log(`   Sample: ${displaySample}`);
        }
      }
    });

  } catch (error) {
    console.error('❌ Error analyzing properties:', error);
  }
}

analyzePropertiesInDetail();
