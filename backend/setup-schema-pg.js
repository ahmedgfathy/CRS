// setup-schema-pg.js - Create database schema using postgres client
require('dotenv').config();
const { Client } = require('pg');

async function createSchema() {
    console.log('🏗️ Creating database schema for migration...');
    
    const client = new Client({
        host: process.env.POSTGRES_HOST || 'db.cqylpwdcwrssttrtvtov.supabase.co',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DATABASE || 'postgres',
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to PostgreSQL');

        // Create areas table
        console.log('📍 Creating areas table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS areas (
                id BIGSERIAL PRIMARY KEY,
                area_name VARCHAR(100) NOT NULL UNIQUE,
                area_name_ar VARCHAR(100),
                region_id BIGINT,
                description TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        
        await client.query(`CREATE INDEX IF NOT EXISTS idx_areas_name ON areas(area_name);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_areas_active ON areas(is_active);`);
        console.log('✅ Areas table created');

        // Create property types table
        console.log('🏘️ Creating property_types table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS property_types (
                id BIGSERIAL PRIMARY KEY,
                type_name VARCHAR(50) NOT NULL UNIQUE,
                type_name_ar VARCHAR(50),
                category VARCHAR(50),
                description TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        
        await client.query(`
            INSERT INTO property_types (type_name, category) VALUES
                ('apartment', 'residential'),
                ('villa', 'residential'),
                ('townhouse', 'residential'),
                ('town house', 'residential'),
                ('studio', 'residential'),
                ('penthouse', 'residential'),
                ('duplex', 'residential'),
                ('office', 'commercial'),
                ('shop', 'commercial'),
                ('warehouse', 'commercial')
            ON CONFLICT (type_name) DO NOTHING;
        `);
        console.log('✅ Property types table created');

        // Create property categories table
        console.log('📂 Creating property_categories table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS property_categories (
                id BIGSERIAL PRIMARY KEY,
                category_name VARCHAR(50) NOT NULL UNIQUE,
                category_name_ar VARCHAR(50),
                description TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        
        await client.query(`
            INSERT INTO property_categories (category_name) VALUES
                ('Residential'),
                ('Commercial'),
                ('Administrative'),
                ('Mixed Use')
            ON CONFLICT (category_name) DO NOTHING;
        `);
        console.log('✅ Property categories table created');

        // Create contacts table
        console.log('👥 Creating contacts table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS contacts (
                id BIGSERIAL PRIMARY KEY,
                contact_name VARCHAR(100),
                primary_phone VARCHAR(20),
                secondary_phone VARCHAR(20),
                email VARCHAR(100),
                contact_type VARCHAR(50),
                notes TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        
        await client.query(`CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(primary_phone);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type);`);
        console.log('✅ Contacts table created');

        // Create properties table
        console.log('🏠 Creating properties table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS properties (
                id BIGSERIAL PRIMARY KEY,
                appwrite_id VARCHAR(50) UNIQUE NOT NULL,
                property_code VARCHAR(50) UNIQUE NOT NULL,
                
                title VARCHAR(200),
                description TEXT,
                
                property_type_id BIGINT REFERENCES property_types(id),
                category_id BIGINT REFERENCES property_categories(id),
                area_id BIGINT REFERENCES areas(id),
                
                listing_type VARCHAR(10) CHECK (listing_type IN ('Rent', 'Sale')),
                bedrooms INT CHECK (bedrooms >= 0 AND bedrooms <= 20),
                floor_number VARCHAR(20),
                
                land_area DECIMAL(8,2) CHECK (land_area >= 0),
                building_area DECIMAL(8,2) CHECK (building_area >= 0),
                space_earth DECIMAL(8,2),
                space_unit DECIMAL(8,2),
                space_guard DECIMAL(8,2),
                
                price DECIMAL(15,2) CHECK (price >= 0 AND price <= 99999999),
                currency VARCHAR(3) DEFAULT 'EGP',
                down_payment DECIMAL(15,2),
                price_per_meter DECIMAL(10,2),
                monthly_payment DECIMAL(10,2),
                installment_plan JSON,
                
                primary_contact_id BIGINT REFERENCES contacts(id),
                handler_contact_id BIGINT REFERENCES contacts(id),
                
                listing_status VARCHAR(20),
                activity_type VARCHAR(50),
                offered_by VARCHAR(20),
                inside_compound BOOLEAN,
                phase_name VARCHAR(50),
                compound_name VARCHAR(150),
                
                is_liked BOOLEAN DEFAULT false,
                featured_home BOOLEAN DEFAULT false,
                
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        
        await client.query(`CREATE INDEX IF NOT EXISTS idx_properties_code ON properties(property_code);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_properties_area ON properties(area_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_properties_listing_type ON properties(listing_type);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(listing_status);`);
        console.log('✅ Properties table created');

        // Create property images table
        console.log('🖼️ Creating property_images table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS property_images (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT REFERENCES properties(id) ON DELETE CASCADE,
                appwrite_file_id VARCHAR(50),
                image_url TEXT NOT NULL,
                image_title VARCHAR(200),
                sort_order INT DEFAULT 0,
                is_primary BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        
        await client.query(`CREATE INDEX IF NOT EXISTS idx_property_images_property ON property_images(property_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_property_images_primary ON property_images(is_primary);`);
        console.log('✅ Property images table created');

        // Create property videos table
        console.log('🎥 Creating property_videos table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS property_videos (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT REFERENCES properties(id) ON DELETE CASCADE,
                video_url TEXT NOT NULL,
                video_title VARCHAR(200),
                video_type VARCHAR(50),
                sort_order INT DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        
        await client.query(`CREATE INDEX IF NOT EXISTS idx_property_videos_property ON property_videos(property_id);`);
        console.log('✅ Property videos table created');

        console.log('🎉 Database schema created successfully!');
        console.log('📊 Tables created:');
        console.log('   ✅ areas');
        console.log('   ✅ property_types');
        console.log('   ✅ property_categories');  
        console.log('   ✅ contacts');
        console.log('   ✅ properties');
        console.log('   ✅ property_images');
        console.log('   ✅ property_videos');
        console.log('');
        console.log('🚀 Ready for migration!');

    } catch (error) {
        console.error('❌ Schema creation failed:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

createSchema();
