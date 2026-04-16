import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import {colors} from '../constants/theme';
import { AuthProvider } from '../contexts/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <View style={styles.container}>
          <StatusBar style="light" />
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

