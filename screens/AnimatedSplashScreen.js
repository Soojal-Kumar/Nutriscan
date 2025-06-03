// screens/AnimatedSplashScreen.js
import React, { useEffect, useRef } from 'react';
import {
  View, StyleSheet, Animated, Easing, Image, SafeAreaView,
  StatusBar, Platform
} from 'react-native';
// We don't need CommonActions for navigation.replace
// import { CommonActions } from '@react-navigation/native'; // Remove or comment out this import
import { auth } from '../config/firebase'; // Import Firebase auth here

// Import your logo - adjust the path based on where you saved nutri-scan-logo.png
const logo = require('../assets/nutri-scan-logo.png');
// Assuming your theme color is also in constants or dummyData
import { THEME_COLOR_PRIMARY as THEME_COLOR } from '../config/constants'; // Adjust path if needed

const AnimatedSplashScreen = ({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(Platform.OS === 'android' ? 200 : 300)).current; // Initial Y position (off-screen bottom)

  useEffect(() => {
    console.log("[AnimatedSplashScreen] Component mounted. Starting animation.");

    // Start the animation sequence
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: -50, // Move up initially
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(translateYAnim, {
         toValue: 0, // Bounce back down slightly to a center-ish position
         speed: 5,
         bounciness: 8,
         useNativeDriver: true,
      }),
      Animated.delay(1000), // Hold for 1 second
      // Optional: Fade out the splash screen content
      Animated.timing(fadeAnim, {
         toValue: 0,
         duration: 300,
         useNativeDriver: true,
      }),
    ]).start(() => {
      // Instead of navigation, call onFinish
      if (onFinish) onFinish();
    });

  }, [fadeAnim, translateYAnim, onFinish]); // Add dependencies

  return (
    <SafeAreaView style={styles.safeArea}>
       <StatusBar barStyle="light-content" backgroundColor={THEME_COLOR} />
      <View style={[styles.container, {backgroundColor: '#ffffff' || '#00C853'}]}>
        <Animated.Image
          source={logo}
          style={[
            styles.logo,
            {
              opacity: fadeAnim,
              transform: [{ translateY: translateYAnim }],
            },
          ]}
          resizeMode="contain"
        />
        {/* Optional: Add a small text loading indicator or app name here */}
        {/* <Animated.Text style={[styles.loadingText, {opacity: fadeAnim}]}>Loading...</Animated.Text> */}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME_COLOR || '#00C853', // Background matching container
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200, // Adjust size for animation
    height: 200, // Adjust size
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: 'white',
  }
});

export default AnimatedSplashScreen;