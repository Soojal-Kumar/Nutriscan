// screens/CommunityScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TextInput, Image, TouchableOpacity, FlatList,
  Platform, StatusBar, ActivityIndicator, Alert,
  RefreshControl, Dimensions, Share,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { db, auth } from '../config/firebase';
import {
  collection, query, orderBy, onSnapshot, doc, getDoc,
  updateDoc, arrayUnion, arrayRemove, increment, deleteDoc,
} from 'firebase/firestore';
import PostCard from '../components/PostCard'; // Make sure this path is correct
import { THEME_COLOR_PRIMARY as THEME_COLOR, LOGO_URL, PLACEHOLDER_AVATAR } from '../config/constants'; // Assuming these are in constants
import { LinearGradient } from 'expo-linear-gradient'; // <-- Import LinearGradient

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// --- Ensure you have LOGO_URL and PLACEHOLDER_AVATAR defined in your constants file ---
// Example in config/constants.js:
// export const THEME_COLOR_PRIMARY = '#2ECC71';
// export const LOGO_URL = 'https://via.placeholder.com/150/0000FF/FFFFFF?text=LOGO'; // Replace with actual logo URL
// export const PLACEHOLDER_AVATAR = 'https://via.placeholder.com/150/CCCCCC/FFFFFF?text=User'; // Replace with actual placeholder URL
// ----------------------------------------------------------------------------------


const CommunityScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState(null);

  const currentUserId = auth.currentUser ? auth.currentUser.uid : null;

  const filteredPosts = posts.filter(post => {
    const text = typeof post.text === 'string' ? post.text : '';
    const username = typeof post.username === 'string' ? post.username : '';
    const query = searchQuery.trim().toLowerCase();
    return (
      text.toLowerCase().includes(query) ||
      username.toLowerCase().includes(query)
    );
  });

  const fetchCurrentUserProfile = useCallback(async () => {
    if (auth.currentUser) {
      try {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          setCurrentUserProfile(docSnap.data());
        } else {
          console.warn("[CommunityScreen] Current user profile not found in Firestore.");
           // Set a default profile state if doc doesn't exist, prevents errors later
           setCurrentUserProfile({
               username: 'Anonymous', // Or some default
               avatarUrl: PLACEHOLDER_AVATAR,
               // ... other default fields
           });
        }
      } catch (error) {
        console.error("[CommunityScreen] Error fetching user profile:", error);
         // Set a default profile state on error too
         setCurrentUserProfile({
               username: 'Error Loading', // Or some default
               avatarUrl: PLACEHOLDER_AVATAR,
               // ... other default fields
           });
      }
    } else {
         // Set default profile state if no user logged in
         setCurrentUserProfile({
               username: 'Not Logged In',
               avatarUrl: PLACEHOLDER_AVATAR,
               // ... other default fields
           });
    }
  }, []);


  useEffect(() => {
    fetchCurrentUserProfile();

    const postsCollectionRef = collection(db, 'posts');
    const q = query(postsCollectionRef, orderBy('createdAt', 'desc'));

    if (posts.length === 0) {
        setIsLoading(true);
    }
    console.log("[CommunityScreen] Setting up posts listener.");

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedPosts = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setPosts(fetchedPosts);
      if (isLoading) setIsLoading(false);
      if (refreshing) setRefreshing(false);
      console.log(`[CommunityScreen] Fetched ${fetchedPosts.length} posts.`);
    }, (error) => {
      console.error("[CommunityScreen] Error fetching posts with onSnapshot: ", error);
      Alert.alert("Error", `Could not fetch community posts. ${error.message}`);
      setIsLoading(false);
      setRefreshing(false);
    });

    return () => {
        console.log("[CommunityScreen] Unsubscribing from posts listener.");
        unsubscribe();
    };
  }, []); // Removed dependencies that might cause re-subscriptions unnecessarily


  const onRefresh = useCallback(() => {
    console.log("[CommunityScreen] Refresh triggered.");
    setRefreshing(true);
    fetchCurrentUserProfile();
    // onSnapshot will handle updating posts, setting refreshing(false) when done.
  }, [fetchCurrentUserProfile]);


  const handleCreatePost = () => {
    if (!currentUserId) {
        Alert.alert("Login Required", "Please log in to create a post.");
        return;
    }
    if (!currentUserProfile || !currentUserProfile.username || currentUserProfile.username === 'Anonymous' || currentUserProfile.username === 'Error Loading' || currentUserProfile.username === 'Not Logged In') {
        Alert.alert("Profile Incomplete", "Please complete your profile (especially username) before posting.", [
            { text: "OK" },
            { text: "Go to Profile", onPress: () => navigation.navigate('Profile') }
        ]);
        return;
    }
    navigation.navigate('CreatePost');
  };

  const handleLikeToggle = async (postId, isCurrentlyLiked) => {
    if (!currentUserId) {
      Alert.alert("Not Logged In", "You need to be logged in to like posts.");
      return;
    }
    const postRef = doc(db, "posts", postId);
    try {
      await updateDoc(postRef, {
        likesCount: increment(isCurrentlyLiked ? -1 : 1),
        likedBy: isCurrentlyLiked ? arrayRemove(currentUserId) : arrayUnion(currentUserId)
      });
    } catch (error) {
      console.error("[CommunityScreen] Error updating like: ", error);
      Alert.alert("Error", `Could not update like status. ${error.message}`);
    }
  };

  const handleCommentPress = (postId) => {
    if (!currentUserId) {
        Alert.alert("Login Required", "Please log in to view or add comments.");
        return;
    }
     if (!currentUserProfile || !currentUserProfile.username || currentUserProfile.username === 'Anonymous' || currentUserProfile.username === 'Error Loading' || currentUserProfile.username === 'Not Logged In') {
        Alert.alert("Profile Incomplete", "Please complete your profile (especially username) before commenting.", [
            { text: "OK" },
            { text: "Go to Profile", onPress: () => navigation.navigate('Profile') }
        ]);
        return;
    }
    navigation.navigate('Comments', {
        postId: postId,
        currentUserData: {
            uid: currentUserId,
            username: currentUserProfile.username,
            avatarUrl: currentUserProfile.avatarUrl
        }
    });
  };

  const handleSharePress = async (postText, postId) => {
    try {
      const appName = "NutriScan"; // Replace with your app's name
      const result = await Share.share({
        message: `${postText}\n\nShared from ${appName}`,
        title: 'Check out this post!',
      });
      if (result.action === Share.sharedAction) {
        console.log(`[CommunityScreen] Post ${postId} shared via ${result.activityType || 'unknown'}`);
      } else if (result.action === Share.dismissedAction) {
        console.log('[CommunityScreen] Share dismissed');
      }
    } catch (error) {
      Alert.alert("Share Error", error.message);
    }
  };

  const handleDeletePost = async (postIdToDelete) => {
    if (!currentUserId) {
      Alert.alert("Not Logged In", "You need to be logged in to delete posts.");
      return;
    }
    const postToDelete = posts.find(p => p.id === postIdToDelete);
    if (postToDelete && postToDelete.userId !== currentUserId) {
        Alert.alert("Permission Denied", "You can only delete your own posts.");
        return;
    }

    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => console.log("Delete cancelled")
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingPostId(postIdToDelete);
            console.log(`[CommunityScreen] Attempting to delete post: ${postIdToDelete}`);
            try {
              const postRef = doc(db, "posts", postIdToDelete);
              await deleteDoc(postRef);
              console.log(`[CommunityScreen] Successfully deleted post: ${postIdToDelete}`);
              // onSnapshot listener will update the posts list.
              // NOTE: Subcollections (comments, etc.) are NOT automatically deleted.
              // This requires a Firebase Cloud Function for proper cleanup in production.
            } catch (error) {
              console.error("[CommunityScreen] Error deleting post: ", error);
              Alert.alert("Error", `Could not delete the post. ${error.message}`);
            } finally {
              setDeletingPostId(null);
            }
          }
        }
      ]
    );
  };


  const renderHeader = () => (
    // The outer headerContainer View can still hold shadows/elevation for the whole block
    <View style={styles.headerContainerWrapper}>
      {/* Wrap the TOP ROW content in LinearGradient */}
      <LinearGradient
        colors={THEME_COLOR ? [THEME_COLOR, '#00A040'] : ['#00C853', '#00A040']} // Same gradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerTopRow} // Apply fixed height and row layout here
      >
        {/* Header Left (Logo + Spacer) */}
        <View style={styles.headerLeft}> {/* This view provides the left offset for centering */}
          {/* Using Image component for network images */}
           <Image
            source={{ uri: LOGO_URL }}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          {/* <View style={{width: 10}} /> Optional spacer if logo margin not enough */}
        </View>

        {/* Header Title (Centered) */}
        <Text style={styles.headerTitle}>COMMUNITY</Text>

        {/* Header Right (Profile Icon + Spacer) */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          style={styles.profileButton} // This view provides the right offset for centering
        >
          <Image
            source={{ uri: currentUserProfile?.avatarUrl || PLACEHOLDER_AVATAR }}
            style={styles.headerProfileIcon}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </LinearGradient>

      {/* Search bar remains below the gradient header top row */}
      <View style={styles.searchContainer}>
        <View style={[
          styles.searchInputContainer,
          isSearchFocused && styles.searchInputContainerFocused
        ]}>
          <Ionicons
            name="search-outline"
            size={20}
            color={isSearchFocused ? THEME_COLOR : "#999"}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search posts or users..."
            placeholderTextColor="#999"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <MaterialCommunityIcons
          name="forum-outline"
          size={screenWidth * 0.15}
          color="#E0E0E0"
        />
      </View>
      {/* --- Check for whitespace here --- */}
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No posts found' : 'Welcome to the Community!'}
      </Text>
      {/* --- Check for whitespace here --- */}
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? `We couldn't find any posts matching "${searchQuery}". Try a different search.`
          : 'Be the first to share your thoughts, ask questions, or connect with others.'
        }
      </Text>
      {/* --- Check for whitespace here --- */}
      {!searchQuery && (
        <TouchableOpacity
          style={styles.emptyActionButton}
          onPress={handleCreatePost}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={22} color="#fff" style={styles.emptyActionIcon} />
          {/* --- Check for whitespace here --- */}
          <Text style={styles.emptyActionText}>Create a New Post</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading && posts.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
         <StatusBar barStyle="light-content" backgroundColor={THEME_COLOR} />
        {renderHeader()} {/* Show header even during initial load */}
        <View style={styles.loadingIndicatorContainer}> {/* Make this container take space below header */}
          <ActivityIndicator size="large" color={THEME_COLOR} />
          {/* --- Check for whitespace here --- */}
          <Text style={styles.loadingText}>Loading posts...说到做到!</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_COLOR} />
      {renderHeader()}
      <FlatList
        data={filteredPosts}
        renderItem={({ item }) => (
          <View style={styles.postCardWrapper}>
            <PostCard
              post={item}
              currentUserId={currentUserId}
              currentUserAvatarUrl={currentUserProfile?.avatarUrl}
              onLikeToggle={handleLikeToggle}
              onCommentPress={handleCommentPress}
              onSharePress={handleSharePress}
              onUserPress={(userId, username) => {
                if (userId === currentUserId) {
                  navigation.navigate('Profile');
                } else {
                  Alert.alert("View Profile", `Tapped on ${username || 'user'}. Profile view coming soon!`);
                  // navigation.navigate('UserProfileScreen', { userId, username });
                }
              }}
              onDeletePost={handleDeletePost}
              navigation={navigation}
            />
            {deletingPostId === item.id && (
              <View style={styles.postDeletingOverlay}>
                <ActivityIndicator color={'#fff'} size="small" />
                 {/* --- Check for whitespace here --- */}
                <Text style={styles.postDeletingText}>Deleting...</Text>
              </View>
            )}
          </View>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          filteredPosts.length === 0 && styles.listContainerEmpty
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!isLoading ? renderEmptyComponent : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME_COLOR]}
            tintColor={THEME_COLOR}
            progressBackgroundColor="#fff"
          />
        }
        ItemSeparatorComponent={() => <View style={styles.postSeparator} />}
        style={{ flex: 1 }} // Make FlatList take available space below header
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreatePost}
        activeOpacity={0.8}
      >
        <Ionicons name="create-outline" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F2F5', // Consistent background color
  },
  // This wrapper holds the gradient row and the search bar
  headerContainerWrapper: {
     elevation: 3, // Apply shadow/elevation to the whole header block
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.1,
     shadowRadius: 4,
     backgroundColor: '#fff', // Background for the search area (visible under shadow)
  },
  // Style for the top row with gradient, logo, title, profile icon
  headerTopRow: {
    flexDirection: 'row',
    // justifyContent: 'space-between', // Removed space-between
    alignItems: 'center',
    height: 65, // Fixed height (match HomeScreen/Notifications)
    paddingHorizontal: 16, // Horizontal padding inside the gradient bar
    // Removed paddingTop and paddingBottom
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    // *** MODIFIED FOR CENTERING ***
    width: 60, // Give the left container a fixed width (approx logo width + margin + padding)
    justifyContent: 'flex-start', // Align logo to the start of its container
    // *** END MODIFIED ***
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 16, // Make it round
    marginRight: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.3,
    // *** MODIFIED FOR CENTERING ***
    flex: 1, // Allow title to take available space
    textAlign: 'center', // Center the text within the available space
    // Negative margin is often not needed when left/right containers are balanced
    // marginLeft: -42, // <-- Try removing this or setting to 0
    // *** END MODIFIED ***
  },
  profileButton: {
    padding: 4, // Increase touchable area
    // *** MODIFIED FOR CENTERING ***
    width: 60, // Give the right container a fixed width (approx profile icon width + padding)
    alignItems: 'flex-end', // Align the profile icon to the right within its space
    // *** END MODIFIED ***
  },
  headerProfileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18, // Make it round
    backgroundColor: '#fff', // Background if image fails
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)', // Light border
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff', // Should match headerContainerWrapper background
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 44,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInputContainerFocused: {
    borderColor: THEME_COLOR,
    backgroundColor: '#fff',
    shadowColor: THEME_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 5,
  },
  loadingIndicatorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  listContainer: {
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: screenHeight * 0.15,
  },
  listContainerEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  postCardWrapper: {
    position: 'relative',
  },
  postDeletingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: Platform.OS === 'ios' ? 0 : 5,
    marginBottom: 10,
    zIndex: 1,
  },
  postDeletingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  postSeparator: {
    height: 8,
    backgroundColor: '#F0F2F5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: screenHeight * 0.1,
  },
  emptyIconContainer: {
    backgroundColor: '#E9ECEF',
    padding: screenWidth * 0.05,
    borderRadius: screenWidth * 0.1,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: screenWidth * 0.055,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: screenWidth * 0.04,
    color: '#555',
    textAlign: 'center',
    lineHeight: screenWidth * 0.055,
    marginBottom: 25,
  },
  emptyActionButton: {
    backgroundColor: THEME_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  emptyActionIcon: {
    marginRight: 8,
  },
  emptyActionText: {
    color: '#fff',
    fontSize: screenWidth * 0.04,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: Platform.OS === 'ios' ? 90 : 70,
    backgroundColor: '#00C853', // Solid green (NutriScan theme)
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    // iOS shadow
    shadowColor: '#00C853', // Green shadow for a soft glow
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    // Android shadow
    elevation: 10,
    borderWidth: 0, // No border for a clean look
    zIndex: 1000,
  },
});

export default CommunityScreen;