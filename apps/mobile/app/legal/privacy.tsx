import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function PrivacyScreen() {
  const handleEmailPress = () => {
    Linking.openURL('mailto:allversegpt@gmail.com');
  };

  const handleWebsitePress = () => {
    Linking.openURL('https://www.allversegpt.com');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.lastUpdated}>
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionText}>
              All Verse GPT ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our marketplace platform and services.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Information We Collect</Text>
            <Text style={styles.subsectionTitle}>1.1 Information You Provide</Text>
            <Text style={styles.bulletPoint}>• Account Information: Name, email address, phone number, username, password</Text>
            <Text style={styles.bulletPoint}>• Profile Information: Profile picture, bio, interests, buying/selling preferences</Text>
            <Text style={styles.bulletPoint}>• Listing Information: Product photos, descriptions, prices, categories, condition details</Text>
            <Text style={styles.bulletPoint}>• Payment Information: Payment method details (processed securely through Stripe)</Text>
            <Text style={styles.bulletPoint}>• Communication Data: Messages between buyers and sellers, customer support inquiries</Text>
            <Text style={styles.bulletPoint}>• Shipping Information: Delivery addresses, package dimensions, tracking details</Text>

            <Text style={styles.subsectionTitle}>1.2 Information Collected Automatically</Text>
            <Text style={styles.bulletPoint}>• Device Information: IP address, browser type, operating system, device identifiers</Text>
            <Text style={styles.bulletPoint}>• Usage Data: Pages viewed, features used, time spent, click patterns</Text>
            <Text style={styles.bulletPoint}>• Location Data: Approximate location based on IP address (for shipping and local listings)</Text>
            <Text style={styles.bulletPoint}>• Cookies and Similar Technologies: To enhance your experience and remember preferences</Text>

            <Text style={styles.subsectionTitle}>1.3 AI-Generated Information</Text>
            <Text style={styles.bulletPoint}>• AI Analysis: Product descriptions, titles, categories, and pricing suggestions generated from your uploaded photos</Text>
            <Text style={styles.bulletPoint}>• Chat Interactions: Conversations with our AI assistant for listing creation and support</Text>
            <Text style={styles.bulletPoint}>• Market Insights: AI-generated market research and pricing recommendations</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
            <Text style={styles.bulletPoint}>• Create and manage your account</Text>
            <Text style={styles.bulletPoint}>• Process transactions and payments</Text>
            <Text style={styles.bulletPoint}>• Enable buying, selling, and communication between users</Text>
            <Text style={styles.bulletPoint}>• Provide AI-powered features (product analysis, pricing suggestions, chat assistance)</Text>
            <Text style={styles.bulletPoint}>• Send transactional notifications (order updates, messages, account alerts)</Text>
            <Text style={styles.bulletPoint}>• Improve our services and develop new features</Text>
            <Text style={styles.bulletPoint}>• Prevent fraud and enhance security</Text>
            <Text style={styles.bulletPoint}>• Comply with legal obligations</Text>
            <Text style={styles.bulletPoint}>• Send marketing communications (with your consent)</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Information Sharing and Disclosure</Text>
            <Text style={styles.subsectionTitle}>3.1 Other Users</Text>
            <Text style={styles.sectionText}>
              When you create a listing or send a message, certain information (username, profile picture, listing details) becomes visible to other users.
            </Text>

            <Text style={styles.subsectionTitle}>3.2 Service Providers</Text>
            <Text style={styles.bulletPoint}>• Firebase/Google Cloud: Database, authentication, and storage services</Text>
            <Text style={styles.bulletPoint}>• Stripe: Payment processing (they have their own privacy policy)</Text>
            <Text style={styles.bulletPoint}>• Google Gemini AI: AI-powered product analysis and chat features</Text>
            <Text style={styles.bulletPoint}>• Vercel: Hosting and deployment services</Text>

            <Text style={styles.subsectionTitle}>3.3 Legal Requirements</Text>
            <Text style={styles.sectionText}>
              We may disclose your information if required by law, court order, or governmental authority, or to protect our rights, users' safety, or prevent fraud.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Data Security</Text>
            <Text style={styles.sectionText}>
              We implement industry-standard security measures to protect your information:
            </Text>
            <Text style={styles.bulletPoint}>• Encrypted data transmission (HTTPS/TLS)</Text>
            <Text style={styles.bulletPoint}>• Secure Firebase authentication</Text>
            <Text style={styles.bulletPoint}>• Access controls and authentication requirements</Text>
            <Text style={styles.bulletPoint}>• Regular security audits and updates</Text>
            <Text style={styles.bulletPoint}>• PCI-compliant payment processing through Stripe</Text>
            <Text style={[styles.sectionText, { marginTop: 12 }]}>
              However, no method of transmission over the internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Your Rights and Choices</Text>
            <Text style={styles.sectionText}>You have the right to:</Text>
            <Text style={styles.bulletPoint}>• Access: Request a copy of your personal information</Text>
            <Text style={styles.bulletPoint}>• Correction: Update or correct your information through your account settings</Text>
            <Text style={styles.bulletPoint}>• Deletion: Request deletion of your account and associated data</Text>
            <Text style={styles.bulletPoint}>• Opt-Out: Unsubscribe from marketing emails (transactional emails will continue)</Text>
            <Text style={styles.bulletPoint}>• Data Portability: Request your data in a structured, machine-readable format</Text>
            <Text style={styles.bulletPoint}>• Withdrawal of Consent: Withdraw consent for data processing where applicable</Text>
            <Text style={[styles.sectionText, { marginTop: 12 }]}>
              To exercise these rights, please contact us at{' '}
              <Text style={styles.link} onPress={handleEmailPress}>allversegpt@gmail.com</Text> or through your account settings.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>12. Contact Us</Text>
            <Text style={styles.sectionText}>
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
            </Text>
            <View style={styles.contactBox}>
              <Text style={styles.contactText}>
                <Text style={styles.contactLabel}>All Verse GPT</Text>{'\n'}
                Email: <Text style={styles.link} onPress={handleEmailPress}>allversegpt@gmail.com</Text>{'\n'}
                Website: <Text style={styles.link} onPress={handleWebsitePress}>www.allversegpt.com</Text>
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
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
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 99, 225, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  content: {
    gap: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 22,
  },
  bulletPoint: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 22,
    marginBottom: 8,
    paddingLeft: 8,
  },
  contactBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 12,
  },
  contactText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 22,
  },
  contactLabel: {
    fontWeight: '600',
    color: '#fff',
  },
  link: {
    color: '#0063e1',
    textDecorationLine: 'underline',
  },
});

