import { Tabs } from 'expo-router';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useUnreadMessages } from '../../hooks/useUnreadMessages';

const logoSource = require('../../assets/icon.png');

// Custom header component with Logo/Title
function CustomHeader({ title, showBackButton }: { title?: string; showBackButton?: boolean }) {
  const isHomePage = !title;

  return (
    <View style={styles.navbar}>
      {/* Center: Logo + Text (Home) or Title (Other pages) */}
      {isHomePage ? (
        <TouchableOpacity 
          style={styles.centerContainer}
          onPress={() => router.push('/(tabs)/index' as any)}
          activeOpacity={0.7}
        >
          <Image 
            source={logoSource} 
            style={styles.navbarLogo}
            contentFit="contain"
          />
          <Text style={styles.navbarTitle}>ALL VERSE GPT</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.centerTitleContainer}>
          <Text style={styles.centerTitle}>{title}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const unreadCount = useUnreadMessages();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#60a5fa', // Accent blue color
        tabBarInactiveTintColor: '#71717a', // Gray
        tabBarStyle: {
          backgroundColor: '#0f1b2e',
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#0f1b2e',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
          height: 100,
        },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          tabBarLabel: '',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
          tabBarLabel: '',
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
          tabBarLabel: '',
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          href: null, // Hide from tab bar but keep route accessible
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          href: null, // Hide from tab bar but keep route accessible
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              <Ionicons name="chatbubbles" size={size} color={color} />
              {unreadCount > 0 && (
                <View style={styles.badge} />
              )}
            </View>
          ),
          tabBarLabel: '',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
          tabBarLabel: '',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 44,
    paddingTop: 10,
  },
  centerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  centerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navbarLogo: {
    width: 28,
    height: 28,
  },
  navbarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  centerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    gap: 4,
  },
  backButtonText: {
    fontSize: 17,
    color: '#60a5fa',
    fontWeight: '600',
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#0f1b2e',
  },
});

