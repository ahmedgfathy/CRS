import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration - using your actual credentials from backend
const supabaseUrl = 'https://cqylpwdcwrssttrtvtov.supabase.co';
const supabaseAnonKey = '***REMOVED***.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxeWxwd2Rjd3Jzc3R0cnR2dG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDc0MTcsImV4cCI6MjA2OTkyMzQxN30.-SjQmiFNoDhExLOA_lBz4J57vqbTUryg186uf5h7TWM';

// Create Supabase client with AsyncStorage for session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types (will be generated based on your Supabase schema)
export interface Property {
  id: string;
  appwrite_id?: string;
  property_code: string;
  title: string;
  description?: string;
  compound_name?: string;
  area_id?: string;
  property_type_id?: string;
  category_id?: string;
  primary_contact_id?: string;
  listing_type?: string;
  bedrooms?: number;
  floor_number?: string;
  land_area?: number;
  building_area?: number;
  space_earth?: number;
  space_unit?: number;
  space_guard?: number;
  price?: number;
  currency?: string;
  down_payment?: number;
  price_per_meter?: number;
  monthly_payment?: number;
  installment_plan?: any;
  listing_status?: string;
  activity_type?: string;
  offered_by?: string;
  inside_compound?: boolean;
  phase_name?: string;
  is_liked?: boolean;
  featured_home?: boolean;
  created_at?: string;
  updated_at?: string;
  // Joined data
  areas?: Area;
  property_types?: PropertyType;
  property_categories?: PropertyCategory;
  contacts?: Contact;
  property_images?: PropertyImage[];
  property_videos?: PropertyVideo[];
}

export interface Area {
  id: string;
  area_name: string;
  region_id: string;
  area_type: string;
  status: string;
}

export interface PropertyType {
  id: string;
  type_name: string;
  category: string;
  is_active: boolean;
}

export interface PropertyCategory {
  id: string;
  category_name: string;
  description?: string;
  is_active: boolean;
}

export interface Contact {
  id: string;
  contact_name?: string;
  primary_phone?: string;
  secondary_phone?: string;
  email?: string;
  contact_type: string;
  is_active: boolean;
}

export interface PropertyImage {
  id: string;
  property_id: string;
  appwrite_file_id?: string;
  appwrite_bucket_id?: string;
  image_url: string;
  image_title?: string;
  sort_order: number;
  is_primary: boolean;
  storage_provider: string;
  file_size?: number;
  file_type?: string;
}

export interface PropertyVideo {
  id: string;
  property_id: string;
  video_url: string;
  video_title?: string;
  video_type: string;
  sort_order: number;
  storage_provider: string;
  appwrite_file_id?: string;
  duration?: number;
  file_size?: number;
}
