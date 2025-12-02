import { firestoreServices } from './services/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';

export interface StartChatFromListingOptions {
  listingId: string;
  sellerId: string;
  listingTitle: string;
  listingPrice: number;
  initialMessage?: string;
  navigateToChat?: boolean; // Optional: control whether to navigate after sending
}

export const startChatFromListing = async (
  options: StartChatFromListingOptions,
  currentUserId: string,
  showSuccess: (title: string, message?: string) => void,
  showError: (title: string, message?: string) => void,
  router?: any
): Promise<string | null> => {
  try {
    // Validate required fields
    if (!options.listingId || typeof options.listingId !== 'string' || options.listingId.trim() === '') {
      console.error('Invalid listingId provided:', options.listingId);
      showError('Invalid listing', 'Please try again.');
      return null;
    }

    if (!options.sellerId || typeof options.sellerId !== 'string' || options.sellerId.trim() === '') {
      console.error('Invalid sellerId provided:', options.sellerId);
      showError('Invalid seller', 'Please try again.');
      return null;
    }

    // Create or get existing chat
    const chatId = await firestoreServices.chats.getOrCreateChat(currentUserId, options.sellerId);
    
    // Send user's input text directly without alteration
    // If no initial message provided, use a default one
    const messageText = options.initialMessage || `Hi! I'm interested in "${options.listingTitle}"`;
    
    // Only include listingId in payload (not listingTitle/listingPrice)
    // Seller will fetch listing from Firestore on mount
    const validListingId = options.listingId.trim();
    await firestoreServices.chats.sendMessage(chatId, currentUserId, messageText, validListingId);
    
    console.log('✅ Chat started with listing context:', { chatId, listingId: validListingId });
    
    // Navigate to messages page with chatId if router is provided and navigation is enabled
    if (router && options.navigateToChat !== false) {
      router.push(`/messages?chatId=${chatId}`);
    }
    
    return chatId;
  } catch (error) {
    console.error('❌ Error starting chat:', error);
    showError('Failed to start chat', 'Please try again later.');
    return null;
  }
};

export const useStartChatFromListing = () => {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const router = useRouter();

  const startChat = async (options: StartChatFromListingOptions) => {
    if (!currentUser) {
      showError('Sign In Required', 'Please sign in to message sellers.');
      return null;
    }

    return startChatFromListing(
      options,
      currentUser.uid,
      showSuccess,
      showError,
      router
    );
  };

  return { startChat };
};
