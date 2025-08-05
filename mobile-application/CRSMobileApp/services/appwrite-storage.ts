import { Client, Storage } from 'appwrite';

// Appwrite configuration - using your actual project
const appwriteConfig = {
  endpoint: 'https://cloud.appwrite.io/v1',
  projectId: '6732766d002b223d1598',
  storageBucketId: '673a2734001f92c1826e', // Properties bucket ID
};

class AppwriteStorageService {
  private client: Client;
  private storage: Storage;

  constructor() {
    this.client = new Client()
      .setEndpoint(appwriteConfig.endpoint)
      .setProject(appwriteConfig.projectId);
    
    this.storage = new Storage(this.client);
  }

  /**
   * Get file preview URL from Appwrite storage
   */
  getFilePreview(fileId: string, width = 400, height = 300, quality = 80): string {
    if (!fileId) return '';
    
    try {
      const url = this.storage.getFilePreview(
        appwriteConfig.storageBucketId,
        fileId,
        width,
        height,
        'center' as any,
        quality
      );
      return url.toString();
    } catch (error) {
      console.error('Error getting file preview:', error);
      return '';
    }
  }

  /**
   * Get file view URL from Appwrite storage
   */
  getFileView(fileId: string): string {
    if (!fileId) return '';
    
    try {
      const url = this.storage.getFileView(appwriteConfig.storageBucketId, fileId);
      return url.toString();
    } catch (error) {
      console.error('Error getting file view URL:', error);
      return '';
    }
  }

  /**
   * Get responsive image URLs for different screen sizes
   */
  getResponsiveImageUrls(fileId: string) {
    if (!fileId) {
      return {
        thumbnail: '',
        small: '',
        medium: '',
        large: '',
        original: '',
      };
    }

    return {
      thumbnail: this.getFilePreview(fileId, 150, 150, 70),
      small: this.getFilePreview(fileId, 300, 200, 80),
      medium: this.getFilePreview(fileId, 600, 400, 85),
      large: this.getFilePreview(fileId, 800, 600, 90),
      original: this.getFileView(fileId),
    };
  }

  /**
   * Get property images from Supabase with Appwrite URLs
   */
  async getPropertyImages(propertyId: number) {
    try {
      const { supabase } = await import('./supabase');
      
      const { data, error } = await supabase
        .from('property_images')
        .select('*')
        .eq('property_id', propertyId)
        .order('id');

      if (error) {
        console.error('Error fetching property images from Supabase:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((img) => ({
        id: img.id,
        appwrite_file_id: img.appwrite_file_id,
        title: img.image_title || 'Property Image',
        url: img.appwrite_file_id 
          ? this.getFilePreview(img.appwrite_file_id, 400, 300)
          : img.image_url || '',
        thumbnail: img.appwrite_file_id 
          ? this.getFilePreview(img.appwrite_file_id, 150, 150)
          : img.image_url || '',
        urls: this.getResponsiveImageUrls(img.appwrite_file_id),
        isPrimary: img.is_primary || false,
        sortOrder: img.sort_order || 0,
      }));
    } catch (error) {
      console.error('Error in getPropertyImages:', error);
      return [];
    }
  }

  /**
   * Get property cover image (primary image)
   */
  async getPropertyCoverImage(propertyId: number) {
    try {
      const images = await this.getPropertyImages(propertyId);
      
      if (images.length === 0) return null;

      // Find primary image or use first image
      const primaryImage = images.find(img => img.isPrimary) || images[0];
      return primaryImage;
    } catch (error) {
      console.error('Error getting property cover image:', error);
      return null;
    }
  }
}

// Create and export singleton instance
export const appwriteStorage = new AppwriteStorageService();

// Export types
export interface ResponsiveImageUrls {
  thumbnail: string;
  small: string;
  medium: string;
  large: string;
  original: string;
}

export interface ProcessedImage {
  id: string;
  property_id: string;
  appwrite_file_id?: string;
  image_url: string;
  image_title?: string;
  sort_order: number;
  is_primary: boolean;
  storage_provider: string;
  urls: ResponsiveImageUrls | { original: string };
}
