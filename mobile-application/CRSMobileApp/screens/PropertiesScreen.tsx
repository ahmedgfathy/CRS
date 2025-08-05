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
  StatusBar,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { appwriteStorage } from '../services/appwrite-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Improved function to determine listing type - PRIORITIZES DATABASE VALUES
const determineListing = (property: any): string => {
  // PRIORITY 1: Use explicit listing_type from database if it exists
  if (property.listing_type && property.listing_type.trim() !== '') {
    const dbListingType = property.listing_type.trim();
    console.log(`🏷️ Property ${property.id} has explicit listing_type: ${dbListingType}`);
    
    // Normalize the database value to standard format
    const normalizedType = dbListingType.toLowerCase();
    if (normalizedType.includes('sale') || normalizedType.includes('sell') || normalizedType === 'sale') {
      return 'Sale';
    }
    if (normalizedType.includes('rent') || normalizedType.includes('rental') || normalizedType === 'rent') {
      return 'Rent';
    }
    
    // Return capitalized version of the database value
    return dbListingType.charAt(0).toUpperCase() + dbListingType.slice(1).toLowerCase();
  }
  
  // PRIORITY 2: Check title for explicit keywords (most reliable indicator)
  const title = (property.title || '').toLowerCase();
  console.log(`🔍 Analyzing property ${property.id}: title="${title.substring(0, 50)}..."`);
  
  // Check for sale keywords first (more specific)
  if (title.includes('sale') || title.includes('sell') || title.includes('buy') ||
      title.includes('للبيع') || title.includes('بيع') || title.includes('for sale')) {
    console.log(`📝 Property ${property.id} determined as SALE from title keywords`);
    return 'Sale';
  }
  
  // Check for rent keywords
  if (title.includes('rent') || title.includes('rental') || title.includes('lease') || 
      title.includes('ايجار') || title.includes('للايجار') || title.includes('for rent')) {
    console.log(`📝 Property ${property.id} determined as RENT from title keywords`);
    return 'Rent';
  }
  
  // PRIORITY 3: Use price-based logic with more accurate thresholds
  const price = property.price || property.unit_price || 0;
  console.log(`💰 Property ${property.id} price analysis: ${price} EGP`);
  
  // High prices (above 2M EGP) are almost always for sale
  if (price > 2000000) {
    console.log(`💰 Property ${property.id} determined as SALE (high price: ${price.toLocaleString()} EGP)`);
    return 'Sale';
  }
  
  // Very low prices (below 20K EGP) are likely monthly rent
  if (price > 0 && price < 20000) {
    console.log(`💰 Property ${property.id} determined as RENT (low price: ${price.toLocaleString()} EGP)`);
    return 'Rent';
  }
  
  // Medium prices (20K-2M EGP) need more analysis
  if (price >= 20000 && price <= 2000000) {
    // For medium prices, consider property characteristics
    const bedrooms = property.bedrooms || property.bedroom_count || 0;
    const area = property.land_area || property.building_area || property.area || 0;
    
    // Larger properties with medium prices more likely to be for sale
    if (bedrooms >= 3 || area > 150) {
      console.log(`🏠 Property ${property.id} determined as SALE (medium price + large property: ${bedrooms} beds, ${area} area)`);
      return 'Sale';
    }
    
    // Smaller properties with medium prices could be either - use balanced approach
    // Properties with prices 100K-2M EGP are more likely for sale
    if (price >= 100000) {
      console.log(`💰 Property ${property.id} determined as SALE (medium-high price: ${price.toLocaleString()} EGP)`);
      return 'Sale';
    }
  }
  
  // PRIORITY 4: Default fallback for properties without clear indicators
  // Create consistent distribution based on property ID
  const propertyId = property.id || 0;
  const hash = Math.abs(propertyId * 23 + (price || 0) * 7) % 100;
  
  // 70% Sale, 30% Rent (reflecting Egyptian real estate market)
  const determined = hash < 70 ? 'Sale' : 'Rent';
  console.log(`🎲 Property ${property.id} determined as ${determined} by fallback logic (hash: ${hash})`);
  return determined;
};

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
  const [selectedListingType, setSelectedListingType] = useState<string>('all'); // New filter for Sale/Rent
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [dbOffset, setDbOffset] = useState(0); // Track actual database offset
  const ITEMS_PER_PAGE = 20;

  // Add state for showing filter modal
  const [showFilters, setShowFilters] = useState(false);
  const [areaSearchText, setAreaSearchText] = useState('');
  const [typeSearchText, setTypeSearchText] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  // Reload data when filters change
  useEffect(() => {
    if (areas.length > 0) { // Only reload if areas are loaded (not on initial mount)
      loadInitialData(1, false);
    }
  }, [selectedArea, selectedType, selectedCategory, selectedListingType, searchText]);

  const loadInitialData = async (page = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true);
        setCurrentPage(1);
        setDbOffset(0);
        setHasMoreData(true);
      }
      
      console.log(`🔍 Loading page ${page} of properties and units...`);
      
      let allValidItems: any[] = [];
      let currentOffset = append ? dbOffset : 0;
      let hasMoreProperties = true;
      
      // Keep loading until we have enough properties or no more data
      while (allValidItems.length < ITEMS_PER_PAGE && hasMoreProperties) { // REMOVED LOOP LIMIT - no artificial restrictions
        // Build query with filters applied
        let propertyQuery = supabase
          .from('properties')
          .select(`
            id,
            title,
            price,
            area_id,
            type_id,
            category_id,
            listing_type,
            created_at,
            areas(area_name),
            property_types(type_name)
          `);

        // Apply filters to the main query
        if (selectedArea) {
          propertyQuery = propertyQuery.eq('area_id', selectedArea);
        }
        
        if (selectedType) {
          propertyQuery = propertyQuery.eq('type_id', selectedType);
        }

        if (selectedCategory !== 'all') {
          // Map category names to IDs for filtering
          const categoryMap: { [key: string]: number } = {
            'residential': 5,
            'commercial': 6,
            'industrial': 7,
            'mixed': 8
          };
          if (categoryMap[selectedCategory]) {
            propertyQuery = propertyQuery.eq('category_id', categoryMap[selectedCategory]);
          }
        }

        if (searchText.trim()) {
          propertyQuery = propertyQuery.ilike('title', `%${searchText.trim()}%`);
        }

        const { data: propertiesData, error: propertiesError } = await propertyQuery
          .range(currentOffset, currentOffset + ITEMS_PER_PAGE - 1)
          .order('created_at', { ascending: false });

        if (!propertiesError && propertiesData && propertiesData.length > 0) {
          console.log(`✅ Loaded ${propertiesData.length} properties at offset ${currentOffset}`);
          console.log(`🎯 Active filters: Listing Type = ${selectedListingType}, Category = ${selectedCategory}, Area = ${selectedArea || 'All'}, Type = ${selectedType || 'All'}`);
          
          // Debug listing types in database with detailed analysis
          const listingTypeStats = propertiesData.reduce((acc: any, p: any) => {
            const originalType = p.listing_type || 'null';
            const determinedType = determineListing(p);
            const key = `${originalType} -> ${determinedType}`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});
          console.log('📊 Listing type transformation analysis:', listingTypeStats);
          
          // Sample a few properties for detailed inspection
          console.log('🔍 Sample properties analysis:');
          propertiesData.slice(0, 3).forEach(p => {
            const originalType = p.listing_type || 'NULL';
            const determinedType = determineListing(p);
            const priceFormatted = p.price ? `${p.price.toLocaleString()} EGP` : 'No price';
            console.log(`  Property ${p.id}:`);
            console.log(`    Title: "${(p.title || '').substring(0, 40)}..."`);
            console.log(`    Price: ${priceFormatted}`);
            console.log(`    DB Type: ${originalType} -> Determined: ${determinedType}`);
            if (originalType !== 'NULL' && originalType !== determinedType) {
              console.log(`    ⚠️ TYPE MISMATCH! Database says "${originalType}" but logic determined "${determinedType}"`);
            }
          });
          
          // Get images for ALL properties to implement proper filtering
          const propertiesWithImageCheck = await Promise.all(
            propertiesData.map(async (property) => {
              const coverImage = await appwriteStorage.getPropertyCoverImage(property.id);
              return {
                ...property,
                coverImage,
                type: 'property',
                hasImage: !!coverImage?.url,
                hasPrice: !!property.price && property.price > 0,
                // Improved fallback for listing_type with better logic
                listing_type: determineListing(property),
                category: property.category_id === 5 ? 'residential' : 
                         property.category_id === 6 ? 'commercial' :
                         property.category_id === 7 ? 'industrial' :
                         property.category_id === 8 ? 'mixed' : 'residential'
              };
            })
          );
          
          // Apply SIMPLE FILTERING: Only apply listing type filter if selected - NO PRICE CONDITIONS
          let validProperties = propertiesWithImageCheck;
          
          // Apply listing type filter if selected (ONLY filter applied)
          if (selectedListingType !== 'all') {
            validProperties = propertiesWithImageCheck.filter(property => {
              const propertyListingType = determineListing(property);
              return propertyListingType.toLowerCase() === selectedListingType.toLowerCase();
            });
            console.log(`🎯 Filtered by listing type "${selectedListingType}": ${validProperties.length} properties remain`);
          }
          
          // SORT BY YOUR RULES: Images first, then prices, then newest
          validProperties.sort((a, b) => {
            // Rule 1: Properties with images come first
            if (a.hasImage && !b.hasImage) return -1;
            if (!a.hasImage && b.hasImage) return 1;
            
            // Rule 2: Among same image status, properties with prices come first
            const aHasPrice = !!(a.price && a.price > 0);
            const bHasPrice = !!(b.price && b.price > 0);
            if (aHasPrice && !bHasPrice) return -1;
            if (!aHasPrice && bHasPrice) return 1;
            
            // Rule 3: Among same image and price status, newest first
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          
          console.log(`📸 Found ${validProperties.length} properties after filtering - showing ALL properties (only filtered by listing type if selected)`);
          console.log(`📋 Sorting rules applied: 1) Images first, 2) Prices second, 3) Newest first`);
          
          // Debug the first few properties to verify sorting
          console.log('🔍 First 4 properties after sorting:');
          validProperties.slice(0, 4).forEach((p, index) => {
            console.log(`  ${index + 1}. Property ${p.id}:`);
            console.log(`      Title: "${(p.title || '').substring(0, 30)}..."`);
            console.log(`      HasImage: ${p.hasImage ? 'YES' : 'NO'}`);
            console.log(`      Price: ${p.price ? `${p.price.toLocaleString()} EGP` : 'NO PRICE'}`);
            console.log(`      Type: ${p.listing_type}`);
          });
          
          allValidItems = [...allValidItems, ...validProperties];
          
          // If we got less than requested, we might be at the end
          if (propertiesData.length < ITEMS_PER_PAGE) {
            hasMoreProperties = false;
          } else {
            currentOffset += ITEMS_PER_PAGE;
          }
        } else {
          console.log('❌ No more properties available or error occurred');
          hasMoreProperties = false;
        }
      }
      
      // Apply YOUR RULES to final sorting - NOT just newest first
      const sortedProperties = allValidItems.sort((a, b) => {
        // Rule 1: Properties with images come first
        if (a.hasImage && !b.hasImage) return -1;
        if (!a.hasImage && b.hasImage) return 1;
        
        // Rule 2: Among same image status, properties with prices come first
        const aHasPrice = !!(a.price && a.price > 0);
        const bHasPrice = !!(b.price && b.price > 0);
        if (aHasPrice && !bHasPrice) return -1;
        if (!aHasPrice && bHasPrice) return 1;
        
        // Rule 3: Among same image and price status, newest first
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      // Debug final sorting results
      console.log('🏆 FINAL SORTING RESULTS - First 4 properties:');
      sortedProperties.slice(0, 4).forEach((p, index) => {
        console.log(`  ${index + 1}. Property ${p.id}:`);
        console.log(`      Title: "${(p.title || '').substring(0, 30)}..."`);
        console.log(`      HasImage: ${p.hasImage ? 'YES' : 'NO'}`);
        console.log(`      Price: ${p.price ? `${p.price.toLocaleString()} EGP` : 'NO PRICE'}`);
        console.log(`      Type: ${p.listing_type}`);
        console.log(`      Should be first: ${p.hasImage ? 'Images first!' : p.price ? 'Has price' : 'Should be last'}`);
      });
      
      // Update database offset for next load
      setDbOffset(currentOffset);
      
      // Set pagination flags
      setHasMoreData(hasMoreProperties && allValidItems.length >= ITEMS_PER_PAGE);
      
      if (append) {
        setProperties(prev => [...prev, ...sortedProperties]);
      } else {
        setProperties(sortedProperties);
      }
      
      // Load filter options only on first load
      if (page === 1) {
        // Debug: Check what listing types actually exist in database
        const { data: listingTypeCheck } = await supabase
          .from('properties')
          .select('listing_type')
          .not('listing_type', 'is', null)
          .limit(100);
        
        console.log('🔍 Actual listing_type values in database (first 100 non-null):');
        const typeDistribution = (listingTypeCheck || []).reduce((acc: any, p: any) => {
          acc[p.listing_type] = (acc[p.listing_type] || 0) + 1;
          return acc;
        }, {});
        console.log('📊 Database listing_type distribution:', typeDistribution);
        
        // Check for high-priced properties
        const { data: highPriced } = await supabase
          .from('properties')
          .select('id, title, price, listing_type')
          .gte('price', 2000000)
          .limit(10);
        
        console.log('💰 High-priced properties (>2M EGP):');
        (highPriced || []).forEach((p: any) => {
          console.log(`  ${p.id}: ${p.price?.toLocaleString()} EGP - "${(p.title || '').substring(0, 30)}..." - Type: ${p.listing_type || 'NULL'}`);
        });
        
        // Check for sale keywords in titles
        const { data: saleKeywords } = await supabase
          .from('properties')
          .select('id, title, price, listing_type')
          .or('title.ilike.%sale%,title.ilike.%sell%,title.ilike.%buy%,title.ilike.%للبيع%')
          .limit(10);
        
        console.log('🏠 Properties with sale keywords in title:');
        (saleKeywords || []).forEach((p: any) => {
          console.log(`  ${p.id}: "${(p.title || '').substring(0, 40)}..." - Type: ${p.listing_type || 'NULL'}`);
        });
        
        const { data: areasData } = await supabase
          .from('areas')
          .select('id, area_name')
          .eq('status', 'active')
          .order('area_name');
        
        console.log(`📍 Loaded ${areasData?.length || 0} areas:`, areasData?.slice(0, 5).map(a => a.area_name) || []);
        setAreas(areasData || []);
        
        const { data: typesData } = await supabase
          .from('property_types')
          .select('id, type_name')
          .order('type_name');
        
        console.log(`🏢 Loaded ${typesData?.length || 0} property types:`, typesData?.slice(0, 5).map(t => t.type_name) || []);
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
      console.log(`📄 Loading more data - page ${nextPage}`);
      await loadInitialData(nextPage, true);
    }
  };

  const searchProperties = async () => {
    try {
      setLoading(true);
      
      let allValidItems: any[] = [];
      let currentOffset = 0;
      let hasMoreProperties = true;
      const SEARCH_BATCH_SIZE = 50; // Load larger batches for search

      // Keep loading until we have at least 20 properties or no more data
      while (allValidItems.length < 20 && hasMoreProperties) { // REMOVED LOOP LIMIT - no artificial restrictions
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
          propertyQuery = propertyQuery.eq('type_id', selectedType);
        }

        if (selectedCategory !== 'all') {
          propertyQuery = propertyQuery.eq('category_id', selectedCategory);
        }
        
        if (searchText.trim()) {
          propertyQuery = propertyQuery.ilike('title', `%${searchText.trim()}%`);
        }

        const { data: propertiesData, error: propertiesError } = await propertyQuery
          .range(currentOffset, currentOffset + SEARCH_BATCH_SIZE - 1)
          .order('created_at', { ascending: false });

        if (!propertiesError && propertiesData && propertiesData.length > 0) {
          const propertiesWithImages = await Promise.all(
            propertiesData.map(async (property) => {
              const coverImage = await appwriteStorage.getPropertyCoverImage(property.id);
              return {
                ...property,
                coverImage,
                type: 'property',
                hasImage: !!coverImage?.url,
                hasPrice: !!property.price && property.price > 0,
                // Improved fallback for listing_type with better logic
                listing_type: determineListing(property),
                category: property.category_id || 'residential'
              };
            })
          );
          
          // Apply SIMPLE FILTERING: Only apply listing type filter if selected - NO PRICE CONDITIONS
          let validProperties = propertiesWithImages;
          
          // Apply listing type filter if selected (ONLY filter applied)
          if (selectedListingType !== 'all') {
            validProperties = propertiesWithImages.filter(property => {
              const propertyListingType = determineListing(property);
              return propertyListingType.toLowerCase() === selectedListingType.toLowerCase();
            });
          }
          
          // SORT BY YOUR RULES: Images first, then prices, then newest
          validProperties.sort((a, b) => {
            // Rule 1: Properties with images come first
            if (a.hasImage && !b.hasImage) return -1;
            if (!a.hasImage && b.hasImage) return 1;
            
            // Rule 2: Among same image status, properties with prices come first
            const aHasPrice = !!(a.price && a.price > 0);
            const bHasPrice = !!(b.price && b.price > 0);
            if (aHasPrice && !bHasPrice) return -1;
            if (!aHasPrice && bHasPrice) return 1;
            
            // Rule 3: Among same image and price status, newest first
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          
          allValidItems = [...allValidItems, ...validProperties];
          
          // Check if we got less than requested
          if (propertiesData.length < SEARCH_BATCH_SIZE) {
            hasMoreProperties = false;
          } else {
            currentOffset += SEARCH_BATCH_SIZE;
          }
        } else {
          hasMoreProperties = false;
        }
      }

      // Search units if they exist (keep existing logic but apply same filtering)
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
          unitQuery = unitQuery.eq('type_id', selectedType);
        }

        if (selectedCategory !== 'all') {
          unitQuery = unitQuery.eq('category_id', selectedCategory);
        }
        
        if (searchText.trim()) {
          unitQuery = unitQuery.or(`unit_title.ilike.%${searchText.trim()}%,title.ilike.%${searchText.trim()}%`);
        }

        const { data: unitsData, error: unitsError } = await unitQuery
          .limit(50); // Increased limit for units

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
            hasImage: !!unit.unit_images[0]?.image_url,
            hasPrice: !!(unit.unit_price || unit.price) && (unit.unit_price || unit.price) > 0,
            // Improved fallback for listing_type with better logic
            listing_type: determineListing(unit),
            type: 'unit',
            category: unit.category || 'residential'
          }));
          
          // Apply SIMPLE FILTERING: Only apply listing type filter if selected - NO PRICE CONDITIONS
          let validUnits = unitsFormatted;
          
          // Apply listing type filter if selected (ONLY filter applied)
          if (selectedListingType !== 'all') {
            validUnits = unitsFormatted.filter(unit => {
              const unitListingType = determineListing(unit);
              return unitListingType.toLowerCase() === selectedListingType.toLowerCase();
            });
          }
          
          // SORT BY YOUR RULES: Images first, then prices, then newest
          validUnits.sort((a, b) => {
            // Rule 1: Units with images come first
            if (a.hasImage && !b.hasImage) return -1;
            if (!a.hasImage && b.hasImage) return 1;
            
            // Rule 2: Among same image status, units with prices come first
            const aHasPrice = !!(a.unit_price || a.price) && (a.unit_price || a.price) > 0;
            const bHasPrice = !!(b.unit_price || b.price) && (b.unit_price || b.price) > 0;
            if (aHasPrice && !bHasPrice) return -1;
            if (!aHasPrice && bHasPrice) return 1;
            
            // Rule 3: Among same image and price status, newest first
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          
          allValidItems = [...allValidItems, ...validUnits];
        }
      } catch (unitsError) {
        console.log('ℹ️ No units table or error searching units');
      }

      // Apply YOUR RULES to final sorting - NOT just newest first
      const finalSortedItems = allValidItems.sort((a, b) => {
        // Rule 1: Items with images come first
        if (a.hasImage && !b.hasImage) return -1;
        if (!a.hasImage && b.hasImage) return 1;
        
        // Rule 2: Among same image status, items with prices come first
        const aHasPrice = !!(a.price && a.price > 0) || !!(a.unit_price && a.unit_price > 0);
        const bHasPrice = !!(b.price && b.price > 0) || !!(b.unit_price && b.unit_price > 0);
        if (aHasPrice && !bHasPrice) return -1;
        if (!aHasPrice && bHasPrice) return 1;
        
        // Rule 3: Among same image and price status, newest first
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      console.log(`🔍 Search completed: Found ${finalSortedItems.length} properties - showing ALL properties with your sorting rules`);
      setProperties(finalSortedItems);
      
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
    setSelectedListingType('all'); // Clear the new filter
  };

  const openFiltersModal = () => {
    setAreaSearchText('');
    setTypeSearchText('');
    setShowFilters(true);
  };

  const closeFiltersModal = () => {
    setAreaSearchText('');
    setTypeSearchText('');
    setShowFilters(false);
  };

  // Optimized Property card component with SMART IMAGE HANDLING
  const PropertyCard = React.memo(({ property }: { property: any }) => {
    return (
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
          
          {/* Listing Type - Rent or Sale (top-left corner) */}
          {property.listing_type && (
            <View style={[
              styles.listingTypeTag,
              property.listing_type === 'Sale' ? styles.listingTypeSaleTag : styles.listingTypeRentTag
            ]}>
              <Text style={[
                styles.listingTypeTagText,
                property.listing_type === 'Sale' ? styles.listingTypeSaleText : styles.listingTypeRentText
              ]}>
                {property.listing_type === 'Sale' ? 'SALE' : 'RENT'}
              </Text>
            </View>
          )}

        {/* Price tag */}
        {property.price && (
          <View style={styles.priceTag}>
            <Text style={styles.priceText}>
              EGP {property.price.toLocaleString()}
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
    );
  });

  // Render header components as FlatList header
  const renderHeader = () => (
    <View>
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search properties and units..."
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={openFiltersModal}
        >
          <Ionicons name="filter" size={18} color="white" />
          {(selectedArea || selectedType || selectedCategory !== 'all' || selectedListingType !== 'all') && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {[selectedArea, selectedType, selectedCategory !== 'all' ? '1' : null, selectedListingType !== 'all' ? '1' : null].filter(Boolean).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filters Display */}
      {(selectedArea || selectedType || selectedCategory !== 'all' || selectedListingType !== 'all') && (
        <View style={styles.activeFiltersSection}>
          <Text style={styles.activeFiltersTitle}>Active Filters:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.activeFiltersRow}>
              {selectedCategory !== 'all' && (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterText}>
                    {PROPERTY_CATEGORIES.find(c => c.id === selectedCategory)?.name}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedCategory('all')}>
                    <Ionicons name="close" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              )}
              {selectedListingType !== 'all' && (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterText}>
                    {selectedListingType === 'sale' ? 'For Sale' : 'For Rent'}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedListingType('all')}>
                    <Ionicons name="close" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              )}
              {selectedType && (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterText}>
                    {propertyTypes.find(t => t.id === selectedType)?.type_name}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedType(null)}>
                    <Ionicons name="close" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              )}
              {selectedArea && (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterText}>
                    {areas.find(a => a.id === selectedArea)?.area_name}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedArea(null)}>
                    <Ionicons name="close" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity style={styles.clearAllButton} onPress={clearFilters}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      
      {/* Blue Header */}
      <View style={styles.blueHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Browse Properties</Text>
          <View style={styles.headerPlaceholder} />
        </View>
      </View>
      
      <FlatList
        data={properties}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        renderItem={({ item }) => <PropertyCard property={item} />}
        numColumns={2}
        columnWrapperStyle={properties.length > 1 ? styles.propertyRow : undefined}
        contentContainerStyle={styles.propertiesGrid}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMoreData}
        onEndReachedThreshold={0.5}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        initialNumToRender={10}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Loading properties...</Text>
            </View>
          ) : (
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
          )
        }
        ListFooterComponent={
          hasMoreData && !loading ? (
            <View style={styles.loadMoreContainer}>
              <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreData}>
                <Text style={styles.loadMoreText}>Load More Properties</Text>
              </TouchableOpacity>
            </View>
          ) : loading && properties.length > 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loadingText}>Loading more properties...</Text>
            </View>
          ) : null
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeFiltersModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeFiltersModal}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filter Properties</Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Listing Type Filter - Sale or Rent */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Listing Type</Text>
              <View style={styles.optionsGrid}>
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    selectedListingType === 'all' && styles.optionItemActive
                  ]}
                  onPress={() => setSelectedListingType('all')}
                >
                  <MaterialIcons 
                    name="home" 
                    size={20} 
                    color={selectedListingType === 'all' ? 'white' : '#2563EB'} 
                  />
                  <Text style={[
                    styles.optionText,
                    selectedListingType === 'all' && styles.optionTextActive
                  ]}>
                    All Properties
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    selectedListingType === 'sale' && styles.optionItemActive
                  ]}
                  onPress={() => setSelectedListingType('sale')}
                >
                  <MaterialIcons 
                    name="sell" 
                    size={20} 
                    color={selectedListingType === 'sale' ? 'white' : '#F59E0B'} 
                  />
                  <Text style={[
                    styles.optionText,
                    selectedListingType === 'sale' && styles.optionTextActive
                  ]}>
                    For Sale
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    selectedListingType === 'rent' && styles.optionItemActive
                  ]}
                  onPress={() => setSelectedListingType('rent')}
                >
                  <MaterialIcons 
                    name="home-work" 
                    size={20} 
                    color={selectedListingType === 'rent' ? 'white' : '#3B82F6'} 
                  />
                  <Text style={[
                    styles.optionText,
                    selectedListingType === 'rent' && styles.optionTextActive
                  ]}>
                    For Rent
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Category Filter */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Category</Text>
              <View style={styles.optionsGrid}>
                {PROPERTY_CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.optionItem,
                      selectedCategory === category.id && styles.optionItemActive
                    ]}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <MaterialIcons 
                      name={category.icon as any} 
                      size={20} 
                      color={selectedCategory === category.id ? 'white' : '#2563EB'} 
                    />
                    <Text style={[
                      styles.optionText,
                      selectedCategory === category.id && styles.optionTextActive
                    ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Property Types */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Property Type</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search property types..."
                value={typeSearchText}
                onChangeText={setTypeSearchText}
              />
              <View style={styles.optionsGrid}>
                {propertyTypes
                  .filter(type => 
                    type.type_name.toLowerCase().includes(typeSearchText.toLowerCase())
                  )
                  .slice(0, 20) // Limit to first 20 matches
                  .map((type) => (
                  <TouchableOpacity
                    key={`type-${type.id}`}
                    style={[
                      styles.optionItem,
                      selectedType === type.id && styles.optionItemActive
                    ]}
                    onPress={() => setSelectedType(selectedType === type.id ? null : type.id)}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedType === type.id && styles.optionTextActive
                    ]}>
                      {type.type_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {typeSearchText && propertyTypes.filter(type => 
                type.type_name.toLowerCase().includes(typeSearchText.toLowerCase())
              ).length > 20 && (
                <Text style={styles.moreResultsText}>
                  +{propertyTypes.filter(type => 
                    type.type_name.toLowerCase().includes(typeSearchText.toLowerCase())
                  ).length - 20} more results...
                </Text>
              )}
            </View>

            {/* Areas */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Areas ({areas.length} available)</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Type area name (e.g. 'new', 'cairo')..."
                value={areaSearchText}
                onChangeText={setAreaSearchText}
              />
              <View style={styles.optionsGrid}>
                {areas
                  .filter(area => 
                    areaSearchText.length >= 2 ? 
                    area.area_name.toLowerCase().includes(areaSearchText.toLowerCase()) :
                    areaSearchText.length === 0
                  )
                  .slice(0, 15) // Show max 15 areas at once
                  .map((area) => (
                  <TouchableOpacity
                    key={`area-${area.id}`}
                    style={[
                      styles.optionItem,
                      selectedArea === area.id && styles.optionItemActive
                    ]}
                    onPress={() => setSelectedArea(selectedArea === area.id ? null : area.id)}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedArea === area.id && styles.optionTextActive
                    ]}>
                      {area.area_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {areaSearchText.length >= 2 && areas.filter(area => 
                area.area_name.toLowerCase().includes(areaSearchText.toLowerCase())
              ).length > 15 && (
                <Text style={styles.moreResultsText}>
                  +{areas.filter(area => 
                    area.area_name.toLowerCase().includes(areaSearchText.toLowerCase())
                  ).length - 15} more areas found. Keep typing to narrow down...
                </Text>
              )}
              {areaSearchText.length === 1 && (
                <Text style={styles.hintText}>
                  💡 Type at least 2 characters to search areas
                </Text>
              )}
              {areaSearchText.length === 0 && (
                <Text style={styles.hintText}>
                  🔍 Start typing to search through {areas.length} areas
                </Text>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.applyButton} 
              onPress={closeFiltersModal}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Blue Header (matching HomeScreen)
  blueHeader: {
    backgroundColor: '#2563EB',
    paddingBottom: 15,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ? StatusBar.currentHeight + 5 : 25 : 5,
    ...Platform.select({
      android: {
        elevation: 8,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 5,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  headerPlaceholder: {
    width: 40, // Same width as back button to center the title
  },
  scrollView: {
    flex: 1,
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
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
    backgroundColor: '#F8FAFC',
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
  
  // Filter Sections
  filterSection: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  
  // Filters Section (legacy - keeping for compatibility)
  filtersSection: {
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterPillText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: 'white',
    fontWeight: '600',
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

  // New Filter System Styles
  filterButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Active Filters
  activeFiltersSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  activeFiltersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeFilterChip: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeFilterText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  clearAllButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  clearAllText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionItem: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  optionItemActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  optionTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  applyButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Search within filters
  moreResultsText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  hintText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 16,
    paddingHorizontal: 16,
  },

  // Listing Type Styles
  listingTypeContainer: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  listingTypeText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listingTypeSale: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    color: '#D97706',
  },
  listingTypeRent: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
    color: '#2563EB',
  },

  // New Listing Type Tags (for top-left corner of property cards)
  listingTypeTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  listingTypeSaleTag: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  listingTypeRentTag: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  listingTypeTagText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  listingTypeSaleText: {
    color: '#D97706',
  },
  listingTypeRentText: {
    color: '#2563EB',
  },

  // Skeleton Loading Styles
  skeletonImageContainer: {
    position: 'relative',
    height: 120,
    backgroundColor: '#F1F5F9',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  skeletonImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  skeletonPriceTag: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#E2E8F0',
    width: 60,
    height: 20,
    borderRadius: 12,
  },
  skeletonTitle: {
    backgroundColor: '#E2E8F0',
    height: 14,
    borderRadius: 4,
    marginBottom: 6,
    width: '85%',
  },
  skeletonLocation: {
    backgroundColor: '#E2E8F0',
    height: 12,
    borderRadius: 4,
    marginBottom: 4,
    width: '70%',
  },
  skeletonType: {
    backgroundColor: '#E2E8F0',
    height: 12,
    borderRadius: 4,
    width: '60%',
  },

  // Filter Loading Overlay Styles
  filterLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterLoadingContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      android: {
        elevation: 8,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
    }),
  },
  filterLoadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
});
