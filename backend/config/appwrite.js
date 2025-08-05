// ═══════════════════════════════════════════════════════════════════════════════════
// APPWRITE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════
// Connection settings for Appwrite database and storage
// ═══════════════════════════════════════════════════════════════════════════════════

const { Client, Databases, Storage, Query } = require('appwrite');

// Appwrite Configuration
const APPWRITE_CONFIG = {
  PROJECT_ID: '6732766d002b223d1598',
  DATABASE_ID: '677a9e5c0014e2994c62',
  API_KEY: 'standard_379f744bcd794731b55d61114aa6f8bd45af6fc0a3f2727925b285034cf0c1578be39606e250cc1dcae9c5bc06ec958070675513dd715f407a8d8abdfc4eb1487721e63df0788ecf14e43217e114af95ee442c6bdd778c6ba4c9a8dc6a6351b346f9c9c6bc318f039ef5c10fef797841d3ac1082bcc17f8e62c9bc64535a50ad',
  
  // Collections
  COLLECTIONS: {
    USERS: '674b14b2000bdd8ac7ce',
    LEADS: '67339a5e003b8cf8eade',
    PROPERTIES: '6737698b000cccaf6f16',
    PROJECTS: '67507a6500213b3917b1',
    SHEETS: '675b3036001829c40954',
    LEADS_SHEETS_CALLS: '6733a1ed000bcf6c24bf',
    EVENTS: '676705a6000fb4bb6f02',
    FILTER_SETTINGS: '673f8e09001cc74b02a6'
  },

  // Storage Buckets
  BUCKETS: {
    LEADS: '6738da370036150c335e',
    PROPERTIES: '673a2734001f92c1826e',
    PROJECTS: '6751e7cb00303fb37e0c',
    PROPERTIES_VIDEOS: '6755abbe00350ded34b7'
  },

  // Site Configuration
  SITE_NAME: 'GloMart-realestates'
};

// Initialize Appwrite Client
const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject(APPWRITE_CONFIG.PROJECT_ID)
  .setDevKey(APPWRITE_CONFIG.API_KEY);

// Initialize services
const databases = new Databases(client);
const storage = new Storage(client);

class AppwriteService {
  
  /**
   * Get all properties from Appwrite (FAST BULK FETCH)
   */
  static async getAllProperties() {
    try {
      console.log('🚀 Bulk fetching ALL properties from Appwrite...');
      
      const allProperties = [];
      let offset = 0;
      const limit = 500; // Larger chunks for speed
      
      while (true) {
        const response = await databases.listDocuments(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.COLLECTIONS.PROPERTIES,
          [
            Query.limit(limit),
            Query.offset(offset),
            Query.orderAsc('$createdAt')
          ]
        );
        
        allProperties.push(...response.documents);
        console.log(`📦 Fetched ${allProperties.length} / ${response.total} properties`);
        
        if (response.documents.length < limit) break;
        offset += limit;
      }

      console.log(`✅ Retrieved ALL ${allProperties.length} properties`);
      return { documents: allProperties, total: allProperties.length };
    } catch (error) {
      console.error('❌ Error fetching properties from Appwrite:', error);
      throw error;
    }
  }

  /**
   * Get all properties from Appwrite (with pagination)
   */
  static async getProperties(limit = 100, offset = 0) {
    try {
      console.log(`📊 Fetching properties from Appwrite (limit: ${limit}, offset: ${offset})`);
      
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.PROPERTIES,
        [
          Query.limit(limit),
          Query.offset(offset),
          Query.orderAsc('$createdAt')
        ]
      );

      console.log(`✅ Retrieved ${response.documents.length} properties`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching properties from Appwrite:', error);
      throw error;
    }
  }

  /**
   * Get property by ID
   */
  static async getPropertyById(propertyId) {
    try {
      const response = await databases.getDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.PROPERTIES,
        propertyId
      );
      return response;
    } catch (error) {
      console.error(`❌ Error fetching property ${propertyId}:`, error);
      throw error;
    }
  }

  /**
   * Get all leads from Appwrite
   */
  static async getLeads(limit = 100, offset = 0) {
    try {
      console.log(`📊 Fetching leads from Appwrite (limit: ${limit}, offset: ${offset})`);
      
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.LEADS,
        [
          Query.limit(limit),
          Query.offset(offset),
          Query.orderAsc('$createdAt')
        ]
      );

      console.log(`✅ Retrieved ${response.documents.length} leads`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching leads from Appwrite:', error);
      throw error;
    }
  }

  /**
   * Get all users from Appwrite
   */
  static async getUsers(limit = 100, offset = 0) {
    try {
      console.log(`📊 Fetching users from Appwrite (limit: ${limit}, offset: ${offset})`);
      
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.USERS,
        [
          Query.limit(limit),
          Query.offset(offset),
          Query.orderAsc('$createdAt')
        ]
      );

      console.log(`✅ Retrieved ${response.documents.length} users`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching users from Appwrite:', error);
      throw error;
    }
  }

  /**
   * Get storage file URL
   */
  static getFileUrl(bucketId, fileId) {
    try {
      const url = storage.getFileView(bucketId, fileId);
      return url.href;
    } catch (error) {
      console.error(`❌ Error getting file URL for ${fileId}:`, error);
      return null;
    }
  }

  /**
   * Get file preview URL
   */
  static getFilePreview(bucketId, fileId, width = 300, height = 300) {
    try {
      const url = storage.getFilePreview(bucketId, fileId, width, height);
      return url.href;
    } catch (error) {
      console.error(`❌ Error getting file preview for ${fileId}:`, error);
      return null;
    }
  }

  /**
   * List files in a bucket
   */
  static async listFiles(bucketId, limit = 100) {
    try {
      const response = await storage.listFiles(bucketId, [
        Query.limit(limit)
      ]);
      return response;
    } catch (error) {
      console.error(`❌ Error listing files in bucket ${bucketId}:`, error);
      throw error;
    }
  }

  /**
   * Test Appwrite connection
   */
  static async testConnection() {
    try {
      console.log('🧪 Testing Appwrite connection...');
      
      // Test database access
      const propertiesTest = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.PROPERTIES,
        [Query.limit(1)]
      );

      console.log('✅ Appwrite connection successful!');
      console.log(`📊 Database accessible - ${propertiesTest.total} total properties found`);
      
      return true;
    } catch (error) {
      console.error('❌ Appwrite connection failed:', error);
      return false;
    }
  }

  /**
   * Get collection schema (analyze first document)
   */
  static async analyzeCollectionSchema(collectionId) {
    try {
      console.log(`🔍 Analyzing schema for collection: ${collectionId}`);
      
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        collectionId,
        [Query.limit(1)]
      );

      if (response.documents.length === 0) {
        console.log(`⚠️ No documents found in collection ${collectionId}`);
        return {};
      }

      const firstDoc = response.documents[0];
      const schema = {};

      // Analyze document structure
      Object.keys(firstDoc).forEach(key => {
        const value = firstDoc[key];
        schema[key] = {
          type: typeof value,
          isArray: Array.isArray(value),
          sample: Array.isArray(value) ? value.slice(0, 2) : value
        };
      });

      console.log(`✅ Schema analyzed for ${collectionId}:`, schema);
      return schema;
    } catch (error) {
      console.error(`❌ Error analyzing schema for ${collectionId}:`, error);
      throw error;
    }
  }
}

module.exports = {
  AppwriteService,
  APPWRITE_CONFIG,
  databases,
  storage
};
