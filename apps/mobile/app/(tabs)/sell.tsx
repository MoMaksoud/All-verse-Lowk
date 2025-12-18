import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api/client';

const CATEGORIES = [
  'Electronics',
  'Fashion',
  'Home',
  'Sports',
  'Automotive',
  'Other',
];

const CONDITIONS = ['New', 'Like New', 'Excellent', 'Good', 'Fair', 'Poor'];

interface AIAnalysis {
  title: string;
  description: string;
  category: string;
  condition: string;
  suggestedPrice: number;
  missingInfo: string[];
}

interface MissingInfoQuestion {
  field: string;
  question: string;
  placeholder: string;
  type: 'text' | 'select';
  options?: string[];
}

export default function SellScreen() {
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [missingInfoQuestions, setMissingInfoQuestions] = useState<MissingInfoQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState('');

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      // Use MediaTypeOptions for compatibility (deprecated but still works)
      // TODO: Update to MediaType when expo-image-picker is updated
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });

    if (!result.canceled && result.assets) {
      const newPhotos = result.assets.map((asset) => asset.uri);
      setPhotos([...photos, ...newPhotos].slice(0, 10));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const analyzeWithAI = async () => {
    if (photos.length === 0) {
      Alert.alert('Error', 'Please upload at least one photo');
      return;
    }

    try {
      setAiAnalyzing(true);
      
      // Upload photos first using ai-chat endpoint (temporary uploads for AI analysis)
      const uploadedUrls: string[] = [];
      for (const photoUri of photos) {
        const formData = new FormData();
        formData.append('file', {
          uri: photoUri,
          type: 'image/jpeg',
          name: 'photo.jpg',
        } as any);

        const uploadResponse = await apiClient.post('/api/upload/ai-chat', formData, true);
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          uploadedUrls.push(uploadData.url);
        } else {
          const errorData = await uploadResponse.json().catch(() => ({}));
          console.error('Upload failed:', errorData);
        }
      }
      
      if (uploadedUrls.length === 0) {
        throw new Error('Failed to upload photos');
      }

      // Call AI analysis
      const response = await apiClient.post('/api/ai/analyze-product', {
        imageUrls: uploadedUrls,
      }, true);

      if (response.ok) {
        const result = await response.json();
        // Handle both response formats: { analysis } or { success, analysis }
        const analysis = result.analysis || result;
        
        if (!analysis) {
          throw new Error('No analysis data received');
        }
        
        setAiAnalysis(analysis);
        setTitle(analysis.title || '');
        setDescription(analysis.description || '');
        setCategory(analysis.category || '');
        setCondition(analysis.condition || '');
        setPrice(analysis.suggestedPrice ? analysis.suggestedPrice.toString() : '');

        // Check for missing info
        if (analysis.missingInfo && analysis.missingInfo.length > 0) {
          const questions = convertMissingInfoToQuestions(analysis.missingInfo);
          setMissingInfoQuestions(questions);
          setCurrentQuestionIndex(0);
          setCurrentStep(3); // Go to questions step
        } else {
          setCurrentStep(4); // Go to review step
        }
      } else {
        throw new Error('AI analysis failed');
      }
    } catch (error) {
      console.error('Error analyzing with AI:', error);
      Alert.alert('Error', 'AI analysis failed. You can still fill in details manually.');
      setCurrentStep(4); // Allow manual editing
    } finally {
      setAiAnalyzing(false);
    }
  };

  const convertMissingInfoToQuestions = (missingInfo: string[]): MissingInfoQuestion[] => {
    return missingInfo
      .map((info, index): MissingInfoQuestion | null => {
        const lowerInfo = info.toLowerCase();
        
        // Skip owner and receipt questions
        if (lowerInfo.includes('owner') || lowerInfo.includes('receipt') || lowerInfo.includes('purchase_year')) {
          return null;
        }

        // Use contextual question if it contains a question mark
        if (info.includes('?')) {
          if (lowerInfo.includes('condition')) {
            return {
              field: 'condition',
              question: info,
              placeholder: 'Select condition',
              type: 'select',
              options: CONDITIONS,
            };
          }
          
          if (lowerInfo.includes('carrier')) {
            return {
              field: 'carrier',
              question: info,
              placeholder: 'Select carrier',
              type: 'select',
              options: ['Unlocked', 'Verizon', 'AT&T', 'T-Mobile', 'Sprint', 'Other'],
            };
          }
          
          return {
            field: `contextual_${index}`,
            question: info,
            placeholder: 'Enter details...',
            type: 'text',
          };
        }

        // Legacy mapping
        if (lowerInfo.includes('condition')) {
          return {
            field: 'condition',
            question: 'What condition is this item in?',
            placeholder: 'Select condition',
            type: 'select',
            options: CONDITIONS,
          };
        }
        
        if (lowerInfo.includes('color')) {
          return {
            field: 'color',
            question: 'What color is this item?',
            placeholder: 'e.g., Black, White, Blue',
            type: 'text',
          };
        }
        
        if (lowerInfo.includes('storage') || lowerInfo.includes('capacity')) {
          return {
            field: 'storage',
            question: 'What storage capacity?',
            placeholder: 'e.g., 128GB, 256GB',
            type: 'text',
          };
        }

        return {
          field: `info_${index}`,
          question: `Please provide: ${info}`,
          placeholder: `Enter ${info.toLowerCase()}`,
          type: 'text',
        };
      })
      .filter((q): q is MissingInfoQuestion => q !== null);
  };

  const handleAnswerQuestion = (answer: string) => {
    const currentQuestion = missingInfoQuestions[currentQuestionIndex];
    const newAnswers = { ...userAnswers, [currentQuestion.field]: answer };
    setUserAnswers(newAnswers);

    // Update form fields based on answer
    if (currentQuestion.field === 'condition') {
      setCondition(answer);
    }

    // Move to next question or review
    if (currentQuestionIndex < missingInfoQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Generate final listing with user answers
      generateFinalListing(newAnswers);
    }
  };

  const generateFinalListing = async (answers: Record<string, string>) => {
    try {
      setAiAnalyzing(true);
      
      const response = await apiClient.post('/api/ai/analyze-product', {
        imageUrls: photos,
        phase: 'final',
        userAnswers: answers,
        initialEvidence: aiAnalysis,
      }, true);

      if (response.ok) {
        const result = await response.json();
        const finalAnalysis = result.analysis;
        
        setTitle(finalAnalysis.title || title);
        setDescription(finalAnalysis.description || description);
        setCategory(finalAnalysis.category || category);
        setCondition(finalAnalysis.condition || condition);
        setPrice(finalAnalysis.suggestedPrice ? finalAnalysis.suggestedPrice.toString() : price);
        
        setCurrentStep(4); // Go to review
      } else {
        setCurrentStep(4); // Go to review anyway
      }
    } catch (error) {
      console.error('Error generating final listing:', error);
      setCurrentStep(4); // Go to review anyway
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleCreateListing = async () => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to create a listing');
      router.push('/auth/signin');
      return;
    }

    if (!title || !description || !price || !category) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    try {
      setLoading(true);
      
      // Upload photos using ai-chat endpoint (temporary uploads)
      // Note: These will be moved to listing-photos endpoint after listing is created
      const uploadedUrls: string[] = [];
      for (const photoUri of photos) {
        const formData = new FormData();
        formData.append('file', {
          uri: photoUri,
          type: 'image/jpeg',
          name: 'photo.jpg',
        } as any);

        const uploadResponse = await apiClient.post('/api/upload/ai-chat', formData, true);
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          uploadedUrls.push(uploadData.url);
        } else {
          const errorData = await uploadResponse.json().catch(() => ({}));
          console.error('Upload failed:', errorData);
        }
      }
      
      if (uploadedUrls.length === 0) {
        Alert.alert('Error', 'Failed to upload photos. Please try again.');
        setLoading(false);
        return;
      }

      const response = await apiClient.post('/api/listings', {
        title,
        description,
        price: priceNum,
        category,
        condition: condition || 'good',
        images: uploadedUrls,
        inventory: 1,
        isActive: true,
      }, true);

      if (response.ok) {
        Alert.alert('Success', 'Listing created successfully!', [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setPhotos([]);
              setTitle('');
              setDescription('');
              setPrice('');
              setCategory('');
              setCondition('');
              setCurrentStep(1);
              router.push('/(tabs)/profile');
            },
          },
        ]);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to create listing');
      }
    } catch (error) {
      console.error('Error creating listing:', error);
      Alert.alert('Error', 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyState}>
          <Ionicons name="add-circle-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
          <Text style={styles.emptyTitle}>Sign In to Sell</Text>
          <Text style={styles.emptyText}>
            Create an account or sign in to start listing your items
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/auth/signin')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Upload Photo
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Upload Your Item Photos</Text>
            <Text style={styles.stepSubtitle}>Take or select photos of your item</Text>

            <View style={styles.photosContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {photos.map((photo, index) => (
                  <View key={index} style={styles.photoWrapper}>
                    <Image source={{ uri: photo }} style={styles.photo} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removePhoto(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                {photos.length < 10 && (
                  <TouchableOpacity style={styles.addPhotoButton} onPress={pickImages}>
                    <Ionicons name="camera-outline" size={32} color="rgba(255, 255, 255, 0.6)" />
                    <Text style={styles.addPhotoText}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, photos.length === 0 && styles.buttonDisabled]}
              onPress={() => setCurrentStep(2)}
              disabled={photos.length === 0}
            >
              <Text style={styles.buttonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        );

      case 2: // AI Analysis
        return (
          <View style={styles.stepContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="bulb-outline" size={48} color="#60a5fa" />
            </View>
            <Text style={styles.stepTitle}>AI Analysis</Text>
            <Text style={styles.stepSubtitle}>
              Let our AI analyze your photos and generate product details
            </Text>

            {aiAnalyzing ? (
              <View style={styles.analyzingContainer}>
                <ActivityIndicator size="large" color="#60a5fa" />
                <Text style={styles.analyzingText}>Analyzing your photos...</Text>
                <Text style={styles.analyzingSubtext}>This may take a few moments</Text>
              </View>
            ) : (
              <View style={styles.buttonGroup}>
                <TouchableOpacity style={styles.primaryButton} onPress={analyzeWithAI}>
                  <Ionicons name="sparkles" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Analyze with AI</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setCurrentStep(4)}
                >
                  <Text style={styles.secondaryButtonText}>Skip AI Analysis</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      case 3: // AI Questions
        const currentQuestion = missingInfoQuestions[currentQuestionIndex];

        return (
          <View style={styles.stepContent}>
            <View style={styles.questionHeader}>
              <Ionicons name="chatbubbles-outline" size={32} color="#60a5fa" />
              <Text style={styles.questionProgress}>
                Question {currentQuestionIndex + 1} of {missingInfoQuestions.length}
              </Text>
            </View>

            <Text style={styles.questionText}>{currentQuestion.question}</Text>

            {currentQuestion.type === 'select' ? (
              <View style={styles.optionsGrid}>
                {currentQuestion.options?.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.option,
                      currentAnswer === option && styles.optionSelected,
                    ]}
                    onPress={() => setCurrentAnswer(option)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        currentAnswer === option && styles.optionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TextInput
                style={styles.input}
                placeholder={currentQuestion.placeholder}
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={currentAnswer}
                onChangeText={setCurrentAnswer}
              />
            )}

            <TouchableOpacity
              style={[styles.primaryButton, !currentAnswer && styles.buttonDisabled]}
              onPress={() => {
                handleAnswerQuestion(currentAnswer);
                setCurrentAnswer('');
              }}
              disabled={!currentAnswer}
            >
              <Text style={styles.buttonText}>
                {currentQuestionIndex === missingInfoQuestions.length - 1 ? 'Complete' : 'Next'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>

            {/* Progress bar */}
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${((currentQuestionIndex + 1) / missingInfoQuestions.length) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
        );

      case 4: // Review & Edit
        return (
          <ScrollView style={styles.stepContent}>
            <Text style={styles.stepTitle}>Review & Edit</Text>
            <Text style={styles.stepSubtitle}>Review the details and make any adjustments</Text>

            {photos.length > 0 && (
              <Image source={{ uri: photos[0] }} style={styles.previewImage} />
            )}

            {/* Title */}
            <View style={styles.field}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., iPhone 14 Pro Max"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your item..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Price */}
            <View style={styles.field}>
              <Text style={styles.label}>Price *</Text>
              <View style={styles.priceInput}>
                <Text style={styles.currency}>$</Text>
                <TextInput
                  style={[styles.input, styles.priceField]}
                  placeholder="0.00"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Category */}
            <View style={styles.field}>
              <Text style={styles.label}>Category *</Text>
              <View style={styles.optionsGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.option,
                      category === cat && styles.optionSelected,
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        category === cat && styles.optionTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Condition */}
            <View style={styles.field}>
              <Text style={styles.label}>Condition</Text>
              <View style={styles.optionsGrid}>
                {CONDITIONS.map((cond) => (
                  <TouchableOpacity
                    key={cond}
                    style={[
                      styles.option,
                      condition === cond && styles.optionSelected,
                    ]}
                    onPress={() => setCondition(cond)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        condition === cond && styles.optionTextSelected,
                      ]}
                    >
                      {cond}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleCreateListing}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating...' : 'Publish Listing'}
              </Text>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
            </TouchableOpacity>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Enhanced Header with Logo */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Sell Your Item</Text>
            <Text style={styles.subtitle}>Upload a photo and let AI do the work</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderStepContent()}
      </ScrollView>

      {/* Navigation Buttons */}
      {currentStep > 1 && currentStep !== 3 && (
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep(currentStep - 1)}
          >
            <Ionicons name="arrow-back" size={20} color="rgba(255, 255, 255, 0.7)" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#0B1220',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(96, 165, 250, 0.2)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  logo: {
    width: 32,
    height: 32,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  stepContent: {
    gap: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  photosContainer: {
    marginVertical: 20,
  },
  photoWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#0B1220',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  addPhotoButton: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#0B1220',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addPhotoText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  analyzingContainer: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  analyzingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  analyzingSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  buttonGroup: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#60a5fa',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  questionHeader: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  questionProgress: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#0B1220',
    borderRadius: 2,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#60a5fa',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  field: {
    gap: 8,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  input: {
    backgroundColor: '#0B1220',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currency: {
    position: 'absolute',
    left: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#60a5fa',
    zIndex: 1,
  },
  priceField: {
    flex: 1,
    paddingLeft: 32,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    backgroundColor: '#0B1220',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionSelected: {
    backgroundColor: '#60a5fa',
    borderColor: '#60a5fa',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  optionTextSelected: {
    color: '#fff',
  },
  navigationButtons: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 24,
  },
  signInButton: {
    backgroundColor: '#60a5fa',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
