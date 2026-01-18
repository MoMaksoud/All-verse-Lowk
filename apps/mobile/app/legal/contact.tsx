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

export default function ContactScreen() {
  const handleEmailPress = () => {
    Linking.openURL('mailto:info@allversegpt.com');
  };

  const handleWebsitePress = () => {
    Linking.openURL('https://www.allversegpt.com');
  };

  const contactMethods = [
    {
      icon: 'mail',
      title: 'Email Support',
      description: 'Get help via email',
      action: 'info@allversegpt.com',
      onPress: handleEmailPress,
      color: '#0063e1',
    },
    {
      icon: 'globe',
      title: 'Website',
      description: 'Visit our website',
      action: 'www.allversegpt.com',
      onPress: handleWebsitePress,
      color: '#10b981',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail" size={48} color="#0063e1" />
          </View>
          <Text style={styles.title}>Get in Touch</Text>
          <Text style={styles.subtitle}>
            We're here to help! Reach out to us through any of the methods below.
          </Text>
        </View>

        <View style={styles.contactMethods}>
          {contactMethods.map((method, index) => (
            <TouchableOpacity
              key={index}
              style={styles.contactCard}
              onPress={method.onPress}
            >
              <View style={[styles.iconWrapper, { backgroundColor: `${method.color}20` }]}>
                <Ionicons name={method.icon as any} size={32} color={method.color} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>{method.title}</Text>
                <Text style={styles.contactDescription}>{method.description}</Text>
                <Text style={[styles.contactAction, { color: method.color }]}>
                  {method.action}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Response Times</Text>
          <Text style={styles.infoText}>
            We typically respond within 1–12 hours. For urgent matters such as disputes, payment issues, or safety concerns, we prioritize these requests.
          </Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>What to Include</Text>
          <Text style={styles.infoText}>
            When contacting support, please include:{'\n'}
            • Your account email{'\n'}
            • Order ID (if applicable){'\n'}
            • A detailed description of your issue{'\n'}
            • Screenshots (if relevant)
          </Text>
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
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 99, 225, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  contactMethods: {
    gap: 16,
    marginBottom: 32,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2332',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 16,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  contactAction: {
    fontSize: 15,
    fontWeight: '500',
  },
  infoSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 22,
  },
});

