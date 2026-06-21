import { withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnreadMessages } from '../../hooks/useUnreadMessages';
import { colors, radii } from '../../constants/theme';

// expo-router file-based routing on top of React Navigation's material top tabs,
// which is swipeable. We position the tab bar at the bottom so it still looks
// like a normal bottom tab bar, but screens can be swiped left/right.
const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

const ICON_SIZE = 24;

export default function TabsLayout() {
  const unreadCount = useUnreadMessages();
  const insets = useSafeAreaInsets();

  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        lazy: true,
        tabBarActiveTintColor: colors.tab.active,
        tabBarInactiveTintColor: colors.tab.inactive,
        tabBarShowIcon: true,
        tabBarShowLabel: true,
        tabBarPressColor: 'transparent',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          textTransform: 'none',
          marginTop: 2,
          marginHorizontal: 0,
        },
        tabBarItemStyle: { paddingVertical: 6 },
        tabBarStyle: {
          backgroundColor: colors.tab.background,
          borderTopColor: colors.tab.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          elevation: 0,
          shadowOpacity: 0,
        },
        // Hide the sliding indicator so it reads as a flat bottom bar.
        tabBarIndicatorStyle: { height: 0 },
      }}
    >
      <MaterialTopTabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="home" size={ICON_SIZE} color={color} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="search"
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="search" size={ICON_SIZE} color={color} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="assistant"
        options={{
          tabBarLabel: 'AI',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="sparkles" size={ICON_SIZE} color={color} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="sell"
        options={{
          tabBarLabel: 'Sell',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="add-circle" size={ICON_SIZE} color={color} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="messages"
        options={{
          tabBarLabel: 'Inbox',
          tabBarIcon: ({ color }: { color: string }) => (
            <View style={styles.iconContainer}>
              <Ionicons name="chatbubbles" size={ICON_SIZE} color={color} />
              {unreadCount > 0 && <View style={styles.badge} />}
            </View>
          ),
        }}
      />
      <MaterialTopTabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="person" size={ICON_SIZE} color={color} />,
        }}
      />
    </MaterialTopTabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: radii.full,
    backgroundColor: colors.error.DEFAULT,
    borderWidth: 2,
    borderColor: colors.bg.base,
  },
});
