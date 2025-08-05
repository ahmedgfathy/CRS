// ═══════════════════════════════════════════════════════════════════════════════════
// FAST BULK MIGRATION SERVICE
// ═══════════════════════════════════════════════════════════════════════════════════
// High-performance migration with batch processing and complete table population
// ═══════════════════════════════════════════════════════════════════════════════════

const { AppwriteService } = require('./config/appwrite');
const { SupabaseService } = require('./config/supabase');

class FastMigrationService {
  constructor() {
    this.supabase = new SupabaseService();
    this.stats = {
      properties: 0,
      images: 0,
      videos: 0,
      features: 0,
      contacts: 0,
      errors: 0
    };
  }

  /**
   * FAST BULK MIGRATION - All 3K properties at once
   */
  async fastMigrateAllProperties() {
    console.log('\n🚀 FAST BULK MIGRATION STARTING...');
    const startTime = Date.now();

    try {
      // Connect to databases
      await this.supabase.connect();
      
      // Disable foreign key constraints for speed
      console.log('⚡ Disabling constraints for speed...');
      await this.supabase.query('SET session_replication_role = replica;');
      
      // 1. Bulk fetch ALL properties from Appwrite
      console.log('📥 Fetching ALL properties from Appwrite...');
      const appwriteResponse = await AppwriteService.getAllProperties();
      const allProperties = appwriteResponse.documents;
      console.log(`✅ Fetched ${allProperties.length} properties in bulk`);

      // 2. Prepare batch data
      console.log('🔄 Preparing batch data...');
      const {
        propertiesBatch,
        imagesBatch,
        videosBatch,
        featuresBatch,
        contactsBatch
      } = this.prepareBatchData(allProperties);

      // 3. Batch insert properties (main table)
      console.log(`📊 Batch inserting ${propertiesBatch.length} properties...`);
      await this.batchInsertProperties(propertiesBatch);
      this.stats.properties = propertiesBatch.length;

      // 4. Batch insert related data
      if (imagesBatch.length > 0) {
        console.log(`📸 Batch inserting ${imagesBatch.length} images...`);
        await this.batchInsertImages(imagesBatch);
        this.stats.images = imagesBatch.length;
      }

      if (videosBatch.length > 0) {
        console.log(`🎥 Batch inserting ${videosBatch.length} videos...`);
        await this.batchInsertVideos(videosBatch);
        this.stats.videos = videosBatch.length;
      }

      if (featuresBatch.length > 0) {
        console.log(`⭐ Batch inserting ${featuresBatch.length} features...`);
        await this.batchInsertFeatures(featuresBatch);
        this.stats.features = featuresBatch.length;
      }

      if (contactsBatch.length > 0) {
        console.log(`📞 Batch inserting ${contactsBatch.length} contacts...`);
        await this.batchInsertContacts(contactsBatch);
        this.stats.contacts = contactsBatch.length;
      }

      // Re-enable constraints
      console.log('🔒 Re-enabling constraints...');
      await this.supabase.query('SET session_replication_role = DEFAULT;');

      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      console.log('\n🎉 FAST MIGRATION COMPLETED!');
      console.log(`⏱️  Duration: ${duration} seconds`);
      console.log(`📊 Statistics:`);
      console.log(`   Properties: ${this.stats.properties}`);
      console.log(`   Images: ${this.stats.images}`);
      console.log(`   Videos: ${this.stats.videos}`);
      console.log(`   Features: ${this.stats.features}`);
      console.log(`   Contacts: ${this.stats.contacts}`);
      console.log(`   Speed: ${Math.round(this.stats.properties / duration)} properties/second`);

    } catch (error) {
      console.error('❌ Fast migration failed:', error);
      // Re-enable constraints on error
      try {
        await this.supabase.query('SET session_replication_role = DEFAULT;');
      } catch (e) {}
      throw error;
    } finally {
      await this.supabase.disconnect();
    }
  }

  /**
   * Prepare all batch data at once
   */
  prepareBatchData(allProperties) {
    const propertiesBatch = [];
    const imagesBatch = [];
    const videosBatch = [];
    const featuresBatch = [];
    const contactsBatch = [];

    allProperties.forEach((prop, index) => {
      const propertyId = index + 1; // Simple incrementing ID

      // Main property data
      const propertyData = {
        id: propertyId,
        property_code: prop.propertyNumber || `PROP_${propertyId}`,
        title: prop.compoundName || prop.name || 'Property',
        description: prop.description || '',
        bedrooms: this.parseInt(prop.rooms),
        total_area: this.parseFloat(prop.building),
        price: this.parsePrice(prop.totalPrice),
        listing_type: this.mapListingType(prop.unitFor),
        availability_status: 'available',
        created_at: prop.$createdAt,
        updated_at: prop.$updatedAt,
        appwrite_id: prop.$id,
        area_id: 7, // Use our default area
        type_id: 5, // Use our default type
        category_id: 1, // Use our default category
        appwrite_data: prop // Store complete original data
      };

      propertiesBatch.push(propertyData);

      // Extract images
      if (prop.propertyImage) {
        let images = [];
        try {
          if (typeof prop.propertyImage === 'string') {
            const parsed = JSON.parse(prop.propertyImage);
            images = Array.isArray(parsed) ? parsed : [parsed];
          } else {
            images = Array.isArray(prop.propertyImage) ? prop.propertyImage : [prop.propertyImage];
          }

          images.forEach((img, imgIndex) => {
            if (img && (img.href || img.url || typeof img === 'string')) {
              imagesBatch.push({
                property_id: propertyId,
                image_url: img.href || img.url || img,
                image_order: imgIndex + 1,
                image_type: 'property',
                appwrite_file_id: img.$id || null
              });
            }
          });
        } catch (e) {
          // If parsing fails, treat as single URL
          if (prop.propertyImage) {
            imagesBatch.push({
              property_id: propertyId,
              image_url: prop.propertyImage,
              image_order: 1,
              image_type: 'property'
            });
          }
        }
      }

      // Extract videos
      if (prop.videos) {
        let videos = [];
        try {
          if (typeof prop.videos === 'string') {
            const parsed = JSON.parse(prop.videos);
            videos = Array.isArray(parsed) ? parsed : [parsed];
          } else {
            videos = Array.isArray(prop.videos) ? prop.videos : [prop.videos];
          }

          videos.forEach((vid, vidIndex) => {
            if (vid && (vid.href || vid.url || typeof vid === 'string')) {
              videosBatch.push({
                property_id: propertyId,
                video_url: vid.href || vid.url || vid,
                video_order: vidIndex + 1,
                video_type: 'property',
                appwrite_file_id: vid.$id || null
              });
            }
          });
        } catch (e) {
          // If parsing fails, treat as single URL
          if (prop.videos) {
            videosBatch.push({
              property_id: propertyId,
              video_url: prop.videos,
              video_order: 1,
              video_type: 'property'
            });
          }
        }
      }

      // Extract features
      if (prop.unitFeatures) {
        featuresBatch.push({
          property_id: propertyId,
          feature_name: 'Unit Features',
          feature_value: prop.unitFeatures,
          feature_type: 'amenity'
        });
      }

      // Extract contact info
      if (prop.mobileNo || prop.tel || prop.handler || prop.sales) {
        if (prop.mobileNo) {
          contactsBatch.push({
            property_id: propertyId,
            contact_type: 'mobile',
            contact_value: prop.mobileNo,
            contact_name: prop.handler || 'Agent'
          });
        }
        if (prop.tel && prop.tel !== prop.mobileNo) {
          contactsBatch.push({
            property_id: propertyId,
            contact_type: 'phone',
            contact_value: prop.tel,
            contact_name: prop.sales || 'Sales'
          });
        }
      }
    });

    return {
      propertiesBatch,
      imagesBatch,
      videosBatch,
      featuresBatch,
      contactsBatch
    };
  }

  /**
   * Batch insert properties
   */
  async batchInsertProperties(propertiesBatch) {
    const batchSize = 50; // Smaller batches for stability
    
    for (let i = 0; i < propertiesBatch.length; i += batchSize) {
      const batch = propertiesBatch.slice(i, i + batchSize);
      
      for (const prop of batch) {
        try {
          const sql = `
            INSERT INTO properties (
              property_code, title, description, bedrooms, total_area, price,
              listing_type, availability_status, area_id, type_id, category_id,
              appwrite_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (appwrite_id) DO NOTHING
          `;

          // Handle large prices by capping them
          const price = prop.price > 99999999 ? 99999999 : prop.price;
          const total_area = prop.total_area > 99999999 ? 99999999 : prop.total_area;
          
          await this.supabase.query(sql, [
            prop.property_code, prop.title, prop.description, prop.bedrooms,
            total_area, price, prop.listing_type, prop.availability_status,
            prop.area_id, prop.type_id, prop.category_id, prop.appwrite_id
          ]);
        } catch (error) {
          console.log(`⚠️  Skipped property ${prop.appwrite_id}: ${error.message}`);
          this.stats.errors++;
        }
      }
      
      console.log(`   ✅ Processed batch ${Math.ceil((i + batch.length) / batchSize)} of ${Math.ceil(propertiesBatch.length / batchSize)}`);
    }
  }

  /**
   * Batch insert images
   */
  async batchInsertImages(imagesBatch) {
    const batchSize = 200;
    for (let i = 0; i < imagesBatch.length; i += batchSize) {
      const batch = imagesBatch.slice(i, i + batchSize);
      
      const values = batch.map((_, index) => {
        const base = i + index;
        return `($${base * 5 + 1}, $${base * 5 + 2}, $${base * 5 + 3}, $${base * 5 + 4}, $${base * 5 + 5})`;
      }).join(', ');

      const params = batch.flatMap(img => [
        img.property_id, img.image_url, img.image_order, img.image_type, img.appwrite_file_id
      ]);

      const sql = `
        INSERT INTO property_images (property_id, image_url, image_order, image_type, appwrite_file_id)
        VALUES ${values}
      `;

      await this.supabase.query(sql, params);
    }
  }

  /**
   * Batch insert videos
   */
  async batchInsertVideos(videosBatch) {
    const batchSize = 200;
    for (let i = 0; i < videosBatch.length; i += batchSize) {
      const batch = videosBatch.slice(i, i + batchSize);
      
      const values = batch.map((_, index) => {
        const base = i + index;
        return `($${base * 5 + 1}, $${base * 5 + 2}, $${base * 5 + 3}, $${base * 5 + 4}, $${base * 5 + 5})`;
      }).join(', ');

      const params = batch.flatMap(vid => [
        vid.property_id, vid.video_url, vid.video_order, vid.video_type, vid.appwrite_file_id
      ]);

      const sql = `
        INSERT INTO property_videos (property_id, video_url, video_order, video_type, appwrite_file_id)
        VALUES ${values}
      `;

      await this.supabase.query(sql, params);
    }
  }

  /**
   * Batch insert features
   */
  async batchInsertFeatures(featuresBatch) {
    const batchSize = 200;
    for (let i = 0; i < featuresBatch.length; i += batchSize) {
      const batch = featuresBatch.slice(i, i + batchSize);
      
      const values = batch.map((_, index) => {
        const base = i + index;
        return `($${base * 4 + 1}, $${base * 4 + 2}, $${base * 4 + 3}, $${base * 4 + 4})`;
      }).join(', ');

      const params = batch.flatMap(feat => [
        feat.property_id, feat.feature_name, feat.feature_value, feat.feature_type
      ]);

      const sql = `
        INSERT INTO property_features (property_id, feature_name, feature_value, feature_type)
        VALUES ${values}
      `;

      await this.supabase.query(sql, params);
    }
  }

  /**
   * Batch insert contacts
   */
  async batchInsertContacts(contactsBatch) {
    const batchSize = 200;
    for (let i = 0; i < contactsBatch.length; i += batchSize) {
      const batch = contactsBatch.slice(i, i + batchSize);
      
      const values = batch.map((_, index) => {
        const base = i + index;
        return `($${base * 4 + 1}, $${base * 4 + 2}, $${base * 4 + 3}, $${base * 4 + 4})`;
      }).join(', ');

      const params = batch.flatMap(contact => [
        contact.property_id, contact.contact_type, contact.contact_value, contact.contact_name
      ]);

      const sql = `
        INSERT INTO property_contacts (property_id, contact_type, contact_value, contact_name)
        VALUES ${values}
      `;

      await this.supabase.query(sql, params);
    }
  }

  /**
   * Helper methods
   */
  mapListingType(unitFor) {
    if (!unitFor) return 'rent';
    
    const type = unitFor.toLowerCase();
    if (type.includes('rent')) return 'rent';
    if (type.includes('sale') || type.includes('sell')) return 'sale';
    if (type.includes('sold')) return 'sale';
    
    return 'rent'; // Default fallback
  }

  parseInt(value) {
    if (!value) return 0;
    if (typeof value === 'number') return Math.floor(value);
    const parsed = parseInt(String(value).replace(/[^\d-]/g, ''), 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  parseFloat(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }

  parsePrice(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    const cleaned = String(value).replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
}

module.exports = { FastMigrationService };
