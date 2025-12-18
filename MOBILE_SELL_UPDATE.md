# Mobile Sell Page - AI-Powered Listing Creation

## Overview
Updated the mobile app's selling page to match the website's AI-powered listing creation workflow.

## New Features

### 1. **Multi-Step Workflow**
The sell page now follows a 4-step process:

#### Step 1: Upload Photo
- User can upload up to 10 photos using the device camera roll
- Uses `expo-image-picker` for native image selection
- Photos are displayed in a horizontal scrollable view
- Users can remove individual photos before proceeding

#### Step 2: AI Analysis
- AI analyzes the uploaded photos using the `/api/ai/analyze-product` endpoint
- Displays a loading state with animation while analyzing
- Automatically fills in:
  - Title
  - Description
  - Category
  - Condition
  - Suggested price
- Option to skip AI analysis and fill manually

#### Step 3: Complete Info (Conversational AI)
- If AI detects missing information, it asks follow-up questions
- Questions are presented one at a time with:
  - Text input for open-ended questions
  - Select buttons for multiple choice questions
- Progress bar shows completion status
- User answers are stored and used to generate the final listing
- Smart question handling:
  - Skips irrelevant questions (owner type, receipt, etc.)
  - Contextual questions based on product type
  - Questions for: condition, color, storage, carrier, battery health, etc.

#### Step 4: Review & Edit
- User can review all generated details
- Full editing capability for:
  - Title
  - Description
  - Price
  - Category
  - Condition
- Preview image of the first photo
- Final "Publish Listing" button

## Technical Implementation

### State Management
```typescript
- currentStep: Tracks which step user is on (1-4)
- photos: Array of photo URIs
- aiAnalyzing: Loading state for AI analysis
- aiAnalysis: Stores AI response data
- missingInfoQuestions: Array of follow-up questions
- currentQuestionIndex: Tracks current question being asked
- userAnswers: Stores user's answers to AI questions
- currentAnswer: Temporary storage for current question answer
```

### Key Functions

**`pickImages()`**
- Requests camera roll permissions
- Opens native image picker
- Supports multiple image selection (up to 10)

**`analyzeWithAI()`**
- Uploads photos to cloud storage
- Calls AI analysis endpoint
- Processes response and fills form fields
- Determines if follow-up questions are needed

**`convertMissingInfoToQuestions()`**
- Converts AI missing info array into interactive questions
- Maps field types (text vs select)
- Provides appropriate placeholders and options
- Filters out unnecessary questions

**`handleAnswerQuestion()`**
- Stores user's answer
- Updates form fields if applicable
- Moves to next question or generates final listing

**`generateFinalListing()`**
- Makes a second AI call with user answers
- Generates polished, complete listing
- Updates all form fields with final data

**`handleCreateListing()`**
- Validates all required fields
- Uploads photos to server
- Creates listing via API
- Redirects to profile on success

### UI Components

**Step Indicator**
- Visual representation of current step
- 4 circular icons with labels
- Active steps highlighted in blue

**Photo Upload Interface**
- Horizontal scroll for multiple photos
- 120x120px preview thumbnails
- Remove button on each photo
- Add photo button with dashed border

**AI Analysis Screen**
- Center-aligned icon
- Loading animation with ActivityIndicator
- "Analyze with AI" and "Skip" buttons

**Question Interface**
- Progress counter (Question X of Y)
- Large, readable question text
- Input field or option buttons
- Next/Complete button
- Visual progress bar at bottom

**Review & Edit Screen**
- Preview image at top
- All form fields with current values
- Familiar form layout from original design
- Publish button with icon

### Styling
- Consistent dark theme (#020617 background)
- Blue accent color (#60a5fa) for active states
- Rounded corners (12px) for modern look
- Proper spacing and padding throughout
- Accessible touch targets (44px minimum)
- Smooth transitions between states

## API Integration

### Endpoints Used
1. **POST `/api/upload`** - Upload individual photos
2. **POST `/api/ai/analyze-product`** - Initial AI analysis
3. **POST `/api/ai/analyze-product`** (Phase 2) - Final listing with user answers
4. **POST `/api/listings`** - Create the actual listing

### Data Flow
1. User uploads photos → Store URIs locally
2. Photos uploaded to server → Get cloud URLs
3. Cloud URLs sent to AI → Get initial analysis
4. Missing info questions asked → Collect answers
5. Answers + photos sent to AI → Get final listing
6. Final listing + photos → Create listing

## Benefits

### For Users
- **Faster listing creation** - AI does most of the work
- **Better listing quality** - AI-generated titles and descriptions
- **Accurate pricing** - AI suggests market-based prices
- **Guided experience** - Step-by-step process is intuitive
- **Mobile-optimized** - Native UI feels natural on phones

### For the Platform
- **Higher completion rates** - Easier process = more listings
- **Better data quality** - AI ensures consistent, detailed listings
- **Improved user engagement** - Interactive AI conversation
- **Competitive advantage** - Unique AI-powered experience

## Future Enhancements

### Potential Improvements
1. **Camera integration** - Take photos directly in-app
2. **Photo editing** - Crop, rotate, adjust brightness
3. **Barcode scanning** - Auto-fill product details from UPC
4. **Voice input** - Answer questions verbally
5. **Draft saving** - Save progress and return later
6. **Bulk uploads** - List multiple items at once
7. **Templates** - Save common listing configurations
8. **Social sharing** - Share listing immediately after creation

### Technical Optimizations
1. **Image compression** - Reduce upload size/time
2. **Offline support** - Queue listings when offline
3. **Progress persistence** - Save state across app restarts
4. **Caching** - Cache AI responses for similar items
5. **Optimistic updates** - Show success immediately, sync in background

## Testing Checklist

- [ ] Photo upload from camera roll
- [ ] Photo removal
- [ ] AI analysis with valid photos
- [ ] AI analysis error handling
- [ ] Skip AI analysis option
- [ ] Answer text questions
- [ ] Answer select questions
- [ ] Question navigation (back/next)
- [ ] Form validation
- [ ] Listing creation success
- [ ] Listing creation failure
- [ ] Sign-in redirect for anonymous users
- [ ] Step navigation
- [ ] Data persistence between steps

## Dependencies
- `expo-image-picker` - Native image selection
- `react-native-safe-area-context` - Safe area handling
- `@expo/vector-icons` - Icon library
- `expo-router` - Navigation

All dependencies are already installed in the mobile app.

