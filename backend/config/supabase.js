// ═══════════════════════════════════════════════════════════════════════════════════
// SUPABASE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════
// Connection settings for Supabase PostgreSQL database
// ═══════════════════════════════════════════════════════════════════════════════════

const { Client } = require('pg');

// Supabase Configuration - using environment variables
const SUPABASE_CONFIG = {
  host: process.env.POSTGRES_HOST || 'aws-0-eu-central-1.pooler.supabase.com',
  database: process.env.POSTGRES_DATABASE || 'postgres',
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.POSTGRES_PORT || '6543'),
  ssl: { rejectUnauthorized: false }
};

class SupabaseService {
  constructor() {
    this.client = null;
  }

  /**
   * Connect to Supabase
   */
  async connect() {
    try {
      this.client = new Client(SUPABASE_CONFIG);
      await this.client.connect();
      console.log('✅ Connected to Supabase');
      return true;
    } catch (error) {
      console.error('❌ Supabase connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Supabase
   */
  async disconnect() {
    if (this.client) {
      await this.client.end();
      console.log('🔌 Disconnected from Supabase');
    }
  }

  /**
   * Execute query
   */
  async query(sql, params = []) {
    try {
      const result = await this.client.query(sql, params);
      return result;
    } catch (error) {
      console.error('❌ Query failed:', error);
      throw error;
    }
  }

  /**
   * Insert property into Supabase
   */
  async insertProperty(propertyData) {
    try {
      const sql = `
        INSERT INTO properties (
          property_code, title, description, area_id, category_id, type_id,
          bedrooms, bathrooms, total_area, floor_number, parking_spaces,
          price, availability_status, main_image_url, video_url,
          created_at, updated_at, appwrite_id, appwrite_images, appwrite_videos
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        ) RETURNING id
      `;

      const result = await this.query(sql, [
        propertyData.property_code || `PROP_${Date.now()}`,
        propertyData.title,
        propertyData.description,
        propertyData.area_id,
        propertyData.category_id,
        propertyData.type_id,
        propertyData.bedrooms,
        propertyData.bathrooms,
        propertyData.total_area,
        propertyData.floor_number,
        propertyData.parking_spaces,
        propertyData.price,
        propertyData.availability_status || 'available',
        propertyData.main_image_url,
        propertyData.video_url,
        propertyData.created_at,
        propertyData.updated_at,
        propertyData.appwrite_id,
        JSON.stringify(propertyData.appwrite_images),
        JSON.stringify(propertyData.appwrite_videos)
      ]);

      return result.rows[0].id;
    } catch (error) {
      console.error('❌ Error inserting property:', error);
      throw error;
    }
  }

  /**
   * Insert lead into Supabase
   */
  async insertLead(leadData) {
    try {
      const sql = `
        INSERT INTO leads (
          name, phone, email, message, status_id, source_id,
          property_interest_id, agent_id, created_at, updated_at,
          appwrite_id, appwrite_files
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        ) RETURNING id
      `;

      const result = await this.query(sql, [
        leadData.name,
        leadData.phone,
        leadData.email,
        leadData.message,
        leadData.status_id,
        leadData.source_id,
        leadData.property_interest_id,
        leadData.agent_id,
        leadData.created_at,
        leadData.updated_at,
        leadData.appwrite_id,
        JSON.stringify(leadData.appwrite_files)
      ]);

      return result.rows[0].id;
    } catch (error) {
      console.error('❌ Error inserting lead:', error);
      throw error;
    }
  }

  /**
   * Insert user into Supabase
   */
  async insertUser(userData) {
    try {
      const sql = `
        INSERT INTO users (
          email, first_name, last_name, phone, role_id,
          status_id, created_at, updated_at, appwrite_id,
          appwrite_avatar
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        ) RETURNING id
      `;

      const result = await this.query(sql, [
        userData.email,
        userData.first_name,
        userData.last_name,
        userData.phone,
        userData.role_id,
        userData.status_id,
        userData.created_at,
        userData.updated_at,
        userData.appwrite_id,
        userData.appwrite_avatar
      ]);

      return result.rows[0].id;
    } catch (error) {
      console.error('❌ Error inserting user:', error);
      throw error;
    }
  }

  /**
   * Find matching area by name
   */
  async findAreaByName(areaName) {
    try {
      const sql = `
        SELECT id FROM areas 
        WHERE LOWER(area_name_ar) LIKE LOWER($1) 
        OR LOWER(area_name_en) LIKE LOWER($1)
        LIMIT 1
      `;
      
      const result = await this.query(sql, [`%${areaName}%`]);
      return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (error) {
      console.error('❌ Error finding area:', error);
      return null;
    }
  }

  /**
   * Find matching property type by name
   */
  async findPropertyTypeByName(typeName) {
    try {
      const sql = `
        SELECT id FROM property_types 
        WHERE LOWER(type_name_ar) LIKE LOWER($1) 
        OR LOWER(type_name_en) LIKE LOWER($1)
        LIMIT 1
      `;
      
      const result = await this.query(sql, [`%${typeName}%`]);
      return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (error) {
      console.error('❌ Error finding property type:', error);
      return null;
    }
  }

  /**
   * Find matching status by name
   */
  async findStatusByName(statusName, tableName = 'property_statuses') {
    try {
      const sql = `
        SELECT id FROM ${tableName}
        WHERE LOWER(status_name_ar) LIKE LOWER($1) 
        OR LOWER(status_name_en) LIKE LOWER($1)
        LIMIT 1
      `;
      
      const result = await this.query(sql, [`%${statusName}%`]);
      return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (error) {
      console.error(`❌ Error finding status in ${tableName}:`, error);
      return null;
    }
  }

  /**
   * Check if record exists by appwrite_id
   */
  async recordExists(tableName, appwriteId) {
    try {
      const sql = `SELECT id FROM ${tableName} WHERE appwrite_id = $1`;
      const result = await this.query(sql, [appwriteId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error(`❌ Error checking record existence in ${tableName}:`, error);
      return false;
    }
  }

  /**
   * Get table structure
   */
  async getTableStructure(tableName) {
    try {
      const sql = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
      `;
      
      const result = await this.query(sql, [tableName]);
      return result.rows;
    } catch (error) {
      console.error(`❌ Error getting table structure for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get all lookup values for matching
   */
  async getLookupValues() {
    try {
      const lookups = {};
      
      // Get areas
      const areasResult = await this.query('SELECT id, area_name, area_name_ar FROM areas');
      lookups.areas = areasResult.rows;
      
      // Get property types
      const typesResult = await this.query('SELECT id, type_name FROM property_types');
      lookups.property_types = typesResult.rows;
      
      // Get property categories
      const categoriesResult = await this.query('SELECT id, category_name FROM property_categories');
      lookups.property_categories = categoriesResult.rows;

      console.log('✅ Loaded lookup values for matching');
      return lookups;
    } catch (error) {
      console.error('❌ Error loading lookup values:', error);
      throw error;
    }
  }
}

module.exports = {
  SupabaseService,
  SUPABASE_CONFIG
};
