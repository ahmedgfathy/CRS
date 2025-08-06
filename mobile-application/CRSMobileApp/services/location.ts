import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
}

class LocationService {
  private currentLocation: LocationCoords | null = null;
  private permissionGranted: boolean = false;

  /**
   * Request location permission from user
   */
  async requestLocationPermission(): Promise<LocationPermissionStatus> {
    try {
      // Check if location services are enabled
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings to find properties near you.',
          [{ text: 'OK' }]
        );
        return { granted: false, canAskAgain: false };
      }

      // Check current permission status
      let { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        // Request permission
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        status = newStatus;
      }

      if (status === 'granted') {
        this.permissionGranted = true;
        return { granted: true, canAskAgain: true };
      } else {
        this.permissionGranted = false;
        Alert.alert(
          'Location Permission Required',
          'To show properties near your location, please allow location access in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => {
                // On iOS/Android, this will open app settings
                Location.requestForegroundPermissionsAsync();
              }
            }
          ]
        );
        return { granted: false, canAskAgain: status !== 'denied' };
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return { granted: false, canAskAgain: false };
    }
  }

  /**
   * Get user's current location
   */
  async getCurrentLocation(): Promise<LocationCoords | null> {
    try {
      if (!this.permissionGranted) {
        const permission = await this.requestLocationPermission();
        if (!permission.granted) {
          return null;
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      console.log('📍 User location obtained:', this.currentLocation);
      return this.currentLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please check your location settings and try again.',
        [{ text: 'OK' }]
      );
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  calculateDistance(coord1: LocationCoords, coord2: LocationCoords): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.latitude)) * 
      Math.cos(this.toRadians(coord2.latitude)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Add distance to properties based on user location
   */
  addDistanceToProperties(properties: any[], userLocation: LocationCoords): any[] {
    console.log(`📍 Calculating distances for ${properties.length} properties from user location:`, userLocation);
    
    return properties.map((property, index) => {
      // Try to get coordinates from property
      let propertyCoords: LocationCoords | null = null;
      let coordinateSource = 'unknown';
      
      // Priority 1: Check if property has explicit coordinates
      if (property.latitude && property.longitude) {
        propertyCoords = {
          latitude: parseFloat(property.latitude),
          longitude: parseFloat(property.longitude)
        };
        coordinateSource = 'property_gps';
        console.log(`📍 Property ${property.id}: Using property GPS coordinates`, propertyCoords);
      }
      // Priority 2: Check if property has area coordinates
      else if (property.areas?.latitude && property.areas?.longitude) {
        propertyCoords = {
          latitude: parseFloat(property.areas.latitude),
          longitude: parseFloat(property.areas.longitude)
        };
        coordinateSource = 'area_gps';
        console.log(`📍 Property ${property.id}: Using area GPS coordinates`, propertyCoords);
      }
      // Priority 3: Use address for geocoding estimation (if available)
      else if (property.address) {
        propertyCoords = this.estimateCoordinatesFromAddress(property.address, property.areas?.area_name);
        coordinateSource = 'address_estimated';
        console.log(`📍 Property ${property.id}: Estimated from address "${property.address}"`, propertyCoords);
      }
      // Priority 4: Default coordinates for major Egyptian cities (as fallback)
      else {
        const areaName = (property.areas?.area_name || '').toLowerCase();
        propertyCoords = this.getDefaultCityCoordinates(areaName);
        coordinateSource = 'city_default';
        console.log(`📍 Property ${property.id}: Using default city coordinates for "${areaName}"`, propertyCoords);
      }

      let distance = null;
      if (propertyCoords) {
        distance = this.calculateDistance(userLocation, propertyCoords);
        console.log(`📏 Property ${property.id}: Distance = ${distance} km (source: ${coordinateSource})`);
      }

      // Only log first 3 properties to avoid spam
      if (index < 3) {
        console.log(`📍 Property ${property.id} "${property.title?.substring(0, 30)}..." - Distance: ${distance} km (${coordinateSource})`);
      }

      return {
        ...property,
        distance,
        distanceText: distance ? `${distance} km away` : 'Distance unknown',
        coordinateSource // For debugging
      };
    });
  }

  /**
   * Sort properties by distance (nearest first)
   */
  sortPropertiesByDistance(properties: any[]): any[] {
    return properties.sort((a, b) => {
      // Properties with known distance come first
      if (a.distance !== null && b.distance === null) return -1;
      if (a.distance === null && b.distance !== null) return 1;
      if (a.distance === null && b.distance === null) return 0;
      
      // Sort by distance (ascending)
      return a.distance - b.distance;
    });
  }

  /**
   * Estimate coordinates from address string
   */
  private estimateCoordinatesFromAddress(address: string, areaName?: string): LocationCoords | null {
    const addressLower = address.toLowerCase();
    const area = (areaName || '').toLowerCase();
    
    // Create small variations based on address details
    const baseCoords = this.getDefaultCityCoordinates(area);
    if (!baseCoords) return null;
    
    // Add small random variations based on address to simulate different locations
    // This creates a spread of properties within the same area
    const addressHash = this.simpleHash(address);
    const latVariation = (addressHash % 200 - 100) * 0.001; // ±0.1 degree variation
    const lngVariation = ((addressHash * 7) % 200 - 100) * 0.001; // ±0.1 degree variation
    
    return {
      latitude: baseCoords.latitude + latVariation,
      longitude: baseCoords.longitude + lngVariation
    };
  }

  /**
   * Simple hash function for consistent coordinate variations
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get default coordinates for major Egyptian cities
   */
  private getDefaultCityCoordinates(areaName: string): LocationCoords | null {
    const cityCoordinates: { [key: string]: LocationCoords } = {
      // Cairo and surroundings - with more specific coordinates
      'cairo': { latitude: 30.0444, longitude: 31.2357 },
      'new cairo': { latitude: 30.0131, longitude: 31.4914 },
      'nasr city': { latitude: 30.0637, longitude: 31.3416 },
      'heliopolis': { latitude: 30.0808, longitude: 31.3181 },
      'maadi': { latitude: 29.9602, longitude: 31.2569 },
      'zamalek': { latitude: 30.0618, longitude: 31.2194 },
      'downtown': { latitude: 30.0626, longitude: 31.2497 },
      'garden city': { latitude: 30.0331, longitude: 31.2357 },
      'helwan': { latitude: 29.8500, longitude: 31.3333 },
      'shubra': { latitude: 30.1167, longitude: 31.2444 },
      
      // 6th of October and Sheikh Zayed
      '6th of october': { latitude: 29.9668, longitude: 30.9876 },
      'sheikh zayed': { latitude: 30.0077, longitude: 30.9671 },
      'october': { latitude: 29.9668, longitude: 30.9876 },
      'zayed': { latitude: 30.0077, longitude: 30.9671 },
      
      // Giza
      'giza': { latitude: 30.0131, longitude: 31.2089 },
      'dokki': { latitude: 30.0385, longitude: 31.2007 },
      'mohandessin': { latitude: 30.0444, longitude: 31.2001 },
      'agouza': { latitude: 30.0522, longitude: 31.2069 },
      'haram': { latitude: 30.0131, longitude: 31.1656 },
      
      // Alexandria
      'alexandria': { latitude: 31.2001, longitude: 29.9187 },
      'alex': { latitude: 31.2001, longitude: 29.9187 },
      'alexandria downtown': { latitude: 31.1975, longitude: 29.9097 },
      'montaza': { latitude: 31.2833, longitude: 30.0167 },
      'stanley': { latitude: 31.2167, longitude: 29.9667 },
      
      // New Administrative Capital
      'new capital': { latitude: 30.0000, longitude: 31.7333 },
      'administrative capital': { latitude: 30.0000, longitude: 31.7333 },
      'capital': { latitude: 30.0000, longitude: 31.7333 },
      
      // Red Sea
      'hurghada': { latitude: 27.2579, longitude: 33.8116 },
      'sharm el sheikh': { latitude: 27.9158, longitude: 34.3300 },
      'sharm': { latitude: 27.9158, longitude: 34.3300 },
      'el gouna': { latitude: 27.3959, longitude: 33.6801 },
      'gouna': { latitude: 27.3959, longitude: 33.6801 },
      'dahab': { latitude: 28.5048, longitude: 34.5136 },
      'safaga': { latitude: 26.7333, longitude: 33.9333 },
      
      // North Coast
      'north coast': { latitude: 31.0424, longitude: 28.4293 },
      'marina': { latitude: 31.0424, longitude: 28.4293 },
      'new alamein': { latitude: 30.8481, longitude: 28.9544 },
      'alamein': { latitude: 30.8481, longitude: 28.9544 },
      'ras el hekma': { latitude: 31.0000, longitude: 28.2000 },
      'sidi abdel rahman': { latitude: 30.9000, longitude: 28.7000 },
      
      // Upper Egypt
      'luxor': { latitude: 25.6872, longitude: 32.6396 },
      'aswan': { latitude: 24.0889, longitude: 32.8998 },
      'sohag': { latitude: 26.5569, longitude: 31.6956 },
      'qena': { latitude: 26.1551, longitude: 32.7160 },
      'minya': { latitude: 28.0871, longitude: 30.7618 },
      
      // Delta cities
      'mansoura': { latitude: 31.0409, longitude: 31.3785 },
      'tanta': { latitude: 30.7865, longitude: 31.0004 },
      'zagazig': { latitude: 30.5877, longitude: 31.5022 },
      'ismailia': { latitude: 30.5965, longitude: 32.2715 },
      'port said': { latitude: 31.2653, longitude: 32.3019 },
      'suez': { latitude: 29.9668, longitude: 32.5498 },
      
      // Sinai
      'arish': { latitude: 31.1313, longitude: 33.7991 },
      'st catherine': { latitude: 28.5569, longitude: 33.9503 },
      'nuweiba': { latitude: 29.0333, longitude: 34.6667 },
      'taba': { latitude: 29.4897, longitude: 34.8869 },
    };

    // Try exact match first
    if (cityCoordinates[areaName]) {
      return cityCoordinates[areaName];
    }

    // Try partial match
    for (const [city, coords] of Object.entries(cityCoordinates)) {
      if (areaName.includes(city) || city.includes(areaName)) {
        return coords;
      }
    }

    // If no match found, create coordinates based on area name hash
    // This ensures consistent but different coordinates for unknown areas
    const hash = this.simpleHash(areaName);
    const baseLatitude = 30.0444; // Cairo as base
    const baseLongitude = 31.2357;
    
    // Create variations within Egypt's bounds
    const latVariation = (hash % 400 - 200) * 0.01; // ±2 degree variation
    const lngVariation = ((hash * 13) % 400 - 200) * 0.01; // ±2 degree variation
    
    const estimatedCoords = {
      latitude: Math.max(22, Math.min(32, baseLatitude + latVariation)), // Keep within Egypt bounds
      longitude: Math.max(25, Math.min(37, baseLongitude + lngVariation))
    };
    
    console.log(`📍 Created estimated coordinates for unknown area "${areaName}":`, estimatedCoords);
    return estimatedCoords;
  }

  /**
   * Check if location permission is granted
   */
  isLocationPermissionGranted(): boolean {
    return this.permissionGranted;
  }

  /**
   * Get cached location
   */
  getCachedLocation(): LocationCoords | null {
    return this.currentLocation;
  }

  /**
   * Clear cached location
   */
  clearCachedLocation(): void {
    this.currentLocation = null;
  }
}

export const locationService = new LocationService();
