// client/components/ContributeScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Image, Alert, ActivityIndicator,
  Platform, KeyboardAvoidingView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const API_BASE_URL = 'https://zyr3x-nutriscan-backend.hf.space'; // Make sure this is your correct backend URL
const THEME_COLOR = '#00C853';

const ContributeScreen = ({ navigation, route }) => {
  const initialSearchTerm = route.params?.searchTerm || '';
  const initialBarcode = route.params?.barcode || '';
  // Assuming userAllergens might come from a global state or a parent component via route.params
  // You might need to adjust how userAllergens is obtained based on your app's state management
  const userAllergens = route.params?.userAllergens || [];

  // State for form fields
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [barcode, setBarcode] = useState(initialBarcode);
  const [nutritionalInfo, setNutritionalInfo] = useState([
    { name: 'Energy', key: 'energy_kcal_100g', value: '', unit: 'kcal' },
    { name: 'Fat', key: 'fat_100g', value: '', unit: 'g' },
    { name: 'Saturated Fat', key: 'saturated_fat_100g', value: '', unit: 'g' },
    { name: 'Carbohydrates', key: 'carbohydrates_100g', value: '', unit: 'g' },
    { name: 'Sugars', key: 'sugars_100g', value: '', unit: 'g' },
    { name: 'Fiber', key: 'fiber_100g', value: '', unit: 'g' },
    { name: 'Protein', key: 'proteins_100g', value: '', unit: 'g' },
    { name: 'Salt', key: 'salt_100g', value: '', unit: 'g' },
    { name: 'Sodium', key: 'sodium_100g', value: '', unit: 'g' },
  ]);
  
  // Additional fields
  const [mainCategory, setMainCategory] = useState('');
  const [categories, setCategories] = useState('');
  const [packaging, setPackaging] = useState('');
  const [origins, setOrigins] = useState('');
  const [labels, setLabels] = useState('');

  // UI state
  const [frontImageUri, setFrontImageUri] = useState(null);
  const [backImageUri, setBackImageUri] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFindingAlternatives, setIsFindingAlternatives] = useState(false); // New loading state for preview

  // Results state
  const [predictedGrades, setPredictedGrades] = useState(null);
  const [detectedAllergens, setDetectedAllergens] = useState([]);
  const [detectedAdditives, setDetectedAdditives] = useState('');
  const [showGrades, setShowGrades] = useState(false); // Controls visibility of AIResultsCard
  const [contributedProductCode, setContributedProductCode] = useState(null); // Code for *saved* product

  // Image Picker Function
  const handlePickImage = async (setImageUri) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Denied", "Access to photos is needed.");
      return;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 4],
      quality: 0.7,
    });
    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      setImageUri(pickerResult.assets[0].uri);
      // Reset analysis/grades when new image is picked
      setShowGrades(false);
      setPredictedGrades(null);
      setDetectedAllergens([]);
      setDetectedAdditives('');
    }
  };
  
  // AI Analysis Function (extracts from images, predicts grades)
  const handleAnalyzeImages = async () => {
    if (!frontImageUri || !backImageUri) {
      Alert.alert("Missing Images", "Please provide both a front and back image of the product.");
      return;
    }
    setIsAnalyzing(true);
    // Reset previous results
    setPredictedGrades(null);
    setDetectedAllergens([]);
    setDetectedAdditives('');
    setShowGrades(false);

    try {
      const frontBase64 = await FileSystem.readAsStringAsync(frontImageUri, { encoding: 'base64' });
      const backBase64 = await FileSystem.readAsStringAsync(backImageUri, { encoding: 'base64' });

      const response = await fetch(`${API_BASE_URL}/extract-from-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front_image_base64: frontBase64,
          back_image_base64: backBase64,
        }),
      });

      const extractedData = await response.json();

      if (!response.ok) {
        throw new Error(extractedData.error || "Failed to analyze images.");
      }

      // Populate form with extracted data (user can review and edit these)
      setProductName(extractedData.product_name || '');
      setBrand(extractedData.brands || '');
      // ingredients_tags from AI is typically a comma-separated string like 'en:sugar, en:salt'
      setIngredients(extractedData.ingredients_tags || ''); 
      setMainCategory(extractedData.main_category_en || '');
      setCategories(extractedData.categories_en || '');
      setPackaging(extractedData.packaging_en || '');
      setOrigins(extractedData.origins_en || '');
      // Labels are not typically extracted by this endpoint, but kept in state for submission
      // setLabels(extractedData.labels_en || ''); 
      
      // Populate nutritional info table
      const updatedNutritionalInfo = [...nutritionalInfo];
      const aiNutrients = extractedData.nutritional_info || {};
      updatedNutritionalInfo.forEach(item => {
        if (aiNutrients[item.key] !== null && aiNutrients[item.key] !== undefined) {
          item.value = String(aiNutrients[item.key]);
        } else {
          item.value = ''; // Clear if AI didn't provide
        }
      });
      setNutritionalInfo(updatedNutritionalInfo);

      // Store predicted grades and detected allergens/additives from this initial analysis
      setPredictedGrades(extractedData.predicted_grades || null);
      setDetectedAllergens(extractedData.detected_allergens || []);
      // The /extract-from-images endpoint might not return additives_en directly.
      // It's usually computed during full /contribute-product or /preview-alternatives calls.
      // So, detectedAdditives will be updated after 'Find Healthier Alternatives' or 'Submit Contribution'.
      setDetectedAdditives(''); 

      setShowGrades(true); // Now show the AI results card
      Alert.alert(
        "Analysis Complete ✅", 
        "AI has extracted product information and predicted nutritional grades. Please review and edit the data below, then you can find alternatives or submit the product!",
        [{ text: "Review Data" }]
      );

    } catch (error) {
      console.error("Analysis error:", error);
      Alert.alert("Analysis Failed", error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNutrientChange = (index, value) => {
    const newInfo = [...nutritionalInfo];
    newInfo[index].value = value;
    setNutritionalInfo(newInfo);
  };

  // Helper to prepare current form data for API calls (both /preview-alternatives and /contribute-product)
  const prepareProductDataFromForm = () => {
    const nutritionalInfoObj = {};
    nutritionalInfo.forEach(item => {
      // Convert to float or null if empty/invalid
      nutritionalInfoObj[item.key] = parseFloat(item.value) || null;
    });

    return {
      product_name: productName.trim(),
      brands: brand.trim(),
      ingredients_text: ingredients.trim(), // Raw ingredients text from the form
      code: barcode.trim() || undefined, // Use user's barcode or let backend generate
      main_category_en: mainCategory.trim(),
      categories_en: categories.trim(),
      packaging_en: packaging.trim(),
      origins_en: origins.trim(),
      labels_en: labels.trim(),
      nutritional_info: nutritionalInfoObj,
      // No need to pass predicted grades from here, backend re-predicts or uses its own
    };
  };

  // NEW: Function to find alternatives (calls /preview-alternatives endpoint)
  const handleFindAlternatives = async () => {
    // Basic validation before sending to preview
    if (!productName.trim() || !ingredients.trim()) {
      Alert.alert("Missing Information", "Please enter Product Name and Ingredients List to find alternatives.");
      return;
    }

    setIsFindingAlternatives(true);
    try {
      const productDataToSend = prepareProductDataFromForm();

      const response = await fetch(`${API_BASE_URL}/preview-alternatives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productDataToSend),
      });

      const result = await response.json();

      if (response.ok) {
        // Update AI Results Card with the grades and other info from /preview-alternatives response
        setPredictedGrades(result.predicted_grades || {});
        setDetectedAllergens(result.detected_allergens || []);
        setDetectedAdditives(result.detected_additives || ''); // Additives are returned here!
        setShowGrades(true); // Ensure AI results card is visible

        if (result.alternatives && result.alternatives.length > 0) {
          console.log('✅ Alternatives found:', result.alternatives.length);

          // Construct the 'original product' object to pass to AlternativesScreen
          // This object needs to mimic the product structure that AlternativesScreen expects.
          const originalProductForAlternativesScreen = {
              code: productDataToSend.code || `PREVIEW_${Date.now()}`, // Use entered barcode or generate preview code
              product_name: productDataToSend.product_name,
              brands: productDataToSend.brands,
              // Use AI-processed fields if available, otherwise fallback to form inputs
              ingredients_text: result.ai_processing?.ingredients_tags_extracted || productDataToSend.ingredients_text,
              ingredients_tags: result.ai_processing?.ingredients_tags_extracted || productDataToSend.ingredients_text.split(',').map(s => `en:${s.trim()}`).join(','), 
              main_category_en: productDataToSend.main_category_en,
              categories_en: productDataToSend.categories_en,
              packaging_en: productDataToSend.packaging_en,
              origins_en: productDataToSend.origins_en,
              labels_en: productDataToSend.labels_en,
              nutritional_info: productDataToSend.nutritional_info, // The numerical values from form
              nutriscore_grade: result.predicted_grades.nutriscore_grade,
              ecoscore_grade: result.predicted_grades.ecoscore_grade,
              nova_group: result.predicted_grades.nova_group,
              allergens_en: result.detected_allergens.join(','), // Comma-separated string
              additives_en: result.detected_additives,           // Comma-separated string
              // Add image_urls if you have a way to associate them for the "original product" view in AlternativesScreen
              // This might require storing remote URLs or converting local URIs to base64 and passing that.
              // For now, it's typically omitted for unsaved products.
              image_urls: [], // Or a placeholder if needed
              // Flags to indicate AI prediction (for ProductDetailCard when viewing alternatives)
              ai_predicted_nutriscore: result.predicted_grades.nutriscore_grade !== 'N/A',
              ai_predicted_ecoscore: result.predicted_grades.ecoscore_grade !== 'N/A',
              ai_predicted_nova: result.predicted_grades.nova_group !== 'N/A',
          };
          
          Alert.alert(
            "Alternatives Found",
            `Found ${result.alternatives.length} healthier alternatives for "${productName}".`,
            [{ text: "View Alternatives", onPress: () => {
              navigation.navigate('Alternatives', {
                initialProduct: originalProductForAlternativesScreen, // Pass the full original product data
                initialAlternatives: result.alternatives,           // Pass the pre-fetched alternatives
                userAllergens: userAllergens,                       // Pass user's allergens
              });
            }}]
          );

        } else {
          Alert.alert("No Alternatives", result.message || "No healthier alternatives found for this product.");
        }
      } else {
        Alert.alert("Error", result.error || "Failed to find alternatives.");
      }
    } catch (error) {
      console.error("Error finding alternatives:", error);
      Alert.alert("Error", `Failed to find alternatives: ${error.message}`);
    } finally {
      setIsFindingAlternatives(false);
    }
  };


  // Submit Function (saves product to DB)
  const handleSubmitContribution = async () => {
    // Validation
    if (!productName.trim()) {
      Alert.alert("Validation Error", "Product name is required.");
      return;
    }
    if (!brand.trim()) {
      Alert.alert("Validation Error", "Brand name is required.");
      return;
    }
    if (!ingredients.trim()) {
      Alert.alert("Validation Error", "Ingredients list is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const productDataToSave = prepareProductDataFromForm(); // Get current form data

      console.log('🔄 Processing and saving product...');
      const response = await fetch(`${API_BASE_URL}/contribute-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productDataToSave)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Update AI results card with FINAL saved predictions and data
        setPredictedGrades(result.predicted_grades || {});
        setDetectedAllergens(result.detected_allergens || []);
        setDetectedAdditives(result.detected_additives || '');
        setShowGrades(true); // Ensure AI results card is visible

        setContributedProductCode(result.product_code); // Store the code of the saved product

        Alert.alert(
          "Success! 🎉", 
          `"${productName}" has been analyzed and saved!\nProduct Code: ${result.product_code}\nYou can now find alternatives based on this saved product, or continue contributing.`,
          [{ text: "OK" }]
        );
      } else {
        throw new Error(result.error || "Failed to submit product");
      }
    } catch (error) {
      console.error("Submission error:", error);
      Alert.alert("Submission Failed", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContentContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.screenTitle}>Contribute a New Product</Text>
          <Text style={styles.screenSubtitle}>
            Add product photos and let AI extract info & predict grades!
          </Text>

          {/* Image Pickers */}
          <View style={styles.imagePickersContainer}>
            <ImagePickerBox 
              title="Front of Product" 
              imageUri={frontImageUri} 
              onPickImage={() => handlePickImage(setFrontImageUri)} 
            />
            <ImagePickerBox 
              title="Back (Nutrition/Ingredients)" 
              imageUri={backImageUri} 
              onPickImage={() => handlePickImage(setBackImageUri)} 
            />
          </View>

          {/* Analyze Button */}
          <TouchableOpacity
            style={[styles.analyzeButton, (!frontImageUri || !backImageUri || isAnalyzing) && styles.buttonDisabled]}
            onPress={handleAnalyzeImages}
            disabled={!frontImageUri || !backImageUri || isAnalyzing}
          >
            {isAnalyzing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#fff" />
                <Text style={[styles.buttonText, { marginLeft: 10 }]}>Analyzing with AI...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>🤖 Analyze Images with AI</Text>
            )}
          </TouchableOpacity>

          {/* AI Analysis Results Card (shows grades, allergens, additives) */}
          {showGrades && predictedGrades && (
            <AIResultsCard 
              grades={predictedGrades}
              allergens={detectedAllergens}
              additives={detectedAdditives}
            />
          )}

          {/* NEW: Alternatives Button - Shows after analysis (grades are set) */}
          {showGrades && ( // Only show this button if AI analysis has happened and grades are available
            <TouchableOpacity
              style={[styles.alternativesButton, isFindingAlternatives && styles.buttonDisabled]}
              onPress={handleFindAlternatives}
              disabled={isFindingAlternatives}
            >
              {isFindingAlternatives ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="white" />
                  <Text style={[styles.alternativesButtonText, { marginLeft: 10 }]}>Finding Alternatives...</Text>
                </View>
              ) : (
                <>
                  <MaterialCommunityIcons name="swap-horizontal" size={24} color="white" />
                  <Text style={styles.alternativesButtonText}>Find Healthier Alternatives</Text>
                  <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          )}

          <View style={styles.divider} />
          
          {/* Basic Product Information Form */}
          <Text style={styles.sectionTitle}>📋 Basic Information</Text>
          <FormInput 
            label="Product Name *" 
            value={productName} 
            onChangeText={setProductName} 
            placeholder="e.g., Crunchy Peanut Butter" 
          />
          <FormInput 
            label="Brand *" 
            value={brand} 
            onChangeText={setBrand} 
            placeholder="e.g., Nutty Delights" 
          />
          <FormInput 
            label="Barcode (Optional)" 
            value={barcode} 
            onChangeText={setBarcode} 
            keyboardType="numeric"
            placeholder="Leave empty for auto-generated code"
          />

          {/* Product Details Form */}
          <Text style={styles.sectionTitle}>🏷️ Product Details</Text>
          <FormInput 
            label="Main Category" 
            value={mainCategory} 
            onChangeText={setMainCategory} 
            placeholder="e.g., Dairy products, Snacks, Beverages" 
          />
          <FormInput 
            label="Detailed Categories" 
            value={categories} 
            onChangeText={setCategories} 
            placeholder="e.g., Dairy products, Fermented dairy products, Yogurts" 
          />
          <FormInput 
            label="Packaging" 
            value={packaging} 
            onChangeText={setPackaging} 
            placeholder="e.g., Plastic container, Glass jar, Tetra pak" 
          />
          <FormInput 
            label="Origins/Country" 
            value={origins} 
            onChangeText={setOrigins} 
            placeholder="e.g., France, United States, Germany" 
          />
          <FormInput 
            label="Labels & Certifications" 
            value={labels} 
            onChangeText={setLabels} 
            placeholder="e.g., Organic, Fair trade, Gluten-free, Non-GMO" 
          />

          {/* Ingredients Form */}
          <Text style={styles.sectionTitle}>🧪 Ingredients & Composition</Text>
          <FormInput 
            label="Ingredients List *" 
            value={ingredients} 
            onChangeText={setIngredients} 
            placeholder="e.g., Wheat flour, Sugar, Eggs, Milk powder, Salt, Vanilla extract, Baking powder (E450, E500)" 
            multiline 
          />
          <Text style={styles.helperText}>
            💡 List all ingredients as they appear on the package. AI will automatically extract ingredient tags and additives.
          </Text>

          {/* Nutrition Table Form */}
          <Text style={styles.sectionTitle}>📊 Nutritional Information (per 100g)</Text>
          <View style={styles.formGroup}>
            {nutritionalInfo.map((item, index) => (
              <View key={index} style={styles.nutrientRow}>
                <Text style={styles.nutrientName}>{item.name}</Text>
                <TextInput
                  style={[styles.input, styles.nutrientInputValue]}
                  value={item.value}
                  onChangeText={(text) => handleNutrientChange(index, text)}
                  placeholder="Value" 
                  keyboardType="numeric"
                />
                <Text style={styles.nutrientUnit}>{item.unit}</Text>
              </View>
            ))}
          </View>

          {/* Final Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.buttonDisabled]} 
            onPress={handleSubmitContribution} 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#fff" />
                <Text style={[styles.buttonText, { marginLeft: 10 }]}>Submitting...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>🚀 Submit Contribution</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Reusable Components (ImagePickerBox, FormInput)
const ImagePickerBox = ({ title, imageUri, onPickImage }) => (
  <TouchableOpacity style={styles.imagePickerBox} onPress={onPickImage}>
    {imageUri ? (
      <Image source={{ uri: imageUri }} style={styles.productImagePreview} />
    ) : (
      <View style={styles.imagePickerPlaceholder}>
        <Ionicons name="camera-outline" size={30} color="#A0A0A0" />
        <Text style={styles.imagePickerText}>{title}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const FormInput = ({ label, value, onChangeText, ...props }) => (
  <View style={styles.formGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, props.multiline && styles.textArea]}
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor="#A9A9A9"
      {...props}
    />
  </View>
);

const AIResultsCard = ({ grades, allergens, additives }) => {
  return (
    <View style={styles.aiResultsCard}>
      <Text style={styles.aiResultsTitle}>🤖 AI Analysis Results</Text>
      
      {/* Predicted Grades */}
      <View style={styles.resultSection}>
        <View style={styles.resultHeader}>
          <MaterialCommunityIcons name="chart-line" size={20} color="#1E40AF" />
          <Text style={styles.resultSectionTitle}>Nutritional Grades</Text>
        </View>
        <View style={styles.gradesBadgesContainer}>
          <GradeBadge 
            label="Nutri-Score" 
            value={grades.nutriscore_grade} 
            type="nutriscore"
          />
          <GradeBadge 
            label="Eco-Score" 
            value={grades.ecoscore_grade} 
            type="ecoscore"
          />
          <GradeBadge 
            label="NOVA Group" 
            value={grades.nova_group} 
            type="nova"
          />
        </View>
      </View>

      {/* Additives */}
      {additives && additives.trim() !== '' && (
        <View style={styles.resultSection}>
          <View style={styles.resultHeader}>
            <MaterialCommunityIcons name="flask" size={20} color="#DC2626" />
            <Text style={styles.resultSectionTitle}>Food Additives</Text>
          </View>
          <View style={styles.additivesContainer}>
            {additives.split(',').filter(a => a.trim()).map((additive, index) => (
              <View key={index} style={styles.additiveChip}>
                <Text style={styles.additiveText}>{additive.trim()}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Allergens */}
      {allergens.length > 0 && (
        <View style={styles.resultSection}>
          <View style={styles.resultHeader}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#F59E0B" />
            <Text style={styles.resultSectionTitle}>Detected Allergens</Text>
          </View>
          <View style={styles.allergensContainer}>
            {allergens.map((allergen, index) => (
              <View key={index} style={styles.allergenChip}>
                <MaterialCommunityIcons name="alert" size={14} color="#DC2626" />
                <Text style={styles.allergenText}>{allergen}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.aiFooter}>
        <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
        <Text style={styles.aiFooterText}>Analysis complete.</Text>
      </View>
    </View>
  );
};

const GradeBadge = ({ label, value, type }) => {
  const getGradeColor = (value, type) => {
    if (type === 'nutriscore' || type === 'ecoscore') {
      const gradeColors = {
        'a': '#2E7D32', 'b': '#689F38', 'c': '#F57C00', 
        'd': '#E64A19', 'e': '#C62828'
      };
      return gradeColors[value?.toLowerCase()] || '#757575';
    } else if (type === 'nova') {
      const novaColors = { '1': '#2E7D32', '2': '#689F38', '3': '#F57C00', '4': '#E64A19' };
      return novaColors[String(value)] || '#757575';
    }
    return '#757575';
  };

  return (
    <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(value, type) }]}>
      <Text style={styles.gradeBadgeLabel}>{label}</Text>
      <Text style={styles.gradeBadgeValue}>
        {type === 'nova' ? `Group ${value}` : String(value).toUpperCase()}
      </Text>
      <View style={styles.aiIndicator}>
        <MaterialCommunityIcons name="robot" size={8} color="white" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContentContainer: { padding: 20 },
  screenTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    color: '#111827',
    marginBottom: 5 
  },
  screenSubtitle: { 
    fontSize: 14, 
    textAlign: 'center', 
    color: '#6B7280', 
    marginBottom: 20 
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 15,
    marginBottom: 10,
  },
  imagePickersContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginBottom: 20 
  },
  imagePickerBox: { 
    width: '48%', 
    height: 150, 
    borderWidth: 1.5, 
    borderColor: '#D1D5DB', 
    borderStyle: 'dashed', 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F9FAFB' 
  },
  productImagePreview: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 10 
  },
  imagePickerPlaceholder: { alignItems: 'center' },
  imagePickerText: { 
    color: '#6B7280', 
    marginTop: 8, 
    fontSize: 12, 
    textAlign: 'center' 
  },
  analyzeButton: { 
    backgroundColor: '#10B981', 
    padding: 15, 
    borderRadius: 8, 
    alignItems: 'center',
    marginBottom: 10
  },
  submitButton: { 
    backgroundColor: THEME_COLOR, 
    padding: 15, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 20 
  },
  alternativesButton: {
    backgroundColor: THEME_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  alternativesButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
  buttonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  buttonDisabled: { backgroundColor: '#A1A1AA' },
  loadingContainer: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  divider: { 
    height: 1, 
    backgroundColor: '#E5E7EB', 
    marginVertical: 25 
  },
  
  // AI Results Card styles
  aiResultsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  aiResultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 20,
  },
  resultSection: {
    marginBottom: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  gradesBadgesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  gradeBadge: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minWidth: 85,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  gradeBadgeLabel: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  gradeBadgeValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  aiIndicator: {
    position: 'absolute',
    top: 4,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    padding: 2,
  },
  additivesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  additiveChip: {
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  additiveText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '500',
  },
  allergensContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  allergenChip: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  allergenText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  aiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  aiFooterText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  
  // Form styles
  formGroup: { marginBottom: 15 },
  label: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#374151', 
    marginBottom: 5 
  },
  input: { 
    backgroundColor: '#FFFFFF', 
    borderWidth: 1, 
    borderColor: '#D1D5DB', 
    borderRadius: 6, 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    fontSize: 15 
  },
  textArea: { 
    minHeight: 80, 
    textAlignVertical: 'top' 
  },
  nutrientRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  nutrientName: { 
    flex: 2, 
    fontSize: 15, 
    color: '#4B5563' 
  },
  nutrientInputValue: { 
    flex: 1, 
    marginRight: 8, 
    textAlign: 'center' 
  },
  nutrientUnit: { 
    flex: 0.5, 
    fontSize: 15, 
    color: '#6B7280' 
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 10,
  },
});

export default ContributeScreen;