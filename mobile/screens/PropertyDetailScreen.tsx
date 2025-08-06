import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
  Share,
  Linking,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { appwriteStorage } from '../services/appwrite-storage';
import { locationService, LocationCoords } from '../services/location';
import { screenProtectionService } from '../services/screenProtection';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PropertyDetailScreen({ route, navigation }: any) {
  const [property, setProperty] = useState(route.params.property);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [relatedProperties, setRelatedProperties] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [distanceToProperty, setDistanceToProperty] = useState<string | null>(null);

  useEffect(() => {
    // Enable screenshot protection for this screen
    screenProtectionService.enableScreenProtection();
    
    if (property) {
      loadPropertyDetails();
      loadPropertyImages();
      loadRelatedProperties();
      calculateDistanceToProperty();
    } else if (route.params.propertyId) {
      loadPropertyById(route.params.propertyId);
    }

    // Cleanup on unmount
    return () => {
      // Note: We don't disable screenshot protection on unmount
      // as it should remain active throughout the app
    };
  }, []);

  const calculateDistanceToProperty = async () => {
    try {
      const userLoc = await locationService.getCurrentLocation();
      if (userLoc) {
        setUserLocation(userLoc);
        
        // Get property coordinates
        let propertyCoords: LocationCoords | null = null;
        
        if (property.latitude && property.longitude) {
          propertyCoords = {
            latitude: parseFloat(property.latitude),
            longitude: parseFloat(property.longitude)
          };
        } else if (property.areas?.latitude && property.areas?.longitude) {
          propertyCoords = {
            latitude: parseFloat(property.areas.latitude),
            longitude: parseFloat(property.areas.longitude)
          };
        }
        
        if (propertyCoords) {
          const distance = locationService.calculateDistance(userLoc, propertyCoords);
          setDistanceToProperty(`${distance} km from your location`);
        }
      }
    } catch (error) {
      console.log('Could not calculate distance to property:', error);
    }
  };

  const loadPropertyById = async (propertyId: number) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          areas(area_name),
          property_types(type_name)
        `)
        .eq('id', propertyId)
        .single();

      if (error) throw error;
      
      const coverImage = await appwriteStorage.getPropertyCoverImage(propertyId);
      setProperty({
        ...data,
        coverImage,
        type: 'property'
      });
      
      loadPropertyImages();
      loadRelatedProperties();
    } catch (error) {
      console.error('Error loading property:', error);
      Alert.alert('Error', 'Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  const loadPropertyDetails = async () => {
    if (!property?.id) return;
    
    try {
      // Load additional details if needed
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          areas(area_name),
          property_types(type_name)
        `)
        .eq('id', property.id)
        .single();

      if (!error && data) {
        setProperty((prev: any) => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error loading property details:', error);
    }
  };

  const loadPropertyImages = async () => {
    if (!property?.id) return;
    
    try {
      const propertyImages = await appwriteStorage.getPropertyImages(property.id);
      if (propertyImages && propertyImages.length > 0) {
        setImages(propertyImages);
      } else if (property.coverImage?.url) {
        setImages([property.coverImage]);
      }
    } catch (error) {
      console.error('Error loading images:', error);
      if (property.coverImage?.url) {
        setImages([property.coverImage]);
      }
    }
  };

  const loadRelatedProperties = async () => {
    if (!property?.area_id) return;
    
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          id,
          title,
          price,
          areas(area_name),
          property_types(type_name)
        `)
        .eq('area_id', property.area_id)
        .neq('id', property.id)
        .limit(4);

      if (!error && data) {
        const propertiesWithImages = await Promise.all(
          data.map(async (prop: any) => {
            const coverImage = await appwriteStorage.getPropertyCoverImage(prop.id);
            return { ...prop, coverImage };
          })
        );
        setRelatedProperties(propertiesWithImages);
      }
    } catch (error) {
      console.error('Error loading related properties:', error);
    }
  };

  const handleShare = async () => {
    try {
      const shareContent = {
        message: `Check out this property: ${property.title}\nPrice: ${property.price ? `EGP ${property.price.toLocaleString()}` : 'Price on request'}\nLocation: ${property.areas?.area_name || 'Not specified'}`,
        url: `https://yourapp.com/property/${property.id}`,
      };
      
      await Share.share(shareContent);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCall = () => {
    const phoneNumber = property.phone || property.contact_phone || '+20123456789'; // Default number
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleWhatsApp = () => {
    const phoneNumber = property.whatsapp || property.phone || '+20123456789'; // Default number
    const message = encodeURIComponent(`Hi, I'm interested in this property: ${property.title}`);
    Linking.openURL(`whatsapp://send?phone=${phoneNumber}&text=${message}`);
  };

  const formatPrice = (price: number) => {
    if (!price) return 'Price on request';
    return `EGP ${price.toLocaleString()}`;
  };

  const renderImageCarousel = () => (
    <View style={styles.imageContainer}>
      {images.length > 0 ? (
        <>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setCurrentImageIndex(index);
            }}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item.url }}
                style={styles.propertyImage}
                resizeMode="cover"
              />
            )}
            keyExtractor={(item, index) => `image-${index}`}
          />
          
          {/* Image indicators */}
          {images.length > 1 && (
            <View style={styles.imageIndicators}>
              {images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === currentImageIndex && styles.activeIndicator
                  ]}
                />
              ))}
            </View>
          )}
          
          {/* Image counter */}
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {currentImageIndex + 1} / {images.length}
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.placeholderImageLarge}>
          <MaterialIcons name="home" size={80} color="#9CA3AF" />
          <Text style={styles.placeholderText}>No images available</Text>
        </View>
      )}
      
      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      
      {/* Share button */}
      <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
        <Ionicons name="share-social" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderPropertyInfo = () => (
    <View style={styles.propertyInfoContainer}>
      {/* Price and listing type */}
      <View style={styles.priceSection}>
        <Text style={styles.price}>{formatPrice(property.price)}</Text>
        {property.listing_type && (
          <View style={[
            styles.listingTypeBadge,
            property.listing_type === 'Sale' ? styles.saleBadge : styles.rentBadge
          ]}>
            <Text style={[
              styles.listingTypeText,
              property.listing_type === 'Sale' ? styles.saleText : styles.rentText
            ]}>
              FOR {property.listing_type?.toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      
      {/* Title */}
      <Text style={styles.propertyTitle}>{property.title}</Text>
      
      {/* Location and type info */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Ionicons name="location" size={18} color="#2563EB" />
          <Text style={styles.infoText}>
            {property.areas?.area_name || 'Location not specified'}
          </Text>
        </View>
      </View>
      
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <MaterialIcons name="home" size={18} color="#2563EB" />
          <Text style={styles.infoText}>
            {property.property_types?.type_name || 'Type not specified'}
          </Text>
        </View>
      </View>
      
      {/* Distance information */}
      {distanceToProperty && (
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="car" size={18} color="#2563EB" />
            <Text style={styles.distanceText}>
              {distanceToProperty}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderSpecifications = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Property Specifications</Text>
      <View style={styles.specsContainer}>
        {property.bedrooms && (
          <View style={styles.specItem}>
            <View style={styles.specIconContainer}>
              <Ionicons name="bed" size={20} color="#2563EB" />
            </View>
            <View style={styles.specTextContainer}>
              <Text style={styles.specLabel}>Bedrooms</Text>
              <Text style={styles.specValue}>{property.bedrooms}</Text>
            </View>
          </View>
        )}
        
        {property.bathrooms && (
          <View style={styles.specItem}>
            <View style={styles.specIconContainer}>
              <MaterialIcons name="bathtub" size={20} color="#2563EB" />
            </View>
            <View style={styles.specTextContainer}>
              <Text style={styles.specLabel}>Bathrooms</Text>
              <Text style={styles.specValue}>{property.bathrooms}</Text>
            </View>
          </View>
        )}
        
        {property.area && (
          <View style={styles.specItem}>
            <View style={styles.specIconContainer}>
              <MaterialIcons name="square-foot" size={20} color="#2563EB" />
            </View>
            <View style={styles.specTextContainer}>
              <Text style={styles.specLabel}>Area</Text>
              <Text style={styles.specValue}>{property.area} m²</Text>
            </View>
          </View>
        )}
        
        {property.land_area && (
          <View style={styles.specItem}>
            <View style={styles.specIconContainer}>
              <MaterialIcons name="landscape" size={20} color="#2563EB" />
            </View>
            <View style={styles.specTextContainer}>
              <Text style={styles.specLabel}>Land Area</Text>
              <Text style={styles.specValue}>{property.land_area} m²</Text>
            </View>
          </View>
        )}
        
        {property.building_area && (
          <View style={styles.specItem}>
            <View style={styles.specIconContainer}>
              <MaterialIcons name="apartment" size={20} color="#2563EB" />
            </View>
            <View style={styles.specTextContainer}>
              <Text style={styles.specLabel}>Building Area</Text>
              <Text style={styles.specValue}>{property.building_area} m²</Text>
            </View>
          </View>
        )}
        
        {property.floors && (
          <View style={styles.specItem}>
            <View style={styles.specIconContainer}>
              <MaterialIcons name="layers" size={20} color="#2563EB" />
            </View>
            <View style={styles.specTextContainer}>
              <Text style={styles.specLabel}>Floors</Text>
              <Text style={styles.specValue}>{property.floors}</Text>
            </View>
          </View>
        )}
        
        {property.parking_spaces && (
          <View style={styles.specItem}>
            <View style={styles.specIconContainer}>
              <MaterialIcons name="local-parking" size={20} color="#2563EB" />
            </View>
            <View style={styles.specTextContainer}>
              <Text style={styles.specLabel}>Parking</Text>
              <Text style={styles.specValue}>{property.parking_spaces} spaces</Text>
            </View>
          </View>
        )}
        
        {property.year_built && (
          <View style={styles.specItem}>
            <View style={styles.specIconContainer}>
              <MaterialIcons name="date-range" size={20} color="#2563EB" />
            </View>
            <View style={styles.specTextContainer}>
              <Text style={styles.specLabel}>Year Built</Text>
              <Text style={styles.specValue}>{property.year_built}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderDescription = () => (
    property.description && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{property.description}</Text>
      </View>
    )
  );

  const renderAmenities = () => {
    const amenities = property.amenities || [];
    if (amenities.length === 0) return null;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Amenities</Text>
        <View style={styles.amenitiesContainer}>
          {amenities.map((amenity: string, index: number) => (
            <View key={index} style={styles.amenityItem}>
              <View style={styles.amenityIconContainer}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              </View>
              <Text style={styles.amenityText}>{amenity}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderRelatedProperties = () => (
    relatedProperties.length > 0 && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Similar Properties in This Area</Text>
        <FlatList
          data={relatedProperties}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.relatedPropertyCard}
              onPress={() => navigation.push('PropertyDetail', { property: item })}
            >
              {item.coverImage?.url ? (
                <Image
                  source={{ uri: item.coverImage.url }}
                  style={styles.relatedPropertyImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.relatedPropertyPlaceholder}>
                  <MaterialIcons name="home" size={30} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.relatedPropertyInfo}>
                <Text style={styles.relatedPropertyTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.relatedPropertyPrice}>
                  {formatPrice(item.price)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => `related-${item.id}`}
          contentContainerStyle={styles.relatedPropertiesList}
        />
      </View>
    )
  );

  const renderContactButtons = () => (
    <View style={styles.contactSection}>
      <View style={styles.contactButtonsContainer}>
        <TouchableOpacity style={styles.callButton} onPress={handleCall}>
          <View style={styles.buttonContent}>
            <Ionicons name="call" size={18} color="white" />
            <Text style={styles.contactButtonText}>Call</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.whatsappButton} onPress={handleWhatsApp}>
          <View style={styles.buttonContent}>
            <Ionicons name="logo-whatsapp" size={18} color="white" />
            <Text style={styles.contactButtonText}>WhatsApp</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.inquireButton} onPress={() => {
          Alert.alert('Inquiry', 'This feature will be available soon!');
        }}>
          <View style={styles.buttonContent}>
            <Ionicons name="mail" size={18} color="white" />
            <Text style={styles.contactButtonText}>Inquire</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!property) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading property details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderImageCarousel()}
        {renderPropertyInfo()}
        {renderSpecifications()}
        {renderDescription()}
        {renderAmenities()}
        {renderRelatedProperties()}
        
        {/* Add some bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      {renderContactButtons()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    height: SCREEN_HEIGHT * 0.4,
    position: 'relative',
  },
  propertyImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.4,
  },
  placeholderImageLarge: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.4,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    color: '#9CA3AF',
    fontSize: 16,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: 'white',
  },
  imageCounter: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageCounterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    position: 'absolute',
    top: 110,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyInfoContainer: {
    padding: 20,
    backgroundColor: 'white',
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  listingTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  saleBadge: {
    backgroundColor: '#FEF3C7',
  },
  rentBadge: {
    backgroundColor: '#DBEAFE',
  },
  listingTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  saleText: {
    color: '#F59E0B',
  },
  rentText: {
    color: '#3B82F6',
  },
  propertyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    lineHeight: 28,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 10,
    flex: 1,
  },
  distanceText: {
    fontSize: 16,
    color: '#2563EB',
    marginLeft: 10,
    flex: 1,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  specsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  specItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  specIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  specTextContainer: {
    flex: 1,
  },
  specLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
    fontWeight: '500',
  },
  specValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 12,
    paddingRight: 8,
  },
  amenityIconContainer: {
    marginRight: 8,
  },
  amenityText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  relatedPropertiesList: {
    paddingLeft: 0,
  },
  relatedPropertyCard: {
    width: 200,
    marginRight: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  relatedPropertyImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  relatedPropertyPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  relatedPropertyInfo: {
    padding: 12,
  },
  relatedPropertyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  relatedPropertyPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  contactSection: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  contactButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  whatsappButton: {
    flex: 1,
    backgroundColor: '#25D366',
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inquireButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  contactButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  bottomPadding: {
    height: 20,
  },
});
