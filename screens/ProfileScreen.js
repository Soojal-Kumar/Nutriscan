// screens/ProfileScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Image, ActivityIndicator,
  ScrollView, TouchableOpacity, Modal, TextInput, FlatList, Alert,
  Platform, StatusBar, Dimensions
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
import { LinearGradient } from 'expo-linear-gradient';

import { AVATAR_OPTIONS, ALLERGY_OPTIONS, THEME_COLOR_PRIMARY as THEME_COLOR, PLACEHOLDER_AVATAR } from '../config/constants';

const { height: screenHeight } = Dimensions.get('window');

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  if (typeof timestamp.toDate === 'function') {
      try {
        return timestamp.toDate().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      } catch (e) {
        console.error("Error formatting Firestore Timestamp:", e);
        return 'Invalid Date';
      }
  }
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
  // NEW: State for the Grading Info Modal
  const [isGradingInfoModalVisible, setIsGradingInfoModalVisible] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [tempSelectedAllergies, setTempSelectedAllergies] = useState([]);
  const [allergySearchTerm, setAllergySearchTerm] = useState('');
  const [tempSelectedCountry, setTempSelectedCountry] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

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
          setUserData(data);
          setNewUsername(data.username || '');
          setTempSelectedAllergies(data.selectedAllergies || []);
        } else {
           setUserData({
               email: currentUser.email,
               createdAt: currentUser.metadata.creationTime ? new Date(currentUser.metadata.creationTime) : null,
               username: '',
               avatarUrl: PLACEHOLDER_AVATAR,
               avatarId: 'default',
               selectedAllergies: [],
               country: '',
               countryCode: '',
           });
           setNewUsername('');
           setTempSelectedAllergies([]);
        }
      } catch (err) {
        setError("Failed to fetch user data. Please try again.");
        setUserData(null);
      }
      setIsLoading(false);
    } else {
      setError("You are not logged in.");
      setUserData(null);
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleUpdateField = async (field, value) => {
    if (!currentUser) {
        Alert.alert("Authentication Required", "Please log in to update your profile.");
        return false;
    }
    setIsUpdating(true);
    const userDocRef = doc(db, "users", currentUser.uid);
    try {
      await updateDoc(userDocRef, { [field]: value });
      setUserData(prev => ({ ...prev, [field]: value }));
      return true;
    } catch (err) {
      Alert.alert("Error", `Failed to update ${field}. ${err.message || ''}`);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) {
      Alert.alert("Validation Error", "Username cannot be empty.");
      return;
    }
    if (userData && newUsername.trim() === userData.username) {
         setIsUsernameModalVisible(false);
         return;
    }
    const success = await handleUpdateField('username', newUsername.trim());
    if (success) setIsUsernameModalVisible(false);
  };

  const handleUpdateAvatar = async (avatarId) => {
    const selectedAvatarData = AVATAR_OPTIONS.find(avatar => avatar.id === avatarId);
    if (!selectedAvatarData) return;
    if (!currentUser) return;
     if (userData && avatarId === userData.avatarId) {
         setIsAvatarModalVisible(false);
         return;
     }
    const userDocRef = doc(db, "users", currentUser.uid);
    setIsUpdating(true);
    try {
      await updateDoc(userDocRef, { avatarId: avatarId, avatarUrl: selectedAvatarData.uri });
      setUserData(prev => ({ ...prev, avatarId: avatarId, avatarUrl: selectedAvatarData.uri }));
      setIsAvatarModalVisible(false);
    } catch (err) {
      Alert.alert("Error", `Failed to update avatar. ${err.message || ''}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateAllergies = async () => {
     if (!currentUser) return;
    const currentAllergies = userData?.selectedAllergies || [];
    const areAllergiesChanged = JSON.stringify(tempSelectedAllergies.sort()) !== JSON.stringify(currentAllergies.sort());
    if (!areAllergiesChanged) {
      setIsAllergiesModalVisible(false);
      setAllergySearchTerm('');
      return;
    }
    const success = await handleUpdateField('selectedAllergies', tempSelectedAllergies);
    if (success) {
      setIsAllergiesModalVisible(false);
      setAllergySearchTerm('');
    }
  };

  const handleUpdateCountry = async () => {
    if (!tempSelectedCountry || !currentUser) return;
    const countryName = tempSelectedCountry.name.en || tempSelectedCountry.name.official;
    const countryCode = tempSelectedCountry.code;
     if (userData && userData.countryCode === countryCode) {
         setIsCountryModalVisible(false);
         setTempSelectedCountry(null);
         return;
     }
    setIsUpdating(true);
    const userDocRef = doc(db, "users", currentUser.uid);
    try {
      await updateDoc(userDocRef, { country: countryName, countryCode: countryCode });
      setUserData(prev => ({ ...prev, country: countryName, countryCode: countryCode }));
      setIsCountryModalVisible(false);
      setTempSelectedCountry(null);
    } catch (err) {
      Alert.alert("Error", "Failed to update country.");
    } finally {
      setIsUpdating(false);
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
    if (!currentUser || !currentUser.email) return;

    setIsUpdating(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await firebaseUpdatePassword(currentUser, newPassword);
      Alert.alert("Success", "Password updated successfully.");
      setIsPasswordModalVisible(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
    } catch (error) {
      let errorMessage = "Failed to update password.";
      if (error.code === 'auth/wrong-password') errorMessage = "Incorrect current password.";
      else if (error.code === 'auth/too-many-requests') errorMessage = "Too many attempts. Please try again later.";
      else if (error.code === 'auth/requires-recent-login') errorMessage = "Please log out and log in again to change your password.";
      else errorMessage = error.message;
      Alert.alert("Password Change Error", errorMessage);
    } finally {
      setIsUpdating(false);
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
     if (isUpdating) return;
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout", style: "destructive",
        onPress: async () => {
          try {
             setIsUpdating(true);
            await signOut(auth);
          } catch (error) {
            Alert.alert("Logout Error", "Could not sign out. Please try again.");
          } finally {
              setIsUpdating(false);
          }
        }
      }
    ]);
  };

  if (isLoading && !userData && !error) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color={THEME_COLOR} />
        <Text style={styles.statusText}>Loading Profile...</Text>
      </SafeAreaView>
    );
  }

   if (error && !userData) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#d9534f" />
        <Text style={[styles.statusText, styles.errorText]}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUserData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_COLOR} />

      {/* --- HEADER WITH BACK BUTTON REMOVED --- */}
       <LinearGradient
        colors={THEME_COLOR ? [THEME_COLOR, '#00A040'] : ['#00C853', '#00A040']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.appHeaderContainer}
      >
        {/* The back button is replaced with a placeholder to keep the title centered */}
        <View style={styles.headerPlaceholder} />

        <Text style={styles.appHeaderTitle}>PROFILE</Text>
        
        <View style={styles.headerPlaceholder} />
      </LinearGradient>
      {/* --- END OF HEADER --- */}

      <ScrollView style={{flex: 1}} contentContainerStyle={styles.scrollContainer}>
        {userData && (
            <View style={styles.profileDetailsBlock}>
              <TouchableOpacity onPress={() => setIsAvatarModalVisible(true)} style={styles.avatarTouchable} disabled={isUpdating}>
                <Image source={{ uri: userData.avatarUrl || PLACEHOLDER_AVATAR }} style={styles.avatar} />
                <View style={styles.editAvatarIconContainer}>
                    {isUpdating ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="edit-2" size={16} color="#fff" />}
                </View>
              </TouchableOpacity>
              <View style={styles.usernameContainer}>
                <Text style={styles.username}>{userData.username || 'N/A'}</Text>
                <TouchableOpacity onPress={() => { setNewUsername(userData.username || ''); setIsUsernameModalVisible(true); }} disabled={isUpdating}>
                  <Feather name="edit-2" size={20} color="#666" style={styles.inlineEditIcon} />
                </TouchableOpacity>
              </View>
              <Text style={styles.email}>{userData.email || 'N/A'}</Text>
            </View>
        )}

         {userData && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Account Information</Text>
              <ProfileDetailRow icon="calendar-outline" label="Member Since" value={formatDate(userData.createdAt)} isUpdating={isUpdating} />
              <ProfileDetailRow
                icon="earth-outline"
                label="Country"
                value={`${userData.country || 'N/A'} (${userData.countryCode || 'N/A'})`}
                onEditPress={isUpdating ? null : () => setIsCountryModalVisible(true)}
                isUpdating={isUpdating}
              />
              <TouchableOpacity style={styles.changePasswordButton} onPress={() => setIsPasswordModalVisible(true)} disabled={isUpdating}>
                <MaterialCommunityIcons name="lock-reset" size={20} color={THEME_COLOR} style={styles.detailIcon} />
                <Text style={styles.changePasswordText}>Change Password</Text>
                <Entypo name="chevron-right" size={22} color="#ccc" />
              </TouchableOpacity>
              {/* NEW: Button to open Grading Info Modal */}
              <TouchableOpacity style={styles.changePasswordButton} onPress={() => setIsGradingInfoModalVisible(true)} disabled={isUpdating}>
                <MaterialCommunityIcons name="information-outline" size={20} color={THEME_COLOR} style={styles.detailIcon} />
                <Text style={styles.changePasswordText}>How Food Grading Works</Text>
                <Entypo name="chevron-right" size={22} color="#ccc" />
              </TouchableOpacity>
            </View>
         )}

         {userData && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Allergies & Dietary Restrictions</Text>
                <TouchableOpacity onPress={() => { setTempSelectedAllergies(userData.selectedAllergies || []); setIsAllergiesModalVisible(true); }} disabled={isUpdating}>
                  <Feather name="edit-2" size={20} color="#666" />
                </TouchableOpacity>
              </View>
              {userData.selectedAllergies && userData.selectedAllergies.length > 0 ? (
                <View style={styles.chipsContainer}>
                  {userData.selectedAllergies.map((allergy) => (
                    <View key={allergy} style={styles.chip}>
                        <Text style={styles.chipText}>{allergy}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noDataContainer}>
                  <MaterialCommunityIcons name="information-outline" size={20} color="#999" />
                  <Text style={styles.noDataText}>No allergies specified.</Text>
                </View>
              )}
            </View>
         )}

        {userData && (
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={isUpdating}>
              <MaterialCommunityIcons name="logout" size={22} color="#fff" style={styles.logoutIcon} />
              <Text style={styles.logoutButtonText}>Logout</Text>
              {isUpdating && <ActivityIndicator size="small" color="#fff" style={{marginLeft: 10}} />}
            </TouchableOpacity>
        )}

        {!userData && !isLoading && !error && (
             <View style={[styles.centered, {flex: 0, marginTop: 50}]}>
                 <MaterialCommunityIcons name="account-off-outline" size={50} color="#ccc" />
                 <Text style={styles.statusText}>Could not load profile data.</Text>
                 <TouchableOpacity style={[styles.retryButton, {marginTop: 20}]} onPress={fetchUserData}>
                     <Text style={styles.retryButtonText}>Refresh Profile</Text>
                 </TouchableOpacity>
             </View>
         )}
      </ScrollView>

      {/* --- Modals --- */}
      <Modal visible={isUsernameModalVisible} animationType="fade" transparent={true} onRequestClose={() => {if(!isUpdating) setIsUsernameModalVisible(false);}}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitleText}>Edit Username</Text>
            <TextInput style={styles.modalInput} value={newUsername} onChangeText={setNewUsername} placeholder="Enter new username" autoCapitalize="none" editable={!isUpdating} placeholderTextColor="#999" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setIsUsernameModalVisible(false)} disabled={isUpdating}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonSave]} onPress={handleUpdateUsername} disabled={isUpdating || !newUsername.trim() || (userData && newUsername.trim() === userData.username)}>
                {isUpdating ? <ActivityIndicator color="#fff" size="small"/> : <Text style={[styles.modalButtonText, styles.modalButtonSaveText]}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ... other modals are unchanged ... */}
      <Modal visible={isAvatarModalVisible} animationType="slide" transparent={false} onRequestClose={() => {if(!isUpdating) setIsAvatarModalVisible(false);}}>
        <SafeAreaView style={styles.fullModalContainer}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitleTextLarge}>Select Profile Picture</Text>
            <TouchableOpacity onPress={() => setIsAvatarModalVisible(false)} disabled={isUpdating}><Ionicons name="close" size={30} color="#333" /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.avatarOptionsScrollContainer}>
            <View style={styles.avatarOptionsContainer}>
              {AVATAR_OPTIONS.map(avatar => (
                <TouchableOpacity key={avatar.id} style={[styles.avatarOptionItem, userData?.avatarId === avatar.id && styles.selectedAvatarOption]} onPress={() => handleUpdateAvatar(avatar.id)} disabled={isUpdating}>
                  <Image source={{ uri: avatar.uri }} style={styles.avatarOptionImage} />
                  {isUpdating && userData?.avatarId !== avatar.id && avatar.id === userData?.tempAvatarIdForUpdate && <ActivityIndicator style={styles.avatarLoadingIndicator} />}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={isAllergiesModalVisible} animationType="slide" transparent={false} onRequestClose={() => { if(!isUpdating) { setIsAllergiesModalVisible(false); setAllergySearchTerm(''); } }}>
        <SafeAreaView style={styles.fullModalContainer}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitleTextLarge}>Allergies & Restrictions</Text>
            <TouchableOpacity onPress={() => setIsAllergiesModalVisible(false)} disabled={isUpdating}>
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <TextInput style={styles.modalSearch} placeholder="Search allergies..." value={allergySearchTerm} onChangeText={setAllergySearchTerm} placeholderTextColor="#999" editable={!isUpdating} />
          <FlatList
            data={filteredAllergiesForModal}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalListItem} onPress={() => toggleAllergyInModal(item)} disabled={isUpdating}>
                <Checkbox style={styles.modalItemCheckbox} value={tempSelectedAllergies.includes(item)} onValueChange={() => toggleAllergyInModal(item)} color={tempSelectedAllergies.includes(item) ? THEME_COLOR : undefined} disabled={isUpdating} />
                <Text style={styles.modalListItemText}>{item}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.modalListSeparator} />}
             style={{ flex: 1 }}
          />
          <TouchableOpacity style={[styles.modalPrimaryButton, styles.modalBottomButton]} onPress={handleUpdateAllergies} disabled={isUpdating || (userData && JSON.stringify(tempSelectedAllergies.sort()) === JSON.stringify((userData.selectedAllergies || []).sort()))}>
            {isUpdating ? <ActivityIndicator color="#fff"/> : <Text style={styles.modalPrimaryButtonText}>Save Allergies</Text>}
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      <Modal visible={isCountryModalVisible} animationType="slide" transparent={false} onRequestClose={() => {if(!isUpdating) setIsCountryModalVisible(false);}}>
        <SafeAreaView style={styles.fullModalContainer}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitleTextLarge}>Select Country</Text>
            <TouchableOpacity onPress={() => setIsCountryModalVisible(false)} disabled={isUpdating}><Ionicons name="close" size={30} color="#333" /></TouchableOpacity>
          </View>
          <CountryPicker
            show={isCountryModalVisible}
            onBackdropPress={() => {if(!isUpdating) setIsCountryModalVisible(false);}}
            pickerButtonOnPress={(item) => { if(!isUpdating) setTempSelectedCountry(item); }}
            style={{ modal: { height: '85%', flex: 1, backgroundColor: '#fff' }, textInput: styles.modalSearch }}
            ListHeaderComponent={tempSelectedCountry && (
                <View style={styles.selectedCountryPreview} >
                    <Text style={styles.selectedCountryText}>Selected: {tempSelectedCountry.flag} {tempSelectedCountry.name.en || tempSelectedCountry.name.official}</Text>
                </View>
            )}
          />
           <TouchableOpacity style={[styles.modalPrimaryButton, styles.modalBottomButton]} onPress={handleUpdateCountry} disabled={isUpdating || !tempSelectedCountry || (userData && tempSelectedCountry.code === userData.countryCode)}>
            {isUpdating ? <ActivityIndicator color="#fff"/> : <Text style={styles.modalPrimaryButtonText}>Save Country</Text>}
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      <Modal visible={isPasswordModalVisible} animationType="fade" transparent={true} onRequestClose={() => {if(!isUpdating) setIsPasswordModalVisible(false);}}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitleText}>Change Password</Text>
            <TextInput style={styles.modalInput} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current Password" secureTextEntry placeholderTextColor="#999" editable={!isUpdating} />
            <TextInput style={styles.modalInput} value={newPassword} onChangeText={setNewPassword} placeholder="New Password (min. 6 characters)" secureTextEntry placeholderTextColor="#999" editable={!isUpdating} />
            <TextInput style={styles.modalInput} value={confirmNewPassword} onChangeText={setConfirmNewPassword} placeholder="Confirm New Password" secureTextEntry placeholderTextColor="#999" editable={!isUpdating} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setIsPasswordModalVisible(false)} disabled={isUpdating}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonSave]} onPress={handleChangePassword} disabled={isUpdating || !currentPassword || !newPassword || !confirmNewPassword || newPassword !== confirmNewPassword || newPassword.length < 6 || newPassword === currentPassword}>
                 {isUpdating ? <ActivityIndicator color="#fff" size="small"/> : <Text style={[styles.modalButtonText, styles.modalButtonSaveText]}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* NEW: Grading Info Modal */}
      <Modal visible={isGradingInfoModalVisible} animationType="slide" transparent={false} onRequestClose={() => setIsGradingInfoModalVisible(false)}>
        <SafeAreaView style={styles.fullModalContainer}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitleTextLarge}>How Food Grading Works</Text>
            <TouchableOpacity onPress={() => setIsGradingInfoModalVisible(false)}>
              <Ionicons name="close" size={30} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.gradingInfoScrollContent}>
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Nutri-Score</Text>
              <Text style={styles.infoDescription}>
                Nutri-Score is a front-of-pack nutrition label used in several European countries. It converts the nutritional value of products into a simple code of 5 colors and letters (A to E).
              </Text>
              <Text style={styles.infoListItem}>
                <Text style={styles.infoListItemBold}>A (Dark Green):</Text> Best nutritional quality.
              </Text>
              <Text style={styles.infoListItem}>
                <Text style={styles.infoListItemBold}>B (Light Green):</Text> Good nutritional quality.
              </Text>
              <Text style={styles.infoListItem}>
                <Text style={styles.infoListItemBold}>C (Yellow):</Text> Medium nutritional quality.
              </Text>
              <Text style={styles.infoListItem}>
                <Text style={styles.infoListItemBold}>D (Orange):</Text> Fair nutritional quality.
              </Text>
              <Text style={styles.infoListItem}>
                <Text style={styles.infoListItemBold}>E (Red):</Text> Poorest nutritional quality.
              </Text>
              <Text style={styles.infoDescription}>
                It considers favorable elements (fiber, protein, fruits/vegetables) and unfavorable elements (calories, sugar, saturated fat, sodium).
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Eco-Score</Text>
              <Text style={styles.infoDescription}>
                Eco-Score is an environmental impact label for food products. Similar to Nutri-Score, it uses a color-coded letter system from A (very low environmental impact) to E (very high environmental impact).
              </Text>
              <Text style={styles.infoDescription}>
                The score is calculated based on:
              </Text>
              <Text style={styles.infoListItem}>• Life Cycle Assessment (LCA): From production to consumption, including ingredients, packaging, transport, etc.</Text>
              <Text style={styles.infoListItem}>• Additional environmental criteria: Biodiversity, production methods (e.g., organic), origin, recyclability of packaging.</Text>
              <Text style={styles.infoDescription}>
                It aims to help consumers make more sustainable food choices.
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>NOVA Group</Text>
              <Text style={styles.infoDescription}>
                The NOVA classification system categorizes foods based on the nature, extent, and purpose of industrial processing. It helps to identify ultra-processed foods, which are often linked to negative health outcomes.
              </Text>
              <Text style={styles.infoListItem}>
                <Text style={styles.infoListItemBold}>Group 1: Unprocessed or Minimally Processed Foods</Text>
                {'\n'}Examples: Fresh fruits, vegetables, meat, eggs, milk, plain yogurt, dried legumes, whole grains, nuts, seeds.
              </Text>
              <Text style={styles.infoListItem}>
                <Text style={styles.infoListItemBold}>Group 2: Processed Culinary Ingredients</Text>
                {'\n'}Examples: Vegetable oils, butter, sugar, salt, honey, maple syrup. Used in kitchens to prepare Group 1 foods.
              </Text>
              <Text style={styles.infoListItem}>
                <Text style={styles.infoListItemBold}>Group 3: Processed Foods</Text>
                {'\n'}Examples: Canned vegetables with salt, plain bread, cheese, cured meats, fruits in syrup. Made by adding Group 2 ingredients to Group 1 foods.
              </Text>
              <Text style={styles.infoListItem}>
                <Text style={styles.infoListItemBold}>Group 4: Ultra-Processed Foods (UPFs)</Text>
                {'\n'}Examples: Soft drinks, packaged snacks, instant noodles, chicken nuggets, sugary cereals, frozen ready meals. Formulations of ingredients, many of which are exclusive to industrial use, typically with a long shelf life and appealing flavors/textures. Often high in sugar, fat, and salt.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
};

const ProfileDetailRow = ({ icon, label, value, onEditPress, isUpdating }) => (
  <View style={styles.detailRow}>
    <Ionicons name={icon} size={22} color="#555" style={styles.detailIcon} />
    <View style={styles.detailTextContainer}>
      <Text style={styles.detailLabelText}>{label}</Text>
      <Text style={styles.detailValueText}>{value}</Text>
    </View>
    {onEditPress && (
      <TouchableOpacity onPress={onEditPress} style={styles.rowEditIcon} disabled={isUpdating}>
        <Feather name="edit-2" size={20} color="#666" />
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME_COLOR,
  },
  appHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 65,
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
   headerBackButton: { // Style is kept for other screens, but unused here now.
    padding: 5,
    width: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
   },
   appHeaderTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
   },
   headerPlaceholder: {
     width: 40, // This is now used on both left and right sides
   },
  scrollContainer: {
      flexGrow: 1,
      paddingBottom: Platform.OS === 'ios' ? 90 : 60,
      backgroundColor: '#F0F2F5',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  statusText: { marginTop: 10, fontSize: 16, color: '#555', textAlign: 'center'},
  errorText: { color: '#d9534f', marginBottom: 15 },
  retryButton: { backgroundColor: THEME_COLOR, paddingVertical: 10, paddingHorizontal: 25, borderRadius: 20},
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  profileDetailsBlock: {
    backgroundColor: '#fff',
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarTouchable: { position: 'relative', marginBottom: 12 },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: THEME_COLOR },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0' },
  editAvatarIconContainer: {
    position: 'absolute', bottom: 5, right: 5, backgroundColor: THEME_COLOR,
    borderRadius: 15, padding: 6, borderWidth: 2, borderColor: '#fff',
    zIndex: 1,
  },
  usernameContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  username: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  inlineEditIcon: { marginLeft: 8, padding: 5 },
  email: { fontSize: 15, color: '#777' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
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

  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  changePasswordText: { flex: 1, fontSize: 15, color: THEME_COLOR, fontWeight: '500' },

  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, paddingBottom: 6 },
  chip: { backgroundColor: '#E8F5E9', borderRadius: 16, paddingVertical: 7, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 13, color: '#1B5E20', fontWeight: '500' },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d9534f',
    paddingVertical: 14,
    borderRadius: 25,
    marginHorizontal: 16,
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

  avatarOptionsScrollContainer: { paddingBottom: 20 },
  avatarOptionsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', paddingVertical: 16, paddingHorizontal: 8 },
  avatarOptionItem: { alignItems: 'center', margin: 8, padding: 8, borderWidth: 2, borderColor: 'transparent', borderRadius: 10, position: 'relative' },
  selectedAvatarOption: { borderColor: THEME_COLOR },
  avatarOptionImage: { width: 90, height: 90, borderRadius: 45, marginBottom: 5 },
  avatarLoadingIndicator: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -12 }, { translateY: -12 }], zIndex: 1 },

  selectedCountryPreview: { paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', backgroundColor: '#f9f9f9', borderBottomWidth: 1, borderColor: '#eee' },
  selectedCountryText: { fontSize: 15, color: '#333' },

  // NEW: Styles for Grading Info Modal
  gradingInfoScrollContent: {
    padding: 20,
    paddingBottom: 40, // Ensure content doesn't get cut off by bottom padding
  },
  infoSection: {
    marginBottom: 25,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  infoDescription: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 8,
  },
  infoListItem: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
    marginLeft: 5, // Indent list items
  },
  infoListItemBold: {
    fontWeight: '600',
    color: '#333',
  },
});

export default ProfileScreen;