import React from 'react';
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

/**
 * About screen. Mobile port of apps/web/src/app/about/page.tsx, scoped to
 * the "Who We Are" + "What We Do" sections. The web version also surfaces
 * a Leadership grid via `teamMembers` + `TeamMemberCard`, which we omit on
 * mobile for now to avoid porting that data layer — the web team page is
 * still reachable via the Visit Website button at the bottom.
 */
export default function AboutScreen() {
  const handleWebsitePress = () => {
    Linking.openURL('https://www.allversegpt.com');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Us</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerSection}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="information-circle"
              size={32}
              color={colors.text.primary}
            />
          </View>
          <Text style={styles.title}>About Us</Text>
        </View>

        <View style={styles.content}>
          {/* Who We Are */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Who We Are</Text>
            <Text style={styles.sectionText}>
              All Verse GPT is an AI-driven marketplace and interaction hub. The
              core idea is simple: technology should make trading smarter, safer,
              and easier for both buyers and sellers. We blend software and
              intelligent tools to remove the guesswork from pricing,
              communication, and product discovery. Instead of spending time
              bouncing between apps, you get a single streamlined place to
              browse, chat, and make decisions confidently.
            </Text>
          </View>

          {/* What We Do */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What We Do</Text>
            <Text style={styles.sectionText}>On the platform, users can:</Text>
            <Text style={styles.bulletPoint}>
              • Talk directly with sellers through Smart Chat.
            </Text>
            <Text style={styles.bulletPoint}>
              • Get AI-assisted offer suggestions for faster negotiation.
            </Text>
            <Text style={styles.bulletPoint}>
              • Explore fair price guidance using real-time market insights.
            </Text>
            <Text style={styles.bulletPoint}>
              • Discover products efficiently through smart search and listing
              previews.
            </Text>
            <Text style={[styles.sectionText, { marginTop: 12 }]}>
              Our tools are built to feel natural, fast, and helpful. Whether
              you're listing an item or making an offer, the AI works quietly in
              the background giving you clarity so you can focus on the
              decision, not the process.
            </Text>
          </View>

          {/* Our Team (pointer to web) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Our Team</Text>
            <Text style={styles.sectionText}>
              We're a group of engineers, creators, and digital builders working
              together to push practical AI into real-world marketplace
              interactions.
            </Text>
            <TouchableOpacity
              style={styles.websiteButton}
              onPress={handleWebsitePress}
            >
              <Ionicons
                name="globe-outline"
                size={18}
                color={colors.brand.DEFAULT}
              />
              <Text style={styles.websiteButtonText}>
                Meet the full team on our website
              </Text>
            </TouchableOpacity>
          </View>
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
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.brand.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  content: {
    gap: 24,
  },
  section: {
    backgroundColor: colors.bg.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 15,
    color: colors.text.tertiary,
    lineHeight: 22,
  },
  bulletPoint: {
    fontSize: 15,
    color: colors.text.tertiary,
    lineHeight: 22,
    marginTop: 8,
    paddingLeft: 8,
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brand.DEFAULT,
    backgroundColor: 'transparent',
  },
  websiteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.brand.DEFAULT,
  },
});
