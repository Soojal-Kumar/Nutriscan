// App.js (Corrected and Updated)
import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { auth, db } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Import screens
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen';
import CommunityScreen from './screens/CommunityScreen';
import CreatePostScreen from './screens/CreatePostScreen';
import ProfileScreen from './screens/ProfileScreen';
import CommentsScreen from './screens/CommentsScreen';
import ContributeScreen from './screens/ContributeScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import AnimatedSplashScreen from './screens/AnimatedSplashScreen';
import AlternativesScreen from './screens/AlternativesScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import TermsScreen from './screens/TermsScreen';
import PrivacyScreen from './screens/PrivacyScreen';
import { LogBox } from 'react-native';

LogBox.ignoreAllLogs(true); // Hide all warnings

const RootStack = createStackNavigator();
const AuthStack = createStackNavigator();
const CommunityNestedStack = createStackNavigator();
const Tab = createBottomTabNavigator();

const THEME_COLOR = '#00C853';

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      {/* Pass the signupSuccess parameter type */}
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen
          name="Terms"
          component={TermsScreen}
          options={{ title: 'Terms & Conditions' }} // Set header title
      />
      <AuthStack.Screen
          name="Privacy"
          component={PrivacyScreen}
          options={{ title: 'Privacy Policy' }} // Set header title
      />
    </AuthStack.Navigator>
  );
}

function CommunityStackNavigator() {
  return (
    <CommunityNestedStack.Navigator>
      <CommunityNestedStack.Screen name="CommunityFeed" component={CommunityScreen} options={{ headerShown: false }} />
      <CommunityNestedStack.Screen name="CreatePost" component={CreatePostScreen} options={{ title: 'Create New Post', headerStyle: { backgroundColor: THEME_COLOR }, headerTintColor: '#fff' }} />
      <CommunityNestedStack.Screen name="Comments" component={CommentsScreen} options={{ title: 'Comments', headerStyle: { backgroundColor: THEME_COLOR }, headerTintColor: '#fff' }} />
    </CommunityNestedStack.Navigator>
  );
}

function MainAppTabNavigator({ userAllergens }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') { iconName = focused ? 'home' : 'home-outline'; }
          else if (route.name === 'CommunityStack') { iconName = focused ? 'people' : 'people-outline'; }
          else if (route.name === 'Profile') { iconName = focused ? 'person-circle' : 'person-circle-outline'; }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: THEME_COLOR,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home">
        {props => <HomeScreen {...props} userAllergens={userAllergens} />}
      </Tab.Screen>
      <Tab.Screen name="CommunityStack" component={CommunityStackNavigator} options={{ tabBarLabel: 'Community' }} />
      <Tab.Screen name="Profile">
        {props => <ProfileScreen {...props} userAllergens={userAllergens} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function AppRootStackNavigator({ userAllergens }) {
  return (
    <RootStack.Navigator>
      <RootStack.Screen
        name="MainApp"
        options={{ headerShown: false }}
      >
        {props => <MainAppTabNavigator {...props} userAllergens={userAllergens} />}
      </RootStack.Screen>

      <RootStack.Group screenOptions={{ presentation: 'modal' }}>
        <RootStack.Screen
          name="Alternatives"
          component={AlternativesScreen}
          options={{ headerShown: false }}
        />
        <RootStack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
          options={{ headerShown: false }}
        />
        <RootStack.Screen
          name="ContributeProduct"
          component={ContributeScreen}
          options={{ title: 'Contribute New Product' }}
        />
        <RootStack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ title: 'Notifications' }}
        />
      </RootStack.Group>
    </RootStack.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [userAllergens, setUserAllergens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
      setUser(authenticatedUser);
      if (authenticatedUser) {
        try {
          const userDocRef = doc(db, 'users', authenticatedUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserAllergens(userData.allergens || []);
          }
        } catch (error) {
          console.error('Error fetching user allergens:', error);
        }
      } else {
        setUserAllergens([]);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
      {user ? <AppRootStackNavigator userAllergens={userAllergens} /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});