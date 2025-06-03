// screens/ProfileScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Image, ActivityIndicator,
  ScrollView, TouchableOpacity, Modal, TextInput, FlatList, Alert,
  Platform, StatusBar, Dimensions // Import Dimensions
} from 'react-native';
import { auth, db } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword as firebaseUpdatePassword,
  signOut,
} from 'firebase/auth';
import { Ionicons, MaterialCommunityIcons, Entypo, Feather } from '@expo/vector-icons';
import Checkbox from 'expo-checkbox';
import { CountryPicker } from "react-native-country-codes-picker";
import { LinearGradient } from 'expo-linear-gradient'; // <-- Import LinearGradient

// Assuming these are correctly imported from your constants file
import { AVATAR_OPTIONS, ALLERGY_OPTIONS, THEME_COLOR_PRIMARY as THEME_COLOR, PLACEHOLDER_AVATAR } from '../config/constants';

const { height: screenHeight } = Dimensions.get('window'); // Get screen height for bottom padding

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  // Check if timestamp is a Firestore Timestamp object and has a toDate method
  if (typeof timestamp.toDate === 'function') {
      try {
        return timestamp.toDate().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      } catch (e) {
        console.error("Error formatting Firestore Timestamp:", e);
        return 'Invalid Date';
      }
  }
  // Fallback for Date objects or other date-like values
  try {
      return new Date(timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
      console.error("Error formatting general date value:", e);
      return 'Invalid Date';
  }
};


const ProfileScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);
  const [isUsernameModalVisible, setIsUsernameModalVisible] = useState(false);
  const [isAllergiesModalVisible, setIsAllergiesModalVisible] = useState(false);
  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [tempSelectedAllergies, setTempSelectedAllergies] = useState([]);
  const [allergySearchTerm, setAllergySearchTerm] = useState('');
  const [tempSelectedCountry, setTempSelectedCountry] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false); // State for modal update loading

  const currentUser = auth.currentUser;

  const fetchUserData = useCallback(async () => {
    console.log("[ProfileScreen] Attempting to fetch user data...");
    if (currentUser) {
      setIsLoading(true);
      setError(null);
      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          console.log("[ProfileScreen] User data fetched:", data);
          setUserData(data);
          setNewUsername(data.username || '');
          setTempSelectedAllergies(data.selectedAllergies || []);
        } else {
          // This case might happen for new users right after sign up
          console.warn("[ProfileScreen] User data document does not exist for:", currentUser.uid);
          // setError("Profile data not found. Setting up defaults..."); // Optional: set error here
           // Set some default empty data structure for display and editing
           setUserData({
               email: currentUser.email,
               createdAt: currentUser.metadata.creationTime ? new Date(currentUser.metadata.creationTime) : null, // Use JS Date
               username: '',
               avatarUrl: PLACEHOLDER_AVATAR,
               avatarId: 'default', // Assuming 'default' is an ID in AVATAR_OPTIONS
               selectedAllergies: [],
               country: '',
               countryCode: '',
           });
           setNewUsername('');
           setTempSelectedAllergies([]);
           // Optionally alert the user or navigate them to a profile setup flow
           // Alert.alert("Welcome!", "Your profile data is being set up. Please fill in details below.");
        }
      } catch (err) {
        console.error("[ProfileScreen] Error fetching user data:", err);
        setError("Failed to fetch user data. Please try again.");
        setUserData(null); // Clear data on error
      }
      setIsLoading(false);
    } else {
      console.warn("[ProfileScreen] No user logged in, cannot fetch profile.");
      setError("You are not logged in.");
      setUserData(null); // Clear data if not logged in
      setIsLoading(false);
    }
  }, [currentUser]); // Added currentUser to deps as it can change (login/logout)

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // --- Helper function to update a single field in Firestore and local state ---
  const handleUpdateField = async (field, value) => {
    if (!currentUser) {
        Alert.alert("Authentication Required", "Please log in to update your profile.");
        return false;
    }
    setIsUpdating(true); // Start general updating state
    const userDocRef = doc(db, "users", currentUser.uid);
    try {
      await updateDoc(userDocRef, { [field]: value });
      // Update local state immediately for faster UI feedback
      setUserData(prev => ({ ...prev, [field]: value }));
      // Alert.alert("Success", `${field.charAt(0).toUpperCase() + field.slice(1)} updated.`); // Maybe less alerts?
      console.log(`[ProfileScreen] Successfully updated ${field}.`);
      return true;
    } catch (err) {
      console.error(`[ProfileScreen] Failed to update ${field}:`, err);
      Alert.alert("Error", `Failed to update ${field}. ${err.message || ''}`);
      return false;
    } finally {
      setIsUpdating(false); // End general updating state
    }
  };

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) {
      Alert.alert("Validation Error", "Username cannot be empty.");
      return;
    }
    // Check if username is actually changed
    if (userData && newUsername.trim() === userData.username) {
         setIsUsernameModalVisible(false); // Just close if no change
         return;
    }
    const success = await handleUpdateField('username', newUsername.trim());
    if (success) setIsUsernameModalVisible(false);
  };

  const handleUpdateAvatar = async (avatarId) => {
    const selectedAvatarData = AVATAR_OPTIONS.find(avatar => avatar.id === avatarId);
    if (!selectedAvatarData) {
        Alert.alert("Error", "Invalid avatar selected.");
        return;
    }
    if (!currentUser) {
         Alert.alert("Authentication Required", "Please log in to update your profile picture.");
         return;
    }
     // Check if avatar is actually changed
     if (userData && avatarId === userData.avatarId) {
         setIsAvatarModalVisible(false); // Just close if no change
         return;
     }
    // Avatar update is handled by handleUpdateField, which sets isUpdating
    const success = await handleUpdateField('avatarUrl', selectedAvatarData.uri);
    if (success) {
      // Also update avatarId locally if you store it, though the field update above handles avatarUrl
       setUserData(prev => ({ ...prev, avatarId: avatarId })); // Manually update avatarId state
       setIsAvatarModalVisible(false);
    }
  };

  const handleUpdateAllergies = async () => {
     if (!currentUser) {
         Alert.alert("Authentication Required", "Please log in to update your allergies.");
         return;
     }
    // Check if allergies are actually changed
    const currentAllergies = userData?.selectedAllergies || [];
    // Need to sort both arrays for a reliable string comparison
    const areAllergiesChanged = JSON.stringify(tempSelectedAllergies.sort()) !== JSON.stringify(currentAllergies.sort());


    if (!areAllergiesChanged) {
      setIsAllergiesModalVisible(false); // Just close if no change
      setAllergySearchTerm(''); // Clear search on close
      return;
    }

    const success = await handleUpdateField('selectedAllergies', tempSelectedAllergies);
    if (success) {
      setIsAllergiesModalVisible(false);
      setAllergySearchTerm(''); // Clear search on close
    }
  };

  const handleUpdateCountry = async () => {
    if (!tempSelectedCountry || !currentUser) {
         Alert.alert("Validation Error", "Please select a country.");
         return;
    }
    const countryName = tempSelectedCountry.name.en || tempSelectedCountry.name.official;
    const countryCode = tempSelectedCountry.code;

     // Check if country is actually changed
     if (userData && userData.countryCode === countryCode) {
         setIsCountryModalVisible(false); // Just close if no change
         setTempSelectedCountry(null); // Clear selected country in modal state
         return;
     }
     if (!currentUser) {
        Alert.alert("Authentication Required", "Please log in to update your country.");
        return;
     }

    setIsUpdating(true); // Start general updating state
    const userDocRef = doc(db, "users", currentUser.uid);
    try {
      await updateDoc(userDocRef, { country: countryName, countryCode: countryCode });
      setUserData(prev => ({ ...prev, country: countryName, countryCode: countryCode }));
      Alert.alert("Success", "Country updated.");
      setIsCountryModalVisible(false);
      setTempSelectedCountry(null); // Clear selected country in modal state
    } catch (err) {
      console.error("[ProfileScreen] Failed to update country:", err);
      Alert.alert("Error", "Failed to update country.");
    } finally {
      setIsUpdating(false); // End general updating state
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert("Validation Error", "All password fields are required.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert("Validation Error", "New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Validation Error", "New password must be at least 6 characters long.");
      return;
    }
    if (newPassword === currentPassword) {
        Alert.alert("Validation Error", "New password must be different from your current password.");
        return;
    }

    if (!currentUser || !currentUser.email) {
        // This case should theoretically not happen if currentUser is checked before calling
        Alert.alert("Error", "User not authenticated correctly for password change.");
        return;
    }

    setIsUpdating(true); // Use a specific loading state for password change if desired, or the general one
    try {
      // Reauthenticate the user
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update the password
      await firebaseUpdatePassword(currentUser, newPassword);

      Alert.alert("Success", "Password updated successfully.");
      setIsPasswordModalVisible(false);
      // Clear password fields after success
      setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
    } catch (error) {
      console.error("[ProfileScreen] Password Change Error:", error);
      let errorMessage = "Failed to update password.";
      if (error.code === 'auth/wrong-password') errorMessage = "Incorrect current password.";
      else if (error.code === 'auth/too-many-requests') errorMessage = "Too many attempts. Please try again later.";
      else if (error.code === 'auth/user-token-expired') errorMessage = "Your session has expired. Please log out and log in again to change your password.";
      else if (error.code === 'auth/weak-password') errorMessage = "The new password is too weak.";
      else if (error.code === 'auth/requires-recent-login') errorMessage = "Please log out and log in again to change your password."; // Similar to user-token-expired
      Alert.alert("Password Change Error", errorMessage);
    } finally {
      setIsUpdating(false); // End general updating state
    }
  };


  const toggleAllergyInModal = (allergy) => {
    setTempSelectedAllergies(prev =>
      prev.includes(allergy) ? prev.filter(a => a !== allergy) : [...prev, allergy]
    );
  };

  const filteredAllergiesForModal = ALLERGY_OPTIONS.filter(allergy =>
    allergy.toLowerCase().includes(allergySearchTerm.toLowerCase())
  );

  const handleLogout = () => {
     if (isUpdating) return; // Prevent logout while an update is in progress
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout", style: "destructive",
        onPress: async () => {
          try {
             setIsUpdating(true); // Set updating state during logout
            await signOut(auth);
            // Navigation to login is typically handled by onAuthStateChanged listener in App.js
          } catch (error) {
             console.error("[ProfileScreen] Logout Error:", error);
            Alert.alert("Logout Error", "Could not sign out. Please try again.");
          } finally {
              setIsUpdating(false); // Reset updating state
          }
        }
      }
    ]);
  };

  // --- Conditional Render for Initial Loading/Error ---
  // Shows a full screen view before any profile data is loaded
  if (isLoading && !userData && !error) { // Only show full screen loader if no data has been loaded yet AND no initial error
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
         {/* Status bar for this loading view */}
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
         {/* --- Check for whitespace here --- */}
        <ActivityIndicator size="large" color={THEME_COLOR} />
         {/* --- Check for whitespace here --- */}
        <Text style={styles.statusText}>Loading Profile...</Text>
      </SafeAreaView>
    );
  }

   // Error state check
   // Shows a full screen error if initial data fetch failed
   if (error && !userData) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
         {/* Status bar for this error view */}
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
         {/* --- Check for whitespace here --- */}
        <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#d9534f" />
         {/* --- Check for whitespace here --- */}
        <Text style={[styles.statusText, styles.errorText]}>{error}</Text>
         {/* --- Check for whitespace here --- */}
        <TouchableOpacity style={styles.retryButton} onPress={fetchUserData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  // --- End Conditional Render for Initial Loading/Error ---


  // Main Profile View
  // Renders even if there's no data but no initial error (e.g., new user with default state)
  return (
    <SafeAreaView style={styles.safeArea}>
       {/* Status bar for the main view, style based on header color */}
      <StatusBar barStyle="light-content" backgroundColor={THEME_COLOR} />

      {/* --- CUSTOM FIXED HEADER START --- */}
       <LinearGradient
        colors={THEME_COLOR ? [THEME_COLOR, '#00A040'] : ['#00C853', '#00A040']} // Same gradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.appHeaderContainer} // Apply fixed height and row layout here
      >
        {/* Back Button */}
        {/* Disable back button while updating */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton} disabled={isUpdating}>
        </TouchableOpacity>
        {/* Title */}
        <Text style={styles.appHeaderTitle}>Profile</Text>
        {/* Right Placeholder (to balance the title, matches back button width) */}
        <View style={styles.headerPlaceholder} />
      </LinearGradient>
      {/* --- CUSTOM FIXED HEADER END --- */}

      {/* Scrollable content starts right below the fixed header */}
      {/* Add style={{flex: 1}} to the ScrollView itself so it takes available vertical space */}
      <ScrollView style={{flex: 1}} contentContainerStyle={styles.scrollContainer}>
        {/* Existing Avatar, Username, Email block - Now INSIDE ScrollView */}
        {/* Only render this section if userData is available */}
        {userData && (
            <View style={styles.profileDetailsBlock}> {/* Styled as a content block */}
              {/* Disable avatar touchable while updating */}
              <TouchableOpacity onPress={() => setIsAvatarModalVisible(true)} style={styles.avatarTouchable} disabled={isUpdating}>
                {userData.avatarUrl ? (
                  <Image source={{ uri: userData.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person-circle-outline" size={80} color="#ccc" />
                  </View>
                )}
                 {/* --- Check for whitespace here --- */}
                <View style={styles.editAvatarIconContainer}>
                    {isUpdating ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="edit-2" size={16} color="#fff" />}
                </View>
              </TouchableOpacity>
               {/* --- Check for whitespace here --- */}
              <View style={styles.usernameContainer}>
                 {/* --- Check for whitespace here --- */}
                <Text style={styles.username}>{userData.username || 'N/A'}</Text>
                 {/* --- Check for whitespace here --- */}
                {/* Disable username edit button while updating */}
                <TouchableOpacity onPress={() => { setNewUsername(userData.username || ''); setIsUsernameModalVisible(true); }} disabled={isUpdating}>
                  <Feather name="edit-2" size={20} color="#666" style={styles.inlineEditIcon} />
                </TouchableOpacity>
              </View>
               {/* --- Check for whitespace here --- */}
              <Text style={styles.email}>{userData.email || 'N/A'}</Text>
            </View>
        )}


        {/* Account Information Card - Only render if userData available */}
         {userData && (
            <View style={styles.card}>
               {/* --- Check for whitespace here --- */}
              <Text style={styles.cardTitle}>Account Information</Text>
               {/* --- Check for whitespace here --- */}
              <ProfileDetailRow icon="calendar-outline" label="Member Since" value={formatDate(userData.createdAt)} isUpdating={isUpdating} /> {/* Pass isUpdating */}
               {/* --- Check for whitespace here --- */}
              <ProfileDetailRow
                icon="earth-outline"
                label="Country"
                value={`${userData.country || 'N/A'} (${userData.countryCode || 'N/A'})`}
                onEditPress={isUpdating ? null : () => setIsCountryModalVisible(true)} // Disable edit while updating
                isUpdating={isUpdating} // Pass isUpdating
              />
               {/* --- Check for whitespace here --- */}
              {/* Disable change password button while updating */}
              <TouchableOpacity style={styles.changePasswordButton} onPress={() => setIsPasswordModalVisible(true)} disabled={isUpdating}>
                 {/* --- Check for whitespace here --- */}
                <MaterialCommunityIcons name="lock-reset" size={20} color={THEME_COLOR} style={styles.detailIcon} />
                 {/* --- Check for whitespace here --- */}
                <Text style={styles.changePasswordText}>Change Password</Text>
                 {/* --- Check for whitespace here --- */}
                <Entypo name="chevron-right" size={22} color="#ccc" />
              </TouchableOpacity>
            </View>
         )}

        {/* Allergies Card - Only render if userData available */}
         {userData && (
            <View style={styles.card}>
               {/* --- Check for whitespace here --- */}
              <View style={styles.cardHeader}>
                 {/* --- Check for whitespace here --- */}
                <Text style={styles.cardTitle}>Allergies & Dietary Restrictions</Text>
                 {/* --- Check for whitespace here --- */}
                 {/* Disable edit button while updating */}
                <TouchableOpacity onPress={() => { setTempSelectedAllergies(userData.selectedAllergies || []); setIsAllergiesModalVisible(true); }} disabled={isUpdating}>
                  <Feather name="edit-2" size={20} color="#666" />
                </TouchableOpacity>
              </View>
               {/* --- Check for whitespace here --- */}
              {userData.selectedAllergies && userData.selectedAllergies.length > 0 ? (
                 /* --- Check for whitespace here --- */
                <View style={styles.chipsContainer}>
                  {userData.selectedAllergies.map((allergy) => (
                    /* --- Check for whitespace here --- */
                    <View key={allergy} style={styles.chip}>
                       {/* --- Check for whitespace here --- */}
                        <Text style={styles.chipText}>{allergy}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                 /* --- Check for whitespace here --- */
                <View style={styles.noDataContainer}>
                   {/* --- Check for whitespace here --- */}
                  <MaterialCommunityIcons name="information-outline" size={20} color="#999" />
                   {/* --- Check for whitespace here --- */}
                  <Text style={styles.noDataText}>No allergies specified.</Text>
                </View>
              )}
            </View>
         )}


         {/* --- Check for whitespace here --- */}
        {/* Logout Button - Only render if userData available */}
        {userData && (
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={isUpdating}>
               {/* --- Check for whitespace here --- */}
              <MaterialCommunityIcons name="logout" size={22} color="#fff" style={styles.logoutIcon} />
               {/* --- Check for whitespace here --- */}
              <Text style={styles.logoutButtonText}>Logout</Text>
               {/* --- Check for whitespace here --- */}
              {isUpdating && ( // Show loading indicator *on* the button if updating (e.g., during logout)
                 <ActivityIndicator size="small" color="#fff" style={{marginLeft: 10}} />
              )}
            </TouchableOpacity>
        )}


         {/* --- Check for whitespace here --- */}
        {/* Show a message if no data and not loading/error */}
        {!userData && !isLoading && !error && (
             <View style={[styles.centered, {flex: 0, marginTop: 50}]}> {/* flex:0 so it doesn't push other elements */}
                 {/* --- Check for whitespace here --- */}
                 <MaterialCommunityIcons name="account-off-outline" size={50} color="#ccc" />
                 {/* --- Check for whitespace here --- */}
                 <Text style={styles.statusText}>Could not load profile data.</Text>
                  {/* --- Check for whitespace here --- */}
                 <TouchableOpacity style={[styles.retryButton, {marginTop: 20}]} onPress={fetchUserData}>
                     <Text style={styles.retryButtonText}>Refresh Profile</Text>
                 </TouchableOpacity>
             </View>
         )}

      </ScrollView>

      {/* --- Modals (Keep outside ScrollView so they float above) --- */}
      <Modal visible={isUsernameModalVisible} animationType="fade" transparent={true} onRequestClose={() => {if(!isUpdating) setIsUsernameModalVisible(false);}}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             {/* --- Check for whitespace here --- */}
            <Text style={styles.modalTitleText}>Edit Username</Text>
            {/* --- Check for whitespace here --- */}
            <TextInput style={styles.modalInput} value={newUsername} onChangeText={setNewUsername} placeholder="Enter new username" autoCapitalize="none" editable={!isUpdating} placeholderTextColor="#999" />
            {/* --- Check for whitespace here --- */}
            <View style={styles.modalActions}>
               {/* --- Check for whitespace here --- */}
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setIsUsernameModalVisible(false)} disabled={isUpdating}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
               {/* --- Check for whitespace here --- */}
              {/* Disable save button if updating or input is empty/same as current */}
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonSave]} onPress={handleUpdateUsername} disabled={isUpdating || !newUsername.trim() || (userData && newUsername.trim() === userData.username)}>
                {isUpdating ? <ActivityIndicator color="#fff" size="small"/> : <Text style={[styles.modalButtonText, styles.modalButtonSaveText]}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isAvatarModalVisible} animationType="slide" transparent={false} onRequestClose={() => {if(!isUpdating) setIsAvatarModalVisible(false);}}>
        <SafeAreaView style={styles.fullModalContainer}>
           {/* --- Check for whitespace here --- */}
          <View style={styles.modalHeaderRow}>
             {/* --- Check for whitespace here --- */}
            <Text style={styles.modalTitleTextLarge}>Select Profile Picture</Text>
             {/* --- Check for whitespace here --- */}
            <TouchableOpacity onPress={() => setIsAvatarModalVisible(false)} disabled={isUpdating}><Ionicons name="close" size={30} color="#333" /></TouchableOpacity>
          </View>
          {/* --- Check for whitespace here --- */}
          <ScrollView contentContainerStyle={styles.avatarOptionsScrollContainer}>
            <View style={styles.avatarOptionsContainer}>
              {AVATAR_OPTIONS.map(avatar => (
                 /* --- Check for whitespace here --- */
                 // Disable individual avatar selection while updating
                <TouchableOpacity key={avatar.id} style={[styles.avatarOptionItem, userData?.avatarId === avatar.id && styles.selectedAvatarOption]} onPress={() => handleUpdateAvatar(avatar.id)} disabled={isUpdating}>
                   {/* --- Check for whitespace here --- */}
                  <Image source={{ uri: avatar.uri }} style={styles.avatarOptionImage} />
                   {/* --- Check for whitespace here --- */}
                   {/* Show loading indicator only on the specific avatar being updated */}
                   {isUpdating && userData?.avatarId !== avatar.id && avatar.uri === userData?.avatarUrl && <ActivityIndicator style={styles.avatarLoadingIndicator} />}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
           {/* NOTE: No save button needed for avatar, save happens on selection */}
        </SafeAreaView>
      </Modal>

      <Modal visible={isAllergiesModalVisible} animationType="slide" transparent={false} onRequestClose={() => { if(!isUpdating) { setIsAllergiesModalVisible(false); setAllergySearchTerm(''); } }}>
        <SafeAreaView style={styles.fullModalContainer}>
           {/* --- Check for whitespace here --- */}
          <View style={styles.modalHeaderRow}>
             {/* --- Check for whitespace here --- */}
            <Text style={styles.modalTitleTextLarge}>Allergies & Restrictions</Text>
             {/* --- Check for whitespace here --- */}
            {/* Done button is just for closing */}
            <TouchableOpacity onPress={() => { setIsAllergiesModalVisible(false); setAllergySearchTerm(''); }} disabled={isUpdating}>
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
          {/* --- Check for whitespace here --- */}
          <TextInput style={styles.modalSearch} placeholder="Search allergies..." value={allergySearchTerm} onChangeText={setAllergySearchTerm} placeholderTextColor="#999" editable={!isUpdating} />
           {/* --- Check for whitespace here --- */}
          <FlatList
            data={filteredAllergiesForModal}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
               /* --- Check for whitespace here --- */
              <TouchableOpacity style={styles.modalListItem} onPress={() => toggleAllergyInModal(item)} disabled={isUpdating}>
                 {/* --- Check for whitespace here --- */}
                <Checkbox style={styles.modalItemCheckbox} value={tempSelectedAllergies.includes(item)} onValueChange={() => toggleAllergyInModal(item)} color={tempSelectedAllergies.includes(item) ? THEME_COLOR : undefined} disabled={isUpdating} />
                 {/* --- Check for whitespace here --- */}
                <Text style={styles.modalListItemText}>{item}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.modalListSeparator} />}
             style={{ flex: 1 }} // Make sure FlatList takes available space
          />
           {/* --- Check for whitespace here --- */}
           {/* Disable save button if updating or no changes made */}
          <TouchableOpacity style={[styles.modalPrimaryButton, styles.modalBottomButton]} onPress={handleUpdateAllergies} disabled={isUpdating || (userData && JSON.stringify(tempSelectedAllergies.sort()) === JSON.stringify((userData.selectedAllergies || []).sort()))}>
            {isUpdating ? <ActivityIndicator color="#fff"/> : <Text style={styles.modalPrimaryButtonText}>Save Allergies</Text>}
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      <Modal visible={isCountryModalVisible} animationType="slide" transparent={false} onRequestClose={() => {if(!isUpdating) setIsCountryModalVisible(false);}}>
        <SafeAreaView style={styles.fullModalContainer}>
          {/* --- Check for whitespace here --- */}
          <View style={styles.modalHeaderRow}>
            {/* --- Check for whitespace here --- */}
            <Text style={styles.modalTitleTextLarge}>Select Country</Text>
            {/* --- Check for whitespace here --- */}
            <TouchableOpacity onPress={() => setIsCountryModalVisible(false)} disabled={isUpdating}><Ionicons name="close" size={30} color="#333" /></TouchableOpacity>
          </View>
          {/* --- Check for whitespace here --- */}
          {/* CountryPicker needs its own handling for showing/hiding */}
          {/* Pass disabled prop potentially if the component supports it */}
          <CountryPicker
            show={isCountryModalVisible} // Control visibility explicitly based on state
            onBackdropPress={() => {if(!isUpdating) setIsCountryModalVisible(false);}}
             // Ensure the picker can still be scrolled/used while updating is true,
             // but the save button will be disabled.
            pickerButtonOnPress={(item) => { if(!isUpdating) setTempSelectedCountry(item); }}
            style={{ modal: { height: '85%', flex: 1, backgroundColor: '#fff' }, textInput: styles.modalSearch }} // Pass modal styles here
            ListHeaderComponent={tempSelectedCountry && (
                <View style={styles.selectedCountryPreview} >
                    <Text style={styles.selectedCountryText}>Selected: {tempSelectedCountry.flag} {tempSelectedCountry.name.en || tempSelectedCountry.name.official}</Text>
                </View>
            )}
          />
          {/* --- Check for whitespace here --- */}
           {/* Disable save button if updating, no country selected, or country is same as current */}
           <TouchableOpacity style={[styles.modalPrimaryButton, styles.modalBottomButton]} onPress={handleUpdateCountry} disabled={isUpdating || !tempSelectedCountry || (userData && tempSelectedCountry.code === userData.countryCode)}>
            {isUpdating ? <ActivityIndicator color="#fff"/> : <Text style={styles.modalPrimaryButtonText}>Save Country</Text>}
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      <Modal visible={isPasswordModalVisible} animationType="fade" transparent={true} onRequestClose={() => {if(!isUpdating) setIsPasswordModalVisible(false);}}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* --- Check for whitespace here --- */}
            <Text style={styles.modalTitleText}>Change Password</Text>
            {/* --- Check for whitespace here --- */}
            <TextInput style={styles.modalInput} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current Password" secureTextEntry placeholderTextColor="#999" editable={!isUpdating} />
            {/* --- Check for whitespace here --- */}
            <TextInput style={styles.modalInput} value={newPassword} onChangeText={setNewPassword} placeholder="New Password (min. 6 characters)" secureTextEntry placeholderTextColor="#999" editable={!isUpdating} />
            {/* --- Check for whitespace here --- */}
            <TextInput style={styles.modalInput} value={confirmNewPassword} onChangeText={setConfirmNewPassword} placeholder="Confirm New Password" secureTextEntry placeholderTextColor="#999" editable={!isUpdating} />
            {/* --- Check for whitespace here --- */}
            <View style={styles.modalActions}>
              {/* --- Check for whitespace here --- */}
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setIsPasswordModalVisible(false)} disabled={isUpdating}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              {/* --- Check for whitespace here --- */}
              {/* Disable update button based on updating state and input validity */}
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonSave]} onPress={handleChangePassword} disabled={isUpdating || !currentPassword || !newPassword || !confirmNewPassword || newPassword !== confirmNewPassword || newPassword.length < 6 || newPassword === currentPassword}>
                 {isUpdating ? <ActivityIndicator color="#fff" size="small"/> : <Text style={[styles.modalButtonText, styles.modalButtonSaveText]}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// Separate component for detail row (keeps render logic clean)
// Pass isUpdating to disable the edit button when an update is happening
const ProfileDetailRow = ({ icon, label, value, onEditPress, isUpdating }) => (
  <View style={styles.detailRow}>
     {/* --- Check for whitespace here --- */}
    <Ionicons name={icon} size={22} color="#555" style={styles.detailIcon} />
     {/* --- Check for whitespace here --- */}
    <View style={styles.detailTextContainer}>
       {/* --- Check for whitespace here --- */}
      <Text style={styles.detailLabelText}>{label}</Text>
       {/* --- Check for whitespace here --- */}
      <Text style={styles.detailValueText}>{value}</Text>
    </View>
    {/* --- Check for whitespace here --- */}
    {onEditPress && (
       /* --- Check for whitespace here --- */
      <TouchableOpacity onPress={onEditPress} style={styles.rowEditIcon} disabled={isUpdating}> {/* Disable edit icon while updating */}
         {/* --- Check for whitespace here --- */}
        <Feather name="edit-2" size={20} color="#666" />
      </TouchableOpacity>
    )}
  </View>
);


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F2F5', // Background color for the whole screen area below the status bar/header
  },

  // --- NEW FIXED APP HEADER STYLES (Matches Home/Notifications) ---
  appHeaderContainer: { // Style for the top fixed gradient bar
    flexDirection: 'row',
    justifyContent: 'space-between', // Align items to left/right edges
    alignItems: 'center', // Vertically center items
    height: 65, // <--- Fixed height (matches others)
    paddingHorizontal: 16, // Internal horizontal padding
    // Apply shadow/elevation here
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    // Background color is handled by LinearGradient component in JSX, not here
  },
   headerBackButton: {
    padding: 5, // Increased touchable area
    // Fixed width to balance the title centering with the right placeholder
    width: 40,
    justifyContent: 'center', // Center the icon vertically within its touchable area
    alignItems: 'flex-start', // Align the icon visually to the start (left) within its space
   },
   appHeaderTitle: { // Style for the title text
    color: '#fff', // White text color
    fontSize: 20, // Font size
    fontWeight: 'bold', // Bold font weight
    // Centering the title when left and right items have fixed widths:
    // With 'space-between' on the parent, the title will sit in the middle space.
    // 'textAlign: 'center'' centers the text horizontally within the title's own bounds.
    textAlign: 'center',
    // No flex: 1 or negative margins needed here when left/right widths are balanced
   },
   headerPlaceholder: { // Used on the right side to balance the back button on the left
     width: 40, // Match the width of the back button area
   },
  // --- END NEW FIXED APP HEADER STYLES ---


  // --- Scrollable Content Area ---
  scrollContainer: {
      // Use flexGrow: 1 and paddingBottom to ensure content fills the space and isn't hidden by a bottom tab bar
      flexGrow: 1,
      paddingBottom: Platform.OS === 'ios' ? 90 : 60, // Add padding bottom for potential bottom tab navigator
      paddingTop: 0, // Content starts immediately below the fixed header
      paddingHorizontal: 0, // <--- Ensure no horizontal padding on the container itself
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  statusText: { marginTop: 10, fontSize: 16, color: '#555', textAlign: 'center'},
  errorText: { color: '#d9534f', marginBottom: 15 },
  retryButton: { backgroundColor: THEME_COLOR, paddingVertical: 10, paddingHorizontal: 25, borderRadius: 20},
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // --- Profile Details Block (Now INSIDE ScrollView) ---
  // This is the block containing the Avatar, Username, and Email
  profileDetailsBlock: { // Renamed from headerContainer for clarity
    backgroundColor: '#fff',
    paddingVertical: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 20,
    marginTop: 0,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginHorizontal: 16, // <--- ADD or CONFIRM this for horizontal centering/spacing
  },
   // These styles remain the same as they apply to elements within the profileDetailsBlock
  avatarTouchable: { position: 'relative', marginBottom: 12 },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: THEME_COLOR },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0' },
  editAvatarIconContainer: {
    position: 'absolute', bottom: 5, right: 5, backgroundColor: THEME_COLOR,
    borderRadius: 15, padding: 6, borderWidth: 2, borderColor: '#fff',
    zIndex: 1, // Ensure icon is above avatar image
  },
  usernameContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  username: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  inlineEditIcon: { marginLeft: 8, padding: 5 },
  email: { fontSize: 15, color: '#777' },
  // --- END Profile Details Block STYLES ---


  // --- Card Styles (Account Info, Allergies) ---
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16, // <--- KEEP this for horizontal centering/spacing
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingTop: 6 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#333' },
  noDataContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  noDataText: { fontSize: 14, color: '#888', fontStyle: 'italic', marginLeft: 8 },
  // --- End Card Styles ---

  // --- Detail Row Styles (Used within Cards) ---
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  detailIcon: { marginRight: 16, color: '#555' },
  detailTextContainer: { flex: 1 },
  detailLabelText: { fontSize: 13, color: '#777', marginBottom: 2 },
  detailValueText: { fontSize: 15, color: '#333', fontWeight: '500' },
  rowEditIcon: { padding: 8 },
  // --- End Detail Row Styles ---


  changePasswordButton: { // Style for the "Change Password" row
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  changePasswordText: { flex: 1, fontSize: 15, color: THEME_COLOR, fontWeight: '500' },


  // --- Allergy Chip Styles ---
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, paddingBottom: 6 },
  chip: { backgroundColor: '#E8F5E9', borderRadius: 16, paddingVertical: 7, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 13, color: '#1B5E20', fontWeight: '500' },
  // --- End Allergy Chip Styles ---


  // --- Logout Button Style ---
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d9534f',
    paddingVertical: 14,
    borderRadius: 25,
    marginHorizontal: 16, // <--- KEEP this for horizontal centering/spacing
    marginTop: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  logoutIcon: { marginRight: 10, color: '#fff' },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  // --- End Logout Button Style ---


  // --- Modal Styles (Generic) ---
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxHeight: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitleText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    marginBottom: 15,
    color: '#333',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginLeft: 10, minWidth: 90, alignItems: 'center', justifyContent: 'center' },
  modalButtonCancel: { backgroundColor: '#f0f0f0' },
  modalButtonSave: { backgroundColor: THEME_COLOR },
  modalButtonText: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  modalButtonSaveText: { color: '#fff' },
  // --- End Modal Styles (Generic) ---


  // --- Modal Styles (Full Screen) ---
  fullModalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitleTextLarge: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  modalDoneText: { fontSize: 16, color: THEME_COLOR, fontWeight: 'bold', padding: 5 },
  modalSearch: {
    height: 48,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginHorizontal: 16,
    marginVertical: 16,
    fontSize: 15,
    color: '#333',
  },
  modalListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  modalItemCheckbox: { marginRight: 16 },
  modalListItemText: { fontSize: 16, color: '#333', flex: 1 },
  modalListSeparator: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 20 + 16 + (Platform.OS === 'ios' ? 0 : 8) },
  modalPrimaryButton: {
    backgroundColor: THEME_COLOR,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    minHeight: 48,
  },
  modalBottomButton: { marginVertical: 20 },
  modalPrimaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  // --- End Modal Styles (Full Screen) ---

  // --- Avatar Options Modal Specific Styles ---
  avatarOptionsScrollContainer: { paddingBottom: 20 },
  avatarOptionsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', paddingVertical: 16, paddingHorizontal: 8 },
  avatarOptionItem: { alignItems: 'center', margin: 8, padding: 8, borderWidth: 2, borderColor: 'transparent', borderRadius: 10, position: 'relative' },
  selectedAvatarOption: { borderColor: THEME_COLOR },
  avatarOptionImage: { width: 90, height: 90, borderRadius: 45, marginBottom: 5 },
  avatarLoadingIndicator: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -12 }, { translateY: -12 }], zIndex: 1 },
  // --- End Avatar Options Modal Specific Styles ---


  // --- Country Picker Modal Specific Styles ---
  selectedCountryPreview: { paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', backgroundColor: '#f9f9f9', borderBottomWidth: 1, borderColor: '#eee' },
  selectedCountryText: { fontSize: 15, color: '#333' },
  // --- End Country Picker Modal Specific Styles ---

});

export default ProfileScreen;