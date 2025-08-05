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
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { appwriteStorage } from '../services/appwrite-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Property categories for filtering
const PROPERTY_CATEGORIES = [
  { id: 'all', name: 'All', icon: 'home' },
  { id: 'residential', name: 'Residential', icon: 'house' },
  { id: 'commercial', name: 'Commercial', icon: 'business' },
  { id: 'industrial', name: 'Industrial', icon: 'precision-manufacturing' },
  { id: 'mixed', name: 'Mixed Use', icon: 'apartment' },
];

export default function PropertiesScreen({ navigation }: any) {
  const [properties, setProperties] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async (page = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true);
        setCurrentPage(1);
        setHasMoreData(true);
      }
      
      console.log(`🔍 Loading page ${page} of properties and units...`);
      
      const offset = (page - 1) * ITEMS_PER_PAGE;
      let allItems: any[] = [];

      // Load properties with pagination
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          id,
          title,
          price,
          currency,
          area_id,
          property_type_id,
          category,
          created_at,
          areas(area_name),
          property_types(type_name)
        `)
        .range(offset, offset + ITEMS_PER_PAGE - 1)
        .order('created_at', { ascending: false });

      if (!propertiesError && propertiesData) {
        // Get images for properties in batches for better performance
        const propertiesWithImages = await Promise.all(
          propertiesData.slice(0, 10).map(async (property) => { // Only get images for first 10
            const coverImage = await appwriteStorage.getPropertyCoverImage(property.id);
            return {
              ...property,
              coverImage,
              type: 'property',
              category: property.category || 'residential'
            };
          })
        );
        
        // Add remaining properties without images initially
        const remainingProperties = propertiesData.slice(10).map(property => ({
          ...property,
          coverImage: null,
          type: 'property',
          category: property.category || 'residential'
        }));
        
        allItems = [...propertiesWithImages, ...remainingProperties];
      }

      // Check if we have more data
      setHasMoreData(allItems.length === ITEMS_PER_PAGE);
      
      if (append) {
        setProperties(prev => [...prev, ...allItems]);
      } else {
        setProperties(allItems);
      }
      
      // Load filter options only on first load
      if (page === 1) {
        const { data: areasData } = await supabase
          .from('areas')
          .select('id, area_name')
          .eq('status', 'active')
          .order('area_name')
          .limit(10); // Limit areas for better UX
        
        setAreas(areasData || []);
        
        const { data: typesData } = await supabase
          .from('property_types')
          .select('id, type_name')
          .eq('is_active', true)
          .order('type_name')
          .limit(10); // Limit types for better UX
        
        setPropertyTypes(typesData || []);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      if (!append) {
        Alert.alert('Error', 'Failed to load properties. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData(1, false);
    setRefreshing(false);
  };

  const loadMoreData = async () => {
    if (!loading && hasMoreData) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      await loadInitialData(nextPage, true);
    }
  };

  const searchProperties = async () => {
    try {
      setLoading(true);
      
      // Search in both properties and units
      let allItems: any[] = [];

      // Search properties
      let propertyQuery = supabase
        .from('properties')
        .select(`
          *,
          areas(area_name),
          property_types(type_name)
        `);
      
      if (selectedArea) {
        propertyQuery = propertyQuery.eq('area_id', selectedArea);
      }
      
      if (selectedType) {
        propertyQuery = propertyQuery.eq('property_type_id', selectedType);
      }

      if (selectedCategory !== 'all') {
        propertyQuery = propertyQuery.eq('category', selectedCategory);
      }
      
      if (searchText.trim()) {
        propertyQuery = propertyQuery.ilike('title', `%${searchText.trim()}%`);
      }

      const { data: propertiesData, error: propertiesError } = await propertyQuery
        .limit(25)
        .order('created_at', { ascending: false });

      if (!propertiesError && propertiesData) {
        const propertiesWithImages = await Promise.all(
          propertiesData.map(async (property) => {
            const coverImage = await appwriteStorage.getPropertyCoverImage(property.id);
            return {
              ...property,
              coverImage,
              type: 'property',
              category: property.category || 'residential'
            };
          })
        );
        allItems = [...allItems, ...propertiesWithImages];
      }

      // Search units if they exist
      try {
        let unitQuery = supabase
          .from('units')
          .select(`
            *,
            areas(area_name),
            property_types(type_name),
            unit_images!inner(
              image_url,
              is_primary
            )
          `)
          .eq('unit_images.is_primary', true);

        if (selectedArea) {
          unitQuery = unitQuery.eq('area_id', selectedArea);
        }
        
        if (selectedType) {
          unitQuery = unitQuery.eq('property_type_id', selectedType);
        }

        if (selectedCategory !== 'all') {
          unitQuery = unitQuery.eq('category', selectedCategory);
        }
        
        if (searchText.trim()) {
          unitQuery = unitQuery.or(`unit_title.ilike.%${searchText.trim()}%,title.ilike.%${searchText.trim()}%`);
        }

        const { data: unitsData, error: unitsError } = await unitQuery
          .limit(25);

        if (!unitsError && unitsData && unitsData.length > 0) {
          const unitsFormatted = unitsData.map(unit => ({
            ...unit,
            coverImage: {
              url: unit.unit_images[0]?.image_url,
              fileId: unit.id
            },
            title: unit.unit_title || unit.title || `Unit ${unit.unit_number || unit.id}`,
            price: unit.unit_price || unit.price,
            bedrooms: unit.bedrooms || unit.bedroom_count,
            property_types: unit.property_types || { type_name: unit.unit_type },
            type: 'unit',
            category: unit.category || 'residential'
          }));
          allItems = [...allItems, ...unitsFormatted];
        }
      } catch (unitsError) {
        console.log('ℹ️ No units table or error searching units');
      }

      setProperties(allItems);
      
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
    setSelectedCategory('all');
    loadInitialData(1, false);
  };

  // Filter properties based on selected category
  const filteredProperties = properties.filter(item => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  // Optimized Property card component
  const PropertyCard = React.memo(({ property }: { property: any }) => (
    <TouchableOpacity
      style={styles.propertyCard}
      onPress={() => {
        console.log('Property selected:', property.id);
      }}
    >
      <View style={styles.propertyImageContainer}>
        {property.coverImage?.url ? (
          <Image 
            source={{ uri: property.coverImage.url }} 
            style={styles.propertyImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <MaterialIcons name="home" size={40} color="#9CA3AF" />
          </View>
        )}
        
        {/* Type indicator */}
        <View style={[
          styles.typeIndicator,
          property.type === 'unit' ? styles.unitIndicator : styles.propertyIndicator
        ]}>
          <Text style={styles.typeText}>
            {property.type === 'unit' ? 'UNIT' : 'PROPERTY'}
          </Text>
        </View>

        {/* Price tag */}
        {property.price && (
          <View style={styles.priceTag}>
            <Text style={styles.priceText}>
              {property.currency || 'EGP'} {property.price.toLocaleString()}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyTitle} numberOfLines={2}>
          {property.title}
        </Text>
        
        <Text style={styles.propertyLocation} numberOfLines={1}>
          📍 {property.areas?.area_name || 'Location not specified'}
        </Text>
        
        <Text style={styles.propertyType}>
          🏠 {property.property_types?.type_name || 'Type not specified'}
        </Text>
        
        {property.bedrooms && (
          <Text style={styles.unitNumber}>
            🛏️ {property.bedrooms} bedrooms
          </Text>
        )}

        {property.type === 'unit' && property.unit_number && (
          <Text style={styles.unitNumber}>
            Unit #{property.unit_number}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  ));

  // Render header components as FlatList header
  const renderHeader = () => (
    <View>
      {/* Header with search */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search properties and units..."
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
          <Ionicons name="search" size={18} color="white" />
        </TouchableOpacity>
      </View>

      {/* Category Filter - Compact */}
      <View style={styles.categorySection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryScroll}>
            {PROPERTY_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  selectedCategory === category.id && styles.categoryCardActive
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <MaterialIcons 
                  name={category.icon as any} 
                  size={16} 
                  color={selectedCategory === category.id ? 'white' : '#2563EB'} 
                />
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.categoryTextActive
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Area and Type Filters */}
      <View style={styles.filtersSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {/* Area filters */}
            {areas.slice(0, 4).map((area) => (
              <TouchableOpacity
                key={`area-${area.id}`}
                style={[
                  styles.filterPill,
                  selectedArea === area.id && styles.filterPillActive
                ]}
                onPress={() => setSelectedArea(selectedArea === area.id ? null : area.id)}
              >
                <Text style={[
                  styles.filterPillText,
                  selectedArea === area.id && styles.filterPillTextActive
                ]}>
                  📍 {area.area_name}
                </Text>
              </TouchableOpacity>
            ))}
            
            {/* Type filters */}
            {propertyTypes.slice(0, 4).map((type) => (
              <TouchableOpacity
                key={`type-${type.id}`}
                style={[
                  styles.filterPill,
                  selectedType === type.id && styles.filterPillActive
                ]}
                onPress={() => setSelectedType(selectedType === type.id ? null : type.id)}
              >
                <Text style={[
                  styles.filterPillText,
                  selectedType === type.id && styles.filterPillTextActive
                ]}>
                  🏠 {type.type_name}
                </Text>
              </TouchableOpacity>
            ))}
            
            {/* Clear filters button */}
            {(selectedArea || selectedType || selectedCategory !== 'all' || searchText) && (
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {filteredProperties.length} Properties Found
        </Text>
        <Text style={styles.resultsSubtext}>
          {selectedCategory !== 'all' && `${PROPERTY_CATEGORIES.find(c => c.id === selectedCategory)?.name} • `}
          Properties & Units
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredProperties}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        renderItem={({ item }) => <PropertyCard property={item} />}
        numColumns={2}
        columnWrapperStyle={styles.propertyRow}
        contentContainerStyle={styles.propertiesGrid}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMoreData}
        onEndReachedThreshold={0.1}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={64} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>
              No properties found
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Try adjusting your filters or search terms
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={clearFilters}>
              <Text style={styles.retryButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          hasMoreData && !loading ? (
            <View style={styles.loadMoreContainer}>
              <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreData}>
                <Text style={styles.loadMoreText}>Load More Properties</Text>
              </TouchableOpacity>
            </View>
          ) : loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
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
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Category Section
  categorySection: {
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  categoryScroll: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  categoryCardActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  categoryTextActive: {
    color: 'white',
  },
  
  // Filters Section
  filtersSection: {
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterPillActive: {
    backgroundColor: '#2563EB',
  },
  filterPillText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: 'white',
  },
  clearButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Properties Section
  propertiesSection: {
    flex: 1,
    paddingVertical: 20,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  resultsSubtext: {
    fontSize: 14,
    color: '#64748B',
  },
  
  // Property Cards Grid
  propertiesGrid: {
    paddingHorizontal: 20,
  },
  propertyRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  propertyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: (SCREEN_WIDTH - 52) / 2, // Account for padding and gap
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      android: {
        elevation: 3,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  propertyImageContainer: {
    position: 'relative',
    height: 120,
  },
  propertyImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Property Card Elements
  typeIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  unitIndicator: {
    backgroundColor: '#10B981',
  },
  propertyIndicator: {
    backgroundColor: '#3B82F6',
  },
  typeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  priceTag: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  propertyInfo: {
    padding: 12,
  },
  propertyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
    lineHeight: 18,
  },
  propertyLocation: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  propertyType: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  unitNumber: {
    fontSize: 11,
    color: '#10B981',
    marginTop: 2,
    fontWeight: '600',
  },
  
  // Loading and Empty States
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },

  // Legacy styles for old interface
  propertiesList: {
    paddingHorizontal: 16,
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },

  // Load More styles
  loadMoreContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadMoreText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
