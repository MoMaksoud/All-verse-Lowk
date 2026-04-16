import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { colors, palette } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function HelpScreen() {
  const handleEmailPress = () => {
    Linking.openURL('mailto:info@allversegpt.com');
  };

  const helpSections = [
    {
      icon: 'search',
      iconColor: colors.success.DEFAULT,
      title: 'Getting Started',
      items: [
        'Create an account using your email.',
        'Verify your email (check spam if not received).',
        'Start listing items instantly using our Smart Pricing Engine.',
      ],
    },
    {
      icon: 'create-outline',
      iconColor: palette.violet[500],
      title: 'Managing Your Listings',
      items: [
        'Edit title, description, price, and photos anytime.',
        'Use recommended pricing to stay competitive.',
        'Deactivate or delete listings if the item is sold.',
      ],
    },
    {
      icon: 'bag-outline',
      iconColor: palette.primary[500],
      title: 'Buying Items',
      items: [
        'Browse listings or search using keywords.',
        'Message sellers directly inside the app.',
        'Request additional photos or negotiate price.',
      ],
    },
    {
      icon: 'cube-outline',
      iconColor: palette.orange[500],
      title: 'Shipping & Delivery',
      items: [
        'Sellers can ship items through integrated carriers.',
        'Tracking numbers update automatically inside your dashboard.',
        'For damaged or missing orders, contact support immediately.',
      ],
    },
    {
      icon: 'shield-outline',
      iconColor: colors.error.DEFAULT,
      title: 'Account & Security',
      items: [
        'Reset your password anytime from the login page.',
        'Two-factor authentication is coming soon.',
        'Report suspicious users at info@allversegpt.com.',
      ],
    },
    {
      icon: 'card-outline',
      iconColor: colors.success.DEFAULT,
      title: 'Payments',
      items: [
        'Secure checkout powered by our payment partners.',
        'Sellers receive payouts after item confirmation.',
        'For payout issues, email us with your order ID.',
      ],
    },
    {
      icon: 'time-outline',
      iconColor: colors.brand.DEFAULT,
      title: 'Support Response Times',
      items: [
        'Typical response: 1–12 hours.',
        'Priority for disputes, payment issues, and safety concerns.',
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerSection}>
          <View style={styles.badge}>
            <Ionicons name="chatbubbles" size={20} color={colors.brand.DEFAULT} />
            <Text style={styles.badgeText}>Help Center</Text>
          </View>
          <Text style={styles.title}>All Verse GPT – Help Center</Text>
          <Text style={styles.subtitle}>
            We're here to support you as you buy, sell, and manage listings across the All Verse GPT platform.
          </Text>
          <View style={styles.contactBanner}>
            <Ionicons name="mail" size={20} color={colors.brand.DEFAULT} />
            <Text style={styles.contactBannerText}>
              Need help? Contact us at{' '}
              <Text style={styles.contactLink} onPress={handleEmailPress}>info@allversegpt.com</Text>
            </Text>
          </View>
        </View>

        <View style={styles.sectionsList}>
          {helpSections.map((section, index) => (
            <View key={index} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconContainer, { backgroundColor: `${section.iconColor}20`, borderColor: `${section.iconColor}40` }]}>
                  <Ionicons name={section.icon as any} size={24} color={section.iconColor} />
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <View style={styles.sectionItems}>
                {section.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.itemRow}>
                    <Text style={[styles.bullet, { color: section.iconColor }]}>•</Text>
                    <Text style={styles.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footerSection}>
          <Text style={styles.footerTitle}>Thank you for choosing All Verse GPT.</Text>
          <Text style={styles.footerText}>
            Still need help? We're just an email away at{' '}
            <Text style={styles.contactLink} onPress={handleEmailPress}>info@allversegpt.com</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.brand.softer,
    borderWidth: 1,
    borderColor: colors.brand.soft,
    marginBottom: 24,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.DEFAULT,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  contactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.brand.softer,
    borderWidth: 1,
    borderColor: colors.brand.soft,
    borderRadius: 12,
  },
  contactBannerText: {
    fontSize: 15,
    color: palette.primary[300],
  },
  contactLink: {
    fontWeight: '600',
    color: colors.brand.DEFAULT,
    textDecorationLine: 'underline',
  },
  sectionsList: {
    gap: 16,
    marginBottom: 32,
  },
  sectionCard: {
    backgroundColor: colors.bg.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  sectionItems: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bullet: {
    fontSize: 16,
    marginTop: 2,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    color: colors.text.tertiary,
    lineHeight: 22,
  },
  footerSection: {
    backgroundColor: colors.bg.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 24,
    alignItems: 'center',
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 15,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

