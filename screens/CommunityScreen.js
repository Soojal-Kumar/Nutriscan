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
import PostCard from '../components/PostCard';
import { THEME_COLOR_PRIMARY as THEME_COLOR, LOGO_URL, PLACEHOLDER_AVATAR } from '../config/constants';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
           setCurrentUserProfile({
               username: 'Anonymous',
               avatarUrl: PLACEHOLDER_AVATAR,
           });
        }
      } catch (error) {
        console.error("[CommunityScreen] Error fetching user profile:", error);
         setCurrentUserProfile({
               username: 'Error Loading',
               avatarUrl: PLACEHOLDER_AVATAR,
           });
      }
    } else {
         setCurrentUserProfile({
               username: 'Not Logged In',
               avatarUrl: PLACEHOLDER_AVATAR,
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
  }, []);


  const onRefresh = useCallback(() => {
    console.log("[CommunityScreen] Refresh triggered.");
    setRefreshing(true);
    fetchCurrentUserProfile();
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
      const appName = "NutriScan";
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
    <View style={styles.headerContainerWrapper}>
      <LinearGradient
        colors={THEME_COLOR ? [THEME_COLOR, '#00A040'] : ['#00C853', '#00A040']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerTopRow}
      >
        <View style={styles.headerLeft}>
           <Image
            source={{ uri: LOGO_URL }}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.headerTitle}>COMMUNITY</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          style={styles.profileButton}
        >
          <Image
            source={{ uri: currentUserProfile?.avatarUrl || PLACEHOLDER_AVATAR }}
            style={styles.headerProfileIcon}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </LinearGradient>

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
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No posts found' : 'Welcome to the Community!'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? `We couldn't find any posts matching "${searchQuery}". Try a different search.`
          : 'Be the first to share your thoughts, ask questions, or connect with others.'
        }
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={styles.emptyActionButton}
          onPress={handleCreatePost}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={22} color="#fff" style={styles.emptyActionIcon} />
          <Text style={styles.emptyActionText}>Create a New Post</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading && posts.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
         <StatusBar barStyle="light-content" backgroundColor={THEME_COLOR} />
        {renderHeader()}
        <View style={styles.loadingIndicatorContainer}>
          <ActivityIndicator size="large" color={THEME_COLOR} />
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
                }
              }}
              onDeletePost={handleDeletePost}
              navigation={navigation}
            />
            {deletingPostId === item.id && (
              <View style={styles.postDeletingOverlay}>
                <ActivityIndicator color={'#fff'} size="small" />
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
        // FIX 2: Apply styles to the FlatList component itself
        style={{ flex: 1, backgroundColor: '#F0F2F5' }}
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

// --- CORRECTED STYLES ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // FIX 1: Set the SafeAreaView background to the header color for a seamless status bar.
    backgroundColor: THEME_COLOR,
  },
  headerContainerWrapper: {
     elevation: 3,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.1,
     shadowRadius: 4,
     backgroundColor: '#fff',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 65, // Consistent fixed height
    paddingHorizontal: 16,
  },
  // --- ROBUST HEADER CENTERING STYLES ---
  headerLeft: {
    width: 60, // Fixed width for the left container
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexDirection: 'row',
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerTitle: {
    flex: 1, // Let the title take available space
    textAlign: 'center', // Center the text within its own container
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.3,
    // REMOVED fragile negative margin
  },
  profileButton: {
    width: 60, // Match left container's width for perfect balance
    alignItems: 'flex-end',
    padding: 4,
  },
  headerProfileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  // --- END OF HEADER CENTERING STYLES ---
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
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
    backgroundColor: '#F0F2F5', // Ensure loading view has correct background
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
    backgroundColor: '#00C853',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 0,
    zIndex: 1000,
  },
});

export default CommunityScreen;
