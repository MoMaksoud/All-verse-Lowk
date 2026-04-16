import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { colors } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const faqs = [
  {
    question: "Why didn't I receive a verification email?",
    answer: 'Check your spam or junk folder. Mark it as "Not Spam" so future emails go to your inbox.',
  },
  {
    question: "How do I list an item?",
    answer: 'Go to "Create Listing," upload photos, add details, and use our Smart Pricing Engine for instant price guidance.',
  },
  {
    question: "Can I negotiate prices?",
    answer: "Yes. Buyers and sellers can negotiate directly through the in-app messaging system.",
  },
  {
    question: "How does the Smart Pricing Engine work?",
    answer: "It analyzes market listings, recent sale trends, and condition data to suggest accurate pricing ranges.",
  },
  {
    question: "How do I report a problem with a seller or buyer?",
    answer: "Email us at info@allversegpt.com with screenshots and the order ID.",
  },
  {
    question: "What payment methods are supported?",
    answer: "We support major debit cards, credit cards, and integrated wallet options.",
  },
  {
    question: "When do sellers receive payouts?",
    answer: "After the buyer confirms the item has arrived and matches the description.",
  },
  {
    question: "What happens if my item arrives damaged?",
    answer: "Contact support immediately. Provide photos and we will start a dispute resolution process.",
  },
  {
    question: "How do I delete my account?",
    answer: "Go to Settings → Account → Delete Account. You may also request removal by emailing support.",
  },
  {
    question: "How do I update my email or password?",
    answer: 'You can change both under "Account Settings."',
  },
];

export default function FAQScreen() {
  const handleContactSupport = () => {
    Linking.openURL('mailto:info@allversegpt.com');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FAQ</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerSection}>
          <View style={styles.badge}>
            <Ionicons name="help-circle" size={20} color={colors.brand.DEFAULT} />
            <Text style={styles.badgeText}>Frequently Asked Questions</Text>
          </View>
          <Text style={styles.title}>All Verse GPT – FAQ</Text>
          <Text style={styles.subtitle}>
            Find quick answers to common questions about using All Verse GPT
          </Text>
        </View>

        <View style={styles.faqList}>
          {faqs.map((faq, index) => (
            <View key={index} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>
                <Text style={styles.faqNumber}>{index + 1}.</Text> {faq.question}
              </Text>
              <Text style={styles.faqAnswer}>{faq.answer}</Text>
            </View>
          ))}
        </View>

        <View style={styles.ctaSection}>
          <Ionicons name="mail" size={48} color={colors.brand.DEFAULT} />
          <Text style={styles.ctaTitle}>Still have questions?</Text>
          <Text style={styles.ctaText}>
            If your question is not listed, email us at info@allversegpt.com
          </Text>
          <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
            <Ionicons name="mail" size={20} color={colors.text.primary} />
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
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
  },
  faqList: {
    gap: 16,
    marginBottom: 32,
  },
  faqItem: {
    backgroundColor: colors.bg.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 20,
  },
  faqQuestion: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
    lineHeight: 26,
  },
  faqNumber: {
    color: colors.brand.DEFAULT,
  },
  faqAnswer: {
    fontSize: 15,
    color: colors.text.tertiary,
    lineHeight: 22,
    paddingLeft: 24,
  },
  ctaSection: {
    backgroundColor: colors.brand.softer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.brand.soft,
    padding: 32,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  ctaText: {
    fontSize: 15,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brand.DEFAULT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  contactButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

