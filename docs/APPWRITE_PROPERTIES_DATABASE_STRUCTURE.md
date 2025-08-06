# APPWRITE PROPERTIES DATABASE STRUCTURE & MATCHING GUIDE
## Complete Column Analysis for Database Service Migration

### 📋 Overview
This document provides a detailed analysis of the Appwrite Properties collection structure for the CRS (Customer Relationship System) real estate platform. It includes every column with descriptions, sample data, and guidance for matching between different database services (Appwrite → Supabase/PostgreSQL).

---

## 🏠 PROPERTIES COLLECTION DETAILS
**Collection ID**: `6737698b000cccaf6f16`  
**Total Records**: 3,228 properties  
**Data Source**: Appwrite Cloud NoSQL Database  
**Target**: Supabase PostgreSQL Database  

---

## 📊 COMPLETE COLUMN STRUCTURE

### **1. CORE PROPERTY IDENTIFICATION**

#### `$id` (System Field)
- **Type**: String (UUID)
- **Purpose**: Unique document identifier in Appwrite
- **Sample**: `"6767eb0d00258936d0cf"`
- **Required**: Yes (Auto-generated)
- **Migration Target**: `appwrite_id` column in Supabase
- **Comment**: This is the primary key in Appwrite. Keep as reference for data integrity during migration.

#### `propertyNumber` 
- **Type**: String
- **Purpose**: Human-readable property code for business operations
- **Sample**: `"PRO1441"`, `"PROP2567"`
- **Required**: Yes (Business key)
- **Migration Target**: `property_code` column in Supabase
- **Comment**: This should be indexed and unique in target database for property lookup and references.

#### `compoundName`
- **Type**: String  
- **Purpose**: Project/compound/development name where property is located
- **Sample**: `"Town house for rent in la rosa"`, `"La Rosa Compound"`, `"Mountain View Hyde Park"`
- **Required**: No
- **Migration Target**: Split into `title` and `compound_name` in Supabase
- **Comment**: Often contains both property title and compound name. Needs parsing logic during migration.

---

### **2. PROPERTY CLASSIFICATION & TYPE**

#### `type`
- **Type**: String
- **Purpose**: Property type classification
- **Sample**: `"town house"`, `"apartment"`, `"villa"`, `"studio"`, `"penthouse"`
- **Required**: Yes
- **Migration Target**: `property_types` lookup table → `property_type_id` FK
- **Comment**: Should be normalized into a lookup table for consistency and dropdown values.

#### `category`
- **Type**: String
- **Purpose**: Property category (broad classification)
- **Sample**: `"Residential"`, `"Commercial"`, `"Administrative"`
- **Required**: No
- **Migration Target**: `property_categories` lookup table → `category_id` FK
- **Comment**: Create enum or lookup table for standardized categories.

#### `unitFor`
- **Type**: String
- **Purpose**: Listing purpose (sale or rental)
- **Sample**: `"Rent"`, `"Sale"`
- **Required**: Yes
- **Migration Target**: `listing_type` ENUM('Rent', 'Sale')
- **Comment**: Critical for filtering properties by purpose. Should be enforced as enum.

---

### **3. PROPERTY SPECIFICATIONS**

#### `rooms`
- **Type**: Number
- **Purpose**: Number of bedrooms/rooms
- **Sample**: `5`, `3`, `2`, `1`
- **Required**: No
- **Migration Target**: `bedrooms` INT
- **Comment**: Essential for property search and filtering. Validate range (0-20).

#### `description`
- **Type**: String (Text)
- **Purpose**: Detailed property description
- **Sample**: `"Town house for rent in La Rosa compound, Sheikh Zayed city..."`
- **Required**: No
- **Migration Target**: `description` TEXT
- **Comment**: Rich text content for property details. May need HTML sanitization.

#### `finished`
- **Type**: String
- **Purpose**: Finishing status of the property
- **Sample**: `"Fully Finished"`, `"semi furnished"`, `"Fully Finished & Furnished"`
- **Required**: No
- **Migration Target**: `finished_types` lookup table → `finished_type_id` FK
- **Comment**: Standardize finishing options for consistency.

#### `unitFeatures`
- **Type**: String
- **Purpose**: Comma-separated list of property features
- **Sample**: `"Pool, Garden, AC"`, `"Gym, Security, Parking"`
- **Required**: No
- **Migration Target**: `property_features` many-to-many relationship
- **Comment**: Parse comma-separated values into normalized feature relationships.

---

### **4. LOCATION & GEOGRAPHIC DATA**

#### `area`
- **Type**: String
- **Purpose**: Neighborhood/area name where property is located
- **Sample**: `"la rosa"`, `"New Cairo"`, `"6th October"`, `"Maadi"`
- **Required**: Yes (Critical for search)
- **Migration Target**: `areas` lookup table → `area_id` FK
- **Comment**: Normalize case sensitivity. Create hierarchical area structure (Region > Area).

#### `theFloors`
- **Type**: String
- **Purpose**: Floor number or level
- **Sample**: `"4"`, `"Ground"`, `"Roof"`, `"1"`, `"Basement"`
- **Required**: No
- **Migration Target**: `floor_number` VARCHAR(20)
- **Comment**: Mix of numbers and text values. Handle special cases like "Ground", "Roof".

#### `landArea`
- **Type**: String (Numeric)
- **Purpose**: Land area in square meters
- **Sample**: `"800"`, `"1200"`, `"500"`
- **Required**: No
- **Migration Target**: `land_area` DECIMAL(8,2)
- **Comment**: Convert string to numeric. Validate reasonable ranges (50-10000 sqm).

#### `building`
- **Type**: String (Numeric)
- **Purpose**: Building/built area in square meters
- **Sample**: `"420"`, `"250"`, `"180"`
- **Required**: No
- **Migration Target**: `building_area` DECIMAL(8,2)
- **Comment**: Convert string to numeric. Should be less than or equal to land area.

---

### **5. FINANCIAL & PRICING DATA**

#### `totalPrice`
- **Type**: Number
- **Purpose**: Total property price
- **Sample**: `120000`, `2500000`, `850000`
- **Required**: Yes (Critical for business)
- **Migration Target**: `price` DECIMAL(15,2)
- **Comment**: Handle large numbers. Implement overflow protection (max 99,999,999).

#### `currency`
- **Type**: String
- **Purpose**: Price currency code
- **Sample**: `"EGP"`, `"USD"`, `"EUR"`
- **Required**: Yes
- **Migration Target**: `currency` VARCHAR(3)
- **Comment**: Standardize to ISO currency codes. Default to EGP for missing values.

#### `downPayment`
- **Type**: Number
- **Purpose**: Required down payment amount
- **Sample**: `0`, `500000`, `100000`
- **Required**: No
- **Migration Target**: `down_payment` DECIMAL(15,2)
- **Comment**: Should be less than or equal to total price. 0 indicates cash payment.

#### `PricePerMeter`
- **Type**: Object/String
- **Purpose**: Price per square meter calculation
- **Sample**: `null`, `"12500"`
- **Required**: No
- **Migration Target**: `price_per_meter` DECIMAL(10,2)
- **Comment**: Calculate if missing: totalPrice / buildingArea. Useful for market analysis.

#### `installment`
- **Type**: Object/String
- **Purpose**: Installment payment plan details
- **Sample**: `null`, `{"monthly": 15000, "years": 5}`
- **Required**: No
- **Migration Target**: `installment_plan` JSON
- **Comment**: Parse JSON objects for payment plan details.

#### `monthly`
- **Type**: Object/String
- **Purpose**: Monthly payment amount
- **Sample**: `null`, `15000`
- **Required**: No
- **Migration Target**: `monthly_payment` DECIMAL(10,2)
- **Comment**: For rental properties or installment purchases.

---

### **6. CONTACT & OWNERSHIP DATA**

#### `name`
- **Type**: String
- **Purpose**: Property owner or contact person name
- **Sample**: `"Ahmed Mohamed"`, `"Sara Ali"`, `"Mohamed Hassan"`
- **Required**: No
- **Migration Target**: `contacts` table → `owner_name`
- **Comment**: Extract to separate contacts table for normalization. Handle privacy requirements.

#### `mobileNo`
- **Type**: String
- **Purpose**: Owner mobile/phone number
- **Sample**: `"01063380678"`, `"+201234567890"`
- **Required**: No
- **Migration Target**: `contacts` table → `owner_mobile`
- **Comment**: Normalize phone format. Validate Egyptian mobile patterns. Handle privacy.

#### `tel`
- **Type**: String
- **Purpose**: Alternative telephone number
- **Sample**: `"default-tel-..."`, `"02-12345678"`
- **Required**: No
- **Migration Target**: `contacts` table → `owner_phone`
- **Comment**: Often contains default/placeholder values. Clean during migration.

#### `handler`
- **Type**: String
- **Purpose**: Sales handler/agent assigned to property
- **Sample**: `"rehab hamedo"`, `"ahmed salah"`, `"sara mohamed"`
- **Required**: No
- **Migration Target**: `users` table → `handler_id` FK
- **Comment**: Match with existing users or create agent profiles.

#### `sales`
- **Type**: String
- **Purpose**: Sales person responsible for property
- **Sample**: `"rehab hamedo"`, `"team leader"`
- **Required**: No
- **Migration Target**: `users` table → `sales_person_id` FK
- **Comment**: Often same as handler. Normalize to user references.

---

### **7. PROPERTY STATUS & METADATA**

#### `status`
- **Type**: String
- **Purpose**: Property listing status
- **Sample**: `"Residentail"`, `"Available"`, `"Sold"`, `"Reserved"`
- **Required**: No
- **Migration Target**: `listing_status` ENUM
- **Comment**: Standardize status values. Fix typos like "Residentail" → "Residential".

#### `activity`
- **Type**: String
- **Purpose**: Property activity/business use
- **Sample**: `"Residential"`, `"Commercial"`, `"Mixed Use"`
- **Required**: No
- **Migration Target**: `activity_type` VARCHAR(50)
- **Comment**: Different from category. Describes actual use vs classification.

#### `propertyOfferedBy`
- **Type**: String
- **Purpose**: Who is offering the property
- **Sample**: `"owner"`, `"agent"`, `"developer"`
- **Required**: No
- **Migration Target**: `offered_by` ENUM('owner', 'agent', 'developer')
- **Comment**: Important for commission and contact handling.

#### `inOrOutSideCompound`
- **Type**: String
- **Purpose**: Whether property is inside or outside a compound
- **Sample**: `"inside"`, `"out side"`, `"outside"`
- **Required**: No
- **Migration Target**: `inside_compound` BOOLEAN
- **Comment**: Normalize to boolean. Handle variations like "out side" vs "outside".

#### `phase`
- **Type**: String
- **Purpose**: Development phase for compound properties
- **Sample**: `"Phase 2"`, `"Phase 1"`, `"Final Phase"`
- **Required**: No
- **Migration Target**: `phase_name` VARCHAR(50)
- **Comment**: Important for new developments and delivery scheduling.

---

### **8. USER PREFERENCES & FLAGS**

#### `liked`
- **Type**: Boolean
- **Purpose**: User preference flag (favorited properties)
- **Sample**: `false`, `true`
- **Required**: No
- **Migration Target**: `is_liked` BOOLEAN
- **Comment**: User-specific preference. May need user context for migration.

#### `inHome`
- **Type**: Boolean
- **Purpose**: Featured on homepage flag
- **Sample**: `false`, `true`
- **Required**: No
- **Migration Target**: `featured_home` BOOLEAN
- **Comment**: Marketing flag for prominent display.

---

### **9. SPATIAL & MEASUREMENT DATA**

#### `spaceEerth`
- **Type**: String
- **Purpose**: Earth/ground space measurement
- **Sample**: `"0"`, `"500"`, `""`
- **Required**: No
- **Migration Target**: `space_earth` DECIMAL(8,2)
- **Comment**: Unclear business meaning. May be typo for "earth space". Investigate usage.

#### `spaceUnit`
- **Type**: String
- **Purpose**: Unit space measurement
- **Sample**: `"0"`, `"250"`, `""`
- **Required**: No
- **Migration Target**: `space_unit` DECIMAL(8,2)
- **Comment**: Might refer to usable unit space vs total space.

#### `spaceGuard`
- **Type**: String
- **Purpose**: Guard/security space measurement
- **Sample**: `"0"`, `"50"`, `""`
- **Required**: No
- **Migration Target**: `space_guard` DECIMAL(8,2)
- **Comment**: Space allocated for security/guard facilities.

---

### **10. RICH MEDIA CONTENT**

#### `propertyImage`
- **Type**: String (JSON Array)
- **Purpose**: Property image gallery
- **Sample**: `[{"id":"673a2d8e0039f72365ba","fileUrl":"https://cloud.appwrite.io/v1/storage/buckets/673a2734001f92c1826e/files/673a2d8e0039f72365ba/view?project=6737671f003c16c1e33f"}]`
- **Required**: No
- **Migration Target**: `property_images` related table
- **Comment**: Parse JSON array. Extract image URLs and metadata. Handle broken/missing images.

#### `videos`
- **Type**: String (JSON Array)
- **Purpose**: Property video content
- **Sample**: `[{"url":"https://youtube.com/...", "title":"Property Tour"}]`
- **Required**: No
- **Migration Target**: `property_videos` related table
- **Comment**: Parse JSON for video URLs and metadata. Validate video links.

---

### **11. SYSTEM AUDIT FIELDS**

#### `$createdAt`
- **Type**: String (ISO DateTime)
- **Purpose**: Record creation timestamp
- **Sample**: `"2024-12-22T10:33:49.003+00:00"`
- **Required**: Yes (Auto-generated)
- **Migration Target**: `created_at` TIMESTAMP
- **Comment**: Convert ISO string to PostgreSQL timestamp. Preserve timezone info.

#### `$updatedAt`
- **Type**: String (ISO DateTime)
- **Purpose**: Last modification timestamp
- **Sample**: `"2025-01-14T19:58:13.553+00:00"`
- **Required**: Yes (Auto-generated)
- **Migration Target**: `updated_at` TIMESTAMP
- **Comment**: Track data freshness and modification history.

#### `users`
- **Type**: Array of Strings
- **Purpose**: Array of user IDs assigned to this property
- **Sample**: `["675d79c700357fcdcc77"]`
- **Required**: No
- **Migration Target**: `property_assignments` junction table
- **Comment**: Many-to-many relationship between properties and users.

---

## 🔗 DATABASE SERVICE MATCHING STRATEGY

### **Appwrite → Supabase Migration Plan**

#### **1. Data Type Conversions**
```sql
-- String to Enum
unitFor → listing_type ENUM('Rent', 'Sale')

-- String to Numeric
landArea → land_area DECIMAL(8,2)
building → building_area DECIMAL(8,2)
totalPrice → price DECIMAL(15,2)

-- String to Boolean
inOrOutSideCompound → inside_compound BOOLEAN

-- JSON String to JSON
propertyImage → property_images JSON
videos → property_videos JSON

-- ISO String to Timestamp
$createdAt → created_at TIMESTAMP WITH TIME ZONE
$updatedAt → updated_at TIMESTAMP WITH TIME ZONE
```

#### **2. Normalization Strategy**
```sql
-- Create lookup tables
CREATE TABLE areas (id SERIAL PRIMARY KEY, area_name VARCHAR(100) UNIQUE);
CREATE TABLE property_types (id SERIAL PRIMARY KEY, type_name VARCHAR(50) UNIQUE);
CREATE TABLE property_categories (id SERIAL PRIMARY KEY, category_name VARCHAR(50) UNIQUE);

-- Extract relationships
CREATE TABLE property_features (
    id SERIAL PRIMARY KEY,
    property_id BIGINT REFERENCES properties(id),
    feature_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Handle rich media
CREATE TABLE property_images (
    id SERIAL PRIMARY KEY,
    property_id BIGINT REFERENCES properties(id),
    image_url TEXT,
    appwrite_file_id VARCHAR(50),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### **3. Data Cleaning Requirements**
```javascript
// Clean price data
const cleanPrice = (price) => {
    if (!price || price > 99999999) return null;
    return parseFloat(price);
};

// Normalize area names
const cleanArea = (area) => {
    if (!area) return null;
    return area.toLowerCase().trim().replace(/\s+/g, ' ');
};

// Parse JSON fields safely
const parseImages = (imageString) => {
    try {
        return imageString === '[]' ? [] : JSON.parse(imageString);
    } catch (e) {
        return [];
    }
};

// Standardize status values
const normalizeStatus = (status) => {
    const statusMap = {
        'Residentail': 'Residential',
        'residentail': 'Residential',
        'RESIDENTIAL': 'Residential'
    };
    return statusMap[status] || status;
};
```

#### **4. Foreign Key Resolution**
```javascript
// Resolve area to area_id
const resolveArea = async (areaName) => {
    let area = await supabase
        .from('areas')
        .select('id')
        .eq('area_name', areaName.toLowerCase())
        .single();
    
    if (!area.data) {
        area = await supabase
            .from('areas')
            .insert({ area_name: areaName.toLowerCase() })
            .select('id')
            .single();
    }
    return area.data.id;
};

// Similar functions for property_types, categories, etc.
```

---

## 📈 MIGRATION RECOMMENDATIONS

### **Performance Optimization**
1. **Batch Processing**: Migrate in chunks of 100-500 records
2. **Index Creation**: Create indexes after migration, not before
3. **Constraint Handling**: Disable constraints during bulk insert
4. **Connection Pooling**: Use connection pooling for concurrent operations

### **Data Integrity**
1. **Validation Rules**: Implement data validation for critical fields
2. **Backup Strategy**: Full backup before migration
3. **Rollback Plan**: Prepare rollback scripts
4. **Verification Queries**: Post-migration data verification

### **Business Continuity**
1. **Incremental Migration**: Migrate in phases to minimize downtime
2. **Data Sync**: Keep systems in sync during transition
3. **Testing Environment**: Full test with production data copy
4. **User Training**: Update documentation and user guides

---

## 🎯 CRITICAL FIELDS PRIORITY

### **High Priority (Business Critical)**
- `propertyNumber` → Property identification
- `totalPrice` → Financial core
- `area` → Location search
- `unitFor` → Listing purpose
- `type` → Property classification

### **Medium Priority (Operational)**
- `rooms` → Search filtering
- `landArea`, `building` → Property specs
- `name`, `mobileNo` → Contact info
- `handler`, `sales` → Assignment

### **Low Priority (Enhancement)**
- `liked`, `inHome` → User preferences
- `spaceEerth`, `spaceUnit` → Additional metrics
- `videos` → Rich media content

This comprehensive structure guide provides the foundation for successful database migration and service matching between different database platforms.
