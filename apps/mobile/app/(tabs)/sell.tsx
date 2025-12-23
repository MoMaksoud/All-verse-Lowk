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
      // Note: MediaTypeOptions is deprecated but MediaType is not available in expo-image-picker ~17.0.10
      // Using MediaTypeOptions is the correct API for this version
      // @ts-ignore - MediaTypeOptions is deprecated but still the correct API for this version
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
      for (let i = 0; i < photos.length; i++) {
        const photoUri = photos[i];
        try {
          // For React Native, pass URI directly with proper metadata (don't convert HEIC to blob)
          const formData = new FormData();
          formData.append('file', {
            uri: photoUri,
            type: 'image/jpeg', // Force JPEG, not image/heic
            name: 'photo.jpg',
          } as any);

          const uploadResponse = await apiClient.post('/api/upload/ai-chat', formData, true);
          
          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            if (uploadData.url) {
              uploadedUrls.push(uploadData.url);
            }
          }
        } catch (uploadError: any) {
          // Silently continue to next photo
        }
      }
      
      if (uploadedUrls.length === 0) {
        throw new Error('Failed to upload photos. Please try again.');
      }

      // Call AI analysis
      const analysisPayload = {
        imageUrls: uploadedUrls,
      };
      
      const response = await apiClient.post('/api/ai/analyze-product', analysisPayload, true);

      if (response.ok) {
        const responseText = await response.text();
        
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error('Invalid JSON response from AI analysis');
        }
        
        // Handle both response formats: { analysis } or { success, analysis }
        const analysis = result.analysis || result;
        console.log('🔵 [AI Analysis] Extracted analysis:', analysis);
        
        if (!analysis) {
          console.error('❌ [AI Analysis] No analysis data in response:', result);
          throw new Error('No analysis data received');
        }
        
        console.log('✅ [AI Analysis] Analysis successful:', {
          hasTitle: !!analysis.title,
          hasDescription: !!analysis.description,
          hasCategory: !!analysis.category,
          hasCondition: !!analysis.condition,
          hasPrice: !!analysis.suggestedPrice,
          missingInfo: analysis.missingInfo?.length || 0,
        });
        
        setAiAnalysis(analysis);
        setTitle(analysis.title || '');
        setDescription(analysis.description || '');
        setCategory(analysis.category || '');
        setCondition(analysis.condition || '');
        setPrice(analysis.suggestedPrice ? analysis.suggestedPrice.toString() : '');

        // Check for missing info
        if (analysis.missingInfo && analysis.missingInfo.length > 0) {
          console.log('🔵 [AI Analysis] Missing info detected, going to questions step');
          const questions = convertMissingInfoToQuestions(analysis.missingInfo);
          setMissingInfoQuestions(questions);
          setCurrentQuestionIndex(0);
          setCurrentStep(3); // Go to questions step
        } else {
          console.log('🔵 [AI Analysis] No missing info, going to review step');
          setCurrentStep(4); // Go to review step
        }
      } else {
        const errorText = await response.text();
        console.error('❌ [AI Analysis] Analysis request failed:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        try {
          const errorData = JSON.parse(errorText);
          console.error('❌ [AI Analysis] Error details:', errorData);
          throw new Error(errorData.message || errorData.error || `AI analysis failed (${response.status})`);
        } catch (parseError) {
          throw new Error(`AI analysis failed: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error: any) {
      console.error('❌ [AI Analysis] Error analyzing with AI:', {
        error,
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      });
      
      const errorMessage = error?.message || 'AI analysis failed. You can still fill in details manually.';
      Alert.alert('Error', errorMessage);
      setCurrentStep(4); // Allow manual editing
    } finally {
      setAiAnalyzing(false);
      console.log('🔵 [AI Analysis] Analysis process completed');
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
        try {
          // Convert React Native file URI to Blob for web API compatibility
          // For React Native, pass URI directly with proper metadata (don't convert HEIC to blob)
          const formData = new FormData();
          formData.append('file', {
            uri: photoUri,
            type: 'image/jpeg', // Force JPEG, not image/heic
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
        } catch (uploadError) {
          console.error('Error converting/uploading file:', uploadError);
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
        const listingData = await response.json();
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
              // Redirect to marketplace (home/search page)
              router.replace('/(tabs)/search');
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
            <Text style={styles.stepSubtitle}>
              Take or select photos of your item. You can upload up to 10 photos.
            </Text>

            <View style={styles.photosContainer}>
              {photos.length === 0 ? (
                <View style={styles.centerPhotoContainer}>
                  <TouchableOpacity style={styles.addPhotoButtonLarge} onPress={pickImages}>
                    <Ionicons name="camera-outline" size={48} color="rgba(96, 165, 250, 0.8)" />
                    <Text style={styles.addPhotoTextLarge}>Tap to Upload</Text>
                    <Text style={styles.addPhotoSubtext}>or select from gallery</Text>
                  </TouchableOpacity>
                  <View style={styles.uploadInfo}>
                    <Text style={styles.uploadInfoText}>
                      Supported formats: PNG, JPG, WebP
                    </Text>
                    <Text style={styles.uploadInfoText}>
                      Maximum file size: 10MB per photo
                    </Text>
                    <Text style={styles.uploadInfoText}>
                      Up to 10 photos allowed
                    </Text>
                  </View>
                </View>
              ) : (
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
              )}
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
            {currentStep > 1 && (
              <TouchableOpacity
                style={styles.stepBackButton}
                onPress={() => setCurrentStep(currentStep - 1)}
              >
                <Ionicons name="chevron-back" size={20} color="#60a5fa" />
                <Text style={styles.stepBackButtonText}>Back</Text>
              </TouchableOpacity>
            )}
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
            {currentStep > 1 && (
              <TouchableOpacity
                style={styles.stepBackButton}
                onPress={() => {
                  if (currentQuestionIndex > 0) {
                    setCurrentQuestionIndex(currentQuestionIndex - 1);
                    setCurrentAnswer(userAnswers[missingInfoQuestions[currentQuestionIndex - 1].field] || '');
                  } else {
                    setCurrentStep(2);
                  }
                }}
              >
                <Ionicons name="chevron-back" size={20} color="#60a5fa" />
                <Text style={styles.stepBackButtonText}>Back</Text>
              </TouchableOpacity>
            )}
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
            {currentStep > 1 && (
              <TouchableOpacity
                style={styles.stepBackButton}
                onPress={() => {
                  // Go back to previous step (either step 3 if questions exist, or step 2)
                  if (missingInfoQuestions.length > 0) {
                    setCurrentStep(3);
                    setCurrentQuestionIndex(missingInfoQuestions.length - 1);
                  } else {
                    setCurrentStep(2);
                  }
                }}
              >
                <Ionicons name="chevron-back" size={20} color="#60a5fa" />
                <Text style={styles.stepBackButtonText}>Back</Text>
              </TouchableOpacity>
            )}
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Card moved to top */}
        <View style={styles.headerCard}>
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

        {renderStepContent()}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1b2e',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#0B1220',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    marginBottom: 32,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
    shadowColor: '#60a5fa',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(96, 165, 250, 0.4)',
  },
  logo: {
    width: 36,
    height: 36,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  stepContent: {
    gap: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'left',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'left',
    marginBottom: 24,
    lineHeight: 22,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  photosContainer: {
    marginVertical: 8,
  },
  centerPhotoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 20,
  },
  photoWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  photo: {
    width: 140,
    height: 140,
    borderRadius: 16,
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#0f1b2e',
    borderRadius: 12,
    padding: 2,
  },
  addPhotoButton: {
    width: 140,
    height: 140,
    borderRadius: 16,
    backgroundColor: '#0B1220',
    borderWidth: 2,
    borderColor: 'rgba(96, 165, 250, 0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  addPhotoButtonLarge: {
    width: 200,
    height: 200,
    borderRadius: 20,
    backgroundColor: '#0B1220',
    borderWidth: 2.5,
    borderColor: 'rgba(96, 165, 250, 0.4)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  addPhotoText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  addPhotoTextLarge: {
    fontSize: 18,
    color: '#60a5fa',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  addPhotoSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '400',
  },
  uploadInfo: {
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  uploadInfoText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
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
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#60a5fa',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
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
  stepBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  stepBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#60a5fa',
    marginLeft: 4,
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
