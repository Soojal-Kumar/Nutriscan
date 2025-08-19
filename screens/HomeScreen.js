import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar, Platform, Alert,
  Modal, ActivityIndicator, Dimensions, Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';

// Assuming theme color is imported from constants now, based on previous screens
// import { THEME_COLOR_PRIMARY as THEME_COLOR } from '../config/dummyData'; // Removed specific dummyData import
import { THEME_COLOR } from '../config/constants'; // Import from constants
import { ProductDetailCard } from '../components/ProductDetailCard'; // Assuming this component exists

// Firebase imports
import { auth, db } from '../config/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

const API_BASE_URL = 'https://zyr3x-nutriscan-backend.hf.space';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [currentProduct, setCurrentProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userAllergens, setUserAllergens] = useState([]); // Keep user allergens state
  const [permission, requestPermission] = useCameraPermissions(); // Keep camera permissions for scanner
  const [isCameraModalVisible, setIsCameraModalVisible] = useState(false); // Keep camera modal state
  const [scanned, setScanned] = useState(false); // Keep scanned state
  // Removed unreadNotificationsCount state as notification icon is removed
  // const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(3);

  // Fetch camera permissions
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Fetch user allergens from Firestore when user is logged in
  // This part relies on App.js managing the user state and passing it down or reading auth.currentUser
  useEffect(() => {
    const fetchUserAllergens = async () => {
      const user = auth.currentUser; // Get current logged-in user
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists() && userDoc.data().selectedAllergies) {
            console.log("Successfully fetched user allergens:", userDoc.data().selectedAllergies);
            setUserAllergens(userDoc.data().selectedAllergies);
          } else {
            console.log("User document exists, but no 'selectedAllergies' field found.");
             setUserAllergens([]); // Set to empty array if field is missing
          }
        } catch (error) {
          console.error("Error fetching user allergens from Firestore:", error);
           setUserAllergens([]); // Set to empty array on error
        }
      } else {
        console.log("No user logged in, cannot fetch allergens.");
         setUserAllergens([]); // Clear allergens if user logs out
      }
    };
    // Fetch allergens when the component mounts or user changes (though user change handled by App.js nav)
    // Add user as a dependency if user state is passed as a prop instead of using auth.currentUser directly
    fetchUserAllergens();
  }, []); // Empty dependency array runs once on mount

  const fetchProductData = async (type, query) => {
    let url = '';
    if (type === 'barcode') {
      url = `${API_BASE_URL}/product/${query}`;
    } else if (type === 'name') {
      url = `${API_BASE_URL}/search?name=${encodeURIComponent(query)}`;
    } else {
      return; // Do nothing if type is invalid
    }

    Keyboard.dismiss(); // Hide keyboard
    setIsLoading(true); // Start loading for fetch
    setCurrentProduct(null); // Clear previous product data

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && data && data.product_name) { // Check if response is ok and data is valid
        setCurrentProduct(data); // Set the fetched product data
        setSearchText(data.product_name || ''); // Update search text with product name
      } else {
        // Product not found or API returned error/empty data
        console.log(`Product "${query}" not found.`);
        // Navigate to Contribute screen, passing data for pre-filling
        navigation.navigate('ContributeProduct', {
          searchTerm: type === 'name' ? query : '',
          barcode: type === 'barcode' ? query : '',
          // Optionally pass other known data if API provides partial info
        });
        // Show an alert indicating the product was not found and prompting contribution
        Alert.alert(
          "Product Not Found",
          `We couldn't find "${query}". Please contribute its details.`
          // Removed the OK button array for a standard alert
        );
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      Alert.alert("Connection Error", "Could not connect to the server or an unexpected error occurred."); // More generic error message
    } finally {
      setIsLoading(false); // Stop loading regardless of success or failure
    }
  };

  // Handle search icon press
  const handleSearchIconPress = () => {
    const searchTerm = searchText.trim();
    if (!searchTerm) {
      setCurrentProduct(null); // Clear product if search is empty
      // Optionally show a message like "Please enter a product name"
      return;
    }
    fetchProductData('name', searchTerm); // Fetch data by name
  };

  // Handle barcode scanned event from the camera modal
  const handleBarCodeScanned = (scanningResult) => {
    if (scanned) return; // Only process one scan result at a time
    setScanned(true); // Mark as scanned
    setIsCameraModalVisible(false); // Close the camera modal
    console.log('Barcode scanned:', scanningResult.data);
    fetchProductData('barcode', scanningResult.data); // Fetch data using the scanned barcode
  };

  // Handle opening the barcode scanner modal
  const handleOpenScannerModal = async () => {
    let currentPermissionStatus = permission;
     // Request permission if not already granted or if can ask again
    if (!currentPermissionStatus || !currentPermissionStatus.granted) {
      currentPermissionStatus = await requestPermission();
    }
    if (currentPermissionStatus && currentPermissionStatus.granted) {
      setScanned(false); // Reset scanned state before opening scanner
      setIsCameraModalVisible(true); // Open the camera modal
    } else {
      // If permission is denied and cannot ask again, guide the user to settings
       if (!currentPermissionStatus.canAskAgain && !currentPermissionStatus.granted) {
           Alert.alert(
               "Permission Denied",
               "Camera permission is permanently denied. Please go to your device settings to enable it.",
               [{ text: "OK" }]
               // Optional: add a button that links directly to app settings
               // [{ text: "Go to Settings", onPress: () => Linking.openSettings() }, { text: "Cancel", style: "cancel" }]
           );
       } else {
            Alert.alert("Camera Permission Required", "Please enable camera access.");
       }
    }
  };

  // Handle clearing the currently displayed product card
  const handleClearProduct = () => {
    setCurrentProduct(null); // Clear the product data
    // Keep the search text or clear it? Let's clear it based on typical UX
    setSearchText('');
  };

  // Check if camera permissions are still loading
  if (permission === null) {
    // Permissions are still loading, return a loading indicator or null
    return (
       <View style={styles.loadingContainer}>
           <ActivityIndicator size="large" color={THEME_COLOR} />
           <Text style={{marginTop: 10}}>Requesting Camera Permission...</Text>
       </View>
    );
  }


  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Status bar color matches header */}
      <StatusBar barStyle="light-content" backgroundColor={THEME_COLOR} />

      {/* Header */}
      <LinearGradient
        // Use theme color for gradient if available, fallback to hardcoded colors
        colors={THEME_COLOR ? [THEME_COLOR, '#00A040'] : ['#00C853', '#00A040']}
        style={styles.headerContainer}
      >
        {/* Left side placeholder (e.g., for a logo if added later) */}
         {/* Giving it a fixed width equal to the potential notification icon area */}
        <View style={styles.headerIconPlaceholder} />

        {/* Header Title (Centered) */}
        <Text style={styles.headerTitle}>SCAN & DISCOVER</Text>

        {/* Right side placeholder (balances the left side to center the title) */}
        {/* Give it the same width as the left placeholder/potential icon area */}
        <View style={styles.headerIconPlaceholder} />

        {/* Removed Notification Bell */}
        {/* <TouchableOpacity style={styles.notificationBell} onPress={() => navigation.navigate('Notifications')}> ... </TouchableOpacity> */}
      </LinearGradient>

      {/* Scrollable Content Area */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled">

        {/* Search/Scan Bar */}
        <View style={styles.searchBarContainer}>
          {/* Search Icon */}
          <TouchableOpacity onPress={handleSearchIconPress} style={styles.searchIconButton}>
            <Ionicons name="search-outline" size={24} color="#757575" />
          </TouchableOpacity>
          {/* Search Input */}
          <TextInput
            placeholder="Search Product Name"
            placeholderTextColor="#A0A0A0"
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearchIconPress} // Trigger search when pressing done on keyboard
            returnKeyType="search"
          />
          {/* Barcode Scan Icon */}
          <TouchableOpacity onPress={handleOpenScannerModal} style={styles.barcodeIconContainer}>
            {/* Use THEME_COLOR if available, fallback to hardcoded green */}
            <Ionicons name="barcode-outline" size={28} color={THEME_COLOR || '#00C853'} />
          </TouchableOpacity>
        </View>

        {/* Content Area (Loading, Product Card, or Placeholder) */}
        {isLoading ? (
          // Show loading indicator
          <ActivityIndicator size="large" color={THEME_COLOR || '#00C853'} style={{ marginTop: 50 }} />
        ) : currentProduct ? (
          // Show Product Detail Card if a product is loaded
          <ProductDetailCard
            product={currentProduct}
            onClearProduct={handleClearProduct} // Pass clear handler
            userAllergens={userAllergens} // Pass fetched allergens
            navigation={navigation} // Pass navigation prop if card needs it
          />
        ) : (
          // Show placeholder content if no product is loaded
          <View style={styles.contentPlaceholder}>
            <Ionicons name="fast-food-outline" size={screenWidth * 0.15} color="#D1D5DB" style={{ marginBottom: 15 }} />
            <Text style={styles.placeholderTitle}>Find Your Food</Text>
            <Text style={styles.placeholderText}>Scan a product barcode or search by name to view its details.</Text>
          </View>
        )}
      </ScrollView>

      {/* Camera Scanner Modal */}
      <Modal
        animationType="slide"
        visible={isCameraModalVisible} // Control visibility
        onRequestClose={() => setIsCameraModalVisible(false)} // Handle Android back button
      >
        {/* Safe area for modal content */}
        <SafeAreaView style={styles.modalSafeArea}>
           {/* Camera View */}
           {/* Only render CameraView when modal is visible to avoid background camera use */}
          {isCameraModalVisible && (
             <CameraView
               style={StyleSheet.absoluteFill} // Make camera fill the modal area
               // Set the barcode scan handler. Use `undefined` when not visible to prevent issues.
               onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
             >
                {/* You can add viewfinder UI elements here if needed */}
             </CameraView>
           )}
           {/* Close Button for the modal */}
          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={() => setIsCameraModalVisible(false)} // Close the modal
          >
            <Ionicons name="close-circle" size={36} color="white" />
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME_COLOR }, // Background color matches header primary
  headerContainer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    height: 65, paddingHorizontal: 15, // Added padding
    elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 3,
  },
   // Placeholder view to balance the header layout
   // Gave it a width similar to the potential notification icon area (40px minus padding)
  headerIconPlaceholder: { width: 40 },
  headerTitle: {
     color: '#fff', fontSize: 20, fontWeight: 'bold',
     flex: 1, // Allow title to take up space
     textAlign: 'center', // Center the text within its flex space
  },
  // Removed notificationBell, notificationBadge, notificationBadgeText styles

  scrollView: { flex: 1, backgroundColor: '#F4F6F8' },
  scrollViewContent: { paddingHorizontal: 15, paddingTop: 20, paddingBottom: 80, alignItems: 'center' },

  searchBarContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 25,
    paddingHorizontal: 5, marginBottom: 20, width: '100%', maxWidth: 500, height: 50,
    elevation: 3, shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3
  },
  searchIconButton: { padding: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#333333', height: '100%', paddingLeft: 5 },
  barcodeIconContainer: {
     paddingHorizontal: 12, height: '100%', justifyContent: 'center', alignItems: 'center',
     borderLeftWidth: 1, borderLeftColor: '#E8E8E8', marginLeft: 8
    },

  contentPlaceholder: {
    marginTop: 25, alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20,
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 15,
    elevation: 2, shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2
    },
  placeholderTitle: { fontSize: 18, fontWeight: '600', color: '#2C3E50', marginBottom: 10, textAlign: 'center' },
  placeholderText: { fontSize: 14, color: '#566573', textAlign: 'center', lineHeight: 21, marginBottom: 12 },

  modalSafeArea: { flex: 1, backgroundColor: 'black' }, // Black background for scanner modal
  closeModalButton: {
     position: 'absolute', top: Platform.OS === 'ios' ? 60 : 25, right: 20,
     backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 6, zIndex: 10
     },

   // Added a loading container style if needed for initial permission request state
   loadingContainer: {
       flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F6F8'
   }
});

export default HomeScreen;