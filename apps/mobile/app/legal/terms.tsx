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

export default function TermsScreen() {
  const handleEmailPress = () => {
    Linking.openURL('mailto:info@allversegpt.com');
  };

  const handleWebsitePress = () => {
    Linking.openURL('https://allversegpt.com');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="document-text" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.lastUpdated}>
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Introduction</Text>
            <Text style={styles.sectionText}>
              Welcome to All Verse GPT LLC (the "App"), an AI-powered marketplace and social hub. By accessing or using the App, you agree to comply with and be bound by these Terms and Conditions ("Terms"). If you do not agree with any part of these Terms, please refrain from using the App.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Definitions</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>"User":</Text> Any individual or entity accessing or using the App.{'\n\n'}
              <Text style={styles.bold}>"Content":</Text> Any information, data, text, graphics, photos, videos, or other materials uploaded, downloaded, or appearing on the App.{'\n\n'}
              <Text style={styles.bold}>"Services":</Text> The functionalities and features provided by the App, including but not limited to AI-generated content, marketplace transactions, and social interactions.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. User Eligibility</Text>
            <Text style={styles.sectionText}>By using the App, you represent and warrant that:</Text>
            <Text style={styles.bulletPoint}>• You are at least 18 years old or have reached the age of majority in your jurisdiction.</Text>
            <Text style={styles.bulletPoint}>• You have the legal capacity to enter into binding contracts.</Text>
            <Text style={styles.bulletPoint}>• Your use of the App does not violate any applicable laws or regulations.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. User Account</Text>
            <Text style={styles.subsectionTitle}>4.1 Registration</Text>
            <Text style={styles.sectionText}>
              To access certain features of the App, you may be required to create a user account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.
            </Text>
            <Text style={styles.subsectionTitle}>4.2 Account Security</Text>
            <Text style={styles.sectionText}>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify All Verse GPT LLC immediately of any unauthorized use of your account or any other breach of security.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. User Conduct</Text>
            <Text style={styles.sectionText}>By using the App, you agree not to:</Text>
            <Text style={styles.bulletPoint}>• Post, transmit, or share Content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, invasive of another's privacy, hateful, or racially, ethnically, or otherwise objectionable.</Text>
            <Text style={styles.bulletPoint}>• Use the App for any illegal or unauthorized purpose, including but not limited to violating any intellectual property rights or privacy rights.</Text>
            <Text style={styles.bulletPoint}>• Impersonate any person or entity or falsely state or otherwise misrepresent your affiliation with a person or entity.</Text>
            <Text style={styles.bulletPoint}>• Interfere with or disrupt the operation of the App or servers or networks connected to the App, or engage in any activity that could damage, disable, overburden, or impair the App's functionality.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Marketplace Transactions</Text>
            <Text style={styles.subsectionTitle}>7.1 Listing and Selling</Text>
            <Text style={styles.sectionText}>
              Users may list items or services for sale on the App's marketplace. By listing an item or service, you represent and warrant that you have the right to sell the item or service and that the listing is accurate, legal, and complete.
            </Text>
            <Text style={styles.subsectionTitle}>7.2 Purchasing</Text>
            <Text style={styles.sectionText}>
              When purchasing an item or service through the App, you agree to pay all charges associated with the transaction, including any applicable taxes and fees. All Verse GPT LLC is not responsible for the quality, safety, legality, or delivery of the items or services sold by users.
            </Text>
            <Text style={styles.subsectionTitle}>7.3 Disputes</Text>
            <Text style={styles.sectionText}>
              Any disputes arising from marketplace transactions are solely between the buyer and seller. All Verse GPT LLC may, at its discretion, assist in resolving disputes but has no obligation to do so.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. AI-Generated Content</Text>
            <Text style={styles.subsectionTitle}>8.1 Nature of AI Content</Text>
            <Text style={styles.sectionText}>
              The App may provide content generated by artificial intelligence ("AI"). While All Verse GPT LLC strives for accuracy, AI-generated content may not always be accurate or reliable. You acknowledge and agree that any reliance on AI-generated content is at your own risk.
            </Text>
            <Text style={styles.subsectionTitle}>8.2 No Professional Advice</Text>
            <Text style={styles.sectionText}>
              AI-generated content is provided for informational purposes only and should not be construed as professional advice (including but not limited to financial, legal, medical, or other professional advice). Always seek the advice of a qualified professional with any questions you may have regarding a particular subject matter.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Disclaimers</Text>
            <Text style={styles.subsectionTitle}>11.1 No Warranty</Text>
            <Text style={styles.sectionText}>
              The App and all Content and Services provided through it are provided on an "as is" and "as available" basis without any warranties of any kind, either express or implied. All Verse GPT LLC disclaims all warranties, express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
            </Text>
            <Text style={styles.subsectionTitle}>11.2 No Liability for User Conduct</Text>
            <Text style={styles.sectionText}>
              All Verse GPT LLC is not responsible or liable for the conduct of any user or for any Content posted by users. You assume all risk when using the App and interacting with other users.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>12. Limitation of Liability</Text>
            <Text style={styles.sectionText}>
              To the fullest extent permitted by applicable law, All Verse GPT LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from: • Your access to or use of or inability to access or use the App. • Any conduct or Content of any third party on the App. • Any Content obtained from the App. • Unauthorized access, use, or alteration of your transmissions or Content.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>13. Indemnification</Text>
            <Text style={styles.sectionText}>
              You agree to indemnify, defend, and hold harmless All Verse GPT LLC, its affiliates, officers, directors, employees, agents, and licensors from and against any and all claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in any way connected with: • Your access to or use of the App. • Your violation of these Terms. • Your infringement of any rights of another party, including intellectual property or privacy rights.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.contactBox}>
              <Text style={styles.contactText}>
                <Text style={styles.contactLabel}>Email:</Text> <Text style={styles.link} onPress={handleEmailPress}>info@allversegpt.com</Text>{'\n'}
                <Text style={styles.contactLabel}>Website:</Text> <Text style={styles.link} onPress={handleWebsitePress}>https://allversegpt.com</Text>
              </Text>
            </View>
          </View>

          <View style={styles.footerNote}>
            <Text style={styles.footerText}>
              By using All Verse GPT, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
            </Text>
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
  bold: {
    fontWeight: '600',
    color: '#fff',
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
  footerNote: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },
});

