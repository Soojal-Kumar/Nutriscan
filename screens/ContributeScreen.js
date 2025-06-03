// screens/ContributeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Image, Alert, ActivityIndicator,
  Platform, StatusBar, KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Assuming your constants file exports THEME_COLOR directly
// If it's THEME_COLOR_PRIMARY, your original import is fine.
import { THEME_COLOR } from '../config/constants'; // OR '../config/dummyData' if it's truly there
// import { db, auth, storage } from '../config/firebase';
// import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
// import * as ImagePicker from 'expo-image-picker';
// import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const PLACEHOLDER_IMAGE_ICON = 'https://via.placeholder.com/150/E0E0E0/808080?Text=No+Image';

const ContributeScreen = ({ navigation, route }) => {
  const initialSearchTerm = route.params?.searchTerm || '';
  const initialBarcode = route.params?.barcode || '';

  const [productName, setProductName] = useState(initialSearchTerm);
  const [brand, setBrand] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [barcode, setBarcode] = useState(initialBarcode);
  const [nutritionalInfo, setNutritionalInfo] = useState([{ name: 'Energy', value: '', unit: 'kcal' }]);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [productImageUri, setProductImageUri] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: 'Contribute Product',
      headerStyle: {
        backgroundColor: THEME_COLOR, // Uses the imported THEME_COLOR
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 15, padding: 5 }}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // const handlePickImage = async () => { // Simplified for one image type for now
  //   const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  //   if (!permissionResult.granted) {
  //     Alert.alert("Permission Denied", "Access to photos is needed to upload images.");
  //     return;
  //   }
  //   const pickerResult = await ImagePicker.launchImageLibraryAsync({
  //     mediaTypes: ImagePicker.MediaTypeOptions.Images,
  //     allowsEditing: true,
  //     aspect: [1, 1], // Square for product image
  //     quality: 0.7,
  //   });
  //   if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
  //     setProductImageUri(pickerResult.assets[0].uri);
  //   }
  // };

  const handleAddNutrient = () => {
    setNutritionalInfo(prevInfo => [...prevInfo, { name: '', value: '', unit: '' }]);
  };

  const handleNutrientChange = (index, field, value) => {
    const newInfo = [...nutritionalInfo];
    newInfo[index][field] = value;
    setNutritionalInfo(newInfo);
  };

  const handleRemoveNutrient = (index) => {
    setNutritionalInfo(prevInfo => prevInfo.filter((_, i) => i !== index));
  };

  const handleSubmitContribution = async () => {
    if (!productName.trim() || !brand.trim()) {
      Alert.alert("Missing Information", "Product Name and Brand are required.");
      return;
    }
    setIsSubmitting(true);

    // --- Firebase Submission Logic ---
    // This part remains the same, ensure 'db', 'auth', 'storage', 'collection',
    // 'addDoc', 'serverTimestamp', 'ref', 'uploadBytes', 'getDownloadURL'
    // are correctly imported and initialized if you uncomment it.

    // For now, simulate submission
    console.log("Simulating submission:", {
        productName: productName.trim(),
        brand: brand.trim(),
        ingredients: ingredients.trim(),
        barcode: barcode.trim(),
        nutritionalInfo: nutritionalInfo.filter(n => n.name.trim() && n.value.trim()),
        additionalInfo: additionalInfo.trim(),
        productImageUri
    });
    Alert.alert("Contribution Submitted (Simulated)", "Thank you for contributing!");
    setTimeout(() => {
        setIsSubmitting(false);
        navigation.goBack();
    }, 1500);
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_COLOR} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? (navigation.dangerouslyGetState().routes.length > 1 ? 60 : 90) : 0} // Adjust offset based on header
      >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Help Us Grow Our Database!</Text>
        <Text style={styles.screenSubtitle}>
          The product "{initialSearchTerm || 'you searched for'}" {initialBarcode ? `(barcode: ${initialBarcode}) `: ''}
          wasn't found. Please provide its details.
        </Text>

        <View style={styles.imageUploadSection}>
          <TouchableOpacity
            style={styles.imagePickerBox}
            // onPress={handlePickImage} // Uncomment when ImagePicker is set up
          >
            {productImageUri ? (
              <Image source={{ uri: productImageUri }} style={styles.productImagePreview} />
            ) : (
              <View style={styles.imagePickerPlaceholder}>
                <Ionicons name="camera-outline" size={40} color="#A0A0A0" />
                <Text style={styles.imagePickerText}>Add Product Image</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Product Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={productName}
            onChangeText={setProductName}
            placeholder="e.g., Crunchy Peanut Butter"
            placeholderTextColor="#A9A9A9"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Brand <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={brand}
            onChangeText={setBrand}
            placeholder="e.g., Nutty Delights"
            placeholderTextColor="#A9A9A9"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Ingredients List</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={ingredients}
            onChangeText={setIngredients}
            placeholder="e.g., Peanuts, Sugar, Salt, Palm Oil"
            placeholderTextColor="#A9A9A9"
            multiline
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Barcode (Optional)</Text>
          <View style={styles.barcodeContainer}>
            <TextInput
                style={[styles.input, {flex: 1}]}
                value={barcode}
                onChangeText={setBarcode}
                placeholder="Scan or enter barcode"
                placeholderTextColor="#A9A9A9"
                keyboardType="numeric"
            />
            {/* <TouchableOpacity style={styles.scanBarcodeButton} onPress={() => {/* Implement barcode scan here */}
            {/*    <Ionicons name="barcode-outline" size={24} color={THEME_COLOR} />
            {/*</TouchableOpacity> */}
          </View>
        </View>

        <View style={styles.formGroup}>
          <View style={styles.nutritionHeader}>
            <Text style={styles.label}>Nutritional Information <Text style={styles.labelDetail}>(per 100g/ml or serving)</Text></Text>
            <TouchableOpacity onPress={handleAddNutrient} style={styles.addMoreButton}>
              <Ionicons name="add-circle-outline" size={24} color={THEME_COLOR} />
              <Text style={styles.addMoreButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          {nutritionalInfo.map((item, index) => (
            <View key={index} style={styles.nutrientRow}>
              <TextInput
                style={[styles.input, styles.nutrientInputName]}
                value={item.name}
                onChangeText={(text) => handleNutrientChange(index, 'name', text)}
                placeholder="Nutrient"
                placeholderTextColor="#A9A9A9"
              />
              <TextInput
                style={[styles.input, styles.nutrientInputValue]}
                value={item.value}
                onChangeText={(text) => handleNutrientChange(index, 'value', text)}
                placeholder="Value"
                placeholderTextColor="#A9A9A9"
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.nutrientInputUnit]}
                value={item.unit}
                onChangeText={(text) => handleNutrientChange(index, 'unit', text)}
                placeholder="Unit"
                placeholderTextColor="#A9A9A9"
              />
              {nutritionalInfo.length > 1 && ( // Only show remove if more than one item
                <TouchableOpacity onPress={() => handleRemoveNutrient(index)} style={styles.removeNutrientButton}>
                  <Ionicons name="remove-circle-outline" size={24} color="#E74C3C" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <View style={styles.formGroup}>
            <Text style={styles.label}>Additional Information <Text style={styles.labelDetail}>(e.g., Certifications)</Text></Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                value={additionalInfo}
                onChangeText={setAdditionalInfo}
                placeholder="e.g., Gluten-Free, Vegan, Contains Nuts, Organic Certified"
                placeholderTextColor="#A9A9A9"
                multiline
            />
        </View>


        <TouchableOpacity
          style={[styles.submitButton, (isSubmitting || !productName.trim() || !brand.trim()) && styles.submitButtonDisabled]}
          onPress={handleSubmitContribution}
          disabled={isSubmitting || !productName.trim() || !brand.trim()}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Contribution</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Styles (minor adjustments for clarity and consistency)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB', // Slightly off-white background
  },
  container: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15, // Reduced top/bottom padding for scrollview itself
  },
  screenTitle: {
    fontSize: 20, // Adjusted size
    fontWeight: '700', // Bolder
    color: THEME_COLOR,
    textAlign: 'center',
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 13.5, // Adjusted size
    color: '#4B5563', // Darker grey
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 19,
  },
  imageUploadSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePickerBox: {
    width: 120, // Adjusted size
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F3F4F6', // Lighter grey
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5, // Thinner border
    borderColor: '#D1D5DB', // Lighter border
    borderStyle: 'dashed',
  },
  imagePickerPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerText: {
    marginTop: 6,
    color: '#6B7280', // Medium grey
    fontSize: 12,
  },
  productImagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  formGroup: {
    marginBottom: 18, // Consistent margin
  },
  label: {
    fontSize: 14.5, // Adjusted size
    fontWeight: '600',
    color: '#1F2937', // Darker label
    marginBottom: 7,
  },
  labelDetail: {
    fontWeight: '400',
    fontSize: 12,
    color: '#6B7280',
  },
  required: {
    color: '#EF4444', // Brighter red
    marginLeft: 2,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6, // Standard border radius
    paddingHorizontal: 14, // More padding
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    fontSize: 15,
    color: '#111827', // Very dark grey for input text
  },
  textArea: {
    minHeight: 70, // Adjusted height
    textAlignVertical: 'top',
    paddingTop: 10, // Ensure padding for multiline
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nutritionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4, // Smaller padding
    paddingHorizontal: 6,
  },
  addMoreButtonText: {
    color: THEME_COLOR,
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  nutrientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8, // Smaller margin
  },
  nutrientInputName: {
    flex: 2.8, // Adjusted flex
    marginRight: 6,
  },
  nutrientInputValue: {
    flex: 1.2,
    marginRight: 6,
  },
  nutrientInputUnit: {
    flex: 1.2, // Adjusted flex
  },
  removeNutrientButton: {
    marginLeft: 8,
    padding: 4, // Smaller padding
  },
  submitButton: {
    backgroundColor: THEME_COLOR,
    paddingVertical: 14, // Adjusted padding
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15, // More margin top
    elevation: 1,
    shadowColor: THEME_COLOR, // Shadow with theme color
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#9AE6B4', // More distinct disabled color
    elevation: 0,
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16, // Adjusted size
    fontWeight: '600', // Semi-bold
  },
});

export default ContributeScreen;