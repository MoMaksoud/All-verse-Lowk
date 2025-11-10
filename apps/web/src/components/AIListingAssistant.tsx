'use client';

import React, { useState, useEffect } from 'react';
import { Bot, Send, CheckCircle } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import Select from './Select';

interface MissingInfo {
  field: string;
  question: string;
  placeholder: string;
  type: 'text' | 'select' | 'number';
  options?: string[];
}

interface AIListingAssistantProps {
  initialAnalysis: {
    title: string;
    description: string;
    category: string;
    condition: string;
    suggestedPrice: number;
    missingInfo: string[];
  };
  onUpdate: (updatedData: {
    title: string;
    description: string;
    category: string;
    condition: string;
    suggestedPrice: number;
  }) => void;
  onComplete: (userAnswers?: Record<string, string>) => void;
}

export function AIListingAssistant({ 
  initialAnalysis, 
  onUpdate, 
  onComplete 
}: AIListingAssistantProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);
  const { showSuccess } = useToast();

  // Convert missing info to interactive questions
  const missingInfoQuestions: MissingInfo[] = initialAnalysis.missingInfo.map((info, index): MissingInfo | null => {
    const lowerInfo = info.toLowerCase();
    
    // Skip owner type and receipt questions
    if (lowerInfo.includes('owner') || lowerInfo.includes('receipt') || lowerInfo.includes('purchase_year')) {
      return null;
    }
    
    // Use contextual question if it contains a question mark
    if (info.includes('?')) {
      if (lowerInfo.includes('condition')) {
        return {
          field: 'condition',
          question: info,
          placeholder: 'e.g., Like new, Good, Fair, etc.',
          type: 'select',
          options: ['New', 'Like New', 'Good', 'Fair', 'Poor']
        };
      }
      
      if (lowerInfo.includes('carrier')) {
        return {
          field: 'carrier',
          question: info,
          placeholder: 'e.g., Unlocked, Verizon, AT&T, etc.',
          type: 'select',
          options: ['Unlocked', 'Verizon', 'AT&T', 'T-Mobile', 'Sprint', 'Other']
        };
      }
      
      if (lowerInfo.includes('box')) {
        return {
          field: 'originalBox',
          question: info,
          placeholder: 'e.g., Yes, No, etc.',
          type: 'select',
          options: ['Yes', 'No', 'Not sure']
        };
      }
      
      // Default for contextual questions
      return {
        field: `contextual_${index}`,
        question: info,
        placeholder: 'Please provide details...',
        type: 'text'
      };
    }
    
    // Legacy mapping for non-contextual questions
    if (lowerInfo.includes('size')) {
      return {
        field: 'size',
        question: 'What size is this item?',
        placeholder: 'e.g., Large, 10, 32x34, etc.',
        type: 'text'
      };
    }
    
    if (lowerInfo.includes('condition')) {
      return {
        field: 'condition',
        question: 'What condition is this item in?',
        placeholder: 'e.g., Like new, Good, Fair, etc.',
        type: 'select',
        options: ['New', 'Like New', 'Good', 'Fair', 'Poor']
      };
    }
    
    if (lowerInfo.includes('color') || lowerInfo.includes('colour')) {
      return {
        field: 'color',
        question: 'What color is this item?',
        placeholder: 'e.g., Black, White, Blue, etc.',
        type: 'text'
      };
    }
    
    if (lowerInfo.includes('storage') || lowerInfo.includes('capacity')) {
      return {
        field: 'storage',
        question: 'What storage capacity does this have?',
        placeholder: 'e.g., 128GB, 256GB, 1TB, etc.',
        type: 'text'
      };
    }
    
    if (lowerInfo.includes('battery')) {
      return {
        field: 'battery',
        question: 'What is the battery health percentage?',
        placeholder: 'e.g., 85%, 90%, etc.',
        type: 'text'
      };
    }
    
    if (lowerInfo.includes('carrier') || lowerInfo.includes('unlocked')) {
      return {
        field: 'carrier',
        question: 'What carrier is this device locked to?',
        placeholder: 'e.g., Unlocked, Verizon, AT&T, etc.',
        type: 'select',
        options: ['Unlocked', 'Verizon', 'AT&T', 'T-Mobile', 'Sprint', 'Other']
      };
    }
    
    if (lowerInfo.includes('duration') || lowerInfo.includes('used')) {
      return {
        field: 'usage',
        question: 'How long have you used this item?',
        placeholder: 'e.g., 6 months, 1 year, lightly used, etc.',
        type: 'text'
      };
    }
    
    if (lowerInfo.includes('accessories')) {
      return {
        field: 'accessories',
        question: 'What accessories are included with this item?',
        placeholder: 'e.g., Charger, case, manual, etc.',
        type: 'text'
      };
    }
    
    if (lowerInfo.includes('box') || lowerInfo.includes('original_box')) {
      return {
        field: 'originalBox',
        question: 'Do you have the original box?',
        placeholder: 'e.g., Yes, No, etc.',
        type: 'select',
        options: ['Yes', 'No', 'Not sure']
      };
    }
    
    if (lowerInfo.includes('scratches') || lowerInfo.includes('damage')) {
      return {
        field: 'damage',
        question: 'Are there any scratches or damage?',
        placeholder: 'e.g., Minor scratches, No damage, etc.',
        type: 'text'
      };
    }
    
    // Default fallback
    return {
      field: `info_${index}`,
      question: `Please provide more details about: ${info}`,
      placeholder: `Enter ${info.toLowerCase()}...`,
      type: 'text'
    };
  }).filter((question): question is MissingInfo => question !== null);

  const currentQuestion = missingInfoQuestions[currentStep];
  const [currentAnswer, setCurrentAnswer] = useState('');

  const handleSubmitAnswer = () => {
    if (!currentAnswer.trim()) return;

    // Update user inputs
    const newInputs = { ...userInputs, [currentQuestion.field]: currentAnswer };
    setUserInputs(newInputs);

    // Process the answer and update the listing
    const updatedData = processUserInput(newInputs);
    onUpdate(updatedData);

    // Skip usage question if condition is "New"
    let nextStep = currentStep + 1;
    if (currentQuestion.field === 'condition' && currentAnswer === 'New') {
      // Find and skip the usage question
      const usageQuestionIndex = missingInfoQuestions.findIndex(q => q.field === 'usage');
      if (usageQuestionIndex > currentStep) {
        nextStep = usageQuestionIndex + 1;
      }
    }

    // Move to next question or complete
    if (nextStep < missingInfoQuestions.length) {
      setCurrentStep(nextStep);
      setCurrentAnswer('');
    } else {
      // All questions answered, complete the process
      setIsComplete(true);
      showSuccess('Listing Complete!', 'All information has been gathered and your listing is ready to post!');
      setTimeout(() => {
        onComplete(newInputs); // Pass user answers to onComplete
      }, 1500);
    }
  };

  const processUserInput = (inputs: Record<string, string>) => {
    return processManually(inputs);
  };

  const processManually = (inputs: Record<string, string>) => {
    let updatedTitle = initialAnalysis.title;
    let updatedDescription = initialAnalysis.description;
    let updatedCategory = initialAnalysis.category;
    let updatedCondition = inputs.condition || initialAnalysis.condition;
    let updatedPrice = initialAnalysis.suggestedPrice;

    // Replace placeholders in title
    Object.entries(inputs).forEach(([key, value]) => {
      const placeholder = `[enter ${key}]`;
      updatedTitle = updatedTitle.replace(placeholder, value);
    });

    // Replace placeholders in description
    Object.entries(inputs).forEach(([key, value]) => {
      const placeholder = `[enter ${key}]`;
      updatedDescription = updatedDescription.replace(placeholder, value);
    });

    // Auto-categorize based on inputs
    if (inputs.size && (inputs.size.includes('shoe') || inputs.size.includes('sneaker'))) {
      updatedCategory = 'shoes';
    } else if (inputs.storage || inputs.battery) {
      updatedCategory = 'electronics';
    } else if (inputs.carrier) {
      updatedCategory = 'phones';
    }

    // Adjust price based on condition
    if (updatedCondition === 'New') {
      updatedPrice = Math.round(updatedPrice * 1.2);
    } else if (updatedCondition === 'Like New') {
      updatedPrice = Math.round(updatedPrice * 1.1);
    } else if (updatedCondition === 'Good') {
      updatedPrice = Math.round(updatedPrice * 0.9);
    } else if (updatedCondition === 'Fair') {
      updatedPrice = Math.round(updatedPrice * 0.7);
    } else if (updatedCondition === 'Poor') {
      updatedPrice = Math.round(updatedPrice * 0.5);
    }

    return {
      title: updatedTitle,
      description: updatedDescription,
      category: updatedCategory,
      condition: updatedCondition,
      suggestedPrice: updatedPrice
    };
  };

  if (isComplete) {
    return (
      <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-green-400 mb-2">Listing Complete!</h3>
        <p className="text-zinc-300">All information has been gathered and your listing is ready to post.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur shadow-lg p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Bot className="w-6 h-6 text-blue-400" />
        <h3 className="text-xl sm:text-2xl font-semibold text-zinc-100">AI Listing Assistant</h3>
        <div className="ml-auto text-sm text-zinc-400">
          Step {currentStep + 1} of {missingInfoQuestions.length}
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-lg font-medium text-zinc-100 mb-4">
          {currentQuestion.question}
        </h4>
        
        {currentQuestion.type === 'select' ? (
          <Select
            value={currentAnswer || null}
            onChange={(value) => setCurrentAnswer(value)}
            options={[
              { value: '', label: 'Select an option...' },
              ...(currentQuestion.options?.map(option => ({ value: option, label: option })) || [])
            ]}
            placeholder="Select an option..."
          />
        ) : (
          <input
            type={currentQuestion.type}
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder={currentQuestion.placeholder}
            className="w-full px-4 py-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleSubmitAnswer()}
          />
        )}
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-zinc-400">
          {currentStep > 0 && (
            <button
              onClick={() => {
                setCurrentStep(prev => prev - 1);
                setCurrentAnswer('');
              }}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            >
              ← Previous
            </button>
          )}
        </div>
        
        <button
          onClick={handleSubmitAnswer}
          disabled={!currentAnswer.trim()}
          className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white shadow transition-colors disabled:opacity-60 disabled:cursor-not-allowed gap-2"
        >
          <Send className="w-4 h-4" />
          {currentStep === missingInfoQuestions.length - 1 ? 'Complete' : 'Next'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="w-full bg-zinc-800 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / missingInfoQuestions.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
