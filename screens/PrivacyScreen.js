// screens/PrivacyScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme color (assuming from constants)
import { THEME_COLOR } from '../config/constants'; // Adjust path as needed

const PrivacyScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Status bar */}
      <StatusBar barStyle="light-content" backgroundColor={THEME_COLOR} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        {/* Placeholder for right side if needed */}
        <View style={styles.headerBack} />
      </View>

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.sectionText}>
          We collect information you provide directly to us when you create an account (username, email, avatar, country, allergies) and when you contribute product data. We may also collect usage data automatically as you use the App.
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.sectionText}>
          We use your information to provide and improve the App, personalize your experience (e.g., allergen alerts), process your contributions, communicate with you, and for security and fraud prevention.
        </Text>

        <Text style={styles.sectionTitle}>3. How We Share Your Information</Text>
        <Text style={styles.sectionText}>
          We do not share your personal information with third parties except as necessary to operate the App (e.g., with service providers), to comply with legal obligations, or with your consent. Your contributed product data may be shared publicly within the App.
        </Text>
        {/* Add more sections as needed */}

        <Text style={styles.sectionTitle}>4. Data Security</Text>
        <Text style={styles.sectionText}>
          We take reasonable measures to protect your information from unauthorized access, disclosure, alteration, and destruction. However, no security system is impenetrable.
        </Text>

        <Text style={styles.sectionTitle}>5. Your Choices</Text>
        <Text style={styles.sectionText}>
          You may update your account information through the App's profile settings. You may also be able to control certain data collection through your device settings.
        </Text>

         <Text style={styles.sectionTitle}>6. Children's Privacy</Text>
        <Text style={styles.sectionText}>
          The App is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13.
        </Text>

         <Text style={styles.sectionTitle}>7. Changes to This Policy</Text>
        <Text style={styles.sectionText}>
          We may update this Privacy Policy periodically. We will notify you of any significant changes by posting the new policy on our website or within the App.
        </Text>

         <Text style={styles.sectionTitle}>8. Contact Us</Text>
        <Text style={styles.sectionText}>
          If you have questions about this Privacy Policy, please contact us. appsupport@nutriscan.com
        </Text>

        <Text style={styles.lastUpdated}>
          Last Updated: June 19, 2025
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: THEME_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerBack: {
    width: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  scrollViewContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
    color: '#333',
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
    color: '#555',
  },
   lastUpdated: {
       fontSize: 12,
       color: '#888',
       textAlign: 'center',
       marginTop: 30,
   }
});

export default PrivacyScreen;