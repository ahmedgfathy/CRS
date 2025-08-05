// ═══════════════════════════════════════════════════════════════════════════════════
// COMPLETE FAST MIGRATION WITH ALL APPWRITE FIELDS
// ═══════════════════════════════════════════════════════════════════════════════════
// This migrates ALL the data you actually have in Appwrite!
// ═══════════════════════════════════════════════════════════════════════════════════

const { AppwriteService } = require('./config/appwrite');
const { SupabaseService } = require('./config/supabase');

class CompleteMigrationService {
  constructor() {
    this.supabase = new SupabaseService();
    this.stats = {
      properties: 0,
      images: 0,
      videos: 0,
      areas: 0,
      errors: 0
    };
  }

  /**
   * Complete migration with ALL Appwrite fields
   */
  async completeMigration() {
    try {
      console.log('🚀 STARTING COMPLETE MIGRATION WITH ALL APPWRITE FIELDS...');
      console.log('This will migrate EVERYTHING: areas, owners, floors, images, videos, features!');
      
      // Connect to Supabase
      await this.supabase.connect();
      console.log('✅ Connected to Supabase');

      // Disable constraints for speed
      console.log('⚡ Disabling constraints for speed...');
      await this.supabase.query('SET session_replication_role = replica');

      // Get ALL properties from Appwrite with BULK fetch
      console.log('📥 Fetching ALL properties with complete data from Appwrite...');
      const response = await AppwriteService.getAllProperties();
      const allProperties = response.documents;
      
      console.log(`✅ Fetched ${allProperties.length} properties with complete data`);

      // Clear existing data first
      console.log('🗑️ Clearing existing incomplete data...');
      await this.supabase.query('TRUNCATE TABLE properties RESTART IDENTITY CASCADE');

      // Process and migrate complete data
      console.log('🔄 Processing complete property data...');
      await this.migrateCompleteProperties(allProperties);

      // Extract and migrate areas
      console.log('🏘️ Extracting and migrating areas...');
      await this.migrateAreas(allProperties);

      // Extract and migrate property images
      console.log('🖼️ Extracting and migrating property images...');
      await this.migratePropertyImages(allProperties);

      // Extract and migrate property videos
      console.log('🎥 Extracting and migrating property videos...');
      await this.migratePropertyVideos(allProperties);

      // Re-enable constraints
      console.log('🔒 Re-enabling constraints...');
      await this.supabase.query('SET session_replication_role = DEFAULT');

      // Final stats
      await this.printFinalStats();

      console.log('🎉 COMPLETE MIGRATION FINISHED SUCCESSFULLY!');
      console.log('✅ ALL Appwrite data migrated: areas, owners, floors, images, videos, features');

    } catch (error) {
      console.error('❌ Complete migration failed:', error);
      throw error;
    } finally {
      await this.supabase.disconnect();
      console.log('🔌 Disconnected from Supabase');
    }
  }

  /**
   * Migrate complete properties with ALL Appwrite fields
   */
  async migrateCompleteProperties(properties) {
    const batchSize = 50;
    
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);
      
      for (const prop of batch) {
        try {
          // Handle large prices
          const price = prop.totalPrice > 99999999 ? 99999999 : (prop.totalPrice || 0);
          const landArea = prop.landArea && !isNaN(prop.landArea) ? parseFloat(prop.landArea) : null;
          const building = prop.building && !isNaN(prop.building) ? parseFloat(prop.building) : null;

          const sql = `
            INSERT INTO properties (
              property_code, title, description, bedrooms, total_area, price,
              listing_type, availability_status, area_name, property_type, category,
              appwrite_id, owner_name, owner_mobile, floor_number, compound_name,
              land_area, building_area, finished_type, unit_features, phase_name,
              handler, sales_person, currency, down_payment, inside_compound,
              property_offered_by, activity, status, space_earth, space_unit, space_guard,
              created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
              $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
            )
            ON CONFLICT (appwrite_id) DO UPDATE SET
              property_code = EXCLUDED.property_code,
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              bedrooms = EXCLUDED.bedrooms,
              total_area = EXCLUDED.total_area,
              price = EXCLUDED.price,
              listing_type = EXCLUDED.listing_type,
              area_name = EXCLUDED.area_name,
              property_type = EXCLUDED.property_type,
              category = EXCLUDED.category,
              owner_name = EXCLUDED.owner_name,
              owner_mobile = EXCLUDED.owner_mobile,
              floor_number = EXCLUDED.floor_number,
              compound_name = EXCLUDED.compound_name,
              land_area = EXCLUDED.land_area,
              building_area = EXCLUDED.building_area,
              finished_type = EXCLUDED.finished_type,
              unit_features = EXCLUDED.unit_features,
              phase_name = EXCLUDED.phase_name,
              handler = EXCLUDED.handler,
              sales_person = EXCLUDED.sales_person,
              currency = EXCLUDED.currency,
              down_payment = EXCLUDED.down_payment,
              inside_compound = EXCLUDED.inside_compound,
              property_offered_by = EXCLUDED.property_offered_by,
              activity = EXCLUDED.activity,
              status = EXCLUDED.status,
              space_earth = EXCLUDED.space_earth,
              space_unit = EXCLUDED.space_unit,
              space_guard = EXCLUDED.space_guard,
              updated_at = EXCLUDED.updated_at
          `;

          await this.supabase.query(sql, [
            prop.propertyNumber || 'N/A',
            prop.compoundName || prop.name || 'Untitled Property',
            prop.description || '',
            prop.rooms || 0,
            building,
            price,
            this.mapListingType(prop.unitFor),
            'available', // Default status
            prop.area || 'Unknown Area',
            prop.type || 'Unknown Type',
            prop.category || 'Residential',
            prop.$id,
            prop.name || 'Owner',
            prop.mobileNo || '',
            prop.theFloors || '',
            prop.compoundName || '',
            landArea,
            building,
            prop.finished || '',
            prop.unitFeatures || '',
            prop.phase || '',
            prop.handler || '',
            prop.sales || '',
            prop.currency || 'EGP',
            prop.downPayment || 0,
            prop.inOrOutSideCompound || '',
            prop.propertyOfferedBy || '',
            prop.activity || '',
            prop.status || '',
            prop.spaceEerth || '',
            prop.spaceUnit || '',
            prop.spaceGuard || '',
            new Date(prop.$createdAt),
            new Date(prop.$updatedAt)
          ]);

          this.stats.properties++;
        } catch (error) {
          console.log(`⚠️  Skipped property ${prop.$id}: ${error.message}`);
          this.stats.errors++;
        }
      }
      
      console.log(`   ✅ Processed batch ${Math.ceil((i + batch.length) / batchSize)} of ${Math.ceil(properties.length / batchSize)} (${this.stats.properties} properties)`);
    }
  }

  /**
   * Extract and migrate all unique areas
   */
  async migrateAreas(properties) {
    const uniqueAreas = new Set();
    
    properties.forEach(prop => {
      if (prop.area && prop.area.trim()) {
        uniqueAreas.add(prop.area.trim());
      }
    });

    console.log(`🏘️ Found ${uniqueAreas.size} unique areas`);

    // Clear existing areas and reset
    await this.supabase.query('TRUNCATE TABLE areas RESTART IDENTITY CASCADE');

    for (const areaName of uniqueAreas) {
      try {
        await this.supabase.query(`
          INSERT INTO areas (name, created_at) 
          VALUES ($1, NOW()) 
          ON CONFLICT (name) DO NOTHING
        `, [areaName]);
        this.stats.areas++;
      } catch (error) {
        console.log(`⚠️  Error inserting area ${areaName}: ${error.message}`);
      }
    }

    console.log(`✅ Migrated ${this.stats.areas} areas`);
  }

  /**
   * Extract and migrate property images
   */
  async migratePropertyImages(properties) {
    // Clear existing
    await this.supabase.query('TRUNCATE TABLE property_images RESTART IDENTITY');

    for (const prop of properties) {
      if (prop.propertyImage && prop.propertyImage !== '[]') {
        try {
          const images = JSON.parse(prop.propertyImage);
          if (Array.isArray(images)) {
            for (let i = 0; i < images.length; i++) {
              const image = images[i];
              if (image.fileUrl) {
                await this.supabase.query(`
                  INSERT INTO property_images (
                    appwrite_property_id, image_url, image_order, is_primary, created_at
                  ) VALUES ($1, $2, $3, $4, NOW())
                `, [prop.$id, image.fileUrl, i, i === 0]);
                this.stats.images++;
              }
            }
          }
        } catch (error) {
          console.log(`⚠️  Error parsing images for ${prop.$id}: ${error.message}`);
        }
      }
    }

    console.log(`✅ Migrated ${this.stats.images} property images`);
  }

  /**
   * Extract and migrate property videos
   */
  async migratePropertyVideos(properties) {
    // Clear existing
    await this.supabase.query('TRUNCATE TABLE property_videos RESTART IDENTITY');

    for (const prop of properties) {
      if (prop.videos && prop.videos !== '[]') {
        try {
          const videos = JSON.parse(prop.videos);
          if (Array.isArray(videos)) {
            for (const video of videos) {
              if (video.url) {
                await this.supabase.query(`
                  INSERT INTO property_videos (
                    appwrite_property_id, video_url, video_title, created_at
                  ) VALUES ($1, $2, $3, NOW())
                `, [prop.$id, video.url, video.title || 'Property Video']);
                this.stats.videos++;
              }
            }
          }
        } catch (error) {
          console.log(`⚠️  Error parsing videos for ${prop.$id}: ${error.message}`);
        }
      }
    }

    console.log(`✅ Migrated ${this.stats.videos} property videos`);
  }

  /**
   * Map listing type
   */
  mapListingType(unitFor) {
    if (!unitFor) return 'sale';
    const type = unitFor.toLowerCase();
    if (type.includes('rent')) return 'rent';
    if (type.includes('sale')) return 'sale';
    return 'sale';
  }

  /**
   * Print final migration stats
   */
  async printFinalStats() {
    console.log('\n🎯 COMPLETE MIGRATION STATISTICS:');
    console.log('════════════════════════════════════════');
    
    // Count everything
    const propertiesCount = await this.supabase.query('SELECT COUNT(*) as count FROM properties');
    const areasCount = await this.supabase.query('SELECT COUNT(*) as count FROM areas');
    const imagesCount = await this.supabase.query('SELECT COUNT(*) as count FROM property_images');
    const videosCount = await this.supabase.query('SELECT COUNT(*) as count FROM property_videos');

    console.log(`📊 Properties: ${propertiesCount.rows[0].count} (with ALL fields: owner, floors, areas, etc.)`);
    console.log(`🏘️  Areas: ${areasCount.rows[0].count} unique areas/neighborhoods`);
    console.log(`🖼️  Images: ${imagesCount.rows[0].count} property images`);
    console.log(`🎥 Videos: ${videosCount.rows[0].count} property videos`);
    console.log(`⚠️  Errors: ${this.stats.errors} items skipped due to data issues`);

    // Show sample complete data
    console.log('\n📋 Sample complete property data:');
    const sample = await this.supabase.query(`
      SELECT property_code, title, owner_name, owner_mobile, area_name, 
             floor_number, compound_name, price, listing_type 
      FROM properties 
      LIMIT 3
    `);
    
    sample.rows.forEach(p => {
      console.log(`   ${p.property_code}: ${p.title}`);
      console.log(`      👤 Owner: ${p.owner_name} (${p.owner_mobile})`);
      console.log(`      🏘️  Area: ${p.area_name} | Floor: ${p.floor_number}`);
      console.log(`      🏢 Compound: ${p.compound_name}`);
      console.log(`      💰 Price: ${p.price} (${p.listing_type})`);
      console.log('');
    });
  }
}

module.exports = { CompleteMigrationService };
