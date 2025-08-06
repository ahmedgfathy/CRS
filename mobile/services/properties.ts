import { supabase, Property } from './supabase';
import { appwriteStorage } from './appwrite-storage';

export class PropertiesService {
  /**
   * Get all properties with their relationships
   */
  async getAllProperties(limit = 50, offset = 0) {
    try {
      const { data, error, count } = await supabase
        .from('properties')
        .select(`
          *,
          areas(area_name, region_id),
          property_types(type_name, category),
          property_categories(category_name),
          contacts(contact_name, primary_phone, email),
          property_images(*, storage_provider, appwrite_file_id, image_url, is_primary, sort_order),
          property_videos(*, storage_provider, video_url, video_type)
        `, { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process images with Appwrite URLs
      const processedProperties = data?.map(property => ({
        ...property,
        property_images: property.property_images 
          ? appwriteStorage.processPropertyImages(property.property_images)
          : [],
        cover_image: property.property_images?.length > 0
          ? appwriteStorage.getPropertyCoverImage(property.property_images)
          : null,
      }));

      return {
        properties: processedProperties || [],
        total: count || 0,
        hasMore: count ? offset + limit < count : false,
      };
    } catch (error) {
      console.error('Error fetching properties:', error);
      throw error;
    }
  }

  /**
   * Get a single property by ID with all details
   */
  async getPropertyById(id: string) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          areas(area_name, region_id),
          property_types(type_name, category),
          property_categories(category_name),
          contacts(contact_name, primary_phone, secondary_phone, email, contact_type),
          property_images(*, storage_provider, appwrite_file_id, image_url, is_primary, sort_order),
          property_videos(*, storage_provider, video_url, video_type, video_title)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        // Process images with Appwrite URLs
        data.property_images = data.property_images 
          ? appwriteStorage.processPropertyImages(data.property_images)
          : [];
        
        data.cover_image = data.property_images?.length > 0
          ? appwriteStorage.getPropertyCoverImage(data.property_images)
          : null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching property:', error);
      throw error;
    }
  }

  /**
   * Search properties by area, type, or other criteria
   */
  async searchProperties(searchParams: {
    area?: string;
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    listingType?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      let query = supabase
        .from('properties')
        .select(`
          *,
          areas(area_name, region_id),
          property_types(type_name, category),
          property_categories(category_name),
          contacts(contact_name, primary_phone),
          property_images(*, storage_provider, appwrite_file_id, image_url, is_primary, sort_order)
        `, { count: 'exact' });

      // Apply filters
      if (searchParams.area) {
        query = query.contains('areas.area_name', searchParams.area);
      }

      if (searchParams.propertyType) {
        query = query.contains('property_types.type_name', searchParams.propertyType);
      }

      if (searchParams.minPrice) {
        query = query.gte('price', searchParams.minPrice);
      }

      if (searchParams.maxPrice) {
        query = query.lte('price', searchParams.maxPrice);
      }

      if (searchParams.bedrooms) {
        query = query.eq('bedrooms', searchParams.bedrooms);
      }

      if (searchParams.listingType) {
        query = query.eq('listing_type', searchParams.listingType);
      }

      // Apply pagination
      const limit = searchParams.limit || 20;
      const offset = searchParams.offset || 0;
      query = query.range(offset, offset + limit - 1);

      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      // Process images with Appwrite URLs
      const processedProperties = data?.map(property => ({
        ...property,
        property_images: property.property_images 
          ? appwriteStorage.processPropertyImages(property.property_images)
          : [],
        cover_image: property.property_images?.length > 0
          ? appwriteStorage.getPropertyCoverImage(property.property_images)
          : null,
      }));

      return {
        properties: processedProperties || [],
        total: count || 0,
        hasMore: count ? offset + limit < count : false,
      };
    } catch (error) {
      console.error('Error searching properties:', error);
      throw error;
    }
  }

  /**
   * Get featured/liked properties
   */
  async getFeaturedProperties(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          areas(area_name),
          property_types(type_name),
          property_images(*, storage_provider, appwrite_file_id, image_url, is_primary, sort_order)
        `)
        .eq('featured_home', true)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process images with Appwrite URLs
      const processedProperties = data?.map(property => ({
        ...property,
        property_images: property.property_images 
          ? appwriteStorage.processPropertyImages(property.property_images)
          : [],
        cover_image: property.property_images?.length > 0
          ? appwriteStorage.getPropertyCoverImage(property.property_images)
          : null,
      }));

      return processedProperties || [];
    } catch (error) {
      console.error('Error fetching featured properties:', error);
      throw error;
    }
  }

  /**
   * Get all unique areas for filtering
   */
  async getAreas() {
    try {
      const { data, error } = await supabase
        .from('areas')
        .select('id, area_name, region_id')
        .eq('status', 'active')
        .order('area_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching areas:', error);
      throw error;
    }
  }

  /**
   * Get all property types for filtering
   */
  async getPropertyTypes() {
    try {
      const { data, error } = await supabase
        .from('property_types')
        .select('id, type_name, category')
        .eq('is_active', true)
        .order('type_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching property types:', error);
      throw error;
    }
  }

  /**
   * Toggle property like status
   */
  async togglePropertyLike(propertyId: string, isLiked: boolean) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .update({ is_liked: isLiked })
        .eq('id', propertyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating property like:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const propertiesService = new PropertiesService();
