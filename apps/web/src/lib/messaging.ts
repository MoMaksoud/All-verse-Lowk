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
}

export const startChatFromListing = async (
  options: StartChatFromListingOptions,
  currentUserId: string,
  showSuccess: (title: string, message?: string) => void,
  showError: (title: string, message?: string) => void,
  router?: any
): Promise<string | null> => {
  try {
    // Create or get existing chat
    const chatId = await firestoreServices.chats.getOrCreateChat(currentUserId, options.sellerId);
    
    // If there's an initial message, send it
    if (options.initialMessage) {
      await firestoreServices.chats.sendMessage(chatId, currentUserId, options.initialMessage);
    }
    
    showSuccess('Chat started!', 'Your message has been sent to the seller.');
    
    // Navigate to messages page if router is provided
    if (router) {
      router.push('/messages');
    }
    
    return chatId;
  } catch (error) {
    console.error('Error starting chat:', error);
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
