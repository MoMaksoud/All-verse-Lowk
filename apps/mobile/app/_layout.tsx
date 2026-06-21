import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {colors} from '../constants/theme';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { FavoritesProvider } from '../contexts/FavoritesContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Notifications } from '../lib/notifications';
import { AlertHost } from '../lib/ui/alert';
import { NotificationPrimer } from '../components/NotificationPrimer';

function AuthGate() {
  const { currentUser, loading, hasProfile, profileLoading } = useAuth();

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!currentUser) return;
    if (!currentUser.emailVerified) {
      router.replace('/auth/verify-email' as any);
      return;
    }
    if (!hasProfile) {
      router.replace('/auth/setup-profile' as any);
    }
  }, [currentUser?.uid, currentUser?.emailVerified, loading, hasProfile, profileLoading]);

  return null;
}

function NotificationSetup() {
  const { currentUser } = useAuth();
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (!currentUser) return;

    // Permission request + token registration is handled by <NotificationPrimer />
    // (custom priming first, then the OS prompt only on opt-in). Here we just
    // wire up the foreground + tap listeners.

    // Foreground notification listener
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});

    // Tap notification → navigate to the right screen
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, any>;
      if ((data?.type === 'message' || data?.type === 'offer') && data?.chatId) {
        router.push(`/chat/${data.chatId}` as any);
      } else if (data?.type === 'new_listing' && data?.listingId) {
        router.push(`/listing/${data.listingId}` as any);
      } else if (data?.type === 'order' || data?.type === 'shipped') {
        router.push('/orders' as any);
      } else if (data?.type === 'sale') {
        router.push('/(tabs)/profile' as any);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [currentUser?.uid]);

  return null;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <FavoritesProvider>
        <View style={styles.container}>
          <StatusBar style="light" />
          <AuthGate />
          <NotificationSetup />
          <NotificationPrimer />
        <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.bg.base,
          },
          headerShadowVisible: false,
          headerTintColor: colors.brand.DEFAULT,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
            color: colors.text.primary,
          },
          contentStyle: {
            backgroundColor: colors.bg.base,
          },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="favorites"
          options={{
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="cart"
          options={{
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen 
          name="listing/[id]" 
          options={{ 
            title: 'Listing Details',
            headerShown: true,
            headerLeft: () => (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Back to marketplace"
                hitSlop={12}
                style={styles.headerBackButton}
                onPress={() => {
                  if (router.canGoBack()) router.back();
                  else router.replace('/(tabs)' as any);
                }}
              >
                <Ionicons name="chevron-back" size={28} color={colors.brand.DEFAULT} />
              </TouchableOpacity>
            ),
          }} 
        />
        <Stack.Screen 
          name="chat/[id]" 
          options={{ 
            title: 'Chat',
            headerShown: false,
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen
          name="checkout"
          options={{
            title: 'Checkout',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="checkout-success"
          options={{
            title: 'Order Confirmed',
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="profile/[userId]"
          options={{
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="orders"
          options={{
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="legal/faq"
          options={{
            title: 'FAQ',
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="legal/privacy" 
          options={{ 
            title: 'Privacy Policy',
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="legal/terms" 
          options={{ 
            title: 'Terms of Service',
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="legal/help" 
          options={{ 
            title: 'Help Center',
            headerShown: false,
          }} 
        />
        <Stack.Screen
          name="legal/contact"
          options={{
            title: 'Contact Us',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="legal/about"
          options={{
            title: 'About Us',
            headerShown: false,
          }}
        />
      </Stack>
        <AlertHost />
      </View>
        </FavoritesProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  headerBackButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
});

