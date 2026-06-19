import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { useEffect, useRef } from 'react';
import {colors} from '../constants/theme';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { registerForPushNotifications, Notifications } from '../lib/notifications';
import { apiClient } from '../lib/api/client';

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

    // Register push token and store it
    registerForPushNotifications().then((token) => {
      if (token) {
        apiClient.post('/api/notifications/token', { token }, true).catch(() => {});
      }
    });

    // Foreground notification listener
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});

    // Tap notification → navigate to the right screen
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, any>;
      if ((data?.type === 'message' || data?.type === 'offer') && data?.chatId) {
        router.push(`/chat/${data.chatId}` as any);
      } else if (data?.type === 'new_listing' && data?.listingId) {
        router.push(`/listing/${data.listingId}` as any);
      } else if (data?.type === 'order' || data?.type === 'sale' || data?.type === 'shipped') {
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
        <View style={styles.container}>
          <StatusBar style="light" />
          <AuthGate />
          <NotificationSetup />
        <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.bg.base,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: colors.border.subtle,
          },
          headerTintColor: colors.brand.DEFAULT,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
            color: colors.text.primary,
          },
          contentStyle: {
            backgroundColor: colors.bg.base,
          },
          headerBackTitleVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="auth/verify-email" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="auth/setup-profile" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen 
          name="listing/[id]" 
          options={{ 
            title: 'Listing Details',
            headerShown: true,
            headerBackTitle: 'Home',
            headerBackTitleVisible: true,
          }} 
        />
        <Stack.Screen 
          name="chat/[id]" 
          options={{ 
            title: 'Chat',
            headerShown: false,
            headerBackTitle: 'Back',
            headerBackTitleVisible: true,
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
      </View>
    </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
});

