# 🚀 Appwrite to Supabase Migration System

Intelligent data migration system that transfers your real estate data from **Appwrite** to **Supabase** while preserving relationships and using Appwrite as a CDN for media files.

## 🎯 **Migration Strategy**

### **Data Flow:**
```
Appwrite (Source) ➜ Intelligent Mapping ➜ Supabase (Destination)
     ↓                                           ↑
Storage/Media ← ← ← ← ← CDN Links ← ← ← ← ← Database
```

### **Key Features:**
- ✅ **Intelligent Column Mapping** - Automatically maps Appwrite fields to Supabase schema
- ✅ **Relationship Preservation** - Maintains foreign key relationships  
- ✅ **Media CDN Strategy** - Keeps images/videos in Appwrite, stores URLs in Supabase
- ✅ **Duplicate Prevention** - Safe to run multiple times
- ✅ **Batch Processing** - Handles large datasets efficiently
- ✅ **Error Recovery** - Continues on individual record failures
- ✅ **Progress Tracking** - Real-time migration statistics

---

## 📊 **Data Mapping**

### **Properties Migration:**
```javascript
Appwrite Field          ➜ Supabase Field
─────────────────────────────────────────
title/name              ➜ title
description/details     ➜ description  
price/cost              ➜ price
type/category           ➜ property_type_id (mapped)
area/location/district  ➜ area_id (mapped)
status/availability     ➜ status_id (mapped)
bedrooms/rooms          ➜ bedrooms
bathrooms               ➜ bathrooms
area/size/area_sqm      ➜ area_sqm
images/photos/gallery   ➜ appwrite_images (JSON)
videos/media_videos     ➜ appwrite_videos (JSON)
```

### **Leads Migration:**
```javascript
Appwrite Field          ➜ Supabase Field
─────────────────────────────────────────
name/client_name        ➜ name
phone/mobile/contact    ➜ phone
email/email_address     ➜ email
message/notes/inquiry   ➜ message
status                  ➜ status_id (mapped)
files/attachments       ➜ appwrite_files (JSON)
```

### **Users Migration:**
```javascript
Appwrite Field          ➜ Supabase Field
─────────────────────────────────────────
email/user_email        ➜ email
name/first_name         ➜ first_name
last_name               ➜ last_name
phone/mobile            ➜ phone
role/user_type          ➜ role_id (mapped)
avatar                  ➜ appwrite_avatar (URL)
```

---

## 🚀 **Quick Start**

### **1. Test Connections:**
```bash
npm run migrate:test
```

### **2. Analyze Appwrite Data:**
```bash
npm run migrate:analyze
```

### **3. Run Full Migration:**
```bash
npm run migrate:full
```

### **4. Migrate Specific Data:**
```bash
npm run migrate:users       # Users only
npm run migrate:properties  # Properties only  
npm run migrate:leads       # Leads only
```

---

## 📋 **Available Commands**

| Command | Description | Usage |
|---------|-------------|-------|
| `migrate:test` | 🧪 Test all connections | `npm run migrate:test` |
| `migrate:analyze` | 🔍 Analyze data structure | `npm run migrate:analyze` |
| `migrate:users` | 👤 Migrate users only | `npm run migrate:users` |
| `migrate:properties` | 🏠 Migrate properties only | `npm run migrate:properties` |
| `migrate:leads` | 👥 Migrate leads only | `npm run migrate:leads` |
| `migrate:full` | 🚀 Complete migration | `npm run migrate:full` |

---

## 🗃️ **Configuration**

### **Appwrite Settings** (`backend/config/appwrite.js`):
```javascript
PROJECT_ID: '6732766d002b223d1598'
DATABASE_ID: '677a9e5c0014e2994c62'
Collections: Properties, Leads, Users, Projects...
Storage Buckets: Properties, Leads, Videos...
```

### **Supabase Settings** (`backend/config/supabase.js`):
```javascript
Host: aws-0-eu-central-1.pooler.supabase.com
Database: postgres
User: postgres.cqylpwdcwrssttrtvtov
Port: 6543
```

---

## 🎯 **Media Strategy**

### **Appwrite as CDN:**
- ✅ All images stay in Appwrite storage
- ✅ All videos stay in Appwrite storage  
- ✅ Supabase stores file URLs and metadata
- ✅ Fast global CDN delivery
- ✅ No migration of large files needed

### **File URL Structure:**
```javascript
// Images
{
  fileId: "64f7a8b2c1e9d5f3a1b2",
  url: "https://cloud.appwrite.io/v1/storage/buckets/673a2734001f92c1826e/files/64f7a8b2c1e9d5f3a1b2/view",
  preview: "https://cloud.appwrite.io/v1/storage/buckets/673a2734001f92c1826e/files/64f7a8b2c1e9d5f3a1b2/preview?width=300&height=300"
}
```

---

## 📊 **Migration Reports**

### **Sample Output:**
```
🚀 Starting full migration from Appwrite to Supabase...
============================================================

👤 Starting users migration...
✅ Migrated user: 64f7a8b2c1e9d5f3a1b2 → 1
✅ Migrated user: 64f7a8b2c1e9d5f3a1b3 → 2
📊 Progress: 45/50 users migrated

🏠 Starting properties migration...  
✅ Migrated property: 64f7a8b2c1e9d5f3a1b4 → 1
✅ Migrated property: 64f7a8b2c1e9d5f3a1b5 → 2
📊 Progress: 127/130 properties migrated

👥 Starting leads migration...
✅ Migrated lead: 64f7a8b2c1e9d5f3a1b6 → 1
📊 Progress: 89/95 leads migrated

📊 MIGRATION COMPLETED!
============================================================
👤 Users: 45 migrated, 5 skipped, 0 errors
🏠 Properties: 127 migrated, 3 skipped, 0 errors
👥 Leads: 89 migrated, 6 skipped, 0 errors
============================================================
```

---

## 🔧 **Smart Features**

### **1. Intelligent Field Mapping:**
- Automatically detects field variations (`name`, `title`, `property_name`)
- Maps to closest Supabase equivalent
- Handles Arabic/English lookup values

### **2. Relationship Mapping:**
- Maps Appwrite categories to Supabase `property_types`
- Maps locations to Supabase `areas` 
- Maps statuses to appropriate lookup tables

### **3. Data Type Conversion:**
- Automatically parses prices (removes currency symbols)
- Converts strings to numbers where needed
- Handles date formatting

### **4. Error Handling:**
- Continues migration on individual record failures
- Logs detailed error information
- Provides recovery suggestions

---

## 🚨 **Important Notes**

### **Before Running:**
1. ✅ Ensure Supabase database is set up with our schema
2. ✅ Test connections with `npm run migrate:test`
3. ✅ Analyze data structure with `npm run migrate:analyze`
4. ✅ Backup your databases (both Appwrite and Supabase)

### **Safe to Re-run:**
- ✅ Migration checks for existing records using `appwrite_id`
- ✅ Skips already migrated records
- ✅ Only migrates new/missing data

### **Performance:**
- ✅ Processes in batches of 50 records
- ✅ Optimized queries and connections
- ✅ Progress tracking for large datasets

---

## 🎉 **After Migration**

### **Your Data Structure:**
```
Supabase Database (Primary)
├── properties (with appwrite_images, appwrite_videos)
├── leads (with appwrite_files)  
├── users (with appwrite_avatar)
└── All relational tables populated

Appwrite Storage (CDN)
├── Property Images → Fast global delivery
├── Property Videos → Streaming optimized
├── Lead Files → Secure access
└── User Avatars → Profile pictures
```

### **Benefits:**
- 🚀 **Fast Queries** - Supabase PostgreSQL performance
- 🌍 **Global CDN** - Appwrite storage worldwide
- 💰 **Cost Effective** - Use free tiers of both services
- 🔒 **Secure** - Row Level Security + file access control
- 📱 **Mobile Ready** - Perfect for React Native apps

---

## 🆘 **Troubleshooting**

### **Connection Issues:**
```bash
# Test individual connections
npm run migrate:test
```

### **Schema Mismatches:**
```bash
# Analyze data structure first
npm run migrate:analyze
```

### **Partial Failures:**
```bash
# Re-run specific migrations
npm run migrate:properties  # Only failed table
```

### **File Access Issues:**
- Check Appwrite bucket permissions
- Verify API key has storage access
- Test file URLs manually

---

## 🎯 **Next Steps**

After successful migration:

1. **🔗 Update your frontend** to use Supabase for data + Appwrite URLs for media
2. **🔒 Configure RLS policies** in Supabase for security
3. **📱 Integrate with React Native** using Supabase client
4. **⚡ Set up real-time subscriptions** for live updates
5. **🔄 Plan incremental sync** for ongoing data updates

**Your Real Estate CRM is now powered by the best of both worlds!** 🚀
