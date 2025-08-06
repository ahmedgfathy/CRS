import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AreaCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source: 'google' | 'cached' | 'default';
}

class GeocodingService {
  private coordinatesCache: { [key: string]: AreaCoordinates } = {};
  private readonly CACHE_KEY = 'area_coordinates_cache';
  private readonly CACHE_EXPIRY_DAYS = 30; // Cache coordinates for 30 days

  constructor() {
    this.loadCacheFromStorage();
  }

  /**
   * Get GPS coordinates for an area name using geocoding
   */
  async getAreaCoordinates(areaName: string): Promise<AreaCoordinates | null> {
    try {
      const cacheKey = this.normalizeAreaName(areaName);
      
      // Check cache first
      if (this.coordinatesCache[cacheKey]) {
        console.log(`📍 Using cached coordinates for ${areaName}`);
        return this.coordinatesCache[cacheKey];
      }

      // Try to geocode the area name
      const coordinates = await this.geocodeArea(areaName);
      
      if (coordinates) {
        // Cache the result
        this.coordinatesCache[cacheKey] = {
          ...coordinates,
          source: 'google'
        };
        await this.saveCacheToStorage();
        console.log(`📍 Geocoded and cached coordinates for ${areaName}:`, coordinates);
        return coordinates;
      }

      // Fall back to default coordinates if geocoding fails
      const defaultCoords = this.getDefaultEgyptianAreaCoordinates(areaName);
      if (defaultCoords) {
        this.coordinatesCache[cacheKey] = {
          ...defaultCoords,
          source: 'default'
        };
        await this.saveCacheToStorage();
        console.log(`📍 Using default coordinates for ${areaName}:`, defaultCoords);
        return defaultCoords;
      }

      return null;
    } catch (error) {
      console.error(`Error getting coordinates for ${areaName}:`, error);
      return this.getDefaultEgyptianAreaCoordinates(areaName);
    }
  }

  /**
   * Geocode an area using Expo Location service
   */
  private async geocodeArea(areaName: string): Promise<AreaCoordinates | null> {
    try {
      // Create a more specific search query for Egyptian locations
      const searchQueries = [
        `${areaName}, Egypt`,
        `${areaName}, Cairo, Egypt`,
        `${areaName}, Giza, Egypt`,
        `${areaName}, Alexandria, Egypt`,
        areaName
      ];

      for (const query of searchQueries) {
        try {
          console.log(`🔍 Geocoding: "${query}"`);
          const geocodedLocations = await Location.geocodeAsync(query);
          
          if (geocodedLocations && geocodedLocations.length > 0) {
            const location = geocodedLocations[0];
            
            // Verify the result is in Egypt (rough bounds check)
            if (this.isInEgypt(location.latitude, location.longitude)) {
              return {
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy || undefined,
                source: 'google'
              };
            }
          }
        } catch (queryError) {
          console.log(`❌ Failed to geocode "${query}":`, queryError);
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error('Geocoding service error:', error);
      return null;
    }
  }

  /**
   * Check if coordinates are within Egypt's boundaries
   */
  private isInEgypt(latitude: number, longitude: number): boolean {
    // Egypt's approximate boundaries
    const egyptBounds = {
      north: 31.8,    // Northern border
      south: 22.0,    // Southern border  
      west: 25.0,     // Western border
      east: 35.0      // Eastern border
    };

    return (
      latitude >= egyptBounds.south &&
      latitude <= egyptBounds.north &&
      longitude >= egyptBounds.west &&
      longitude <= egyptBounds.east
    );
  }

  /**
   * Normalize area name for consistent caching
   */
  private normalizeAreaName(areaName: string): string {
    return areaName.toLowerCase()
      .trim()
      .replace(/[^\w\s\u0600-\u06FF]/g, '') // Keep only alphanumeric and Arabic chars
      .replace(/\s+/g, '_');
  }

  /**
   * Get default coordinates for major Egyptian areas
   */
  private getDefaultEgyptianAreaCoordinates(areaName: string): AreaCoordinates | null {
    const normalizedName = areaName.toLowerCase();
    
    // Comprehensive Egyptian areas with accurate coordinates
    const egyptianAreas: { [key: string]: AreaCoordinates } = {
      // Greater Cairo
      'cairo': { latitude: 30.0444, longitude: 31.2357, source: 'default' },
      'new cairo': { latitude: 30.0131, longitude: 31.4914, source: 'default' },
      'nasr city': { latitude: 30.0637, longitude: 31.3416, source: 'default' },
      'heliopolis': { latitude: 30.0808, longitude: 31.3181, source: 'default' },
      'maadi': { latitude: 29.9602, longitude: 31.2569, source: 'default' },
      'zamalek': { latitude: 30.0618, longitude: 31.2194, source: 'default' },
      'downtown cairo': { latitude: 30.0478, longitude: 31.2435, source: 'default' },
      'old cairo': { latitude: 30.0056, longitude: 31.2297, source: 'default' },
      'fifth settlement': { latitude: 30.0327, longitude: 31.4913, source: 'default' },
      'rehab city': { latitude: 30.0584, longitude: 31.4913, source: 'default' },
      'shorouk city': { latitude: 30.1218, longitude: 31.6063, source: 'default' },
      'obour city': { latitude: 30.2041, longitude: 31.4913, source: 'default' },
      
      // Giza
      'giza': { latitude: 30.0131, longitude: 31.2089, source: 'default' },
      'dokki': { latitude: 30.0385, longitude: 31.2007, source: 'default' },
      'mohandessin': { latitude: 30.0444, longitude: 31.2001, source: 'default' },
      '6th of october': { latitude: 29.9668, longitude: 30.9876, source: 'default' },
      'sheikh zayed': { latitude: 30.0077, longitude: 30.9671, source: 'default' },
      'haram': { latitude: 29.9892, longitude: 31.1769, source: 'default' },
      'faisal': { latitude: 29.9970, longitude: 31.1769, source: 'default' },
      'smart village': { latitude: 30.0719, longitude: 30.9462, source: 'default' },
      
      // Alexandria
      'alexandria': { latitude: 31.2001, longitude: 29.9187, source: 'default' },
      'alexandria downtown': { latitude: 31.1975, longitude: 29.9097, source: 'default' },
      'smouha': { latitude: 31.2156, longitude: 29.9553, source: 'default' },
      'miami': { latitude: 31.2708, longitude: 29.9648, source: 'default' },
      'agami': { latitude: 31.0424, longitude: 29.7831, source: 'default' },
      'montaza': { latitude: 31.2889, longitude: 30.0131, source: 'default' },
      
      // Red Sea (Tourist Areas)
      'hurghada': { latitude: 27.2579, longitude: 33.8116, source: 'default' },
      'sharm el sheikh': { latitude: 27.9158, longitude: 34.3300, source: 'default' },
      'el gouna': { latitude: 27.3959, longitude: 33.6801, source: 'default' },
      'dahab': { latitude: 28.4966, longitude: 34.5197, source: 'default' },
      'marsa alam': { latitude: 25.0657, longitude: 34.8837, source: 'default' },
      'safaga': { latitude: 26.7431, longitude: 33.9378, source: 'default' },
      
      // North Coast
      'north coast': { latitude: 31.0424, longitude: 28.4293, source: 'default' },
      'marina': { latitude: 31.0424, longitude: 28.4293, source: 'default' },
      'new alamein': { latitude: 30.8481, longitude: 28.9544, source: 'default' },
      'hacienda': { latitude: 31.0156, longitude: 28.5167, source: 'default' },
      'sidi abdel rahman': { latitude: 31.0500, longitude: 28.4167, source: 'default' },
      
      // Other Major Cities
      'luxor': { latitude: 25.6872, longitude: 32.6396, source: 'default' },
      'aswan': { latitude: 24.0889, longitude: 32.8998, source: 'default' },
      'mansoura': { latitude: 31.0409, longitude: 31.3785, source: 'default' },
      'tanta': { latitude: 30.7865, longitude: 31.0004, source: 'default' },
      'ismailia': { latitude: 30.5965, longitude: 32.2715, source: 'default' },
      'suez': { latitude: 29.9668, longitude: 32.5498, source: 'default' },
      'port said': { latitude: 31.2653, longitude: 32.3019, source: 'default' },
      'damanhour': { latitude: 31.0339, longitude: 30.4707, source: 'default' },
      'zagazig': { latitude: 30.5877, longitude: 31.5022, source: 'default' },
      'minya': { latitude: 28.0871, longitude: 30.7618, source: 'default' },
      'asyut': { latitude: 27.1809, longitude: 31.1837, source: 'default' },
      'sohag': { latitude: 26.5569, longitude: 31.6956, source: 'default' },
      'qena': { latitude: 26.1551, longitude: 32.7160, source: 'default' },
      
      // New Administrative Capital
      'new administrative capital': { latitude: 30.0131, longitude: 31.7333, source: 'default' },
      'new capital': { latitude: 30.0131, longitude: 31.7333, source: 'default' },
      'capital city': { latitude: 30.0131, longitude: 31.7333, source: 'default' },
    };

    // Try exact match first
    if (egyptianAreas[normalizedName]) {
      return egyptianAreas[normalizedName];
    }

    // Try partial matches
    for (const [areaKey, coords] of Object.entries(egyptianAreas)) {
      if (normalizedName.includes(areaKey) || areaKey.includes(normalizedName)) {
        console.log(`📍 Found partial match for "${areaName}" -> "${areaKey}"`);
        return coords;
      }
    }

    // Default to Cairo if no match found
    console.log(`📍 No coordinates found for "${areaName}", defaulting to Cairo`);
    return egyptianAreas['cairo'];
  }

  /**
   * Load cached coordinates from AsyncStorage
   */
  private async loadCacheFromStorage(): Promise<void> {
    try {
      const cachedData = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cachedData) {
        const parsedCache = JSON.parse(cachedData);
        
        // Check if cache is not expired
        const cacheDate = new Date(parsedCache.timestamp || 0);
        const now = new Date();
        const daysDiff = (now.getTime() - cacheDate.getTime()) / (1000 * 3600 * 24);
        
        if (daysDiff < this.CACHE_EXPIRY_DAYS) {
          this.coordinatesCache = parsedCache.data || {};
          console.log(`📍 Loaded ${Object.keys(this.coordinatesCache).length} cached coordinates`);
        } else {
          console.log('📍 Cache expired, starting fresh');
          await AsyncStorage.removeItem(this.CACHE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading coordinates cache:', error);
    }
  }

  /**
   * Save coordinates cache to AsyncStorage
   */
  private async saveCacheToStorage(): Promise<void> {
    try {
      const cacheData = {
        timestamp: new Date().toISOString(),
        data: this.coordinatesCache
      };
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving coordinates cache:', error);
    }
  }

  /**
   * Clear all cached coordinates
   */
  async clearCache(): Promise<void> {
    this.coordinatesCache = {};
    await AsyncStorage.removeItem(this.CACHE_KEY);
    console.log('📍 Coordinates cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { totalCached: number; sources: { google: number; default: number } } {
    const sources = { google: 0, default: 0 };
    
    Object.values(this.coordinatesCache).forEach(coord => {
      if (coord.source === 'google') sources.google++;
      else sources.default++;
    });

    return {
      totalCached: Object.keys(this.coordinatesCache).length,
      sources
    };
  }
}

export const geocodingService = new GeocodingService();
