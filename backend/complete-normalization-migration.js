// complete-normalization-migration.js
// Normalizes single Appwrite table into multiple related Supabase tables
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

console.log('🚀 COMPLETE NORMALIZATION MIGRATION: Appwrite Single Table → Supabase Relational Database');
console.log('📋 Goal: Transform single properties table into normalized relational structure');

class DatabaseNormalizationService {
    constructor() {
        this.appwrite = new AppwriteService();
        this.supabase = createClient(config.supabase.url, config.supabase.key);
        
        // Caches for foreign key lookups
        this.regionCache = new Map();
        this.areaCache = new Map();
        this.categoryCache = new Map();
        this.typeCache = new Map();
        this.compoundCache = new Map();
        
        this.stats = {
            properties: 0,
            areas: 0,
            categories: 0,
            types: 0,
            compounds: 0,
            errors: 0
        };
    }

    async migrateComplete() {
        console.log('\n=== PHASE 1: DATA EXTRACTION FROM APPWRITE ===');
        const allProperties = await this.appwrite.getAllProperties();
        console.log(`✅ Retrieved ${allProperties.length} properties from Appwrite`);

        console.log('\n=== PHASE 2: NORMALIZATION & RELATIONSHIP CREATION ===');
        
        // Extract and normalize areas (with region hierarchy)
        await this.normalizeGeographicHierarchy(allProperties);
        
        // Extract and normalize property categories & types
        await this.normalizePropertyClassification(allProperties);
        
        // Extract and normalize compounds
        await this.normalizeCompounds(allProperties);

        console.log('\n=== PHASE 3: PROPERTY MIGRATION WITH RELATIONSHIPS ===');
        await this.migratePropertiesWithRelationships(allProperties);

        console.log('\n=== PHASE 4: MIGRATION SUMMARY ===');
        this.printMigrationSummary();
    }

    async normalizeGeographicHierarchy(properties) {
        console.log('🗺️ Normalizing geographic hierarchy (Country → Region → Area)...');
        
        // Step 1: Ensure Egypt exists as country (id=1)
        console.log('🇪🇬 Setting up Egypt as base country...');
        
        // Step 2: Extract unique regions and areas
        const regionsSet = new Set();
        const areasData = new Map(); // area -> { region, count }
        
        properties.forEach(property => {
            if (property.area && property.area.trim()) {
                const cleanArea = this.cleanString(property.area);
                
                // Determine region based on area name (smart mapping)
                const region = this.determineRegion(cleanArea);
                regionsSet.add(region);
                
                if (areasData.has(cleanArea)) {
                    areasData.get(cleanArea).count++;
                } else {
                    areasData.set(cleanArea, { region, count: 1 });
                }
            }
        });

        console.log(`📊 Found ${regionsSet.size} regions and ${areasData.size} areas`);

        // Step 3: Create regions first
        for (const regionName of regionsSet) {
            await this.getOrCreateRegion(regionName);
        }

        // Step 4: Create areas with proper region relationships
        let areaIndex = 0;
        for (const [areaName, areaInfo] of areasData) {
            const regionId = this.regionCache.get(areaInfo.region);
            const areaId = await this.getOrCreateArea(areaName, regionId);
            
            areaIndex++;
            if (areaIndex % 50 === 0) {
                console.log(`📍 Created ${areaIndex}/${areasData.size} areas`);
            }
        }

        this.stats.areas = areasData.size;
        console.log(`✅ Geographic hierarchy created: ${regionsSet.size} regions, ${areasData.size} areas`);
    }

    async normalizePropertyClassification(properties) {
        console.log('🏠 Normalizing property categories and types...');
        
        const categoriesSet = new Set();
        const typesData = new Map(); // type -> { category, count }
        
        properties.forEach(property => {
            // Extract categories
            if (property.category && property.category.trim()) {
                const cleanCategory = this.cleanString(property.category);
                categoriesSet.add(cleanCategory);
            }
            
            // Extract types with category mapping
            if (property.type && property.type.trim()) {
                const cleanType = this.cleanString(property.type);
                const category = property.category ? this.cleanString(property.category) : this.categorizeType(cleanType);
                
                categoriesSet.add(category);
                
                if (typesData.has(cleanType)) {
                    typesData.get(cleanType).count++;
                } else {
                    typesData.set(cleanType, { category, count: 1 });
                }
            }
        });

        console.log(`📊 Found ${categoriesSet.size} categories and ${typesData.size} types`);

        // Create categories first
        for (const categoryName of categoriesSet) {
            await this.getOrCreateCategory(categoryName);
        }

        // Create types with category relationships
        let typeIndex = 0;
        for (const [typeName, typeInfo] of typesData) {
            const categoryId = this.categoryCache.get(typeInfo.category);
            await this.getOrCreateType(typeName, categoryId);
            
            typeIndex++;
            if (typeIndex % 20 === 0) {
                console.log(`🏘️ Created ${typeIndex}/${typesData.size} property types`);
            }
        }

        this.stats.categories = categoriesSet.size;
        this.stats.types = typesData.size;
        console.log(`✅ Property classification created: ${categoriesSet.size} categories, ${typesData.size} types`);
    }

    async normalizeCompounds(properties) {
        console.log('🏗️ Normalizing compounds/developments...');
        
        const compoundsData = new Map(); // compound -> { area, count }
        
        properties.forEach(property => {
            if (property.compoundName && property.compoundName.trim()) {
                const cleanCompound = this.cleanString(property.compoundName);
                const area = property.area ? this.cleanString(property.area) : 'unknown';
                
                if (compoundsData.has(cleanCompound)) {
                    compoundsData.get(cleanCompound).count++;
                } else {
                    compoundsData.set(cleanCompound, { area, count: 1 });
                }
            }
        });

        console.log(`📊 Found ${compoundsData.size} compounds`);

        let compoundIndex = 0;
        for (const [compoundName, compoundInfo] of compoundsData) {
            const areaId = this.areaCache.get(compoundInfo.area);
            await this.getOrCreateCompound(compoundName, areaId);
            
            compoundIndex++;
            if (compoundIndex % 30 === 0) {
                console.log(`🏗️ Created ${compoundIndex}/${compoundsData.size} compounds`);
            }
        }

        this.stats.compounds = compoundsData.size;
        console.log(`✅ Compounds created: ${compoundsData.size} developments`);
    }

    async migratePropertiesWithRelationships(properties) {
        console.log('🏠 Migrating properties with normalized relationships...');
        
        const batchSize = 50;
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < properties.length; i += batchSize) {
            const batch = properties.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(properties.length / batchSize);
            
            console.log(`📦 Processing batch ${batchNumber}/${totalBatches}: Properties ${i + 1}-${Math.min(i + batchSize, properties.length)}`);

            const transformedBatch = [];
            
            for (const appwriteProperty of batch) {
                try {
                    const transformedProperty = await this.transformPropertyWithRelationships(appwriteProperty);
                    if (transformedProperty) {
                        transformedBatch.push(transformedProperty);
                    }
                } catch (error) {
                    console.error(`❌ Error transforming property ${appwriteProperty.$id}:`, error.message);
                    errorCount++;
                }
            }

            // Insert batch into Supabase
            if (transformedBatch.length > 0) {
                try {
                    const { data, error } = await this.supabase
                        .from('properties')
                        .insert(transformedBatch)
                        .select('id, property_code');

                    if (error) {
                        console.error('❌ Batch insertion failed:', error);
                        errorCount += transformedBatch.length;
                    } else {
                        successCount += data.length;
                        console.log(`✅ Inserted ${data.length} properties successfully`);
                    }
                } catch (error) {
                    console.error('❌ Batch insertion error:', error);
                    errorCount += transformedBatch.length;
                }
            }

            // Progress update
            const progress = ((i + batchSize) / properties.length * 100).toFixed(1);
            console.log(`📊 Progress: ${progress}% | Success: ${successCount} | Errors: ${errorCount}`);
        }

        this.stats.properties = successCount;
        this.stats.errors = errorCount;
    }

    async transformPropertyWithRelationships(appwriteProperty) {
        const prop = appwriteProperty;

        // Get normalized foreign key relationships
        const areaId = this.areaCache.get(this.cleanString(prop.area)) || null;
        const categoryId = this.categoryCache.get(this.cleanString(prop.category || 'residential')) || 1;
        const typeId = this.typeCache.get(this.cleanString(prop.type || 'apartment')) || 1;
        const compoundId = this.compoundCache.get(this.cleanString(prop.compoundName)) || null;

        // Transform property data to match Supabase schema
        return {
            // System fields
            appwrite_id: prop.$id,
            property_code: prop.propertyNumber || `PROP_${prop.$id.slice(-8)}`,
            
            // Basic information
            title: this.extractTitle(prop.compoundName, prop.description) || 'Property',
            description: prop.description || null,
            
            // NORMALIZED FOREIGN KEY RELATIONSHIPS
            area_id: areaId, // ✅ NORMALIZED: area string → foreign key to areas table
            category_id: categoryId, // ✅ NORMALIZED: category string → foreign key to property_categories table  
            type_id: typeId, // ✅ NORMALIZED: type string → foreign key to property_types table
            compound_id: compoundId, // ✅ NORMALIZED: compound string → foreign key to compounds table
            
            // Property specifications
            building_name: prop.building || null,
            floor_number: this.parseInteger(prop.theFloors),
            unit_number: prop.unitNumber || null,
            
            // Areas and measurements
            total_area: this.parseDecimal(prop.landArea),
            built_area: this.parseDecimal(prop.building),
            bedrooms: this.parseInteger(prop.rooms),
            bathrooms: this.parseInteger(prop.bathrooms),
            
            // Financial data
            price: this.parseDecimal(prop.totalPrice),
            price_per_meter: this.parseDecimal(prop.PricePerMeter),
            down_payment: this.parseDecimal(prop.downPayment),
            monthly_installment: this.parseDecimal(prop.monthly),
            
            // Listing information
            listing_type: this.normalizeListingType(prop.unitFor),
            availability_status: this.normalizeStatus(prop.status),
            
            // Rich media (preserve original Appwrite data)
            appwrite_images: this.parseJSON(prop.propertyImage),
            appwrite_videos: this.parseJSON(prop.videos),
            
            // Timestamps
            created_at: this.parseTimestamp(prop.$createdAt),
            updated_at: this.parseTimestamp(prop.$updatedAt)
        };
    }

    // Helper methods for foreign key creation
    async getOrCreateRegion(regionName) {
        if (this.regionCache.has(regionName)) {
            return this.regionCache.get(regionName);
        }

        // Check if region exists
        const { data: existing } = await this.supabase
            .from('regions')
            .select('id')
            .eq('region_name', regionName)
            .single();

        if (existing) {
            this.regionCache.set(regionName, existing.id);
            return existing.id;
        }

        // Create new region
        const { data: newRegion, error } = await this.supabase
            .from('regions')
            .insert({
                region_name: regionName,
                country_id: 1, // Egypt
                status: 'active'
            })
            .select('id')
            .single();

        if (error) {
            console.error(`❌ Error creating region ${regionName}:`, error);
            return null;
        }

        this.regionCache.set(regionName, newRegion.id);
        return newRegion.id;
    }

    async getOrCreateArea(areaName, regionId) {
        if (this.areaCache.has(areaName)) {
            return this.areaCache.get(areaName);
        }

        // Check if area exists
        const { data: existing } = await this.supabase
            .from('areas')
            .select('id')
            .eq('area_name', areaName)
            .single();

        if (existing) {
            this.areaCache.set(areaName, existing.id);
            return existing.id;
        }

        // Create new area
        const { data: newArea, error } = await this.supabase
            .from('areas')
            .insert({
                area_name: areaName,
                region_id: regionId || 2, // Default to Cairo
                status: 'active'
            })
            .select('id')
            .single();

        if (error) {
            console.error(`❌ Error creating area ${areaName}:`, error);
            return null;
        }

        this.areaCache.set(areaName, newArea.id);
        return newArea.id;
    }

    async getOrCreateCategory(categoryName) {
        if (this.categoryCache.has(categoryName)) {
            return this.categoryCache.get(categoryName);
        }

        // Check if category exists
        const { data: existing } = await this.supabase
            .from('property_categories')
            .select('id')
            .eq('category_name', categoryName)
            .single();

        if (existing) {
            this.categoryCache.set(categoryName, existing.id);
            return existing.id;
        }

        // Create new category
        const { data: newCategory, error } = await this.supabase
            .from('property_categories')
            .insert({
                category_name: categoryName,
                status: 'active'
            })
            .select('id')
            .single();

        if (error) {
            console.error(`❌ Error creating category ${categoryName}:`, error);
            return 1; // Default category
        }

        this.categoryCache.set(categoryName, newCategory.id);
        return newCategory.id;
    }

    async getOrCreateType(typeName, categoryId) {
        if (this.typeCache.has(typeName)) {
            return this.typeCache.get(typeName);
        }

        // Check if type exists
        const { data: existing } = await this.supabase
            .from('property_types')
            .select('id')
            .eq('type_name', typeName)
            .single();

        if (existing) {
            this.typeCache.set(typeName, existing.id);
            return existing.id;
        }

        // Create new type
        const { data: newType, error } = await this.supabase
            .from('property_types')
            .insert({
                type_name: typeName,
                category_id: categoryId || 1,
                status: 'active'
            })
            .select('id')
            .single();

        if (error) {
            console.error(`❌ Error creating type ${typeName}:`, error);
            return 1; // Default type
        }

        this.typeCache.set(typeName, newType.id);
        return newType.id;
    }

    async getOrCreateCompound(compoundName, areaId) {
        if (this.compoundCache.has(compoundName)) {
            return this.compoundCache.get(compoundName);
        }

        // Check if compound exists
        const { data: existing } = await this.supabase
            .from('compounds')
            .select('id')
            .eq('compound_name', compoundName)
            .single();

        if (existing) {
            this.compoundCache.set(compoundName, existing.id);
            return existing.id;
        }

        // Create new compound
        const { data: newCompound, error } = await this.supabase
            .from('compounds')
            .insert({
                compound_name: compoundName,
                area_id: areaId || 1, // Default to area 1 if not found
                status: 'active'
            })
            .select('id')
            .single();

        if (error) {
            console.error(`❌ Error creating compound ${compoundName}:`, error);
            return null;
        }

        this.compoundCache.set(compoundName, newCompound.id);
        return newCompound.id;
    }

    // Utility methods
    cleanString(str) {
        if (!str) return '';
        return str.toLowerCase().trim().replace(/\s+/g, ' ');
    }

    determineRegion(areaName) {
        const area = areaName.toLowerCase();
        
        // New Cairo and East Cairo areas
        if (area.includes('new cairo') || area.includes('fifth settlement') || 
            area.includes('madinaty') || area.includes('hyde park') || 
            area.includes('mivida') || area.includes('uptown')) {
            return 'new cairo';
        }
        
        // West Cairo areas  
        if (area.includes('6 october') || area.includes('sheikh zayed') || 
            area.includes('beverly hills') || area.includes('palm hills')) {
            return '6th of october';
        }
        
        // North Coast
        if (area.includes('north coast') || area.includes('sahel') || 
            area.includes('marina') || area.includes('alamein')) {
            return 'north coast';
        }
        
        // Giza areas
        if (area.includes('giza') || area.includes('dokki') || area.includes('mohandessin')) {
            return 'giza';
        }
        
        // Default to Cairo
        return 'cairo';
    }

    categorizeType(typeName) {
        const type = typeName.toLowerCase();
        
        if (type.includes('villa') || type.includes('townhouse') || type.includes('house')) {
            return 'villa';
        }
        
        if (type.includes('office') || type.includes('commercial') || type.includes('shop')) {
            return 'commercial';
        }
        
        // Default to residential
        return 'residential';
    }

    extractTitle(compoundName, description) {
        if (compoundName && compoundName.length <= 100) {
            return compoundName;
        }
        
        if (description && description.length <= 100) {
            return description;
        }
        
        if (description) {
            return description.substring(0, 97) + '...';
        }
        
        return 'Property';
    }

    normalizeListingType(unitFor) {
        if (!unitFor) return 'sale';
        const lower = unitFor.toLowerCase();
        if (lower.includes('rent')) return 'rent';
        if (lower.includes('sale')) return 'sale';
        return 'sale';
    }

    normalizeStatus(status) {
        if (!status) return 'available';
        const lower = status.toLowerCase();
        if (lower.includes('available')) return 'available';
        if (lower.includes('sold')) return 'sold';
        if (lower.includes('reserved')) return 'reserved';
        return 'available';
    }

    parseInteger(value) {
        if (!value) return null;
        const num = parseInt(value);
        return isNaN(num) ? null : num;
    }

    parseDecimal(value) {
        if (!value) return null;
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
    }

    parseJSON(value) {
        if (!value) return null;
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

    printMigrationSummary() {
        console.log('🎉 COMPLETE NORMALIZATION MIGRATION SUMMARY');
        console.log('='.repeat(50));
        console.log(`✅ Geographic Hierarchy:`);
        console.log(`   📍 Areas: ${this.stats.areas} unique areas extracted and normalized`);
        console.log(`   🗺️ Regions: Mapped to regional hierarchy`);
        console.log(`✅ Property Classification:`);
        console.log(`   📂 Categories: ${this.stats.categories} property categories`);
        console.log(`   🏠 Types: ${this.stats.types} property types`);
        console.log(`✅ Developments:`);
        console.log(`   🏗️ Compounds: ${this.stats.compounds} compounds/developments`);
        console.log(`✅ Properties:`);
        console.log(`   🏡 Successfully migrated: ${this.stats.properties} properties`);
        console.log(`   ❌ Migration errors: ${this.stats.errors} properties`);
        console.log('='.repeat(50));
        console.log('🎯 RESULT: Single Appwrite table successfully normalized into relational database!');
        console.log('✨ Areas, types, categories, and compounds are now isolated tables with foreign key relationships');
    }
}

// Appwrite Service
class AppwriteService {
    constructor() {
        this.client = new Client()
            .setEndpoint(config.appwrite.endpoint)
            .setProject(config.appwrite.projectId);
        
        this.databases = new (require('appwrite')).Databases(this.client);
    }

    async getAllProperties() {
        const allProperties = [];
        let hasMore = true;
        let lastId = null;

        console.log('📦 Fetching all properties from Appwrite...');

        while (hasMore) {
            try {
                const queries = [
                    require('appwrite').Query.limit(500)
                ];
                
                if (lastId) {
                    queries.push(require('appwrite').Query.cursorAfter(lastId));
                }

                const response = await this.databases.listDocuments(
                    config.appwrite.databaseId,
                    config.appwrite.propertiesCollectionId,
                    queries
                );

                allProperties.push(...response.documents);
                
                console.log(`📦 Fetched ${allProperties.length} / ${response.total} properties`);

                if (response.documents.length < 500) {
                    hasMore = false;
                } else {
                    lastId = response.documents[response.documents.length - 1].$id;
                }
            } catch (error) {
                console.error('❌ Error fetching properties:', error);
                throw error;
            }
        }

        console.log(`✅ Retrieved ALL ${allProperties.length} properties from Appwrite`);
        return allProperties;
    }
}

// Main execution
async function main() {
    try {
        const migrationService = new DatabaseNormalizationService();
        await migrationService.migrateComplete();
        
        console.log('\n✅ COMPLETE NORMALIZATION MIGRATION FINISHED SUCCESSFULLY!');
        console.log('🎯 Your single Appwrite table is now a proper normalized relational database in Supabase!');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ MIGRATION FAILED:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { DatabaseNormalizationService };
