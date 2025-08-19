// screens/SignupScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Platform,
  Alert, // Keep Alert for validation/error popups
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
  Pressable, // Keep Pressable
} from 'react-native';

// Import necessary icons
import { MaterialCommunityIcons, Entypo, Ionicons } from '@expo/vector-icons';

// Import Checkbox
import Checkbox from 'expo-checkbox';

// Import Country Picker
import { CountryPicker } from "react-native-country-codes-picker";

// Firebase imports
import { auth, db } from '../config/firebase'; // Import auth and firestore db instance
// Import createUserWithEmailAndPassword, sendEmailVerification, and signOut
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; // Import Firestore methods

// Import constants (assuming this path is correct)
import { AVATAR_OPTIONS, ALLERGY_OPTIONS, THEME_COLOR } from '../config/constants';


const SignupScreen = ({ navigation }) => {
  // State for core signup fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Loading state

  // State for Country Picker
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null); // Stores country object

  // State for Avatar Selection
  const [selectedAvatar, setSelectedAvatar] = useState(null); // Stores avatar ID

  // State for Allergy Selection
  const [selectedAllergies, setSelectedAllergies] = useState([]); // Stores array of allergy strings
  const [isAllergyModalVisible, setIsAllergyModalVisible] = useState(false);
  const [allergySearchTerm, setAllergySearchTerm] = useState('');


const handleSignup = async () => {
  // --- Validation ---
  if (!selectedAvatar) {
    Alert.alert("Validation Error", "Please select a profile picture.");
    return;
  }
  if (!username.trim()) {
    Alert.alert("Validation Error", "Username is required.");
    return;
  }
  if (!email.trim()) {
    Alert.alert("Validation Error", "Email is required.");
    return;
  }
  if (!password.trim()) {
    Alert.alert("Validation Error", "Password is required.");
    return;
  }
   if (password.trim().length < 6) {
       Alert.alert("Validation Error", "Password must be at least 6 characters.");
       return;
   }
  if (!selectedCountry) {
    Alert.alert("Validation Error", "Please select your country.");
    return;
  }
  if (!agreeToTerms) {
    Alert.alert("Terms", "You must agree to the terms and conditions and privacy policy.");
    return;
  }

  setIsLoading(true); // Start loading indicator

  try {
    // --- START: Firebase Authentication & Firestore Save ---

    // 1. Create user with Email and Password in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
    const user = userCredential.user;
    console.log('Firebase user created:', user.uid);

    // User is automatically logged in at this point.
    // The onAuthStateChanged listener in App.js will fire now, briefly showing Home.

    // 2. Prepare user data to save to Firestore
    const selectedAvatarData = AVATAR_OPTIONS.find(avatar => avatar.id === selectedAvatar);
    const avatarUrlToStore = selectedAvatarData ? selectedAvatarData.uri : null;

    const userData = {
      uid: user.uid,
      username: username.trim(),
      email: email.trim(),
      avatarId: selectedAvatar,
      avatarUrl: avatarUrlToStore,
      selectedAllergies: selectedAllergies,
      country: selectedCountry.name.en || selectedCountry.name.official || selectedCountry.name,
      countryCode: selectedCountry.code,
      createdAt: new Date(),
    };

    // 3. Save user data to Firestore WHILE the user is still logged in
    console.log('Saving user data to Firestore for UID:', user.uid);
    await setDoc(doc(db, "users", user.uid), userData);
    console.log('User data saved to Firestore.');


    // 4. Send verification email
    console.log('Sending verification email...');
    await sendEmailVerification(user);
    console.log('Verification email sent.');


    // 5. Sign the user out immediately after verification email sent and data saved
    // This allows App.js to detect the logout and switch back to AuthNavigator
    await signOut(auth);
    console.log('User signed out after signup process.');


    // --- REMOVE SUCCESS ALERT FROM HERE ---
    // Alert.alert("Account Created", "Your account has been created. Please check your email to verify it, then you can log in.", ...);


    // 6. Clear form state
    setUsername('');
    setEmail('');
    setPassword('');
    setSelectedAvatar(null);
    setSelectedAllergies([]);
    setSelectedCountry(null);
    setAgreeToTerms(false);
    setShowPassword(false);
    setIsAllergyModalVisible(false);
    setAllergySearchTerm('');

    // 7. Navigate to Login screen AND pass a success parameter
    // This parameter will tell the Login screen to show the alert
    // Use nested navigation syntax to target the Login screen inside the Auth navigator
    console.log('Navigating to Auth (root stack) with signupSuccess=true');
    navigation.navigate('Auth', { screen: 'Login', params: { signupSuccess: true } });


    // --- END: Firebase Authentication & Firestore Save ---

  } catch (error) {
    // --- Firebase Error Handling ---
    console.error("Signup Error:", error);

    let errorMessage = "An unexpected error occurred during signup.";
    if (error && typeof error.code === 'string') {
       switch (error.code) {
          case 'auth/email-already-in-use':
             errorMessage = 'The email address is already in use by another account.';
             break;
          case 'auth/invalid-email':
             errorMessage = 'The email address is not valid.';
             break;
          case 'auth/operation-not-allowed':
             errorMessage = 'Email/Password sign-in is not enabled. (Check Firebase console)';
             break;
          case 'auth/weak-password':
             errorMessage = 'The password is too weak. Please choose a stronger password (minimum 6 characters).';
             break;
          default:
             // Use the specific Firebase error message if none of the common ones match
             errorMessage = error.message;
       }
    } else {
      errorMessage = error.message || errorMessage;
    }
    Alert.alert("Sign Up Failed", errorMessage); // Keep error alert for failure
  } finally {
    setIsLoading(false); // Stop loading indicator
  }
};


  // --- Allergy Modal Handlers ---
  const toggleAllergyInModal = (allergy) => {
    setSelectedAllergies(prev =>
      prev.includes(allergy)
        ? prev.filter(a => a !== allergy)
        : [...prev, allergy]
    );
  };

  const removeAllergyChip = (allergyToRemove) => {
    setSelectedAllergies(prev => prev.filter(allergy => allergy !== allergyToRemove));
  };

  const filteredAllergiesForModal = ALLERGY_OPTIONS.filter(allergy =>
    allergy.toLowerCase().includes(allergySearchTerm.toLowerCase())
  );
  // --- End Allergy Modal Handlers ---


  // --- UI Rendering ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.title}>Create an account</Text>
          <Text style={styles.subtitle}>
            Provide the requested information to create your account and access the platform.
            Your details are securely handled, ensuring a seamless sign-up process.
          </Text>

          {/* Profile Picture Selection */}
          <Text style={styles.inputLabel}>Choose your Profile Picture</Text>
          <View style={styles.avatarContainer}>
            {AVATAR_OPTIONS.map((avatar) => (
              <TouchableOpacity
                key={avatar.id}
                style={[
                  styles.avatarTouchable,
                  selectedAvatar === avatar.id && styles.avatarSelected,
                ]}
                onPress={() => setSelectedAvatar(avatar.id)}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <Image source={{ uri: avatar.uri }} style={styles.avatarImage} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Username Input */}
          <Text style={styles.inputLabel}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Write here"
            placeholderTextColor="#aaa"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            editable={!isLoading}
          />

          {/* Email Input */}
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="your@mail.com"
            placeholderTextColor="#aaa"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
          />

          {/* Password Input */}
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Write here (min. 6 characters)"
              placeholderTextColor="#aaa"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon} disabled={isLoading}>
              <MaterialCommunityIcons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color="#888"
              />
            </TouchableOpacity>
          </View>

          {/* Allergies Selection */}
          <Text style={styles.inputLabel}>Allergies (optional)</Text>
          <View style={styles.allergiesOuterContainer}>
            <TouchableOpacity
              style={styles.allergiesChipInputArea}
              onPress={() => setIsAllergyModalVisible(true)}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              {selectedAllergies.length === 0 ? (
                <Text style={styles.allergiesPlaceholder}>Tap to add allergies</Text>
              ) : (
                <View style={styles.chipsWrapper}>
                  {selectedAllergies.map(allergy => (
                    <View key={allergy} style={styles.chip}>
                      <Text style={styles.chipText}>{allergy}</Text>
                      <TouchableOpacity
                        onPress={() => removeAllergyChip(allergy)}
                        style={styles.chipRemoveIconTouchable}
                      >
                        <Ionicons name="close-circle" size={18} color="#555" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
            {selectedAllergies.length > 0 && (
                 <TouchableOpacity onPress={() => setIsAllergyModalVisible(true)} style={styles.editAllergiesButton} disabled={isLoading}>
                    <MaterialCommunityIcons name="pencil-outline" size={22} color="#666" />
                 </TouchableOpacity>
            )}
          </View>

          {/* Country Selection */}
          <Text style={styles.inputLabel}>Country</Text>
          <TouchableOpacity
            style={styles.countrySelectorButton}
            onPress={() => setShowCountryPicker(true)}
             disabled={isLoading}
          >
            <View style={styles.countrySelectorButtonInner}>
              {selectedCountry ? (
                <>
                  <Text style={styles.flagEmoji}>{selectedCountry.flag}</Text>
                  <Text style={styles.countryNameText}>{selectedCountry.name.en || selectedCountry.name.official}</Text>
                </>
              ) : (
                <Text style={styles.placeholderStyle}>Select Country</Text>
              )}
            </View>
            <Entypo name="chevron-down" size={24} color="#888" style={styles.chevronIcon} />
          </TouchableOpacity>

          <CountryPicker
            show={showCountryPicker}
            pickerButtonOnPress={(item) => {
              setSelectedCountry(item);
              setShowCountryPicker(false);
            }}
            onBackdropPress={() => setShowCountryPicker(false)}
            style={{
                modal: {
                    height: Platform.OS === 'ios' ? '70%' : '80%',
                },
            }}
          />

          <View style={styles.termsContainer}>
            <Checkbox
              style={styles.checkbox}
              value={agreeToTerms}
              onValueChange={setAgreeToTerms}
              color={agreeToTerms ? THEME_COLOR : undefined}
               disabled={isLoading}
            />
            {/* Text with tappable links */}
            <Text style={styles.termsText}>
              Agree to{' '}
              {/* Terms link */}
              <Text style={[styles.linkText, {color: THEME_COLOR}]} onPress={() => navigation.navigate('Terms')} disabled={isLoading}>
                terms & conditions
              </Text>{' '}
              and{' '}
              {/* Privacy link */}
              <Text style={[styles.linkText, {color: THEME_COLOR}]} onPress={() => navigation.navigate('Privacy')} disabled={isLoading}>
                privacy policy
              </Text>
            </Text>
          </View>

          {/* Create Account Button */}
          <TouchableOpacity
            style={[styles.createAccountButton, isLoading && styles.disabledButton, {backgroundColor: THEME_COLOR}]}
            onPress={handleSignup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.createAccountButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Prompt */}
          <View style={styles.loginPrompt}>
            <Text style={styles.loginText}>You already have an account? </Text>
            {/* Button to navigate to Login screen */}
            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={isLoading}>
              <Text style={[styles.loginLink, {color: THEME_COLOR}]}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Allergy Selection Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={isAllergyModalVisible}
        onRequestClose={() => {
          setIsAllergyModalVisible(false);
          setAllergySearchTerm('');
        }}
      >
        {/* Modal content container */}
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header with Title and Done button */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Allergies</Text>
            {/* Done button to close modal */}
            <TouchableOpacity onPress={() => {
              setIsAllergyModalVisible(false);
              setAllergySearchTerm('');
            }}>
              <Text style={[styles.doneButton, {color: THEME_COLOR}]}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Search input for allergies */}
          <TextInput
            style={styles.modalSearchInput}
            placeholder="Search allergies..."
            value={allergySearchTerm}
            onChangeText={setAllergySearchTerm}
            placeholderTextColor="#999"
          />

          {/* List of filterable allergies */}
          <FlatList
            data={filteredAllergiesForModal}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalAllergyItem}
                onPress={() => toggleAllergyInModal(item)}
              >
                <Checkbox
                  style={styles.modalCheckbox}
                  value={selectedAllergies.includes(item)}
                  onValueChange={() => toggleAllergyInModal(item)}
                  color={selectedAllergies.includes(item) ? THEME_COLOR : undefined}
                />
                <Text style={styles.modalAllergyText}>{item}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center' },
  container: {
    paddingHorizontal: 30,
    paddingVertical: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 40,
    backgroundColor: '#fff',
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30, lineHeight: 20 },
  inputLabel: { fontSize: 14, color: '#333', marginBottom: 8, alignSelf: 'flex-start', marginTop: 15 },
  input: {
    backgroundColor: '#F5F5F5', paddingHorizontal: 15, paddingVertical: 12,
    borderRadius: 8, fontSize: 16, marginBottom: 15, borderWidth: 1,
    borderColor: '#E0E0E0', width: '100%',
  },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5',
    borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 15, width: '100%',
  },
  passwordInput: { flex: 1, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16 },
  eyeIcon: { paddingHorizontal: 10 },

  // Avatar Selection Styles
  avatarContainer: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    marginBottom: 20, marginTop: 5,
  },
  avatarTouchable: {
    padding: 3, borderWidth: 4, borderColor: 'transparent',
    borderRadius: 50, alignItems: 'center', justifyContent: 'center',
  },
  avatarSelected: {
    borderColor: THEME_COLOR,
  },
  avatarImage: {
    width: 80, height: 80,
  },

  // Allergies Chip Input Area Styles
  allergiesOuterContainer: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 15,
  },
  allergiesChipInputArea: {
    flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
    backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', minHeight: 50,
  },
  allergiesPlaceholder: { fontSize: 16, color: '#aaa' },
  chipsWrapper: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#e9e9e9',
    borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, margin: 4,
  },
  chipText: { fontSize: 14, color: '#333', marginRight: 6 },
  chipRemoveIconTouchable: {},
  editAllergiesButton: {
    marginLeft: 10, padding: 5, justifyContent: 'center', alignItems: 'center',
    height: 40, width: 40,
  },
  countrySelectorButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F5F5F5', paddingHorizontal: 15, paddingVertical: 12,
    borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 15,
    width: '100%', height: 50,
  },
  countrySelectorButtonInner: {
    flexDirection: 'row', alignItems: 'center',
  },
  flagEmoji: {
    fontSize: Platform.OS === 'android' ? 20 : 24,
    marginRight: 10,
  },
  countryNameText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#aaa',
  },
  chevronIcon: {},
  termsContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, marginTop: 10 },
  checkbox: { marginRight: 10 },
  termsText: { flex: 1, color: '#666', fontSize: 12 },
  linkText: { textDecorationLine: 'underline' },

  // Create Account Button Styles
  createAccountButton: {
    paddingVertical: 15, borderRadius: 25, alignItems: 'center', marginTop: 20,
  },
  createAccountButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  disabledButton: { opacity: 0.6 },

  // Login Prompt Styles
  loginPrompt: { flexDirection: 'row', justifyContent: 'center', marginTop: 30, paddingBottom: 20 },
  loginText: { color: '#666', fontSize: 14 },
  loginLink: { fontWeight: 'bold', fontSize: 14 },

  // Modal Styles (General)
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 15 : StatusBar.currentHeight + 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  doneButton: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSearchInput: {
    height: 45,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginHorizontal: 20,
    marginVertical: 15,
    fontSize: 16,
  },
  modalAllergyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  modalAllergyText: {
    fontSize: 16,
    marginLeft: 15,
    color: '#333',
    flex: 1,
  },
  modalCheckbox: {},
  modalSeparator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 20 + 15 + 8,
  },
});

export default SignupScreen;