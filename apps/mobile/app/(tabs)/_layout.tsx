import { Tabs } from 'expo-router';
import { View, StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const logoSource = require('../../assets/icon.png');

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#60a5fa', // Accent blue color
        tabBarInactiveTintColor: '#71717a', // Gray
        tabBarStyle: {
          backgroundColor: '#020617',
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          borderTopWidth: 1,
          height: 90,
          paddingBottom: 30,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#020617',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: () => (
            <View style={styles.headerContainer}>
              <Image 
                source={logoSource} 
                style={styles.headerLogo}
                contentFit="contain"
                transition={200}
              />
              <Text style={styles.headerTitle}>ALL VERSE GPT</Text>
            </View>
          ),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: 'Sell',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 28,
    height: 28,
    tintColor: undefined, // Don't tint the image
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
});

