-- ═══════════════════════════════════════════════════════════════════════════════════
-- SUPABASE REACT NATIVE INTEGRATION GUIDE
-- ═══════════════════════════════════════════════════════════════════════════════════
-- Complete implementation guide for Real Estate CRM with Supabase
-- Includes: Setup, Authentication, Real-time, File Storage, Security
-- 🆓 FREE PLAN OPTIMIZED: 50MB file limit solutions included
-- ═══════════════════════════════════════════════════════════════════════════════════

## 🚀 SUPABASE SETUP FOR YOUR REAL ESTATE CRM

### 🆓 FREE PLAN CONSIDERATIONS (READ FIRST!)
**Important:** Supabase free plan has a 50MB per file limit. This guide includes:
- ✅ Automatic image compression (10MB max)
- ✅ Video optimization strategies (45MB max)
- ✅ Fallback solutions for large files
- ✅ External hosting integration options
- ✅ Upgrade path guidance

### STEP 1: PROJECT INITIALIZATION (5 minutes)
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize your project
supabase init
supabase start

# Install React Native dependencies
npm install @supabase/supabase-js
npm install react-native-url-polyfill
```

### STEP 2: SUPABASE CONFIGURATION
```javascript
// supabase-config.js
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable automatic session refresh
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

## 🔐 AUTHENTICATION SYSTEM

### USER REGISTRATION WITH ROLE ASSIGNMENT
```javascript
// auth/AuthService.js
import { supabase } from '../supabase-config';

export class AuthService {
  
  // Register new user with role
  async registerUser(userData) {
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });

      if (authError) throw authError;

      // 2. Create user profile with role
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          user_code: `USR${Date.now()}`,
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone_primary: userData.phone,
          role_id: userData.roleId, // From your 6-tier role system
          department_id: userData.departmentId,
          employment_status: 'active',
        });

      if (profileError) throw profileError;

      return { success: true, user: authData.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Login with role-based permissions
  async loginUser(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Get user profile with role information
      const { data: profile } = await supabase
        .from('user_profiles')
        .select(`
          *,
          user_roles(role_name, role_level, permissions),
          departments(department_name),
          teams(team_name)
        `)
        .eq('id', data.user.id)
        .single();

      return { success: true, user: data.user, profile };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get current user with full profile
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select(`
        *,
        user_roles(role_name, role_level, permissions),
        departments(department_name),
        teams(team_name)
      `)
      .eq('id', user.id)
      .single();

    return { user, profile };
  }
}
```

## 🏠 PROPERTY MANAGEMENT

### PROPERTY LISTING WITH REAL-TIME UPDATES
```javascript
// services/PropertyService.js
import { supabase } from '../supabase-config';

export class PropertyService {
  
  // Get properties with filters and real-time subscription
  async getProperties(filters = {}) {
    let query = supabase
      .from('properties')
      .select(`
        *,
        property_types(type_name, type_name_ar),
        areas(area_name, area_name_ar),
        compounds(compound_name, compound_name_ar),
        user_profiles!listing_agent_id(first_name, last_name),
        property_images(image_url, is_primary)
      `)
      .eq('listing_status', 'available')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.areaId) query = query.eq('area_id', filters.areaId);
    if (filters.propertyTypeId) query = query.eq('property_type_id', filters.propertyTypeId);
    if (filters.minPrice) query = query.gte('price', filters.minPrice);
    if (filters.maxPrice) query = query.lte('price', filters.maxPrice);
    if (filters.bedrooms) query = query.eq('bedrooms', filters.bedrooms);

    const { data, error } = await query.limit(20);
    
    if (error) throw error;
    return data;
  }

  // Real-time property updates subscription
  subscribeToPropertyUpdates(callback) {
    return supabase
      .channel('properties')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'properties' },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();
  }

  // Add new property
  async addProperty(propertyData, userId) {
    const { data, error } = await supabase
      .from('properties')
      .insert({
        ...propertyData,
        property_code: `PROP${Date.now()}`,
        listing_agent_id: userId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Search properties near location (using PostGIS)
  async searchNearbyProperties(latitude, longitude, radiusKm = 5) {
    const { data, error } = await supabase.rpc('properties_near_location', {
      lat: latitude,
      lng: longitude,
      radius_km: radiusKm
    });

    if (error) throw error;
    return data;
  }
}
```

## 👥 LEAD MANAGEMENT SYSTEM

### COMPLETE CRM PIPELINE
```javascript
// services/LeadService.js
import { supabase } from '../supabase-config';

export class LeadService {
  
  // Get agent's lead pipeline
  async getAgentLeads(agentId) {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        customers(first_name, last_name, phone_primary, email),
        lead_statuses(status_name, color_code, stage_order),
        lead_sources(source_name),
        budget_ranges(range_name),
        property_types(type_name),
        user_profiles!assigned_agent_id(first_name, last_name)
      `)
      .eq('assigned_agent_id', agentId)
      .order('lead_priority')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Real-time lead updates
  subscribeToLeadUpdates(agentId, callback) {
    return supabase
      .channel('agent_leads')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'leads',
          filter: `assigned_agent_id=eq.${agentId}`
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();
  }

  // Add lead activity
  async addLeadActivity(leadId, activityData, agentId) {
    const { data, error } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        agent_id: agentId,
        ...activityData,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update lead status with automatic history tracking
  async updateLeadStatus(leadId, newStatusId, userId) {
    const { data, error } = await supabase
      .from('leads')
      .update({ 
        lead_status_id: newStatusId,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
```

## 📸 FILE STORAGE FOR PROPERTY IMAGES

### 🆓 FREE PLAN FILE STORAGE STRATEGY

**IMPORTANT:** Supabase free plan has 50MB per file limit. Our solution:

#### File Size Limits (Free Plan Optimized):
- 📷 **Images:** 10MB max (auto-compressed to fit)
- 🎥 **Videos:** 45MB max (with compression recommendations)
- 📄 **Documents:** 25MB max
- 👤 **Avatars:** 5MB max

#### Automatic Optimization:
- Images resized to max 1920x1080, 75% quality
- JPEG conversion for smaller file sizes
- Progressive JPEG encoding
- Client-side compression before upload

#### Large File Solutions:
- YouTube/Vimeo embedding for videos >45MB
- External CDN integration (Cloudinary, ImageKit)
- Upgrade prompts for Pro plan (500GB limit)

### FREE PLAN IMAGE UPLOAD SERVICE
```javascript
// services/FreePlanStorageService.js
import { supabase } from '../supabase-config';
import { FREE_PLAN_CONFIG, FreePlanHelper } from '../freePlanConfig';

export class FreePlanStorageService {
  
  // Upload property image with free plan optimization
  async uploadPropertyImage(propertyId, imageFile, isPrimary = false) {
    try {
      // 🔍 Validate file size and type
      const validation = FreePlanHelper.getOptimizationSuggestion(
        imageFile.size, 
        imageFile.type, 
        'image'
      );

      if (!validation.canUpload) {
        throw new Error(`File too large: ${validation.message}`);
      }

      // 🗜️ Compress image if needed
      let optimizedFile = imageFile;
      if (imageFile.size > FREE_PLAN_CONFIG.LIMITS.MAX_IMAGE_SIZE) {
        optimizedFile = await this.compressImage(imageFile);
      }

      const fileExt = optimizedFile.name.split('.').pop();
      const fileName = `${propertyId}/${Date.now()}.${fileExt}`;
      
      // 📤 Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(fileName, optimizedFile);

      if (uploadError) throw uploadError;

      // 🔗 Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(fileName);

      // 💾 Save image record to database
      const { data: imageRecord, error: dbError } = await supabase
        .from('property_files')
        .insert({
          property_id: propertyId,
        .insert({
          property_id: propertyId,
          file_url: publicUrl,
          file_type: 'image',
          file_category: 'image',
          file_size: optimizedFile.size,
          original_filename: imageFile.name,
          optimized: imageFile.size !== optimizedFile.size,
          file_metadata: {
            original_size: imageFile.size,
            compressed_size: optimizedFile.size,
            is_primary: isPrimary
          }
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return {
        success: true,
        file: imageRecord,
        optimized: imageFile.size !== optimizedFile.size,
        savings: imageFile.size - optimizedFile.size
      };
    } catch (error) {
      throw error;
    }
  }

  // 🗜️ Image compression for free plan
  async compressImage(imageFile) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        const maxWidth = FREE_PLAN_CONFIG.IMAGE.MAX_WIDTH;
        const maxHeight = FREE_PLAN_CONFIG.IMAGE.MAX_HEIGHT;
        
        let { width, height } = img;
        
        // Maintain aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], imageFile.name, { 
                type: 'image/jpeg',
                lastModified: Date.now()
              }));
            } else {
              reject(new Error('Compression failed'));
            }
          },
          'image/jpeg',
          FREE_PLAN_CONFIG.IMAGE.QUALITY / 100
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(imageFile);
    });
  }

  // 🎥 Video upload with size validation
  async uploadPropertyVideo(propertyId, videoFile, title = 'Property Video') {
    try {
      // Check if video exceeds free plan limits
      if (videoFile.size > FREE_PLAN_CONFIG.LIMITS.MAX_VIDEO_SIZE) {
        return {
          success: false,
          error: 'Video too large for free plan',
          suggestions: [
            'Compress video to H.264, 720p, ~1Mbps',
            'Upload to YouTube and paste link instead',
            'Consider upgrading to Supabase Pro plan'
          ],
          externalOptions: {
            youtube: 'https://youtube.com/upload',
            vimeo: 'https://vimeo.com/upload',
            compressionTools: ['HandBrake', 'FFmpeg', 'Clipchamp']
          }
        };
      }

      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${propertyId}/videos/${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('property-videos')
        .upload(fileName, videoFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('property-videos')
        .getPublicUrl(fileName);

      // Save video record
      const { data: videoRecord, error: dbError } = await supabase
        .from('property_files')
        .insert({
          property_id: propertyId,
          file_url: publicUrl,
          file_type: 'video',
          file_category: 'video',
          file_size: videoFile.size,
          original_filename: videoFile.name,
          file_metadata: { title }
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return { success: true, video: videoRecord };
    } catch (error) {
      throw error;
    }
  }

  // Get property files
  async getPropertyFiles(propertyId, category = null) {
    let query = supabase
      .from('property_files')
      .select('*')
      .eq('property_id', propertyId)
      .order('is_primary', { ascending: false })
      .order('sort_order');

    if (error) throw error;
    return data;
  }

  // Delete property image
  async deletePropertyImage(imageId, imagePath) {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('property-images')
      .remove([imagePath]);

    if (storageError) throw storageError;

    // Delete from database
    const { error: dbError } = await supabase
      .from('property_images')
      .delete()
      .eq('id', imageId);

    if (dbError) throw dbError;
  }
}
```

## 🔒 ROW LEVEL SECURITY (RLS) POLICIES

### SECURITY POLICIES FOR YOUR 6-TIER ROLE SYSTEM
```sql
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- User can see their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
FOR SELECT USING (auth.uid() = id);

-- User can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
FOR UPDATE USING (auth.uid() = id);

-- Properties visibility based on role level
CREATE POLICY "Properties access by role" ON properties
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.id = auth.uid()
    AND (
      ur.role_level <= 3 -- Managers and above see all
      OR up.team_id = (
        SELECT team_id FROM user_profiles 
        WHERE id = properties.listing_agent_id
      ) -- Team members see team properties
      OR properties.listing_agent_id = auth.uid() -- Agents see own properties
    )
  )
);

-- Leads visibility based on assignment
CREATE POLICY "Leads access control" ON leads
FOR SELECT USING (
  assigned_agent_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.id = auth.uid()
    AND ur.role_level <= 3 -- Managers see all team leads
  )
);
```

## 📱 REACT NATIVE COMPONENTS

### PROPERTY LIST COMPONENT WITH REAL-TIME UPDATES
```javascript
// components/PropertyList.js
import React, { useState, useEffect } from 'react';
import { FlatList, View, Text, Image, TouchableOpacity } from 'react-native';
import { PropertyService } from '../services/PropertyService';

const PropertyList = ({ filters, onPropertyPress }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const propertyService = new PropertyService();

  useEffect(() => {
    loadProperties();
    
    // Subscribe to real-time updates
    const subscription = propertyService.subscribeToPropertyUpdates((payload) => {
      if (payload.eventType === 'INSERT') {
        setProperties(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setProperties(prev => 
          prev.map(prop => 
            prop.id === payload.new.id ? payload.new : prop
          )
        );
      } else if (payload.eventType === 'DELETE') {
        setProperties(prev => 
          prev.filter(prop => prop.id !== payload.old.id)
        );
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [filters]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const data = await propertyService.getProperties(filters);
      setProperties(data);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderProperty = ({ item }) => (
    <TouchableOpacity 
      style={styles.propertyCard}
      onPress={() => onPropertyPress(item)}
    >
      <Image 
        source={{ 
          uri: item.property_images?.find(img => img.is_primary)?.image_url 
        }}
        style={styles.propertyImage}
      />
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyTitle}>{item.title}</Text>
        <Text style={styles.propertyLocation}>
          {item.areas.area_name} • {item.property_types.type_name}
        </Text>
        <Text style={styles.propertyPrice}>
          {item.currency} {item.price?.toLocaleString()}
        </Text>
        <Text style={styles.propertySpecs}>
          {item.bedrooms} BR • {item.bathrooms} BA • {item.built_area} sqm
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={properties}
      renderItem={renderProperty}
      keyExtractor={(item) => item.id.toString()}
      refreshing={loading}
      onRefresh={loadProperties}
      showsVerticalScrollIndicator={false}
    />
  );
};
```

### LEAD MANAGEMENT COMPONENT
```javascript
// components/LeadPipeline.js
import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { LeadService } from '../services/LeadService';
import { useAuth } from '../contexts/AuthContext';

const LeadPipeline = () => {
  const [leads, setLeads] = useState([]);
  const { user } = useAuth();
  const leadService = new LeadService();

  useEffect(() => {
    loadLeads();
    
    // Real-time lead updates
    const subscription = leadService.subscribeToLeadUpdates(
      user.profile.id, 
      (payload) => {
        if (payload.eventType === 'UPDATE') {
          setLeads(prev => 
            prev.map(lead => 
              lead.id === payload.new.id ? { ...lead, ...payload.new } : lead
            )
          );
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadLeads = async () => {
    try {
      const data = await leadService.getAgentLeads(user.profile.id);
      setLeads(data);
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const updateLeadStatus = async (leadId, newStatusId) => {
    try {
      await leadService.updateLeadStatus(leadId, newStatusId, user.id);
      // Real-time subscription will update the UI automatically
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  };

  const groupedLeads = leads.reduce((groups, lead) => {
    const status = lead.lead_statuses.status_name;
    if (!groups[status]) groups[status] = [];
    groups[status].push(lead);
    return groups;
  }, {});

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {Object.entries(groupedLeads).map(([status, statusLeads]) => (
        <View key={status} style={styles.statusColumn}>
          <Text style={styles.statusHeader}>{status} ({statusLeads.length})</Text>
          {statusLeads.map(lead => (
            <TouchableOpacity 
              key={lead.id} 
              style={styles.leadCard}
              onPress={() => navigateToLeadDetails(lead)}
            >
              <Text style={styles.leadName}>
                {lead.customers.first_name} {lead.customers.last_name}
              </Text>
              <Text style={styles.leadBudget}>
                Budget: {lead.budget_ranges?.range_name}
              </Text>
              <Text style={styles.leadSource}>
                Source: {lead.lead_sources.source_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </ScrollView>
  );
};
```

## 🔄 DATABASE FUNCTIONS FOR ADVANCED QUERIES

### POSTGRESQL FUNCTIONS FOR SUPABASE
```sql
-- Function to find properties near a location
CREATE OR REPLACE FUNCTION properties_near_location(
  lat FLOAT,
  lng FLOAT,
  radius_km FLOAT
)
RETURNS TABLE (
  id BIGINT,
  property_code VARCHAR,
  title VARCHAR,
  price DECIMAL,
  distance_km FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.property_code,
    p.title,
    p.price,
    ST_Distance(
      ST_GeogFromText('POINT(' || lng || ' ' || lat || ')'),
      a.coordinates::geography
    ) / 1000 AS distance_km
  FROM properties p
  JOIN areas a ON p.area_id = a.id
  WHERE p.listing_status = 'available'
  AND ST_DWithin(
    ST_GeogFromText('POINT(' || lng || ' ' || lat || ')'),
    a.coordinates::geography,
    radius_km * 1000
  )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- Function to get lead conversion statistics
CREATE OR REPLACE FUNCTION get_lead_conversion_stats(agent_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_leads', COUNT(*),
    'converted_leads', COUNT(*) FILTER (WHERE opportunity_stage = 'won'),
    'conversion_rate', 
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE opportunity_stage = 'won')::FLOAT / COUNT(*)) * 100, 2)
        ELSE 0 
      END,
    'average_deal_value', AVG(deal_value) FILTER (WHERE opportunity_stage = 'won'),
    'pipeline_value', SUM(deal_value) FILTER (WHERE opportunity_stage IN ('qualified', 'proposal', 'negotiation'))
  ) INTO result
  FROM leads
  WHERE assigned_agent_id = agent_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

## 🎯 NEXT STEPS FOR IMPLEMENTATION

### IMMEDIATE ACTIONS (This Week):
1. **Create Supabase Project**: Sign up and create your project
2. **Run Schema Migration**: Use the converted PostgreSQL schema
3. **Set up RLS Policies**: Implement security policies
4. **Configure Authentication**: Set up email/password auth

### SHORT-TERM (Next 2 Weeks):
1. **Build Core Components**: Property list, lead pipeline
2. **Implement Real-time Features**: Live updates, notifications
3. **Add File Storage**: Property image uploads
4. **Test User Roles**: Verify access control works

### LONG-TERM (Next Month):
1. **Advanced Features**: Search, filters, analytics
2. **Push Notifications**: Lead updates, new properties
3. **Offline Support**: Sync when back online
4. **Performance Optimization**: Caching, pagination

---

**🎉 I can provide complete support for every aspect of this Supabase implementation!**

Do you want me to continue with specific parts like:
- Complete schema conversion
- React Native navigation setup
- Push notifications configuration
- Advanced search implementation
- Analytics dashboard
- Or any other specific feature?
