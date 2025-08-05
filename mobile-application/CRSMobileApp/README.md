# CRS Mobile App - Real Estate CRM

A React Native mobile application for the Cairo Real Estate System (CRS) built with Expo and TypeScript.

## 🏗️ Architecture

This mobile app uses a **hybrid architecture**:
- **Data**: Stored in Supabase PostgreSQL (normalized relational database)
- **Media**: Files remain in Appwrite storage (images, videos, documents)
- **Frontend**: React Native with Expo for cross-platform mobile development

## 📦 Features

- ✅ Property browsing and search
- ✅ Area-based filtering 
- ✅ Property type filtering
- ✅ High-resolution image galleries (from Appwrite storage)
- ✅ Video galleries support
- ✅ Contact information display
- ✅ Favorite properties functionality
- ✅ Responsive image loading
- ✅ Offline-ready with AsyncStorage

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio & Emulator (for Android development)

### Installation

1. **Navigate to the mobile app directory:**
   ```bash
   cd mobile-application/CRSMobileApp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Supabase connection:**
   
   Open `services/supabase.ts` and replace the placeholder values:
   ```typescript
   const supabaseUrl = 'https://your-project.supabase.co'; // Your Supabase URL
   const supabaseKey = 'your-anon-key-here'; // Your Supabase anon key
   ```

4. **Start the development server:**
   ```bash
   npx expo start
   ```

5. **Run on device/simulator:**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on physical device

## 🔧 Configuration

### Supabase Setup

The app connects to your Supabase database where the migration stored all property data. You need:

1. **Supabase URL**: Found in your Supabase project settings
2. **Anon Key**: Found in your Supabase project API settings

### Appwrite Media Access

Media files (images/videos) remain in Appwrite storage. The configuration is already set up in `services/appwrite-storage.ts`:

- Project ID: `6732766d002b223d1598`
- Endpoint: `https://cloud.appwrite.io/v1`
- Bucket: `properties`

## 📁 Project Structure

```
CRSMobileApp/
├── App.tsx                          # Main app component
├── services/
│   ├── supabase.ts                  # Supabase client & types
│   ├── appwrite-storage.ts          # Appwrite media service
│   └── properties.ts                # Properties business logic
├── components/                      # (To be created)
├── screens/                         # (To be created)
├── navigation/                      # (To be created)
└── assets/                          # App assets
```

## 🛠️ Services Overview

### PropertiesService (`services/properties.ts`)
- `getAllProperties()` - Fetch properties with pagination
- `getPropertyById()` - Get single property with full details
- `searchProperties()` - Search with filters (area, type, price, etc.)
- `getFeaturedProperties()` - Get featured/liked properties
- `getAreas()` - Get all available areas for filtering
- `getPropertyTypes()` - Get all property types for filtering
- `togglePropertyLike()` - Like/unlike properties

### AppwriteStorageService (`services/appwrite-storage.ts`)
- `getFilePreview()` - Get responsive image previews
- `getResponsiveImageUrls()` - Get multiple image sizes
- `processPropertyImages()` - Process property image arrays
- `getPropertyCoverImage()` - Get primary property image

## 📊 Database Schema

The app works with the following main tables in Supabase:

- `properties` - Main property data
- `areas` - Normalized area/location data  
- `property_types` - Property types (apartment, villa, etc.)
- `property_categories` - Categories (residential, commercial)
- `contacts` - Contact information
- `property_images` - Image metadata (files in Appwrite)
- `property_videos` - Video metadata

## 🎨 Next Steps

1. **Create UI Components:**
   - PropertyCard component
   - ImageGallery component
   - SearchFilter component
   - PropertyDetails screen

2. **Add Navigation:**
   - Install React Navigation
   - Create stack/tab navigation
   - Property list → Property details flow

3. **Enhance Features:**
   - Property search and filtering
   - Image gallery with zoom
   - Contact property owner
   - Save favorites locally
   - Push notifications

4. **Performance:**
   - Image caching
   - Lazy loading
   - Search debouncing
   - Offline capabilities

## 🔍 Testing the Setup

Run the app and you should see:
- Area count from your Supabase database
- Sample properties with their details
- Configuration guide button

If you see "Configuration Needed" alert, update your Supabase credentials in `services/supabase.ts`.

## 📱 Platform Support

- ✅ iOS (iPhone/iPad)
- ✅ Android
- ✅ Expo Go for testing
- 🚀 Ready for App Store/Play Store deployment

## 🔗 Related Documentation

- [Migration Process](../docs/MIGRATION_PROCESS.md)
- [Database Schema](../docs/DB/DATABASE_CREATION_METHODOLOGY.md)
- [Supabase Implementation](../docs/SUPABASE_IMPLEMENTATION_GUIDE.md)

---

**Ready to build your real estate CRM mobile app! 🏠📱**
