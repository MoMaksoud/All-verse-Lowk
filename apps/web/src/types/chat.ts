export interface User {
  id: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessagePreview: string;
  isDraft: boolean;
  tokenCount?: number;
  summary?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  index: number;
  attachments?: string[];
  archived?: boolean;
}

export interface ChatEmbedding {
  id: string;
  conversationId: string;
  userId: string;
  messageEmbedding: number[];
  createdAt: Date;
}

export interface CreateConversationRequest {
  title?: string;
}

export interface CreateConversationResponse {
  conversationId: string;
}

export interface ListConversationsResponse {
  conversations: Conversation[];
  nextPageToken?: string;
  hasMore: boolean;
}

export interface ListMessagesResponse {
  messages: Message[];
  nextPageToken?: string;
  hasMore: boolean;
}

export interface AddMessageRequest {
  role: 'user' | 'assistant';
  content: string;
  attachments?: string[];
}

export interface SearchResponse {
  conversations: Conversation[];
  messages: Message[];
  totalResults: number;
}

export interface GenerateTitleRequest {
  firstMessage: string;
}

export interface GenerateTitleResponse {
  title: string;
}
