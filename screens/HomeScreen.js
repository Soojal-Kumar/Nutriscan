// screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar, Platform, Alert,
  Modal, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';

// Assuming THEME_COLOR is defined in dummyData or your constants file
import { DUMMY_PRODUCTS, THEME_COLOR_PRIMARY as THEME_COLOR } from '../config/dummyData';
import ProductDetailCard from '../components/ProductDetailCard';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [currentProduct, setCurrentProduct] = useState(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraModalVisible, setIsCameraModalVisible] = useState(false);
  const [scanned, setScanned] = useState(false);

  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(3); // Example unread count, fetch this dynamically later

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
        console.log("[HomeScreen] Initial permission check, requesting.");
        requestPermission();
    } else if (permission && permission.granted) {
        console.log("[HomeScreen] Camera permission already granted.");
    }
  }, [permission, requestPermission]);


  const fetchProductData = (identifier, isFromScan = false) => {
    console.log(`[HomeScreen] fetchProductData called with identifier: "${identifier}", isFromScan: ${isFromScan}`);
    let product = null;
    const identifierLower = typeof identifier === 'string' ? identifier.toLowerCase() : identifier;

    if (DUMMY_PRODUCTS[identifier]) {
      product = DUMMY_PRODUCTS[identifier];
    } else if (DUMMY_PRODUCTS[identifierLower]) {
      product = DUMMY_PRODUCTS[identifierLower];
    }

    if (product) {
      console.log("[HomeScreen] Product found by direct key:", product.name);
      setCurrentProduct(product);
      setSearchText(product.name);
    } else {
      console.log("[HomeScreen] Product NOT found for identifier:", identifier);
      setCurrentProduct(null);
      Alert.alert(
        "Product Not Found",
        `We couldn't find "${identifier}" in our database. Would you like to help add it?`,
        [
          { text: "Not Now", style: "cancel", onPress: () => { if (!isFromScan) setSearchText(''); } },
          {
            text: "Yes, Contribute",
            onPress: () => navigation.navigate('ContributeProduct', {
              searchTerm: isFromScan ? '' : identifier,
              barcode: isFromScan ? identifier : '',
            }),
          },
        ]
      );
    }
  };

  const handleSearchIconPress = () => {
    const searchTermToProcess = searchText.trim();
    if (!searchTermToProcess) {
      setCurrentProduct(null);
      return;
    }
    console.log("[HomeScreen] handleSearchIconPress with searchTerm:", searchTermToProcess);
    const searchTermLower = searchTermToProcess.toLowerCase();

    if (DUMMY_PRODUCTS[searchTermToProcess] || DUMMY_PRODUCTS[searchTermLower]) {
      console.log("[HomeScreen] Search term matches a product key directly.");
      fetchProductData(DUMMY_PRODUCTS[searchTermToProcess] ? searchTermToProcess : searchTermLower, false);
      return;
    }

    const foundProductKeyByName = Object.keys(DUMMY_PRODUCTS).find(
      key => DUMMY_PRODUCTS[key].name.toLowerCase().includes(searchTermLower)
    );

    if (foundProductKeyByName) {
      console.log("[HomeScreen] Product found by name search, key:", foundProductKeyByName);
      fetchProductData(foundProductKeyByName, false);
    } else {
      console.log("[HomeScreen] No product found by key or name search for term:", searchTermToProcess);
      setCurrentProduct(null);
      Alert.alert(
        "Product Not Found",
        `No product found matching "${searchTermToProcess}". Would you like to contribute it?`,
        [
          { text: "Cancel", style: "cancel", onPress: () => setSearchText('') },
          {
            text: "Contribute",
            onPress: () => navigation.navigate('ContributeProduct', {
              searchTerm: searchTermToProcess,
              barcode: '',
            }),
          },
        ]
      );
    }
  };

  const handleOpenScannerModal = async () => {
    console.log("[HomeScreen] Opening scanner modal. Current permission:", permission);
    let currentPermissionStatus = permission;

    if (!currentPermissionStatus || !currentPermissionStatus.granted) {
        console.log("[HomeScreen] Requesting/Re-requesting camera permission.");
        currentPermissionStatus = await requestPermission();
    }

    if (currentPermissionStatus && currentPermissionStatus.granted) {
      console.log("[HomeScreen] Camera permission granted. Opening modal.");
      setScanned(false);
      setIsCameraModalVisible(true);
    } else {
      if (currentPermissionStatus && !currentPermissionStatus.canAskAgain) {
          Alert.alert(
              "Camera Permission Required",
              "Camera permission has been permanently denied. Please enable it in your device settings to use the scanner."
          );
      } else {
          Alert.alert(
              "Camera Permission Denied",
              "Camera access is needed to scan barcodes. Please grant permission if prompted again."
          );
      }
    }
  };

  const handleBarCodeScanned = (scanningResult) => {
    if (scanned) return;
    const { data: barcodeData } = scanningResult;
    console.log("[HomeScreen] Barcode scanned, data:", barcodeData);
    setScanned(true);
    setIsCameraModalVisible(false);
    fetchProductData(barcodeData, true);
  };

  const handleClearProduct = () => {
    console.log("[HomeScreen] Clearing current product.");
    setCurrentProduct(null);
    setSearchText('');
  };

  if (permission === null && Platform.OS !== 'web') {
    return (
      <SafeAreaView style={[styles.safeArea, {justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color={THEME_COLOR} />
        <Text style={{marginTop: 10, color: '#555'}}>Checking camera permission...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_COLOR} />

      {/* HEADER WITH BELL ICON */}
      <LinearGradient
        colors={THEME_COLOR ? [THEME_COLOR, '#00A040'] : ['#00C853', '#00A040']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerContainer}
      >
        <View style={styles.headerIconPlaceholder} /> {/* For balance if title is not perfectly centered */}
        <Text style={styles.headerTitle}>SCAN & DISCOVER</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')} // Make sure 'Notifications' screen is in your navigator
          style={styles.notificationBell}
        >
          <Ionicons name="notifications-outline" size={26} color="#fff" />
          {unreadNotificationsCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchBarContainer}>
          <TouchableOpacity onPress={handleSearchIconPress} style={styles.searchIconButton}>
            <Ionicons name="search-outline" size={24} color="#757575" />
          </TouchableOpacity>
          <TextInput
            placeholder="Search Product Name or Key"
            placeholderTextColor="#A0A0A0"
            style={styles.searchInput}
            value={searchText}
            onChangeText={(text) => {
                setSearchText(text);
                if(text.trim() === '' && currentProduct) {
                    setCurrentProduct(null);
                }
            }}
            onSubmitEditing={handleSearchIconPress}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={handleOpenScannerModal} style={styles.barcodeIconContainer}>
            <Ionicons name="barcode-outline" size={28} color={THEME_COLOR || '#00C853'} />
          </TouchableOpacity>
        </View>

        {currentProduct ? (
          <ProductDetailCard product={currentProduct} onClearProduct={handleClearProduct} />
        ) : (
          <View style={styles.contentPlaceholder}>
            <Ionicons name="fast-food-outline" size={screenWidth * 0.15} color="#D1D5DB" style={{ marginBottom: 15 }} />
            <Text style={styles.placeholderTitle}>Find Your Food</Text>
            <Text style={styles.placeholderText}>
              Scan a product barcode or search by name to view its details, allergens, and healthier alternatives.
            </Text>
            <Text style={styles.placeholderSmallText}>Try searching "Pan Cakes" or "Organic Milk Bread".</Text>
            <Text style={styles.placeholderSmallText}>Or enter a key: "pancakes123" or "milkbread456".</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={false}
        visible={isCameraModalVisible}
        onRequestClose={() => { setIsCameraModalVisible(false); setScanned(false); }}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          {permission && permission.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code39", "code128", "pdf417", "aztec", "datamatrix"],
              }}
            >
              <View style={styles.cameraModalOverlay}>
                <View style={styles.scannerFocusBoxOuter}>
                    <View style={styles.scannerFocusBoxInner} />
                </View>
                <Text style={styles.scannerInstructionText}>Align barcode within the frame</Text>
              </View>
            </CameraView>
          ) : (
            <View style={styles.permissionDeniedContainer}>
              <Ionicons name="camera-off-outline" size={60} color="rgba(255,255,255,0.7)" style={{marginBottom: 20}}/>
              <Text style={styles.permissionDeniedText}>
                {permission === null ? "Initializing camera..." :
                 !permission?.granted && permission?.canAskAgain ? "Camera access is needed to scan barcodes." :
                 "Camera permission denied. Please enable it in your device settings to use the scanner."}
              </Text>
              {permission && !permission.granted && permission.canAskAgain && (
                  <TouchableOpacity style={styles.requestPermissionButton} onPress={requestPermission}>
                      <Text style={styles.requestPermissionButtonText}>Grant Permission</Text>
                  </TouchableOpacity>
              )}
            </View>
          )}
          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={() => { setIsCameraModalVisible(false); setScanned(false); }}
          >
            <Ionicons name="close-circle" size={36} color="white" />
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  // UPDATED/ADDED HEADER STYLES FOR BELL ICON
  headerContainer: {
    flexDirection: 'row', // To allow items side-by-side
    justifyContent: 'space-between', // Pushes title to center, icons to sides
    alignItems: 'center', // Vertical alignment
    // *** CHANGES MADE HERE: Removed dynamic padding, Added fixed height ***
    height: 60, // <--- Set your desired fixed height here (e.g., 55, 56, 60)
    // paddingTop and paddingBottom removed
    // *** END CHANGES ***

    paddingHorizontal: 15, // Keep horizontal padding for content
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerIconPlaceholder: { // To balance the title if one side has an icon and other doesn't
    width: 30, // Adjust to roughly match the width of your icon + padding
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    // textAlign: 'center', // Not needed if using space-between and placeholder for balance
  },
  notificationBell: {
    padding: 5, // Make touchable area slightly larger
    position: 'relative', // For positioning the badge
  },
  notificationBadge: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: 'red',
    borderRadius: 9, // Make it circular
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1, // Optional: white border around badge
    borderColor: '#fff',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // END OF UPDATED/ADDED HEADER STYLES

  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 15,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80, // Keep padding bottom for scroll view content
    alignItems: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 5,
    marginBottom: 20,
    width: '100%',
    maxWidth: 500,
    height: 50,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  searchIconButton: {
      padding: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
    height: '100%',
    paddingLeft: 5,
  },
  barcodeIconContainer: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#E8E8E8',
    marginLeft: 8,
  },
  contentPlaceholder: {
    marginTop: 25,
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#566573',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 12,
  },
   placeholderSmallText: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
    marginTop: 4,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: 'black',
  },
  permissionDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    padding: 30,
  },
  permissionDeniedText: {
    color: 'white',
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  requestPermissionButton: {
      backgroundColor: THEME_COLOR || '#00C853',
      paddingVertical: 12,
      paddingHorizontal: 25,
      borderRadius: 25,
  },
  requestPermissionButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
  },
  cameraModalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFocusBoxOuter: {
    flex:1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  scannerFocusBoxInner: {
    width: screenWidth * 0.75,
    height: screenWidth * 0.45,
    borderColor: 'rgba(255,255,255,0.8)',
    borderWidth: 2,
    borderRadius: 12,
  },
  scannerInstructionText: {
    position: 'absolute',
    bottom: screenHeight * 0.12,
    fontSize: 15,
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    textAlign: 'center',
  },
  closeModalButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 25, // Adjusted slightly for fixed height header
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 6,
    zIndex: 10,
  },
});

export default HomeScreen;