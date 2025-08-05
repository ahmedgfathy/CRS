// complete-migration-with-area-normalization.js
require('dotenv').config();
const { Client } = require('appwrite');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const config = {
    appwrite: {
        endpoint: 'https://cloud.appwrite.io/v1',
        projectId: '6732766d002b223d1598',
        databaseId: '677a9e5c0014e2994c62',
        propertiesCollectionId: '6737698b000cccaf6f16'
    },
    supabase: {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_SERVICE_ROLE_KEY
    }
};

class AreaNormalizationService {
    constructor(appwriteService, supabaseService) {
        this.appwrite = appwriteService;
        this.supabase = supabaseService;
        this.areaCache = new Map();
    }

    async extractAndCreateAreas() {
        console.log('🔍 Extracting unique areas from Appwrite properties...');
        
        const allProperties = await this.appwrite.getAllProperties();
        
        // Extract unique area names with statistics
        const uniqueAreas = new Set();
        const areaStats = new Map();
        
        allProperties.forEach(property => {
            if (property.area && property.area.trim()) {
                const cleanArea = this.cleanAreaName(property.area);
                if (cleanArea) {
                    uniqueAreas.add(cleanArea);
                    const count = areaStats.get(cleanArea) || 0;
                    areaStats.set(cleanArea, count + 1);
                }
            }
        });

        console.log(`📊 Found ${uniqueAreas.size} unique areas from ${allProperties.length} properties`);
        
        // Sort areas by frequency
        const sortedAreas = Array.from(uniqueAreas).sort((a, b) => {
            return (areaStats.get(b) || 0) - (areaStats.get(a) || 0);
        });

        // Display top 10 most common areas
        console.log('\n🏆 Top 10 most common areas:');
        sortedAreas.slice(0, 10).forEach((area, index) => {
            console.log(`   ${index + 1}. ${area} (${areaStats.get(area)} properties)`);
        });

        // Create areas in Supabase
        const createdAreas = await this.createAreasInSupabase(sortedAreas, areaStats);
        
        console.log(`✅ Created ${createdAreas.length} areas in Supabase`);
        return createdAreas;
    }

    cleanAreaName(areaName) {
        if (!areaName) return null;
        
        return areaName
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\u0600-\u06FF]/g, '')
            .trim();
    }

    async createAreasInSupabase(areaNames, stats) {
        const createdAreas = [];
        const batchSize = 50;
        
        for (let i = 0; i < areaNames.length; i += batchSize) {
            const batch = areaNames.slice(i, i + batchSize);
            
            const areaRecords = batch.map(areaName => ({
                area_name: areaName,
                region_id: 2, // Cairo region
                area_type: 'neighborhood',
                status: 'active'
            }));

            try {
                const { data, error } = await this.supabase.client
                    .from('areas')
                    .insert(areaRecords)
                    .select('id, area_name');

                if (error) {
                    console.error('❌ Error creating areas batch:', error);
                    throw error;
                }

                // Cache area IDs
                data.forEach(area => {
                    this.areaCache.set(area.area_name, area.id);
                });

                createdAreas.push(...data);
                console.log(`📦 Processed areas batch ${Math.floor(i / batchSize) + 1}: ${data.length} areas`);
                
            } catch (error) {
                console.error(`❌ Failed to create areas batch:`, error);
                throw error;
            }
        }

        return createdAreas;
    }

    async getAreaId(areaName) {
        if (!areaName) return null;
        
        const cleanName = this.cleanAreaName(areaName);
        if (!cleanName) return null;
        
        // Check cache first
        if (this.areaCache.has(cleanName)) {
            return this.areaCache.get(cleanName);
        }

        // Search in database
        const { data, error } = await this.supabase.client
            .from('areas')
            .select('id')
            .eq('area_name', cleanName)
            .single();

        if (error || !data) {
            console.warn(`⚠️ Area not found: ${cleanName}`);
            return null;
        }

        this.areaCache.set(cleanName, data.id);
        return data.id;
    }
}

class AppwriteService {
    constructor() {
        this.client = new Client()
            .setEndpoint(config.appwrite.endpoint)
            .setProject(config.appwrite.projectId);
        
        this.databases = new Databases(this.client);
    }

    async getAllProperties() {
        console.log('📦 Fetching all properties from Appwrite...');
        
        const allProperties = [];
        let offset = 0;
        const limit = 500;
        let hasMore = true;

        while (hasMore) {
            try {
                const response = await this.databases.listDocuments(
                    config.appwrite.databaseId,
                    config.appwrite.propertiesCollectionId,
                    [
                        Query.limit(limit),
                        Query.offset(offset)
                    ]
                );

                allProperties.push(...response.documents);
                console.log(`📦 Fetched ${offset + response.documents.length} / ${response.total} properties`);

                offset += limit;
                hasMore = response.documents.length === limit && offset < response.total;

            } catch (error) {
                console.error('❌ Error fetching properties:', error);
                throw error;
            }
        }

        console.log(`✅ Retrieved ALL ${allProperties.length} properties from Appwrite`);
        return allProperties;
    }
}

class SupabaseService {
    constructor() {
        this.client = createClient(config.supabase.url, config.supabase.key);
    }

    // Delegate all methods to the underlying client
    from(table) {
        return this.client.from(table);
    }

    rpc(functionName, params) {
        return this.client.rpc(functionName, params);
    }
}

class CompleteMigrationService {
    constructor() {
        this.appwrite = new AppwriteService();
        this.supabase = new SupabaseService();
        this.areaNormalizer = new AreaNormalizationService(this.appwrite, this.supabase);
        this.contactCache = new Map();
        this.typeCache = new Map();
        this.categoryCache = new Map();
    }

    async migrate() {
        try {
            console.log('🚀 Starting COMPLETE Appwrite → Supabase Migration');
            console.log('📋 Focus: Proper area normalization and relational database structure\n');
            
            const startTime = Date.now();

            // Phase 0: Create database schema
            console.log('=== PHASE 0: SCHEMA CREATION ===');
            await this.createDatabaseSchema();

            // Phase 1: Extract and normalize areas
            console.log('\n=== PHASE 1: AREA NORMALIZATION ===');
            await this.areaNormalizer.extractAndCreateAreas();
            
            // Phase 2: Get all properties
            console.log('\n=== PHASE 2: PROPERTY RETRIEVAL ===');
            const allProperties = await this.appwrite.getAllProperties();
            
            // Phase 3: Migrate properties with proper relationships
            console.log('\n=== PHASE 3: PROPERTY MIGRATION ===');
            await this.migratePropertiesWithRelationships(allProperties);
            
            // Phase 4: Migrate rich media
            console.log('\n=== PHASE 4: RICH MEDIA MIGRATION ===');
            await this.migrateRichMedia(allProperties);
            
            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;
            
            console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
            console.log(`⏱️ Total time: ${duration.toFixed(2)} seconds`);
            
            // Validation
            await this.validateMigration();
            
        } catch (error) {
            console.error('❌ MIGRATION FAILED:', error);
            throw error;
        }
    }

    async createDatabaseSchema() {
        console.log('🏗️ Setting up database schema...');
        
        try {
            // Test if areas table exists by trying to select from it
            const { data, error } = await this.supabase
                .from('areas')
                .select('count', { count: 'exact' })
                .limit(1);
                
            if (error && error.code === 'PGRST116') {
                console.log('📄 Tables need to be created. Please ensure the following tables exist in Supabase:');
                console.log('   - areas');
                console.log('   - property_types'); 
                console.log('   - property_categories');
                console.log('   - contacts');
                console.log('   - properties');
                console.log('   - property_images');
                console.log('   - property_videos');
                console.log('');
                console.log('💡 You can create them using the SQL editor in Supabase dashboard.');
                console.log('✅ Continuing with migration...');
            } else {
                console.log('✅ Database tables appear to be ready');
            }
            
        } catch (error) {
            console.warn('⚠️ Could not verify table structure:', error.message);
            console.log('✅ Continuing with migration...');
        }
    }

    async migratePropertiesWithRelationships(properties) {
        const batchSize = 25; // Smaller batches for better error handling
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        console.log(`📦 Migrating ${properties.length} properties in batches of ${batchSize}`);

        for (let i = 0; i < properties.length; i += batchSize) {
            const batch = properties.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(properties.length / batchSize);
            
            console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches}: Properties ${i + 1}-${Math.min(i + batchSize, properties.length)}`);

            const processedBatch = [];
            
            for (const property of batch) {
                try {
                    const transformed = await this.transformPropertyWithRelationships(property);
                    if (transformed) {
                        processedBatch.push(transformed);
                    }
                } catch (error) {
                    console.error(`❌ Error transforming property ${property.$id}:`, error.message);
                    errors.push({ propertyId: property.$id, error: error.message });
                    errorCount++;
                }
            }

            // Insert batch with proper error handling
            if (processedBatch.length > 0) {
                try {
                    const { data, error } = await this.supabase
                        .from('properties')
                        .upsert(processedBatch, {
                            onConflict: 'appwrite_id',
                            ignoreDuplicates: false
                        })
                        .select('id, property_code, appwrite_id');

                    if (error) {
                        console.error('❌ Batch insertion error:', error);
                        errorCount += processedBatch.length;
                        errors.push({ batch: batchNumber, error: error.message });
                    } else {
                        successCount += data.length;
                        console.log(`✅ Successfully inserted ${data.length} properties`);
                        
                        // Show sample of inserted properties
                        if (data.length > 0) {
                            console.log(`   Sample: ${data[0].property_code} (${data[0].appwrite_id})`);
                        }
                    }
                } catch (insertError) {
                    console.error('❌ Critical insertion error:', insertError);
                    errorCount += processedBatch.length;
                    errors.push({ batch: batchNumber, error: insertError.message });
                }
            }

            // Progress indicator
            const progress = ((i + batchSize) / properties.length * 100).toFixed(1);
            console.log(`📊 Progress: ${progress}% | Success: ${successCount} | Errors: ${errorCount}`);
        }

        console.log(`\n📊 MIGRATION SUMMARY:`);
        console.log(`   ✅ Successful: ${successCount} properties`);
        console.log(`   ❌ Failed: ${errorCount} properties`);
        console.log(`   📈 Success Rate: ${((successCount / properties.length) * 100).toFixed(1)}%`);

        if (errors.length > 0) {
            console.log(`\n⚠️ First 5 errors:`);
            errors.slice(0, 5).forEach((err, index) => {
                console.log(`   ${index + 1}. ${err.propertyId || err.batch}: ${err.error}`);
            });
        }
    }

    async transformPropertyWithRelationships(appwriteProperty) {
        const prop = appwriteProperty;

        // CRITICAL: Get area ID through normalization
        const areaId = await this.areaNormalizer.getAreaId(prop.area);
        if (!areaId && prop.area) {
            console.warn(`⚠️ Could not resolve area: ${prop.area} for property ${prop.$id}`);
        }
        
        // Get property type ID
        const propertyTypeId = await this.getPropertyTypeId(prop.type);
        
        // Get category ID
        const categoryId = await this.getCategoryId(prop.category);
        
        // Get or create contact
        const primaryContactId = await this.getOrCreateContactId(
            prop.name, 
            prop.mobileNo, 
            prop.tel
        );

        // Parse compound name
        const { title, compoundName } = this.parseCompoundName(prop.compoundName);

        // Build the transformed property object
        const transformedProperty = {
            // System fields
            appwrite_id: prop.$id,
            property_code: prop.propertyNumber || `PROP_${prop.$id.slice(-8).toUpperCase()}`,
            
            // Basic info
            title: title || prop.description?.substring(0, 200) || `Property ${prop.propertyNumber || prop.$id.slice(-8)}`,
            description: prop.description,
            compound_name: compoundName,
            
            // CRITICAL: Normalized relationships
            area_id: areaId, // This is the key normalization
            property_type_id: propertyTypeId,
            category_id: categoryId,
            primary_contact_id: primaryContactId,
            
            // Property specifications
            listing_type: this.normalizeListingType(prop.unitFor),
            bedrooms: this.parseNumeric(prop.rooms, 0, 20),
            floor_number: prop.theFloors?.toString().substring(0, 20),
            
            // Measurements
            land_area: this.parseDecimal(prop.landArea),
            building_area: this.parseDecimal(prop.building),
            space_earth: this.parseDecimal(prop.spaceEerth),
            space_unit: this.parseDecimal(prop.spaceUnit),
            space_guard: this.parseDecimal(prop.spaceGuard),
            
            // Financial data
            price: this.parsePrice(prop.totalPrice),
            currency: prop.currency || 'EGP',
            down_payment: this.parseDecimal(prop.downPayment),
            price_per_meter: this.parseDecimal(prop.PricePerMeter),
            monthly_payment: this.parseDecimal(prop.monthly),
            installment_plan: this.parseJSON(prop.installment),
            
            // Status and metadata
            listing_status: this.normalizeStatus(prop.status),
            activity_type: prop.activity,
            offered_by: prop.propertyOfferedBy,
            inside_compound: this.parseBoolean(prop.inOrOutSideCompound),
            phase_name: prop.phase,
            
            // User preferences
            is_liked: prop.liked || false,
            featured_home: prop.inHome || false,
            
            // System timestamps
            created_at: this.parseTimestamp(prop.$createdAt),
            updated_at: this.parseTimestamp(prop.$updatedAt)
        };

        return transformedProperty;
    }

    async getPropertyTypeId(typeName) {
        if (!typeName) return null;
        
        const cleanType = typeName.toLowerCase().trim();
        
        if (this.typeCache.has(cleanType)) {
            return this.typeCache.get(cleanType);
        }

        // Search existing
        let { data, error } = await this.supabase
            .from('property_types')
            .select('id')
            .eq('type_name', cleanType)
            .single();

        // Create if not exists
        if (error || !data) {
            const { data: newType, error: createError } = await this.supabase
                .from('property_types')
                .upsert({ 
                    type_name: cleanType, 
                    category: 'residential',
                    is_active: true 
                }, {
                    onConflict: 'type_name',
                    ignoreDuplicates: false
                })
                .select('id')
                .single();

            if (createError) {
                console.error('❌ Error creating property type:', createError);
                return null;
            }
            data = newType;
        }

        this.typeCache.set(cleanType, data.id);
        return data.id;
    }

    async getCategoryId(categoryName) {
        if (!categoryName) return null;
        
        const cleanCategory = this.normalizeCategory(categoryName);
        
        if (this.categoryCache.has(cleanCategory)) {
            return this.categoryCache.get(cleanCategory);
        }

        const { data, error } = await this.supabase
            .from('property_categories')
            .select('id')
            .eq('category_name', cleanCategory)
            .single();

        if (data) {
            this.categoryCache.set(cleanCategory, data.id);
            return data.id;
        }

        return null;
    }

    async getOrCreateContactId(name, mobile, tel) {
        if (!name && !mobile) return null;
        
        const contactKey = `${name || ''}_${mobile || ''}`;
        
        if (this.contactCache.has(contactKey)) {
            return this.contactCache.get(contactKey);
        }

        const contactData = {
            contact_name: name?.substring(0, 100),
            primary_phone: this.cleanPhone(mobile),
            secondary_phone: this.cleanPhone(tel),
            contact_type: 'owner',
            is_active: true
        };

        const { data, error } = await this.supabase
            .from('contacts')
            .upsert(contactData, {
                onConflict: 'primary_phone',
                ignoreDuplicates: false
            })
            .select('id')
            .single();

        if (error) {
            console.error('❌ Error creating contact:', error);
            return null;
        }

        this.contactCache.set(contactKey, data.id);
        return data.id;
    }

    // Helper functions
    parseCompoundName(compoundName) {
        if (!compoundName) return { title: null, compoundName: null };
        
        const delimiters = [' - ', ' in ', ' at ', ' located in ', ' for rent in ', ' for sale in '];
        
        for (const delimiter of delimiters) {
            if (compoundName.includes(delimiter)) {
                const parts = compoundName.split(delimiter);
                return {
                    title: parts[0]?.trim() || null,
                    compoundName: parts[1]?.trim() || null
                };
            }
        }
        
        return {
            title: compoundName.length > 50 ? compoundName.substring(0, 50) + '...' : compoundName,
            compoundName: null
        };
    }

    normalizeListingType(unitFor) {
        if (!unitFor) return null;
        const lower = unitFor.toLowerCase();
        if (lower.includes('rent') || lower.includes('إيجار')) return 'Rent';
        if (lower.includes('sale') || lower.includes('بيع')) return 'Sale';
        return unitFor.substring(0, 10);
    }

    normalizeStatus(status) {
        if (!status) return null;
        const statusMap = {
            'residentail': 'Residential',
            'available': 'Available',
            'sold': 'Sold',
            'reserved': 'Reserved'
        };
        return statusMap[status.toLowerCase()] || status.substring(0, 20);
    }

    normalizeCategory(category) {
        if (!category) return 'Residential';
        const categoryMap = {
            'residentail': 'Residential',
            'residential': 'Residential',
            'commercial': 'Commercial',
            'administrative': 'Administrative'
        };
        return categoryMap[category.toLowerCase()] || 'Residential';
    }

    parseBoolean(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const lower = value.toLowerCase();
            return lower === 'true' || lower === 'inside' || lower === 'yes';
        }
        return false;
    }

    parseNumeric(value, min = 0, max = 999999) {
        if (value === null || value === undefined || value === '') return null;
        const num = parseInt(value);
        if (isNaN(num)) return null;
        return Math.max(min, Math.min(max, num));
    }

    parseDecimal(value) {
        if (value === null || value === undefined || value === '') return null;
        const num = parseFloat(value);
        if (isNaN(num)) return null;
        return Math.max(0, Math.min(99999999, num));
    }

    parsePrice(value) {
        const price = this.parseDecimal(value);
        return price ? Math.min(price, 99999999) : null;
    }

    parseJSON(value) {
        if (!value || value === '[]' || value === '{}') return null;
        try {
            return typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
            return null;
        }
    }

    parseTimestamp(isoString) {
        if (!isoString) return new Date();
        try {
            return new Date(isoString);
        } catch {
            return new Date();
        }
    }

    cleanPhone(phone) {
        if (!phone) return null;
        return phone.toString().replace(/[^\d+]/g, '').substring(0, 20);
    }

    async migrateRichMedia(properties) {
        console.log('🖼️ Starting rich media migration...');
        let imageCount = 0;
        let videoCount = 0;

        for (let i = 0; i < properties.length; i++) {
            const property = properties[i];
            
            try {
                // Get Supabase property ID
                const { data: supabaseProperty } = await this.supabase
                    .from('properties')
                    .select('id')
                    .eq('appwrite_id', property.$id)
                    .single();

                if (!supabaseProperty) continue;

                // Migrate images
                const images = await this.migratePropertyImages(property, supabaseProperty.id);
                imageCount += images;
                
                // Migrate videos
                const videos = await this.migratePropertyVideos(property, supabaseProperty.id);
                videoCount += videos;
                
                if ((i + 1) % 100 === 0) {
                    console.log(`📊 Processed ${i + 1}/${properties.length} properties for media`);
                }
                
            } catch (error) {
                console.error(`❌ Error migrating media for ${property.$id}:`, error.message);
            }
        }

        console.log(`✅ Rich media migration completed: ${imageCount} images, ${videoCount} videos`);
    }

    async migratePropertyImages(appwriteProperty, supabasePropertyId) {
        const images = this.parseJSON(appwriteProperty.propertyImage);
        if (!images || !Array.isArray(images) || images.length === 0) return 0;

        const imageRecords = images.map((image, index) => ({
            property_id: supabasePropertyId,
            appwrite_file_id: image.id,
            image_url: image.fileUrl,
            image_title: `Property Image ${index + 1}`,
            sort_order: index,
            is_primary: index === 0
        }));

        const { error } = await this.supabase
            .from('property_images')
            .upsert(imageRecords, {
                onConflict: 'property_id,appwrite_file_id',
                ignoreDuplicates: true
            });

        if (error) {
            console.error('❌ Error inserting images:', error);
            return 0;
        }

        return imageRecords.length;
    }

    async migratePropertyVideos(appwriteProperty, supabasePropertyId) {
        const videos = this.parseJSON(appwriteProperty.videos);
        if (!videos || !Array.isArray(videos) || videos.length === 0) return 0;

        const videoRecords = videos.map((video, index) => ({
            property_id: supabasePropertyId,
            video_url: video.url,
            video_title: video.title || `Property Video ${index + 1}`,
            video_type: this.getVideoType(video.url),
            sort_order: index
        }));

        const { error } = await this.supabase
            .from('property_videos')
            .upsert(videoRecords, {
                onConflict: 'property_id,video_url',
                ignoreDuplicates: true
            });

        if (error) {
            console.error('❌ Error inserting videos:', error);
            return 0;
        }

        return videoRecords.length;
    }

    getVideoType(url) {
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
        if (url.includes('vimeo.com')) return 'vimeo';
        return 'direct';
    }

    async validateMigration() {
        console.log('\n🔍 VALIDATION: Checking migration results...');
        
        try {
            // Check property counts
            const { count: propertyCount, error: propError } = await this.supabase
                .from('properties')
                .select('*', { count: 'exact', head: true });

            // Check area counts
            const { count: areaCount, error: areaError } = await this.supabase
                .from('areas')
                .select('*', { count: 'exact', head: true });

            // Check relationship integrity
            const { count: orphanedCount, error: orphanError } = await this.supabase
                .from('properties')
                .select('*', { count: 'exact', head: true })
                .is('area_id', null);

            console.log(`📊 VALIDATION RESULTS:`);
            console.log(`   Properties: ${propertyCount} (Expected: 3,228)`);
            console.log(`   Areas: ${areaCount} (Expected: 200+)`);
            console.log(`   Properties without area: ${orphanedCount || 0}`);

            // Sample check
            const { data: sampleProperty } = await this.supabase
                .from('properties')
                .select(`
                    property_code,
                    title,
                    areas(area_name),
                    property_types(type_name),
                    contacts(contact_name, primary_phone)
                `)
                .limit(1)
                .single();

            if (sampleProperty) {
                console.log(`\n📋 SAMPLE PROPERTY WITH RELATIONSHIPS:`);
                console.log(`   Code: ${sampleProperty.property_code}`);
                console.log(`   Title: ${sampleProperty.title}`);
                console.log(`   Area: ${sampleProperty.areas?.area_name || 'N/A'}`);
                console.log(`   Type: ${sampleProperty.property_types?.type_name || 'N/A'}`);
                console.log(`   Contact: ${sampleProperty.contacts?.contact_name || 'N/A'}`);
            }

            const successRate = ((propertyCount / 3228) * 100).toFixed(1);
            console.log(`\n🎯 MIGRATION SUCCESS RATE: ${successRate}%`);

            if (successRate >= 95) {
                console.log('✅ MIGRATION SUCCESSFUL: 95%+ success rate achieved');
            } else {
                console.log('⚠️ MIGRATION NEEDS REVIEW: Success rate below 95%');
            }

        } catch (error) {
            console.error('❌ Validation failed:', error);
        }
    }
}

// Main execution
async function main() {
    const migrationService = new CompleteMigrationService();
    
    try {
        await migrationService.migrate();
    } catch (error) {
        console.error('💥 Migration failed completely:', error);
        process.exit(1);
    }
}

// Import required modules at the top
const { Databases, Query } = require('appwrite');

// Execute if running directly
if (require.main === module) {
    main();
}

module.exports = {
    CompleteMigrationService,
    AreaNormalizationService,
    AppwriteService,
    SupabaseService
};
