// client/components/ProductDetailCard.js (Updated for Flask API)
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');
const API_BASE_URL = 'https://zyr3x-nutriscan-backend.hf.space';

const formatNumber = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) ? num.toFixed(2) : '–';
};

const NutritionTableRow = ({ nutrient, amount, unit, indent = false, isBold = false }) => (
  <View style={styles.tableRow}>
    <Text style={[styles.nutrientName, indent && styles.indent]}>{nutrient}</Text>
    <Text style={[styles.nutrientValue, isBold && styles.boldText]}>{amount} {unit}</Text>
  </View>
);

const InfoRow = ({ icon, label, value }) => {
  if (!value || value.trim() === '') return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={22} color="#555" style={styles.infoIcon} />
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value.replace(/en:|fr:/g, '').replace(/,/g, ', ').trim()}</Text>
      </View>
    </View>
  );
};

const ScoreBadge = ({ label, value, icon, colors, isAIPredicted = false }) => {
  if (!value) return null;
  const color = colors[value.toString().toLowerCase()] || colors.default;
  return (
    <View style={styles.badge}>
      <Ionicons name={icon} size={28} color={color} />
      <Text style={styles.badgeLabel}>{label}</Text>
      <Text style={[styles.badgeValue, { color }]}>{value}</Text>
      {isAIPredicted && <Text style={styles.aiPredictedLabel}>AI</Text>}
    </View>
  );
};

const AllergenPill = ({ name, isUserAllergen }) => {
  const containerStyle = isUserAllergen ? styles.userAllergenPill : styles.otherAllergenPill;
  const textStyle = isUserAllergen ? styles.userAllergenPillText : styles.otherAllergenPillText;
  const iconName = isUserAllergen ? "alert-circle" : "information-circle-outline";
  return (
    <View style={containerStyle}>
      <Ionicons name={iconName} size={16} color={textStyle.color} style={{ marginRight: 6 }} />
      <Text style={textStyle}>{name}</Text>
    </View>
  );
};

const IngredientTag = ({ text }) => (
  <View style={styles.ingredientTag}>
    <Text style={styles.ingredientTagText}>{text}</Text>
  </View>
);

const AdditivePill = ({ number, name }) => (
  <View style={styles.additivePill}>
    {number && <Text style={styles.additiveNumber}>{number}</Text>}
    <Text style={styles.additiveName}>{name}</Text>
  </View>
);

const _ProductDetailCard = ({ product, onClearProduct, userAllergens = [], navigation }) => {
  const [liveImageUrl, setLiveImageUrl] = useState(null);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isIngredientsVisible, setIsIngredientsVisible] = useState(true);
  const [isLoadingAllergens, setIsLoadingAllergens] = useState(false);
  const [detectedProductAllergens, setDetectedProductAllergens] = useState([]);

  useEffect(() => {
    if (!product || !product.code) return;

    if (product.image_urls && product.image_urls.length > 0) {
      setLiveImageUrl(product.image_urls[0]);
    } else {
      setLiveImageUrl(null);
    }

    const detectAllergens = async () => {
      let ingredientsForApi = product.ingredients_text;
      if (!ingredientsForApi && product.ingredients_tags) {
        const tagsSource = Array.isArray(product.ingredients_tags) ? product.ingredients_tags : String(product.ingredients_tags).split(',');
        ingredientsForApi = tagsSource.map(tag => String(tag).replace(/en:|fr:/g, '').trim()).join(', ');
      }
      if (ingredientsForApi) {
        setIsLoadingAllergens(true);
        try {
          const response = await fetch(`${API_BASE_URL}/detect-allergens`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredients_text: ingredientsForApi }),
          });
          if (response.ok) {
            const data = await response.json();
            setDetectedProductAllergens(data.allergens || []);
          } else {
            console.error('Failed to detect allergens:', response.status);
          }
        } catch (error) {
          console.error('Error detecting allergens:', error);
        } finally {
          setIsLoadingAllergens(false);
        }
      }
    };

    detectAllergens();
  }, [product]);

  const handleImageError = () => {
    const currentIndex = product.image_urls ? product.image_urls.indexOf(liveImageUrl) : -1;
    if (currentIndex < product.image_urls.length - 1) {
      setLiveImageUrl(product.image_urls[currentIndex + 1]);
    } else {
      setImageError(true);
    }
  };

  const { productAllergensList, ingredientsList, lowerCaseUserAllergens, additivesList } = useMemo(() => {
    const lowerCaseUser = userAllergens.map(a => a.toLowerCase());
    const productAllergens = (product.allergens_en && typeof product.allergens_en === 'string') 
      ? product.allergens_en.split(',').map(a => a.replace(/en:|fr:/g, '').trim()) 
      : [];
    let ingredients = [];
    if (product.ingredients_tags) {
      const sourceArray = Array.isArray(product.ingredients_tags) ? product.ingredients_tags : String(product.ingredients_tags).split(',');
      ingredients = sourceArray.slice(0, 30).map(tag => String(tag).replace(/en:|fr:/g, '').trim());
    }
    let additives = [];
    if (product.additives_en && typeof product.additives_en === 'string') {
      additives = product.additives_en.split(',').map(additiveStr => {
        const parts = additiveStr.trim().split(' - ');
        let number = null;
        let name = additiveStr.trim();
        if (parts.length > 1 && parts[0].match(/e\d+/i)) {
          number = parts[0].toUpperCase();
          name = parts.slice(1).join(' - ');
        }
        return { number, name };
      });
    }
    return { productAllergensList, ingredientsList: ingredients, lowerCaseUserAllergens: lowerCaseUser, additivesList: additives };
  }, [product.allergens_en, product.ingredients_tags, product.additives_en, userAllergens]);

 const handleViewAlternatives = () => {
  navigation.navigate('Alternatives', { 
    productCode: product.code, 
    productName: product.product_name, 
    userAllergens 
  });
};

  const { product_name, brands, nutriscore_grade, ecoscore_grade, nova_group, ...otherDetails } = product;

  return (
    <View style={styles.card}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          {imageError || !liveImageUrl ? (
            <View style={styles.placeholderContainer}>
              <Ionicons name="camera-reverse-outline" size={60} color="#E0E0E0" />
            </View>
          ) : (
            <>
              <Image
                source={{ uri: liveImageUrl }}
                style={styles.productImage}
                onLoadEnd={() => setIsImageLoading(false)}
                onError={handleImageError}
              />
              {isImageLoading && <ActivityIndicator style={StyleSheet.absoluteFill} color="#00C853" />}
            </>
          )}
          <TouchableOpacity style={styles.closeButton} onPress={onClearProduct}>
            <Ionicons name="close-circle" size={36} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.brandName}>{brands || 'Unknown Brand'}</Text>
          <Text style={styles.productName}>{product_name || 'Unknown Product'}</Text>

          <View style={styles.scoresContainer}>
            <ScoreBadge
              label="Nutri-Score"
              value={nutriscore_grade}
              icon="nutrition"
              colors={{ a: '#038141', b: '#85BB2F', c: '#FECB02', d: '#F58220', e: '#E63E11', default: '#9E9E9E' }}
              isAIPredicted={product.ai_predicted_nutriscore}
            />
            <ScoreBadge
              label="NOVA Group"
              value={nova_group}
              icon="planet"
              colors={{ '1': '#00A84D', '2': '#A1CD45', '3': 'orange', '4': '#F58220', default: '#9E9E9E' }}
              isAIPredicted={product.ai_predicted_nova}
            />
            <ScoreBadge
              label="Eco-Score"
              value={ecoscore_grade}
              icon="leaf"
              colors={{ a: '#1E8F4E', b: '#74B445', c: '#FDCB02', d: '#F58220', e: '#E63E11', default: '#9E9E9E' }}
              isAIPredicted={product.ai_predicted_ecoscore}
            />
          </View>

          <View style={styles.nutritionTable}>
            <Text style={styles.nutritionTableHeader}>Nutrition Facts</Text>
            <Text style={styles.nutritionTableSubheader}>per 100g serving</Text>
            <View style={styles.tableThickDivider} />
            <NutritionTableRow nutrient="Energy" amount={formatNumber(otherDetails.energy_kcal_100g)} unit="kcal" isBold={true} />
            <View style={styles.tableThinDivider} />
            <NutritionTableRow nutrient="Fat" amount={formatNumber(otherDetails.fat_100g)} unit="g" isBold={true} />
            <NutritionTableRow nutrient="Saturated Fat" amount={formatNumber(otherDetails.saturated_fat_100g)} unit="g" indent={true} />
            <View style={styles.tableThinDivider} />
            <NutritionTableRow nutrient="Carbohydrates" amount={formatNumber(otherDetails.carbohydrates_100g)} unit="g" isBold={true} />
            <NutritionTableRow nutrient="Sugars" amount={formatNumber(otherDetails.sugars_100g)} unit="g" indent={true} />
            <View style={styles.tableThinDivider} />
            <NutritionTableRow nutrient="Protein" amount={formatNumber(otherDetails.proteins_100g)} unit="g" isBold={true} />
            <View style={styles.tableThinDivider} />
            <NutritionTableRow nutrient="Sodium" amount={formatNumber(otherDetails.sodium_100g)} unit="g" />
            <View style={styles.tableThickDivider} />
          </View>

          <View style={styles.infoSection}>
            <InfoRow icon="fast-food-outline" label="Main Category" value={otherDetails.main_category_en} />
            <InfoRow icon="earth-outline" label="Origins" value={otherDetails.origins_en} />
            <InfoRow icon="cube-outline" label="Packaging" value={otherDetails.packaging_en} />
          </View>

          <TouchableOpacity style={styles.accordionHeader} onPress={() => setIsIngredientsVisible(!isIngredientsVisible)}>
            <Text style={styles.sectionTitle}>Ingredients & Composition</Text>
            <Ionicons name={isIngredientsVisible ? 'chevron-up-outline' : 'chevron-down-outline'} size={24} color="#333" />
          </TouchableOpacity>
          {isIngredientsVisible && (
            <View style={styles.accordionContent}>
              <Text style={styles.subSectionTitle}>AI Detected Allergens</Text>
              {isLoadingAllergens ? (
                <ActivityIndicator style={{ marginVertical: 10 }} color="#00C853" />
              ) : (
                <View style={styles.tagContainer}>
                  {detectedProductAllergens.length > 0 ? (
                    detectedProductAllergens.map((allergen, index) => {
                      const isPersonalAllergen = lowerCaseUserAllergens.includes(allergen.toLowerCase());
                      return (
                        <AllergenPill key={`${allergen}-${index}`} name={allergen} isUserAllergen={isPersonalAllergen} />
                      );
                    })
                  ) : (
                    <Text style={styles.noDataText}>No common allergens detected by AI.</Text>
                  )}
                </View>
              )}

              <Text style={styles.subSectionTitle}>Additives</Text>
              <View style={styles.tagContainer}>
                {additivesList.length > 0 ? (
                  additivesList.map((additive, index) => (
                    <AdditivePill key={index} number={additive.number} name={additive.name} />
                  ))
                ) : (
                  <Text style={styles.noDataText}>No additives listed.</Text>
                )}
              </View>

              <Text style={styles.subSectionTitle}>Full Ingredient List</Text>
              <View style={styles.tagContainer}>
                {ingredientsList.length > 0 ? (
                  ingredientsList.map((tag, index) => (
                    <IngredientTag key={`${tag}-${index}`} text={tag} />
                  ))
                ) : (
                  <Text style={styles.noDataText}>No ingredients data available.</Text>
                )}
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={handleViewAlternatives} style={styles.alternativesButton}>
          <LinearGradient colors={['#00C853', '#00A040']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
            <Ionicons name="search-circle-outline" size={24} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>View Alternatives</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export const ProductDetailCard = React.memo(_ProductDetailCard);
export default ProductDetailCard;

const styles = StyleSheet.create({
  card: { width: '100%', backgroundColor: '#FFFFFF' },
  userAllergenPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D32F2F', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 2, borderColor: '#B71C1C' },
  userAllergenPillText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', textTransform: 'capitalize' },
  otherAllergenPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#FFD54F' },
  otherAllergenPillText: { color: '#BF360C', fontSize: 14, fontWeight: '500', textTransform: 'capitalize' },
  noDataText: { fontStyle: 'italic', color: '#666', marginBottom: 15 },
  additivePill: { backgroundColor: '#E3F2FD', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: '#90CAF9', flexDirection: 'row', alignItems: 'center' },
  additiveNumber: { fontSize: 13, fontWeight: 'bold', color: '#1565C0', marginRight: 6 },
  additiveName: { fontSize: 14, color: '#1E88E5', textTransform: 'capitalize' },
  imageContainer: { height: screenWidth * 0.7, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  productImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  closeButton: { position: 'absolute', top: 15, right: 15, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20 },
  contentContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  brandName: { fontSize: 16, color: '#7F8C8D', marginTop: 20, textTransform: 'uppercase', fontWeight: '500' },
  productName: { fontSize: 28, fontWeight: 'bold', color: '#2C3E50', marginBottom: 15 },
  scoresContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15, backgroundColor: '#FAFAFA', borderRadius: 12, marginBottom: 25 },
  badge: { alignItems: 'center', flex: 1 },
  badgeLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  badgeValue: { fontSize: 20, fontWeight: 'bold', textTransform: 'uppercase' },
  aiPredictedLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  nutritionTable: { borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 8, padding: 15, marginBottom: 25 },
  nutritionTableHeader: { fontSize: 22, fontWeight: '800', color: '#111' },
  nutritionTableSubheader: { fontSize: 14, color: '#666', marginBottom: 8 },
  tableThickDivider: { height: 8, backgroundColor: '#111', marginVertical: 5 },
  tableThinDivider: { height: 1, backgroundColor: '#EAEAEA' },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  nutrientName: { fontSize: 16, color: '#333' },
  nutrientValue: { fontSize: 16, color: '#333' },
  indent: { marginLeft: 15 },
  boldText: { fontWeight: 'bold' },
  infoSection: { marginTop: 10, marginBottom: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  infoIcon: { marginRight: 15 },
  infoLabel: { fontSize: 13, color: '#7F8C8D', fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#2C3E50', flexShrink: 1 },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  accordionContent: { paddingBottom: 10 },
  subSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#424242', marginTop: 20, marginBottom: 10, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ingredientTag: { backgroundColor: '#E8F5E9', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  ingredientTagText: { color: '#2E7D32', fontSize: 14, textTransform: 'capitalize' },
  alternativesButton: { marginHorizontal: 20, marginBottom: 30, marginTop: 20 },
  gradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 30 },
  buttonIcon: { marginRight: 10 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
});