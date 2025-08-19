// screens/LoginScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Platform, Alert, ActivityIndicator, Image,
  Modal, // Import Modal for custom FP modal
  Pressable, // Import Pressable for modal overlay/closing
} from 'react-native';

// Import necessary icons
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'; // Import Ionicons for modal close icon

// Navigation hooks
import { useNavigation, useRoute } from '@react-navigation/native'; // Import useRoute

// Firebase imports
import { auth } from '../config/firebase'; // Import from your config
// Import signInWithEmailAndPassword and sendPasswordResetEmail, and signOut
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';

// Assuming your logo is in the assets folder one level up from screens
const logo = require('../assets/nutri-scan-logo.png');

// Assuming your theme color is defined in constants (as used in Signup)
// import { THEME_COLOR } from '../config/constants'; // Uncomment if needed for modal styling

const LoginScreen = ({ navigation }) => {
  const route = useRoute(); // Get the route object to access parameters

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Loading state for login

  // State for custom Forgot Password modal
  const [isForgotPasswordModalVisible, setIsForgotPasswordModalVisible] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false); // Loading state for password reset


  // --- Effect to show success alert after signup ---
  useEffect(() => {
    // Check if the 'signupSuccess' parameter exists and is true
    if (route.params?.signupSuccess) {
      // Show the alert
      Alert.alert(
        "Account Created", // Title
        "Your account has been created. Please check your email to verify it, then you can log in.", // Message
        [
          {
            text: "OK",
            onPress: () => {
              // Clear the parameter after the alert is dismissed
              // This prevents the alert from showing again if the user returns to Login
              navigation.setParams({ signupSuccess: undefined });
            }
          }
        ],
        { cancelable: false } // Prevent dismissing by tapping outside
      );
    }
  }, [route.params?.signupSuccess, navigation]); // Depend on the parameter and navigation object


const handleLogin = async () => {
  if (!email.trim() || !password.trim()) {
    Alert.alert("Validation Error", "Email and Password are required.");
    return;
  }
  setIsLoading(true); // Start loading indicator for login

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
    const user = userCredential.user; // Get the user object for the just-logged-in user

    // 🔽 Reload user to get latest verification status
    // This is important if they verified between signup and this login attempt
    await user.reload();

    // 🔐 Check email verification
    if (!user.emailVerified) { // Use user.emailVerified
      // If email is NOT verified:
      Alert.alert(
        "Email Not Verified",
        "Please verify your email before continuing. Check your inbox for the verification link."
        // Optional: Add button to resend verification email
        // [{ text: "Resend Email", onPress: () => handleResendVerification(user) }, { text: "OK" }]
      );
      // Crucially, sign the user OUT immediately if not verified
      // This prevents App.js from switching to the MainAppNavigator
       await signOut(auth); // Make sure signOut completes
      return; // Stop the login process here
    }

    // ✅ Email is verified!
    // We don't need an explicit success alert here.
    // The onAuthStateChanged listener in App.js detects the authenticated user
    // (because we DIDN'T sign them out above) and automatically
    // switches the RootStack to the MainAppNavigator.

  } catch (error) {
    console.error("Login Error:", error);
    let errorMessage = "An unexpected error occurred during login.";
    if (
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/invalid-credential' // Use invalid-credential for newer versions
    ) {
      errorMessage = 'Invalid email or password.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Please enter a valid email address.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many failed login attempts. Please try again later.';
    } else {
        errorMessage = error.message;
     }
     Alert.alert("Login Failed", errorMessage); // Show error alert for failure
   } finally {
     setIsLoading(false); // Stop loading indicator regardless of success or failure
   }
 };

  // --- Forgot Password Functionality (using custom modal) ---
  const handleForgotPasswordPress = () => {
      console.log('Forgot Password pressed (opening modal)');
      // Optionally pre-fill the modal email input if the login email input has a value
      setForgotPasswordEmail(email);
      setIsForgotPasswordModalVisible(true); // Show the custom modal
  };

  const handleSendResetEmail = async () => {
      if (!forgotPasswordEmail || !forgotPasswordEmail.trim()) {
          Alert.alert("Error", "Please enter a valid email address.");
          return;
      }
      setIsSendingResetEmail(true); // Start loading for reset email button
      try {
          await sendPasswordResetEmail(auth, forgotPasswordEmail.trim());

           // Firebase intentionally gives a generic success message for user-not-found for security.
           // We show a similar generic success message regardless of whether the email exists.
           Alert.alert(
               "Password Reset", // Generic title
               `If an account exists for ${forgotPasswordEmail.trim()}, a password reset email has been sent.`
            );
           console.log('Password reset email sent attempt for:', forgotPasswordEmail.trim());
           setIsForgotPasswordModalVisible(false); // Close modal on success/generic success

       } catch (error) {
          console.error("Password Reset Error:", error);
          let errorMessage = "Failed to send password reset email.";
           if (error && typeof error.code === 'string') {
                switch (error.code) {
                    case 'auth/invalid-email':
                        errorMessage = 'The email address is not valid.';
                        break;
                    case 'auth/user-not-found':
                         // This case is handled by the generic success message above,
                         // but including it here for completeness if the generic message wasn't used.
                         // Don't show a specific "user not found" error for security.
                         // Fall through to show the generic success message or handle it above.
                         Alert.alert(
                           "Password Reset",
                           `If an account exists for ${forgotPasswordEmail.trim()}, a password reset email has been sent.`
                         );
                         console.log('Attempted password reset for non-existent user (caught):', forgotPasswordEmail.trim());
                         setIsForgotPasswordModalVisible(false); // Close modal even if user not found
                         break; // Exit the catch handler for this case
                    // Add other relevant Firebase auth error codes if necessary
                    default:
                        errorMessage = error.message;
                        Alert.alert("Password Reset Error", errorMessage); // Show Firebase error message for other failures
                        // Keep modal open for specific errors, or close it? Depends on UX.
                        // Let's close it on any attempt for simplicity now.
                         setIsForgotPasswordModalVisible(false);
                }
            } else {
                errorMessage = error.message || errorMessage;
                Alert.alert("Password Reset Error", errorMessage);
                 setIsForgotPasswordModalVisible(false);
            }
      } finally {
          setIsSendingResetEmail(false); // Stop loading for reset email button
           // Clear email input in modal after attempt
           setForgotPasswordEmail('');
      }
  };

  const handleCloseForgotPasswordModal = () => {
      setIsForgotPasswordModalVisible(false);
      setForgotPasswordEmail(''); // Clear email input on close
      setIsSendingResetEmail(false); // Ensure loading is off
  };

  const handleSignup = () => {
    console.log('Signup link pressed');
    // Navigate to the Signup screen which is in the same Auth stack
    navigation.navigate('Signup');
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>

        {/* Logo */}
        <Image
          source={logo}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>Login</Text>
        <Text style={styles.subtitle}>Please enter your credential</Text>

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
          editable={!isLoading && !isForgotPasswordModalVisible && !isSendingResetEmail} // Disable input while login loading OR modal is open/sending
        />

        {/* Password Input */}
        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Write here"
            placeholderTextColor="#aaa"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            editable={!isLoading && !isForgotPasswordModalVisible && !isSendingResetEmail} // Disable input while login loading OR modal is open/sending
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon} disabled={isLoading || isForgotPasswordModalVisible || isSendingResetEmail}>
            <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color="#888" />
          </TouchableOpacity>
        </View>
        {/* Forgot Password Link */}
        {/* Attach handler for custom modal */}
        <TouchableOpacity onPress={handleForgotPasswordPress} disabled={isLoading || isForgotPasswordModalVisible || isSendingResetEmail}>
          <Text style={styles.forgotPassword}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginButton, (isLoading || isForgotPasswordModalVisible || isSendingResetEmail) && styles.disabledButton]}
          onPress={handleLogin}
          disabled={isLoading || isForgotPasswordModalVisible || isSendingResetEmail} // Disable button while login loading OR modal is open/sending
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* Signup Prompt */}
        <View style={styles.signupPrompt}>
          <Text style={styles.signupText}>You don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')} disabled={isLoading || isForgotPasswordModalVisible || isSendingResetEmail}>
            <Text style={styles.signupLink}>Signup</Text>
          </TouchableOpacity>
        </View>
      </View>

       {/* --- Custom Forgot Password Modal --- */}
        <Modal
           animationType="fade"
           transparent={true}
           visible={isForgotPasswordModalVisible} // Control visibility
           onRequestClose={handleCloseForgotPasswordModal} // Handle Android back button
        >
            {/* Modal overlay */}
            <Pressable style={forgotPasswordModalStyles.modalOverlay} onPress={handleCloseForgotPasswordModal}>
                 {/* Modal content container */}
                 <Pressable style={forgotPasswordModalStyles.modalContainer} onPress={(e) => e.stopPropagation()}> {/* Prevent closing when tapping inside */}
                     <Text style={forgotPasswordModalStyles.modalTitle}>Forgot Password</Text>

                     <Text style={forgotPasswordModalStyles.modalDescription}>
                         Enter the email address associated with your account to receive a password reset link.
                     </Text>

                     {/* Email Input */}
                     <TextInput
                         style={forgotPasswordModalStyles.modalInput}
                         placeholder="Email address"
                         placeholderTextColor="#999"
                         keyboardType="email-address"
                         autoCapitalize="none"
                         value={forgotPasswordEmail}
                         onChangeText={setForgotPasswordEmail}
                         editable={!isSendingResetEmail} // Disable input while sending email
                     />

                     {/* Button Row */}
                     <View style={forgotPasswordModalStyles.modalButtonRow}>
                         {/* Cancel Button */}
                         <TouchableOpacity
                             style={[forgotPasswordModalStyles.modalButton, forgotPasswordModalStyles.modalButtonCancel]}
                             onPress={handleCloseForgotPasswordModal}
                             disabled={isSendingResetEmail}
                         >
                             <Text style={forgotPasswordModalStyles.modalButtonTextcancel}>Cancel</Text>
                         </TouchableOpacity>
                         {/* Send Reset Email Button */}
                         <TouchableOpacity
                             style={[forgotPasswordModalStyles.modalButton, forgotPasswordModalStyles.modalButtonSend]}
                             onPress={handleSendResetEmail}
                             disabled={isSendingResetEmail}
                         >
                             {isSendingResetEmail ? (
                                 <ActivityIndicator size="small" color="#fff" /> // Loading indicator
                             ) : (
                                 <Text style={forgotPasswordModalStyles.modalButtonText}>Send Reset Email</Text> // Button text
                             )}
                         </TouchableOpacity>
                     </View>
                 </Pressable>
            </Pressable>
        </Modal>
       {/* --- End Custom Forgot Password Modal --- */}

    </SafeAreaView>
  );
};

// Keep all your existing styles
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 30, justifyContent: 'center', backgroundColor: '#fff', paddingBottom: 20 },
  logo: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 30,
  },
  title: { fontSize: 32, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  inputLabel: { fontSize: 14, color: '#333', marginBottom: 5, alignSelf: 'flex-start' },
  input: { backgroundColor: '#F5F5F5', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 8, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E0E0E0', width: '100%' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 10, width: '100%' },
  passwordInput: { flex: 1, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16 },
  eyeIcon: { padding: 10 },
  forgotPassword: { fontSize: 14, color: '#2ECC71', textAlign: 'right', marginBottom: 40 },
  loginButton: { backgroundColor: '#2ECC71', paddingVertical: 15, borderRadius: 25, alignItems: 'center', marginTop: 20, marginBottom: 30, width: '100%', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2 },
  loginButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  disabledButton: { opacity: 0.5 }, // Use opacity for disabled state
  signupPrompt: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 20 },
  signupText: { fontSize: 14, color: '#666' },
  signupLink: { fontSize: 14, color: '#2ECC71', fontWeight: 'bold' },
});


// --- Styles for the custom Forgot Password Modal ---
// Kept separate for clarity, but still in the same file
const forgotPasswordModalStyles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        width: '80%', // Modal width
        alignItems: 'center', // Center content inside modal
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    modalDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    modalInput: {
        width: '100%',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 8,
        fontSize: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    modalButtonRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    modalButton: {
        flex: 1, // Distribute space
        marginHorizontal: 5, // Space between buttons
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
     modalButtonCancel: {
         backgroundColor: '#ccc', // Gray background for cancel
         color: '#000000', // Dark text for cancel
     },
     modalButtonSend: {
         backgroundColor: '#2ECC71', // Green background for send
     },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalButtonTextcancel: {
        color: '#333',
        fontSize: 16,
        fontWeight: 'bold',
    },
});


export default LoginScreen;