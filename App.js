// App.js
import 'react-native-gesture-handler'; // Must be at the top
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';

import { auth } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Import Screens
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen';
import CommunityScreen from './screens/CommunityScreen';
import CreatePostScreen from './screens/CreatePostScreen';
import ProfileScreen from './screens/ProfileScreen';
import CommentsScreen from './screens/CommentsScreen';
import ContributeScreen from './screens/ContributeScreen';
import NotificationsScreen from './screens/NotificationsScreen'; // <-- IMPORT NotificationsScreen
import AnimatedSplashScreen from './screens/AnimatedSplashScreen'; // Import the animated splash screen

const RootStack = createStackNavigator(); // For the main app structure and modals
const AuthStack = createStackNavigator(); // For Login/Signup
const CommunityNestedStack = createStackNavigator(); // For screens within Community tab
const Tab = createBottomTabNavigator();

const THEME_COLOR = '#00C853'; // Define your theme color

// --- Auth Navigator ---
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

// --- Community Stack Navigator (nested within Tabs) ---
function CommunityStackNavigator() {
  return (
    <CommunityNestedStack.Navigator>
      <CommunityNestedStack.Screen
        name="CommunityFeed"
        component={CommunityScreen}
        options={{ headerShown: false }}
      />
      <CommunityNestedStack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{
          title: 'Create New Post',
          headerStyle: { backgroundColor: THEME_COLOR },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitleVisible: false,
        }}
      />
      <CommunityNestedStack.Screen
        name="Comments"
        component={CommentsScreen}
        options={{
          title: 'Comments',
          headerStyle: { backgroundColor: THEME_COLOR },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitleVisible: false,
        }}
      />
    </CommunityNestedStack.Navigator>
  );
}

// --- Main App Navigator (Bottom Tabs) ---
function MainAppTabNavigator() { // Renamed for clarity
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'CommunityStack') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }
          return <Ionicons name={iconName} size={focused ? size * 1.05 : size} color={color} />;
        },
        tabBarActiveTintColor: THEME_COLOR,
        tabBarInactiveTintColor: 'gray',
        headerShown: false, // Default to false, let screens/stacks manage headers
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: Platform.OS === 'android' ? 0.5 : 0,
          borderTopColor: '#E0E0E0',
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 5,
          paddingTop: 5,
          ...(Platform.OS === 'ios' && { // Floating effect for iOS
            position: 'absolute',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
      />
      <Tab.Screen
        name="CommunityStack"
        component={CommunityStackNavigator}
        options={{
          tabBarLabel: 'Community',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'My Profile',
          headerShown: false,
          headerStyle: {
            backgroundColor: THEME_COLOR,
            elevation: Platform.OS === 'android' ? 2 : 0,
            shadowOpacity: 0,
          },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
          headerTitleAlign: 'center',
        }}
      />
    </Tab.Navigator>
  );
}

// --- Root Navigator for the Authenticated App ---
function AppRootStackNavigator() {
  return (
    <RootStack.Navigator>
      <RootStack.Screen
        name="MainAppTabs" 
        component={MainAppTabNavigator}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="ContributeProduct" 
        component={ContributeScreen}
        options={{
          headerShown: true, 
        }}
      />
      {/* === ADDED NOTIFICATIONS SCREEN DEFINITION HERE === */}
      <RootStack.Screen
        name="Notifications" 
        component={NotificationsScreen}
        options={{
          headerShown: false, // Since NotificationsScreen sets its own header
          // presentation: 'modal', // Optional: for iOS modal style
        }}
      />
      {/* ================================================== */}
    </RootStack.Navigator>
  );
}


export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true); // <-- Add this

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authenticatedUser) => {
      setUser(authenticatedUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Handler to hide splash after animation
  const handleSplashFinish = () => setShowSplash(false);

  if (showSplash) {
    return <AnimatedSplashScreen onFinish={handleSplashFinish} />;
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME_COLOR} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppRootStackNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});