// screens/TermsScreen.js
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

const TermsScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Status bar */}
      <StatusBar barStyle="light-content" backgroundColor={THEME_COLOR} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms and Conditions</Text>
        {/* Placeholder for right side if needed */}
        <View style={styles.headerBack} />
      </View>

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.sectionText}>
          By accessing and using the NutriScan mobile application ("the App"), you agree to be bound by these Terms and Conditions and all terms incorporated by reference. If you do not agree to all of these terms, do not use the App.
        </Text>

        <Text style={styles.sectionTitle}>2. Use of the App</Text>
        <Text style={styles.sectionText}>
          The App is intended for personal, non-commercial use. You agree not to misuse the App or assist anyone else to do so. Prohibited activities include violating any law, infringing upon the rights of others, or distributing malicious content.
        </Text>

        <Text style={styles.sectionTitle}>3. User Contributions</Text>
        <Text style={styles.sectionText}>
          Users may contribute information (e.g., product details). You are responsible for ensuring the accuracy and legality of your contributions. By contributing, you grant NutriScan a license to use, modify, and display your content.
        </Text>
        {/* Add more sections as needed */}

        <Text style={styles.sectionTitle}>4. Disclaimer</Text>
        <Text style={styles.sectionText}>
          The nutritional information provided by the App is for informational purposes only and should not be considered professional medical or dietary advice. Consult with a healthcare professional before making any decisions related to your health or diet. NutriScan does not guarantee the accuracy or completeness of the information.
        </Text>

        <Text style={styles.sectionTitle}>5. Limitation of Liability</Text>
        <Text style={styles.sectionText}>
          NutriScan shall not be liable for any direct, indirect, incidental, special, or consequential damages arising out of or in any way connected with the use of the App or the information provided.
        </Text>

         <Text style={styles.sectionTitle}>6. Changes to Terms</Text>
        <Text style={styles.sectionText}>
          NutriScan reserves the right to modify these Terms and Conditions at any time. Your continued use of the App after any such changes constitutes your acceptance of the new Terms.
        </Text>

         <Text style={styles.sectionTitle}>7. Contact Information</Text>
        <Text style={styles.sectionText}>
          If you have any questions about these Terms, please contact us. appsupport@nutriscan.com
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
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerBack: {
    width: 40, // Give back button area some width for centering title
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1, // Allow title to take available space
    textAlign: 'center', // Center the title
  },
  scrollViewContent: {
    padding: 20,
    paddingBottom: 40, // Extra padding at the bottom
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

export default TermsScreen;