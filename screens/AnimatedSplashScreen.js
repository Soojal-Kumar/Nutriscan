// screens/AnimatedSplashScreen.js
import React, { useEffect, useRef } from 'react';
import {
  View, StyleSheet, Animated, Easing, Image, SafeAreaView,
  StatusBar, Platform
} from 'react-native';
// We don't need CommonActions for navigation.replace
// import { CommonActions } from '@react-navigation/native'; // Remove or comment out this import if not used
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

    // IMPORTANT FIX: Introduce a slight delay using setTimeout(0) or requestAnimationFrame.
    // This allows React Native's rendering engine to complete its initial layout
    // for the Animated components before the animations start scheduling updates,
    // which often resolves 'useInsertionEffect' warnings.
    const animationStartDelay = setTimeout(() => {
    // Alternatively, for more frame-accurate timing:
    // const animationFrame = requestAnimationFrame(() => {
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
             speed: 5, // Adjust speed/bounciness if needed
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
    }, 0); // A 0ms delay moves the animation start to the end of the current event loop.
            // If the warning persists, you can try a very small value like 10ms.

    // Cleanup function: Clear the timeout if the component unmounts prematurely
    return () => {
        clearTimeout(animationStartDelay);
        // If you used requestAnimationFrame: cancelAnimationFrame(animationFrame);
    };

  }, [fadeAnim, translateYAnim, onFinish]); // Add dependencies for useEffect

  return (
    <SafeAreaView style={styles.safeArea}>
       <StatusBar barStyle="light-content" backgroundColor={THEME_COLOR} />
      {/* Changed background color logic: Directly use THEME_COLOR or a fallback */}
      <View style={[styles.container, {backgroundColor: THEME_COLOR || '#00C853'}]}>
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