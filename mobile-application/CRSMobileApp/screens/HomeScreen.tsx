import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  RefreshControl,
  Dimensions,
  Platform,
  FlatList,
  StatusBar,
  ImageBackground,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { appwriteStorage } from '../services/appwrite-storage';
import ContabooLogo from '../components/ContabooLogo';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Real Cairo compound images - high quality, professional shots
const CAIRO_COMPOUNDS = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&h=600&fit=crop&q=80',
    title: 'New Administrative Capital',
    subtitle: 'Luxury Compounds in NAC'
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1200&h=600&fit=crop&q=80',
    title: 'Sheikh Zayed Compounds',
    subtitle: 'Premium Gated Communities'
  },
  {
    id: 3,
    url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&h=600&fit=crop&q=80',
    title: 'New Cairo Residences',
    subtitle: 'Modern Living Spaces'
  },
  {
    id: 4,
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=600&fit=crop&q=80',
    title: '6th October Villas',
    subtitle: 'Exclusive Villa Compounds'
  },
  {
    id: 5,
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=600&fit=crop&q=80',
    title: 'Madinaty Compounds',
    subtitle: 'Integrated Communities'
  }
];

export default function HomeScreen({ navigation }: any) {
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalAreas: 0,
    totalAgents: 0,
  });
  const [featuredProperties, setFeaturedProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('English');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const sidebarAnimation = useRef(new Animated.Value(-300)).current;
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      await Promise.all([
        loadStats(),
        loadFeaturedProperties(),
      ]);
      
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get total properties count
      const { count: propertyCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true });

      // Get total areas count  
      const { count: areaCount } = await supabase
        .from('areas')
        .select('*', { count: 'exact', head: true });

      // Get total agents count from contacts table
      const { count: agentsCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });

      // Try to get units count if units table exists
      let unitsCount = 0;
      try {
        const { count: unitCount } = await supabase
          .from('units')
          .select('*', { count: 'exact', head: true });
        unitsCount = unitCount || 0;
      } catch (unitsError) {
        console.log('ℹ️ No units table found for stats');
      }

      // Get count of properties + units that actually have images (featured ones)
      const { count: propertyImagesCount } = await supabase
        .from('property_images')
        .select('*', { count: 'exact', head: true })
        .eq('is_primary', true);

      let unitImagesCount = 0;
      try {
        const { count: unitImageCount } = await supabase
          .from('unit_images')
          .select('*', { count: 'exact', head: true })
          .eq('is_primary', true);
        unitImagesCount = unitImageCount || 0;
      } catch (unitImagesError) {
        console.log('ℹ️ No unit_images table found for stats');
      }

      const totalWithImages = (propertyImagesCount || 0) + unitImagesCount;
      const totalItems = (propertyCount || 0) + unitsCount;

      setStats({
        totalProperties: totalItems,
        totalAreas: areaCount || 0,
        totalAgents: agentsCount || 0,
      });
      
      console.log(`📊 Stats loaded: ${totalItems} total items (${propertyCount} properties${unitsCount > 0 ? ` + ${unitsCount} units` : ''}), ${totalWithImages} with images`);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadFeaturedProperties = async () => {
    try {
      console.log('🔍 Searching for featured properties and units with images...');
      
      // First, try to get units table if it exists
      let unitsWithImages = [];
      try {
        const { data: unitsData, error: unitsError } = await supabase
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
          .eq('unit_images.is_primary', true)
          .limit(5);

        if (!unitsError && unitsData && unitsData.length > 0) {
          console.log(`🏠 Found ${unitsData.length} units with images`);
          unitsWithImages = unitsData.map(unit => ({
            ...unit,
            coverImage: {
              url: unit.unit_images[0]?.image_url,
              fileId: unit.id
            },
            // Map unit fields to property-like structure for consistency
            title: unit.unit_title || unit.title || `Unit ${unit.unit_number || unit.id}`,
            price: unit.unit_price || unit.price,
            bedrooms: unit.bedrooms || unit.bedroom_count,
            property_types: unit.property_types || { type_name: unit.unit_type },
            type: 'unit' // Mark as unit for distinction
          }));
        }
      } catch (unitsErr) {
        console.log('ℹ️ No units table found, continuing with properties only');
      }

      // Get properties with appwrite_images directly from properties table
      const { data: propertiesWithImages, error: imagesError } = await supabase
        .from('properties')
        .select(`
          *,
          areas(area_name),
          property_types(type_name)
        `)
        .not('appwrite_images', 'is', null)
        .not('main_image_url', 'is', null)
        .limit(8);

      let propertiesFormatted: any[] = [];
      if (!imagesError && propertiesWithImages) {
        propertiesFormatted = await Promise.all(
          propertiesWithImages.map(async (property) => {
            // Get the cover image from appwrite_images column
            const coverImage = await appwriteStorage.getPropertyCoverImage(property.id);
            return {
              ...property,
              coverImage,
              type: 'property' // Mark as property for distinction
            };
          })
        );
        // Filter out properties without valid cover images
        propertiesFormatted = propertiesFormatted.filter(p => p.coverImage?.url);
      }

      // Combine units and properties, prioritize units if available
      const allFeaturedItems = [...unitsWithImages, ...propertiesFormatted];
      
      // If we have no items with images, try fallback
      if (allFeaturedItems.length === 0) {
        console.log('🔄 No items with images found, trying fallback...');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('properties')
          .select(`
            *,
            areas(area_name),
            property_types(type_name)
          `)
          .limit(5);
        
        if (!fallbackError && fallbackData) {
          const fallbackWithImages = await Promise.all(
            fallbackData.map(async (property) => {
              const coverImage = await appwriteStorage.getPropertyCoverImage(property.id);
              return {
                ...property,
                coverImage,
                type: 'property'
              };
            })
          );
          setFeaturedProperties(fallbackWithImages.filter(p => p.coverImage?.url));
          return;
        }
      }
      
      // Filter to only show items with valid images and limit to 5
      const validFeaturedItems = allFeaturedItems
        .filter(item => item.coverImage?.url)
        .slice(0, 5);
      
      console.log(`🖼️ Loaded ${validFeaturedItems.length} featured items with images (${unitsWithImages.length} units, ${propertiesFormatted.length} properties)`);
      setFeaturedProperties(validFeaturedItems);
      
    } catch (error) {
      console.error('Error loading featured properties:', error);
      // Ultimate fallback - try to get any properties and check for images
      try {
        const { data: anyProperties, error: anyError } = await supabase
          .from('properties')
          .select(`
            *,
            areas(area_name),
            property_types(type_name)
          `)
          .limit(10);
        
        if (!anyError && anyProperties) {
          const propertiesWithValidImages = [];
          for (const property of anyProperties) {
            const coverImage = await appwriteStorage.getPropertyCoverImage(property.id);
            if (coverImage?.url) {
              propertiesWithValidImages.push({
                ...property,
                coverImage,
                type: 'property'
              });
              if (propertiesWithValidImages.length >= 5) break;
            }
          }
          setFeaturedProperties(propertiesWithValidImages);
        }
      } catch (finalError) {
        console.error('Final fallback failed:', finalError);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const openSideMenu = () => {
    setIsSidebarVisible(true);
    Animated.timing(sidebarAnimation, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeSideMenu = () => {
    Animated.timing(sidebarAnimation, {
      toValue: -300,
      duration: 250,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsSidebarVisible(false);
    });
  };

  const handleLogin = () => {
    closeSideMenu();
    setTimeout(() => {
      Alert.alert('Login', 'Login feature coming soon!', [
        { text: 'OK', style: 'default' }
      ]);
    }, 300);
  };

  const handleHelp = () => {
    closeSideMenu();
    setTimeout(() => {
      Alert.alert(
        'Help & Support', 
        'Need assistance? Contact our support team:\n\n📧 Email: support@contaboo.com\n📞 Phone: +20 123 456 7890\n🌐 Website: www.contaboo.com',
        [{ text: 'OK', style: 'default' }]
      );
    }, 300);
  };

  const handleLanguageSwitch = () => {
    closeSideMenu();
    setTimeout(() => {
      const newLanguage = currentLanguage === 'English' ? 'العربية' : 'English';
      setCurrentLanguage(newLanguage);
      Alert.alert(
        'Language Changed',
        `Language switched to ${newLanguage}\n\nNote: Full language support will be implemented in the next update.`,
        [{ text: 'OK', style: 'default' }]
      );
    }, 300);
  };

  const handleThemeSwitch = () => {
    closeSideMenu();
    setTimeout(() => {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      Alert.alert(
        'Theme Changed',
        `Switched to ${newMode ? 'Dark' : 'Light'} mode\n\nNote: Full theme support will be implemented in the next update.`,
        [{ text: 'OK', style: 'default' }]
      );
    }, 300);
  };

  // Auto-scroll slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        const nextSlide = (prev + 1) % CAIRO_COMPOUNDS.length;
        flatListRef.current?.scrollToIndex({ index: nextSlide, animated: true });
        return nextSlide;
      });
    }, 4000);
    
    return () => clearInterval(interval);
  }, []);

  const renderSlideItem = ({ item }: { item: any }) => (
    <View style={styles.slideContainer}>
      <ImageBackground source={{ uri: item.url }} style={styles.slideImage} resizeMode="cover">
        <View style={styles.slideOverlay}>
          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
        </View>
      </ImageBackground>
    </View>
  );

  const PropertyCard = ({ property }: { property: any }) => (
    <TouchableOpacity style={styles.propertyCard}>
      <View style={styles.propertyImageContainer}>
        {property.coverImage?.url ? (
          <Image 
            source={{ uri: property.coverImage.url }} 
            style={styles.propertyImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="home" size={40} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>
            {property.currency || 'EGP'} {property.price?.toLocaleString() || 'N/A'}
          </Text>
        </View>
        {/* Unit/Property indicator */}
        {property.type && (
          <View style={[styles.typeIndicator, property.type === 'unit' ? styles.unitIndicator : styles.propertyIndicator]}>
            <Text style={styles.typeText}>
              {property.type === 'unit' ? 'UNIT' : 'PROPERTY'}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyTitle} numberOfLines={2}>
          {property.title}
        </Text>
        <Text style={styles.propertyLocation}>
          📍 {property.areas?.area_name || 'Location not specified'}
        </Text>
        <Text style={styles.propertyType}>
          🏠 {property.property_types?.type_name || property.unit_type || 'Type not specified'} • {property.bedrooms || 0} beds
        </Text>
        {property.unit_number && (
          <Text style={styles.unitNumber}>
            🔢 Unit #{property.unit_number}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      {/* Modern Sidebar Modal */}
      <Modal
        visible={isSidebarVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeSideMenu}
      >
        <View style={styles.sidebarOverlay}>
          <TouchableOpacity 
            style={styles.sidebarBackground} 
            activeOpacity={1}
            onPress={closeSideMenu}
          />
          <Animated.View 
            style={[
              styles.sidebarContainer,
              { transform: [{ translateX: sidebarAnimation }] }
            ]}
          >
            {/* Sidebar Header */}
            <View style={styles.sidebarHeader}>
              <ContabooLogo color="#1F2937" size="medium" />
              <TouchableOpacity onPress={closeSideMenu} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Sidebar Content */}
            <View style={styles.sidebarContent}>
              {/* Login Button */}
              <TouchableOpacity style={styles.sidebarItem} onPress={handleLogin}>
                <View style={styles.sidebarItemIcon}>
                  <Ionicons name="log-in-outline" size={24} color="#2563EB" />
                </View>
                <Text style={styles.sidebarItemText}>Login</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Help Button */}
              <TouchableOpacity style={styles.helpSidebarItem} onPress={handleHelp}>
                <View style={styles.sidebarItemIcon}>
                  <Ionicons name="help-circle-outline" size={24} color="#10B981" />
                </View>
                <Text style={styles.sidebarItemText}>Help & Support</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Language Switcher */}
              <TouchableOpacity style={styles.languageSidebarItem} onPress={handleLanguageSwitch}>
                <View style={styles.languageIconContainer}>
                  <Ionicons name="globe-outline" size={20} color="#3B82F6" />
                </View>
                <View style={styles.languageContent}>
                  <Text style={styles.sidebarItemText}>Language</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Theme/Dark Mode Switcher */}
              <TouchableOpacity style={styles.themeSidebarItem} onPress={handleThemeSwitch}>
                <View style={styles.themeIconContainer}>
                  <Ionicons 
                    name={isDarkMode ? "moon" : "sunny"} 
                    size={20} 
                    color={isDarkMode ? "#6366F1" : "#F59E0B"} 
                  />
                </View>
                <View style={styles.themeContent}>
                  <Text style={styles.sidebarItemText}>Theme</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Sidebar Footer */}
            <View style={styles.sidebarFooter}>
              <View style={styles.copyrightContainer}>
                <Text style={styles.copyrightText}>© 2025 Contaboo</Text>
                <Text style={styles.copyrightSubtext}>Ahmed Fathy</Text>
              </View>
              <View style={styles.footerDivider} />
              <Text style={styles.footerNote}>Real Estate Management System</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <ContabooLogo color="white" size="medium" />
          </View>
          <TouchableOpacity 
            style={styles.hamburgerButton}
            onPress={openSideMenu}
          >
            <Ionicons name="menu" size={28} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Hero Section with Cairo Compounds Slideshow */}
        <View style={styles.heroSection}>
          <View style={styles.slideshowContainer}>
            <FlatList
              ref={flatListRef}
              data={CAIRO_COMPOUNDS}
              renderItem={renderSlideItem}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id.toString()}
              style={styles.slideshow}
              onMomentumScrollEnd={(event) => {
                const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setCurrentSlide(slideIndex);
              }}
              getItemLayout={(data, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
            />
            
            {/* Slide Indicators */}
            <View style={styles.slideIndicators}>
              {CAIRO_COMPOUNDS.map((_, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.slideIndicator,
                    index === currentSlide && styles.activeSlideIndicator
                  ]}
                  onPress={() => {
                    setCurrentSlide(index);
                    flatListRef.current?.scrollToIndex({ index, animated: true });
                  }}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Live Statistics */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Live Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <FontAwesome5 name="home" size={24} color="#2563EB" />
              </View>
              <Text style={styles.statNumber}>{stats.totalProperties.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Properties</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="location" size={24} color="#059669" />
              </View>
              <Text style={styles.statNumber}>{stats.totalAreas}</Text>
              <Text style={styles.statLabel}>Areas</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="people" size={24} color="#DC2626" />
              </View>
              <Text style={styles.statNumber}>{stats.totalAgents}</Text>
              <Text style={styles.statLabel}>Agents</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('Properties')}
            >
              <View style={styles.actionIcon}>
                <FontAwesome5 name="building" size={24} color="#2563EB" />
              </View>
              <Text style={styles.actionTitle}>Properties</Text>
              <Text style={styles.actionSubtitle}>Browse All</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => Alert.alert('Search', 'Advanced search coming soon!')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="search" size={24} color="#059669" />
              </View>
              <Text style={styles.actionTitle}>Search</Text>
              <Text style={styles.actionSubtitle}>Find Properties</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => Alert.alert('Favorites', 'Saved properties coming soon!')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="heart" size={24} color="#DC2626" />
              </View>
              <Text style={styles.actionTitle}>Favorites</Text>
              <Text style={styles.actionSubtitle}>Saved Items</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => Alert.alert('Add Property', 'Add new property coming soon!')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="add-circle" size={24} color="#7C3AED" />
              </View>
              <Text style={styles.actionTitle}>Add Property</Text>
              <Text style={styles.actionSubtitle}>List Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Featured Properties */}
        {featuredProperties.length > 0 && (
          <View style={styles.featuredSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Properties</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Properties')}>
                <Text style={styles.viewAllText}>View All →</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredScroll}
            >
              {featuredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hamburgerButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  scrollView: {
    flex: 1,
  },
  
  // Hero Section with Slideshow
  heroSection: {
    backgroundColor: '#1E293B',
    position: 'relative',
  },
  slideshowContainer: {
    position: 'relative',
    height: SCREEN_HEIGHT * 0.35,
  },
  slideshow: {
    height: '100%',
  },
  slideContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
    position: 'relative',
  },
  slideImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  slideOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 24,
  },
  slideTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  slideSubtitle: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '500',
  },
  slideIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  slideIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  activeSlideIndicator: {
    backgroundColor: 'white',
    width: 24,
  },

  // Quick Actions
  quickActions: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    width: (SCREEN_WIDTH - 56) / 2,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
    }),
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
  },

  // Statistics
  statsSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#F8FAFC',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
    }),
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },

  // Featured Properties
  featuredSection: {
    paddingVertical: 24,
    backgroundColor: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  viewAllText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  featuredScroll: {
    paddingLeft: 20,
  },
  propertyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 16,
    width: SCREEN_WIDTH * 0.75,
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
    height: 160,
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
    fontSize: 12,
    fontWeight: 'bold',
  },
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
  propertyInfo: {
    padding: 16,
  },
  propertyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  propertyLocation: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  propertyType: {
    fontSize: 13,
    color: '#64748B',
  },
  unitNumber: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 2,
    fontWeight: '600',
  },
  seeAllText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  propertiesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 5,
  },
  noUnitsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noUnitsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },
  noUnitsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },

  // Modern Sidebar Styles
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
  },
  sidebarBackground: {
    flex: 1,
  },
  sidebarContainer: {
    width: 280,
    backgroundColor: '#FFFFFF',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 30 : 20,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarContent: {
    flex: 1,
    paddingTop: 20,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  helpSidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  sidebarItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sidebarItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  languageContent: {
    flex: 1,
  },
  languageSidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  languageIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  // Theme Switcher Styles
  themeSidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  themeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  themeContent: {
    flex: 1,
  },
  sidebarFooter: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
  },
  copyrightContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  copyrightText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  copyrightSubtext: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },
  footerDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  footerNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
