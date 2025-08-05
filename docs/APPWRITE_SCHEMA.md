# Appwrite Database Schema - Complete Field Analysis

## 🎯 Overview
Complete analysis of Appwrite collections and their field structures for the CRS real estate system.

---

## 🏠 PROPERTIES Collection Analysis
**Collection ID**: `6737698b000cccaf6f16`
**Total Records**: 3,228 properties

### Field Mapping: Appwrite → Supabase

#### Core Property Information
| Appwrite Field | Type | Sample Value | Supabase Mapping | Notes |
|----------------|------|--------------|------------------|-------|
| `propertyNumber` | string | "PRO1441" | `property_code` | Unique property identifier |
| `compoundName` | string | "Town house for rent in la rosa" | `title` | Property title/name |
| `description` | string | "Town house for rent in La Rosa..." | `description` | Full property description |
| `rooms` | number | 5 | `bedrooms` | Number of bedrooms |
| `totalPrice` | number | 120000 | `price` | Property price |
| `unitFor` | string | "Rent" / "Sale" | `listing_type` | Rent or Sale |

#### Location & Area Data
| Appwrite Field | Type | Sample Value | Supabase Mapping | Notes |
|----------------|------|--------------|------------------|-------|
| `area` | string | "la rosa" | `area_name` | Neighborhood/area name |
| `theFloors` | string | "4" | `floor_number` | Floor number or level |
| `landArea` | string | "800" | `land_area` | Land area in square meters |
| `building` | string | "420" | `building_area` | Building area in square meters |
| `compoundName` | string | "La Rosa Compound" | `compound_name` | Project/compound name |

#### Owner & Contact Information
| Appwrite Field | Type | Sample Value | Supabase Mapping | Notes |
|----------------|------|--------------|------------------|-------|
| `name` | string | "Ahmed Mohamed" | `owner_name` | Property owner name |
| `mobileNo` | string | "01063380678" | `owner_mobile` | Owner mobile number |
| `handler` | string | "rehab hamedo" | `handler` | Sales handler name |
| `sales` | string | "rehab hamedo" | `sales_person` | Sales person name |
| `tel` | string | "default-tel-..." | `owner_phone` | Alternative phone |

#### Property Details
| Appwrite Field | Type | Sample Value | Supabase Mapping | Notes |
|----------------|------|--------------|------------------|-------|
| `finished` | string | "Fully Finished" | `finished_type` | Finishing status |
| `unitFeatures` | string | "Pool, Garden, AC" | `unit_features` | Property features |
| `phase` | string | "Phase 2" | `phase_name` | Development phase |
| `type` | string | "town house" | `property_type` | Property type |
| `category` | string | "Residential" | `category` | Property category |

#### Financial Information
| Appwrite Field | Type | Sample Value | Supabase Mapping | Notes |
|----------------|------|--------------|------------------|-------|
| `currency` | string | "EGP" | `currency` | Price currency |
| `downPayment` | number | 0 | `down_payment` | Down payment amount |
| `installment` | object | null | `installment_plan` | Payment plan |
| `monthly` | object | null | `monthly_payment` | Monthly payment |
| `PricePerMeter` | object | null | `price_per_meter` | Price per square meter |

#### Property Status & Availability
| Appwrite Field | Type | Sample Value | Supabase Mapping | Notes |
|----------------|------|--------------|------------------|-------|
| `status` | string | "Residentail" | `status` | Property status |
| `activity` | string | "Residential" | `activity` | Property activity |
| `propertyOfferedBy` | string | "owner" | `property_offered_by` | Offered by owner/agent |
| `inOrOutSideCompound` | string | "inside" | `inside_compound` | Inside/outside compound |

#### Rich Media Content
| Appwrite Field | Type | Sample Value | Supabase Mapping | Notes |
|----------------|------|--------------|------------------|-------|
| `propertyImage` | string (JSON) | `[{"id":"...", "fileUrl":"..."}]` | `property_images` table | Image gallery |
| `videos` | string (JSON) | `[{"url":"...", "title":"..."}]` | `property_videos` table | Video content |

#### Additional Metadata
| Appwrite Field | Type | Sample Value | Supabase Mapping | Notes |
|----------------|------|--------------|------------------|-------|
| `liked` | boolean | false | `is_liked` | User preference |
| `inHome` | boolean | false | `featured_home` | Featured on homepage |
| `spaceEerth` | string | "0" | `space_earth` | Earth space |
| `spaceUnit` | string | "0" | `space_unit` | Unit space |
| `spaceGuard` | string | "0" | `space_guard` | Guard space |

#### System Fields
| Appwrite Field | Type | Sample Value | Supabase Mapping | Notes |
|----------------|------|--------------|------------------|-------|
| `$id` | string | "6767eb0d00258936d0cf" | `appwrite_id` | Source record ID |
| `$createdAt` | string | "2024-12-22T10:33:49.003+00:00" | `created_at` | Creation timestamp |
| `$updatedAt` | string | "2025-01-14T19:58:13.553+00:00" | `updated_at` | Last update timestamp |
| `users` | array | ["675d79c700357fcdcc77"] | `assigned_users` | Assigned user IDs |

---

## 👥 USERS Collection Analysis
**Collection ID**: `674b14b2000bdd8ac7ce`

### Key Fields
| Field | Type | Purpose |
|-------|------|---------|
| `email` | string | User login email |
| `name` | string | Full name |
| `role` | string | User role (admin, agent, etc.) |
| `properties` | array | Assigned property IDs |
| `phone` | string | Contact phone |

---

## 🎯 LEADS Collection Analysis  
**Collection ID**: `67339a5e003b8cf8eade`

### Key Fields
| Field | Type | Purpose |
|-------|------|---------|
| `name` | string | Lead name |
| `leadNumber` | string | Unique lead identifier |
| `mobileNo` | string | Lead contact number |
| `leadStatus` | string | Current lead status |
| `assignedTo` | string | Assigned agent |
| `customerSource` | string | Lead source (WhatsApp, etc.) |

---

## 🏗️ PROJECTS Collection Analysis
**Collection ID**: `67507a6500213b3917b1`

### Key Fields
| Field | Type | Purpose |
|-------|------|---------|
| `projectName` | string | Project name |
| `companyName` | string | Developer company |
| `projectInformation` | string | Project details |
| `longitude` | number | GPS longitude |
| `latitude` | number | GPS latitude |
| `images` | string (JSON) | Project images |

---

## ⚙️ FILTER_SETTINGS Collection Analysis
**Collection ID**: `673f8e09001cc74b02a6`

Contains filter options and dropdown values for the system.

### Unit Settings (Property Filters)
```json
{
  "area": [
    "Nakheel Compound", "Taj city", "Mivida", "Layan Residance",
    "Taj sultan", "Lake view Residance", "uptown", "Fifth Settlement",
    "Eastownsodic", "Hyde park", "el narges villas", "Water way",
    "90 avenue", "West golf", "Mountain view Hyde park", "madinaty",
    "South 90th", "Katameya Heights", "Village Gate", "El-Diplomaseen",
    "1st Settlement", "Mirage City", "Porto New Cairo", "Elrehab city",
    // ... 200+ more areas
  ],
  "type": [
    "apartment", "town house", "studio", "penthouse", "Standalone",
    "Duplex", "Office Space", "twin house", "Shops", "villa",
    "Medical", "Admin Building"
  ],
  "UnitFor": ["Rent", "Sale"],
  "finished": [
    "Fully Finished & Furnished", "semi furnished", "Fully Finished"
  ],
  "inside_outside": ["inside", "out side"],
  "theFloors": [
    "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
    "Roof", "Ground", "Basement", "not selected"
  ]
}
```

---

## 🔗 Storage Buckets
| Bucket | ID | Purpose |
|--------|----|---------| 
| PROPERTIES | 673a2734001f92c1826e | Property images |
| PROPERTIES_VIDEOS | 6755abbe00350ded34b7 | Property videos |
| LEADS | 6738da370036150c335e | Lead attachments |
| PROJECTS | 6751e7cb00303fb37e0c | Project media |

---

## 📊 Data Volume Analysis

### Properties (3,228 records)
- **With Images**: ~80% have property images (JSON arrays)
- **With Videos**: ~10% have property videos
- **With Complete Data**: ~95% have basic info
- **With Owner Info**: ~70% have owner contact details

### Areas Extraction
From all properties, extracted **200+ unique areas**:
- New Cairo areas: ~40%
- 6th October areas: ~25% 
- North Coast areas: ~15%
- Other locations: ~20%

### Property Types Distribution
- Apartments: ~60%
- Town Houses: ~20%
- Villas: ~10%
- Commercial: ~5%
- Other: ~5%

---

## 🚨 Data Quality Issues

### Common Issues Found
1. **Inconsistent Naming**: "Residentail" vs "Residential"
2. **Empty Values**: Many fields contain empty strings instead of null
3. **Number as Strings**: Area values stored as strings ("800" instead of 800)
4. **JSON Parsing**: Images/videos stored as JSON strings
5. **Case Sensitivity**: Mixed case in area names

### Data Cleaning Required
```javascript
// Example cleaning needed
const cleanPrice = prop.totalPrice > 99999999 ? 99999999 : prop.totalPrice;
const cleanArea = prop.landArea && !isNaN(prop.landArea) ? parseFloat(prop.landArea) : null;
const cleanImages = prop.propertyImage !== '[]' ? JSON.parse(prop.propertyImage) : [];
```

---

## 🎯 Migration Priority Matrix

### High Priority (Core Data)
1. ✅ Property basic info (code, title, price, type)
2. ✅ Location data (area, floors, compound)
3. ⏳ Owner contact info (name, mobile)
4. ⏳ Property details (features, finishing)

### Medium Priority (Enhanced Data)
1. ⏳ Property images and galleries
2. ⏳ Area and region relationships
3. ⏳ Sales handler assignments
4. ⏳ Financial details (installments, etc.)

### Low Priority (Metadata)
1. ⏳ Property videos
2. ⏳ User preferences (liked, featured)
3. ⏳ System audit fields
4. ⏳ Advanced search filters

**This schema analysis provides the complete blueprint for data migration and system understanding.**
