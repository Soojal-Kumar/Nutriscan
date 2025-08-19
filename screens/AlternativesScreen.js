// client/components/AlternativesScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const API_BASE_URL = 'https://zyr3x-nutriscan-backend.hf.space'; // Make sure this is your correct backend URL

const ScoreBadge = ({ label, value, icon, colors, isAIPredicted = false }) => {
  if (!value || value === 'N/A' || String(value).trim() === '') return null; // Handle empty string/null values
  const stringValue = String(value);
  const color = colors[stringValue.toLowerCase()] || colors.default;
  return (
    <View style={styles.badge}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.badgeLabel}>{label}</Text>
      <Text style={[styles.badgeValue, { color }]}>{stringValue.toUpperCase()}</Text>
      {isAIPredicted && <Text style={styles.aiPredictedLabel}>AI</Text>}
    </View>
  );
};

const AlternativeItem = ({ item, userAllergens = [], onPress }) => {
  const [detectedAllergens, setDetectedAllergens] = useState([]);
  const [isLoadingAllergens, setIsLoadingAllergens] = useState(false);
  
  // Image handling states - same as ProductDetailCard
  const [liveImageUrl, setLiveImageUrl] = useState(null);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Initialize image URL - same logic as ProductDetailCard
  useEffect(() => {
    if (item.image_urls && item.image_urls.length > 0) {
      setLiveImageUrl(item.image_urls[0]);
      setImageError(false);
    } else {
      setLiveImageUrl(null);
      setImageError(true);
    }
  }, [item.image_urls]);

  // Image error handling - same as ProductDetailCard
  const handleImageError = () => {
    const currentIndex = item.image_urls ? item.image_urls.indexOf(liveImageUrl) : -1;
    if (currentIndex < item.image_urls.length - 1) {
      setLiveImageUrl(item.image_urls[currentIndex + 1]);
      setImageError(false);
    } else {
      setImageError(true);
    }
  };

  useEffect(() => {
    // If the item already has 'allergens_en' (from backend processing), use them directly
    if (item.allergens_en && item.allergens_en.trim() !== '') {
      const parsedAllergens = item.allergens_en.split(',').map(a => a.trim()).filter(Boolean);
      setDetectedAllergens(parsedAllergens);
      return; // No need to fetch
    }

    // Otherwise, try to extract ingredients and detect allergens
    let ingredientsForApi = item.ingredients_text;
    if (!ingredientsForApi && item.ingredients_tags) {
      // If ingredients_tags is an array, join it. If it's a string, use it.
      const tagsSource = Array.isArray(item.ingredients_tags)
        ? item.ingredients_tags.join(',')
        : String(item.ingredients_tags);
      
      ingredientsForApi = tagsSource
        .replace(/en:|fr:/g, '') // Clean up language prefixes
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
        .join(', ');
    }
    
    if (ingredientsForApi) {
      setIsLoadingAllergens(true);
      fetch(`${API_BASE_URL}/detect-allergens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients_text: ingredientsForApi }),
      })
        .then(response => {
          if (!response.ok) {
            console.error('Failed to detect allergens for alternative:', response.status);
            return { allergens: [] };
          }
          return response.json();
        })
        .then(data => {
          setDetectedAllergens(data.allergens || []);
        })
        .catch(error => {
          console.error('Error detecting allergens for alternative:', error);
        })
        .finally(() => {
          setIsLoadingAllergens(false);
        });
    }
  }, [item.ingredients_text, item.ingredients_tags, item.allergens_en]); // Added allergens_en to dependencies

  const userAllergenMatch = detectedAllergens.some(allergen =>
    userAllergens.map(a => a.toLowerCase()).includes(allergen.toLowerCase())
  );

  return (
    <TouchableOpacity style={styles.itemContainer} onPress={() => onPress(item)}>
      {/* Image rendering - same pattern as ProductDetailCard */}
      {imageError || !liveImageUrl ? (
        <View style={styles.placeholderContainer}>
          <Ionicons name="camera-reverse-outline" size={30} color="#E0E0E0" />
        </View>
      ) : (
        <>
          <Image
            source={{ uri: liveImageUrl }}
            style={styles.itemImage}
            onLoadEnd={() => setIsImageLoading(false)}
            onError={handleImageError}
          />
          {isImageLoading && (
            <ActivityIndicator 
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(245, 245, 245, 0.8)' }]} 
              color="#00C853" 
            />
          )}
        </>
      )}
      
      <View style={styles.itemDetails}>
        <Text style={styles.itemName} numberOfLines={2}>{item.product_name || 'Unknown Product'}</Text>
        <Text style={styles.itemBrand}>{item.brands || 'Unknown Brand'}</Text>
        <Text style={styles.itemCategory}>
          {item.main_category_en ? String(item.main_category_en).replace(/en:/g, '') : 'No Category'}
        </Text>
        <View style={styles.scoresContainer}>
          <ScoreBadge
            label="Nutri-Score"
            value={item.nutriscore_grade}
            icon="nutrition-outline"
            colors={{ a: '#038141', b: '#85BB2F', c: '#FECB02', d: '#F58220', e: '#E63E11', default: '#9E9E9E' }}
            isAIPredicted={item.ai_predicted_nutriscore}
          />
          <ScoreBadge
            label="Eco-Score"
            value={item.ecoscore_grade}
            icon="leaf-outline"
            colors={{ a: '#1E8F4E', b: '#74B445', c: '#FDCB02', d: '#F58220', e: '#E63E11', default: '#9E9E9E' }}
            isAIPredicted={item.ai_predicted_ecoscore}
          />
          <ScoreBadge
            label="NOVA"
            value={item.nova_group}
            icon="planet-outline"
            colors={{ '1': '#00A84D', '2': '#A1CD45', '3': '#F57C00', '4': '#E63E11', default: '#9E9E9E' }}
            isAIPredicted={item.ai_predicted_nova}
          />
        </View>
        {isLoadingAllergens ? (
          <ActivityIndicator size="small" color="#00C853" style={styles.allergenLoading} />
        ) : userAllergenMatch ? (
          <View style={styles.allergenWarningContainer}>
            <View style={[styles.allergenWarning, { backgroundColor: '#D32F2F' }]}>
              <Ionicons name="alert-circle-outline" size={16} color="#FFF" style={styles.allergenIcon} />
              <Text style={styles.allergenWarningText}>Contains Your Allergens</Text>
            </View>
          </View>
        ) : detectedAllergens.length > 0 ? (
          <View style={styles.allergenInfo}>
            <Ionicons name="information-circle-outline" size={16} color="#BF360C" style={styles.allergenIcon} />
            <Text style={styles.allergenInfoText}>
              Allergens: {detectedAllergens.slice(0, 3).join(', ')}
              {detectedAllergens.length > 3 ? '...' : ''}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const AlternativesScreen = ({ route, navigation }) => {
  // Extract parameters from the route
  const { productCode, productName, userAllergens = [], initialAlternatives, initialProduct } = route.params || {};
  
  const [alternatives, setAlternatives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Determine the product name to display in the header
  const currentProductName = initialProduct?.product_name || productName || 'Product';

  useEffect(() => {
    // Priority 1: Use initialAlternatives if provided (from ContributeScreen preview)
    if (initialAlternatives && Array.isArray(initialAlternatives) && initialAlternatives.length > 0) {
      console.log('AlternativesScreen: Using initial alternatives from route params.');
      setAlternatives(initialAlternatives);
      setIsLoading(false);
      return; // Stop here, no need to fetch from backend
    }

    // Priority 2: Fetch alternatives from backend if productCode is available
    const fetchAlternatives = async () => {
      if (!productCode) {
        setError('No product code or initial data provided for alternatives.');
        setIsLoading(false);
        return;
      }
      try {
        console.log(`AlternativesScreen: Fetching recommendations for productCode ${productCode}`);
        const response = await fetch(`${API_BASE_URL}/recommendations/${productCode}`);
        const data = await response.json(); // Data is expected to be an array of products or {error: ...}

        if (!response.ok) {
          throw new Error(data.error || `Failed to fetch alternatives: ${response.status}`);
        }
        
        console.log('AlternativesScreen: Parsed recommendations data:', data);
        setAlternatives(Array.isArray(data) ? data : []); // Ensure it's an array
      } catch (err) {
        console.error('AlternativesScreen: Fetch error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlternatives();
  }, [productCode, initialAlternatives]); // Re-run effect if productCode or initial data changes

  const handleSelectAlternative = (item) => {
    console.log('AlternativesScreen: Selected alternative data:', item);
    // Ensure ingredients_tags is an array for ProductDetailCard
    const productDataForDetail = {
      ...item,
      // Ensure ingredients_tags is an array if it's a string, or remains null/undefined if not present
      ingredients_tags: typeof item.ingredients_tags === 'string'
        ? item.ingredients_tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : Array.isArray(item.ingredients_tags)
          ? item.ingredients_tags
          : [], // Default to empty array if no tags
    };

    navigation.navigate('ProductDetail', {
      product: productDataForDetail,
      userAllergens, // Pass user allergens down to ProductDetailCard
    });
  };

  const renderContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color="#00C853" style={styles.loading} />;
    }
    if (error) {
      return <Text style={styles.errorText}>Error: {error}</Text>;
    }
    if (alternatives.length === 0) {
      return <Text style={styles.errorText}>No healthier alternatives found.</Text>;
    }
    return (
      <FlatList
        data={alternatives}
        keyExtractor={(item) => item.code?.toString() || `${item.product_name}-${item.brands}-${Math.random()}`} // Robust key extractor
        renderItem={({ item }) => (
          <AlternativeItem item={item} userAllergens={userAllergens} onPress={handleSelectAlternative} />
        )}
        contentContainerStyle={styles.listContainer}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close-outline" size={30} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerSubtitle}>Healthier Alternatives for</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{currentProductName}</Text>
        </View>
        <View style={{ width: 40 }} /> {/* Spacer */}
      </View>
      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: { padding: 5 },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 12, color: '#777' },
  errorText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#666' },
  loading: { marginTop: 50 },
  listContainer: { paddingVertical: 10, paddingHorizontal: 15 },
  itemContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  itemImage: {
    width: 90,
    height: 90,
    borderRadius: 8,
    marginRight: 15,
    resizeMode: 'contain',
    backgroundColor: '#F5F5F5',
  },
  // Added placeholder container style - same as ProductDetailCard
  placeholderContainer: {
    width: 90,
    height: 90,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: { flex: 1 },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  itemBrand: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 12,
    color: '#555',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  scoresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    alignItems: 'center',
    marginRight: 8,
  },
  badgeLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  badgeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  aiPredictedLabel: {
    fontSize: 8,
    color: '#666',
    marginTop: 1,
  },
  allergenWarningContainer: {
    marginTop: 8,
  },
  allergenWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  allergenWarningText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
  },
  allergenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  allergenInfoText: {
    fontSize: 12,
    color: '#BF360C',
    fontWeight: '500',
  },
  allergenIcon: {
    marginRight: 5,
  },
  allergenLoading: {
    marginTop: 8,
  },
});

export default AlternativesScreen;