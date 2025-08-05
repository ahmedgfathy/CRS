// ═══════════════════════════════════════════════════════════════════════════════════
// APPWRITE TO SUPABASE MIGRATION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════════
// Intelligent data migration with column mapping and relationship preservation
// ═══════════════════════════════════════════════════════════════════════════════════

const { AppwriteService, APPWRITE_CONFIG } = require('../config/appwrite');
const { SupabaseService } = require('../config/supabase');

class MigrationService {
  constructor() {
    this.supabase = new SupabaseService();
    this.lookupValues = {};
    this.migrationStats = {
      properties: { total: 0, migrated: 0, skipped: 0, errors: 0 },
      leads: { total: 0, migrated: 0, skipped: 0, errors: 0 },
      users: { total: 0, migrated: 0, skipped: 0, errors: 0 }
    };
  }

  /**
   * Initialize migration by loading lookup values
   */
  async initialize() {
    try {
      console.log('\n🚀 Initializing Migration Service...');
      
      // Connect to Supabase first
      await this.supabase.connect();
      
      // Load lookup values
      this.lookupValues = await this.supabase.getLookupValues();
      console.log('✅ Lookup values loaded successfully');
    } catch (error) {
      console.error('❌ Failed to initialize migration service:', error);
      throw error;
    }
  }

  /**
   * Migrate properties from Appwrite to Supabase
   */
  async migrateProperties(limit = null) {
    try {
      console.log('\n📊 Starting Properties Migration...');

      // Get all properties from Appwrite
      const appwriteResponse = await AppwriteService.getProperties();
      const appwriteProperties = appwriteResponse.documents;
      console.log(`📋 Found ${appwriteProperties.length} properties in Appwrite`);

      this.migrationStats.properties.total = appwriteProperties.length;
      
      // Limit for testing if specified
      const propertiesToMigrate = limit ? appwriteProperties.slice(0, limit) : appwriteProperties;
      console.log(`🎯 Migrating ${propertiesToMigrate.length} properties`);

      for (const appwriteProperty of propertiesToMigrate) {
        try {
          // Check if already migrated
          const existing = await this.supabase.query(
            'SELECT id FROM properties WHERE appwrite_id = $1',
            [appwriteProperty.$id]
          );

          if (existing.rows.length > 0) {
            console.log(`⏭️  Property ${appwriteProperty.$id} already migrated, skipping`);
            this.migrationStats.properties.skipped++;
            continue;
          }

          // Map and insert property
          const mappedProperty = this.mapPropertyData(appwriteProperty);
          const result = await this.supabase.insertProperty(mappedProperty);
          
          console.log(`✅ Migrated property: ${appwriteProperty.$id} -> ${result.id}`);
          this.migrationStats.properties.migrated++;

        } catch (error) {
          console.error(`❌ Failed to migrate property ${appwriteProperty.$id}:`, error);
          this.migrationStats.properties.errors++;
        }
      }

      console.log('\n📊 Properties Migration Complete:');
      console.log(`   Total: ${this.migrationStats.properties.total}`);
      console.log(`   Migrated: ${this.migrationStats.properties.migrated}`);
      console.log(`   Skipped: ${this.migrationStats.properties.skipped}`);
      console.log(`   Errors: ${this.migrationStats.properties.errors}`);

    } catch (error) {
      console.error('❌ Properties migration failed:', error);
      throw error;
    }
  }

  /**
   * Map Appwrite property to Supabase format with all 55 fields
   */
  mapPropertyData(appwriteProperty) {
    try {
      const mapped = {
        // Basic property info
        property_code: appwriteProperty.propertyNumber || `PROP_${Date.now()}`,
        title: appwriteProperty.compoundName || appwriteProperty.name || 'Untitled Property',
        description: appwriteProperty.description || '',
        
        // Property specifications
        bedrooms: this.parseInt(appwriteProperty.rooms),
        bathrooms: this.parseInt(appwriteProperty.bathrooms || 0),
        total_area: this.parseFloat(appwriteProperty.building), // Building area (BUA)
        built_area: this.parseFloat(appwriteProperty.building),
        floor_number: this.parseInt(appwriteProperty.theFloors),
        parking_spaces: this.parseInt(appwriteProperty.parking || 0),
        
        // Land and space info
        reception_rooms: this.parseInt(appwriteProperty.reception || 0),
        kitchens: this.parseInt(appwriteProperty.kitchens || 1),
        balconies: this.parseInt(appwriteProperty.balconies || 0),
        storage_rooms: this.parseInt(appwriteProperty.storage || 0),
        
        // Property details
        furnished: appwriteProperty.finished || 'unfurnished',
        view_type: appwriteProperty.view || null,
        floor_type: appwriteProperty.floorType || null,
        
        // Financial info
        price: this.parsePrice(appwriteProperty.totalPrice),
        down_payment: this.parsePrice(appwriteProperty.downPayment || 0),
        installment_years: this.parseInt(appwriteProperty.installmentYears || 0),
        monthly_installment: this.parsePrice(appwriteProperty.monthly || 0),
        maintenance_fee: this.parsePrice(appwriteProperty.maintenance || 0),
        payment_method: appwriteProperty.payedEvery || 'cash',
        
        // Location and compound info
        building_name: appwriteProperty.compoundName || '',
        unit_number: appwriteProperty.unitNo || '',
        street_name: appwriteProperty.streetName || '',
        
        // Status and availability
        listing_type: appwriteProperty.unitFor?.toLowerCase() || 'rent', // Rent/Sale
        availability_status: this.mapAvailabilityStatus(appwriteProperty.status),
        priority_level: appwriteProperty.liked ? 'high' : 'normal',
        
        // Media URLs from Appwrite
        main_image_url: null, // Will be set from images
        video_url: null, // Will be set from videos
        virtual_tour_url: appwriteProperty.virtualTour || null,
        
        // Timestamps
        created_at: appwriteProperty.$createdAt,
        updated_at: appwriteProperty.$updatedAt,
        listed_at: appwriteProperty.rentFrom || appwriteProperty.$createdAt,
        available_from: appwriteProperty.rentFrom || null,
        last_viewed_at: appwriteProperty.lastFollowIn || null,
        
        // Appwrite references
        appwrite_id: appwriteProperty.$id,
        appwrite_images: this.extractImageUrls(appwriteProperty),
        appwrite_videos: this.extractVideoUrls(appwriteProperty),
        
        // Additional Appwrite-specific data (all 55 fields preserved)
        appwrite_data: {
          propertyNumber: appwriteProperty.propertyNumber,
          handler: appwriteProperty.handler,
          sales: appwriteProperty.sales,
          mobileNo: appwriteProperty.mobileNo,
          currency: appwriteProperty.currency,
          propertyOfferedBy: appwriteProperty.propertyOfferedBy,
          inOrOutSideCompound: appwriteProperty.inOrOutSideCompound,
          phase: appwriteProperty.phase,
          note: appwriteProperty.note,
          unitFeatures: appwriteProperty.unitFeatures,
          landArea: appwriteProperty.landArea,
          spaceEerth: appwriteProperty.spaceEerth,
          spaceUnit: appwriteProperty.spaceUnit,
          spaceGuard: appwriteProperty.spaceGuard,
          users: appwriteProperty.users,
          tel: appwriteProperty.tel,
          rentTo: appwriteProperty.rentTo,
          liked: appwriteProperty.liked,
          inHome: appwriteProperty.inHome,
          // Additional fields from our analysis
          activity: appwriteProperty.activity,
          type: appwriteProperty.type,
          category: appwriteProperty.category,
          area: appwriteProperty.area,
          status: appwriteProperty.status,
          propertyImage: appwriteProperty.propertyImage,
          videos: appwriteProperty.videos
        }
      };

      // Set main image URL from first image
      if (mapped.appwrite_images && mapped.appwrite_images.length > 0) {
        mapped.main_image_url = mapped.appwrite_images[0].url;
      }

      // Set video URL from first video
      if (mapped.appwrite_videos && mapped.appwrite_videos.length > 0) {
        mapped.video_url = mapped.appwrite_videos[0].url;
      }

      // Map area/location (use the first available area if no match found)
      const areaMatch = this.findBestMatch(
        appwriteProperty.area || appwriteProperty.location,
        this.lookupValues.areas,
        ['area_name', 'area_name_ar']
      );
      // Use first available area if no match or default found
      const firstAreaId = this.lookupValues.areas && this.lookupValues.areas.length > 0 ? this.lookupValues.areas[0].id : 7;
      mapped.area_id = areaMatch || firstAreaId;

      // Map property type (use the first available type if no match found)  
      const typeMatch = this.findBestMatch(
        appwriteProperty.type || appwriteProperty.category,
        this.lookupValues.property_types,
        ['type_name']
      );
      const firstTypeId = this.lookupValues.property_types && this.lookupValues.property_types.length > 0 ? this.lookupValues.property_types[0].id : 5;
      mapped.type_id = typeMatch || firstTypeId;

      // Map category (use the first available category if no match found)
      const categoryMatch = this.findBestMatch(
        appwriteProperty.category || appwriteProperty.activity || appwriteProperty.type,
        this.lookupValues.property_categories,
        ['category_name']
      );
      const firstCategoryId = this.lookupValues.property_categories && this.lookupValues.property_categories.length > 0 ? this.lookupValues.property_categories[0].id : 1;
      mapped.category_id = categoryMatch || firstCategoryId;

      return mapped;
    } catch (error) {
      console.error('❌ Error mapping property data:', error);
      throw error;
    }
  }

  /**
   * Map availability status from Appwrite to standard values
   */
  mapAvailabilityStatus(status) {
    if (!status) return 'available';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('rent') || statusLower.includes('available')) return 'available';
    if (statusLower.includes('sold') || statusLower.includes('rented')) return 'rented';
    if (statusLower.includes('reserved')) return 'reserved';
    
    return 'available'; // Default
  }

  /**
   * Extract image URLs from Appwrite property
   */
  extractImageUrls(property) {
    try {
      const images = [];
      
      // Check if propertyImage is a JSON string
      if (property.propertyImage) {
        let imageData;
        
        if (typeof property.propertyImage === 'string') {
          try {
            imageData = JSON.parse(property.propertyImage);
          } catch (e) {
            // If parsing fails, treat as single URL
            images.push({
              url: property.propertyImage,
              file_id: null,
              original_name: 'property_image'
            });
            return images;
          }
        } else {
          imageData = property.propertyImage;
        }
        
        // Handle array of image objects
        if (Array.isArray(imageData)) {
          imageData.forEach((img, index) => {
            if (typeof img === 'object' && img.href) {
              images.push({
                url: img.href,
                file_id: img.$id || null,
                original_name: img.name || `image_${index + 1}`
              });
            } else if (typeof img === 'string') {
              images.push({
                url: img,
                file_id: null,
                original_name: `image_${index + 1}`
              });
            }
          });
        } else if (typeof imageData === 'object' && imageData.href) {
          // Single image object
          images.push({
            url: imageData.href,
            file_id: imageData.$id || null,
            original_name: imageData.name || 'property_image'
          });
        }
      }

      return images;
    } catch (error) {
      console.error('Error extracting image URLs:', error);
      return [];
    }
  }

  /**
   * Extract video URLs from Appwrite property
   */
  extractVideoUrls(property) {
    try {
      const videos = [];
      
      // Check if videos field exists
      if (property.videos) {
        let videoData;
        
        if (typeof property.videos === 'string') {
          try {
            videoData = JSON.parse(property.videos);
          } catch (e) {
            // If parsing fails, treat as single URL
            videos.push({
              url: property.videos,
              file_id: null,
              original_name: 'property_video'
            });
            return videos;
          }
        } else {
          videoData = property.videos;
        }
        
        // Handle array of video objects
        if (Array.isArray(videoData)) {
          videoData.forEach((vid, index) => {
            if (typeof vid === 'object' && vid.href) {
              videos.push({
                url: vid.href,
                file_id: vid.$id || null,
                original_name: vid.name || `video_${index + 1}`
              });
            } else if (typeof vid === 'string') {
              videos.push({
                url: vid,
                file_id: null,
                original_name: `video_${index + 1}`
              });
            }
          });
        } else if (typeof videoData === 'object' && videoData.href) {
          // Single video object
          videos.push({
            url: videoData.href,
            file_id: videoData.$id || null,
            original_name: videoData.name || 'property_video'
          });
        }
      }

      return videos;
    } catch (error) {
      console.error('Error extracting video URLs:', error);
      return [];
    }
  }

  /**
   * Find best match for lookup values
   */
  findBestMatch(searchValue, lookupArray, searchFields) {
    if (!searchValue || !lookupArray || lookupArray.length === 0) {
      return null;
    }

    const searchTerm = String(searchValue).toLowerCase().trim();
    
    // Exact match first
    for (const item of lookupArray) {
      for (const field of searchFields) {
        if (item[field] && String(item[field]).toLowerCase() === searchTerm) {
          return item.id;
        }
      }
    }
    
    // Partial match
    for (const item of lookupArray) {
      for (const field of searchFields) {
        if (item[field] && String(item[field]).toLowerCase().includes(searchTerm)) {
          return item.id;
        }
      }
    }
    
    // Reverse partial match
    for (const item of lookupArray) {
      for (const field of searchFields) {
        if (item[field] && searchTerm.includes(String(item[field]).toLowerCase())) {
          return item.id;
        }
      }
    }
    
    return null;
  }

  /**
   * Parse integer safely
   */
  parseInt(value) {
    if (!value) return 0;
    if (typeof value === 'number') return Math.floor(value);
    
    const parsed = parseInt(String(value).replace(/[^\d-]/g, ''), 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Parse float safely
   */
  parseFloat(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    
    const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Parse price safely
   */
  parsePrice(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    
    // Remove non-numeric characters except decimals
    const cleaned = String(value).replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Test connections to both databases
   */
  async testConnections() {
    console.log('\n🔍 Testing Database Connections...');
    
    try {
      // Test Appwrite
      const appwriteTest = await AppwriteService.testConnection();
      console.log('✅ Appwrite connection:', appwriteTest);
      
      // Test Supabase (connect first if not connected)
      if (!this.supabase.client) {
        await this.supabase.connect();
      }
      const supabaseTest = await this.supabase.testConnection();
      console.log('✅ Supabase connection:', supabaseTest);
      
      return { appwrite: appwriteTest, supabase: supabaseTest };
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      throw error;
    }
  }

  /**
   * Get migration statistics
   */
  getMigrationStats() {
    return this.migrationStats;
  }
}

module.exports = { MigrationService };
