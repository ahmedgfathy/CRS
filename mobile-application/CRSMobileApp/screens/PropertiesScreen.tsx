import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  RefreshControl,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { appwriteStorage } from '../services/appwrite-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PropertiesScreen({ navigation }: any) {
  const [properties, setProperties] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load properties with relationships
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          *,
          areas(area_name),
          property_types(type_name)
        `)
        .limit(20)
        .order('created_at', { ascending: false });

      if (propertiesError) {
        console.error('Error loading properties:', propertiesError);
      } else {
        // Add cover images to properties
        const propertiesWithImages = await Promise.all(
          (propertiesData || []).map(async (property) => {
            const coverImage = await appwriteStorage.getPropertyCoverImage(property.id);
            return {
              ...property,
              coverImage,
            };
          })
        );
        setProperties(propertiesWithImages);
      }
      
      // Load filter options
      const { data: areasData } = await supabase
        .from('areas')
        .select('id, area_name')
        .eq('status', 'active')
        .order('area_name')
        .limit(20);
      
      setAreas(areasData || []);
      
      const { data: typesData } = await supabase
        .from('property_types')
        .select('id, type_name')
        .eq('is_active', true)
        .order('type_name')
        .limit(20);
      
      setPropertyTypes(typesData || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load properties. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const searchProperties = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('properties')
        .select(`
          *,
          areas(area_name),
          property_types(type_name)
        `);
      
      if (selectedArea) {
        query = query.contains('areas.area_name', selectedArea);
      }
      
      if (selectedType) {
        query = query.contains('property_types.type_name', selectedType);
      }
      
      if (searchText.trim()) {
        query = query.ilike('title', `%${searchText.trim()}%`);
      }

      const { data, error } = await query
        .limit(50)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Search error:', error);
        Alert.alert('Error', 'Failed to search properties.');
      } else {
        // Add cover images
        const propertiesWithImages = await Promise.all(
          (data || []).map(async (property) => {
            const coverImage = await appwriteStorage.getPropertyCoverImage(property.id);
            return {
              ...property,
              coverImage,
            };
          })
        );
        setProperties(propertiesWithImages);
      }
      
    } catch (error) {
      console.error('Error searching properties:', error);
      Alert.alert('Error', 'Failed to search properties.');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchText('');
    setSelectedArea(null);
    setSelectedType(null);
    loadInitialData();
  };

  const renderProperty = ({ item }: { item: any }) => (
    <View style={styles.propertyCard}>
      <View style={styles.propertyImageContainer}>
        {item.coverImage?.url ? (
          <Image 
            source={{ uri: item.coverImage.url }} 
            style={styles.propertyImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="home" size={40} color="#9CA3AF" />
          </View>
        )}
      </View>
      
      <View style={styles.propertyContent}>
        <Text style={styles.propertyTitle} numberOfLines={2}>
          {item.title}
        </Text>
        
        <View style={styles.propertyDetails}>
          <Text style={styles.propertyArea}>
            📍 {item.areas?.area_name || 'Area not specified'}
          </Text>
          <Text style={styles.propertyType}>
            🏠 {item.property_types?.type_name || 'Type not specified'}
          </Text>
          {item.bedrooms && (
            <Text style={styles.propertyBedrooms}>
              🛏️ {item.bedrooms} bedrooms
            </Text>
          )}
        </View>
        
        <View style={styles.propertyFooter}>
          <Text style={styles.propertyPrice}>
            {item.price 
              ? `${item.currency || 'EGP'} ${item.price.toLocaleString()}`
              : 'Price on request'
            }
          </Text>
          <View style={styles.listingTypeBadge}>
            <Text style={styles.listingType}>
              {item.listing_type || 'Sale'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search properties..."
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={searchProperties}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity style={styles.searchButton} onPress={searchProperties}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Pills */}
      <View style={styles.filtersSection}>
        <FlatList
          horizontal
          data={[...areas.slice(0, 5), ...propertyTypes.slice(0, 5)]}
          keyExtractor={(item) => `${item.id}-${item.area_name || item.type_name}`}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterPill,
                (selectedArea === item.area_name || selectedType === item.type_name) && 
                styles.filterPillActive
              ]}
              onPress={() => {
                if (item.area_name) {
                  setSelectedArea(selectedArea === item.area_name ? null : item.area_name);
                } else if (item.type_name) {
                  setSelectedType(selectedType === item.type_name ? null : item.type_name);
                }
              }}
            >
              <Text style={[
                styles.filterPillText,
                (selectedArea === item.area_name || selectedType === item.type_name) && 
                styles.filterPillTextActive
              ]}>
                {item.area_name || item.type_name}
              </Text>
            </TouchableOpacity>
          )}
        />
        
        {(selectedArea || selectedType || searchText) && (
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Properties List */}
      <FlatList
        data={properties}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProperty}
        contentContainerStyle={styles.propertiesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>
              {loading ? 'Loading properties...' : 'No properties found'}
            </Text>
            {!loading && (
              <TouchableOpacity style={styles.retryButton} onPress={loadInitialData}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListHeaderComponent={
          properties.length > 0 ? (
            <Text style={styles.resultsCount}>
              {properties.length} properties found
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    alignItems: 'center',
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#111827',
  },
  searchButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  filtersSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#4F46E5',
  },
  filterPillText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: 'white',
  },
  clearButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  propertiesList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  resultsCount: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
    fontWeight: '500',
  },
  propertyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 20,
    ...Platform.select({
      android: {
        elevation: 3,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  propertyImageContainer: {
    position: 'relative',
    height: 200,
  },
  propertyImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyContent: {
    padding: 20,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    lineHeight: 24,
  },
  propertyDetails: {
    marginBottom: 16,
  },
  propertyArea: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  propertyType: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  propertyBedrooms: {
    fontSize: 14,
    color: '#6B7280',
  },
  propertyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  propertyPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  listingTypeBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  listingType: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
