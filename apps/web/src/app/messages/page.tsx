'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, MoreVertical, Send, Image, Paperclip, Smile, X, Check, CheckCheck, DollarSign, Phone, Mail, Flag } from 'lucide-react';
import { mockApi } from '@marketplace/lib';
import { Navigation } from '@/components/Navigation';
import { Logo } from '@/components/Logo';
import { VoiceInputButton, VoiceInputStatus } from '@/components/VoiceInputButton';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: string;
  type: 'text' | 'image' | 'offer';
  offer?: {
    amount: number;
    currency: string;
  };
  status: 'sending' | 'sent' | 'delivered' | 'read';
  deliveredAt?: string;
  readAt?: string;
}

interface Conversation {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage: string;
  otherUser: {
    id: string;
    name: string;
    avatar: string;
    isOnline: boolean;
  };
  lastMessage: Message;
  unreadCount: number;
  updatedAt: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isVoiceListening, setIsVoiceListening] = useState(false);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        
        if (!currentUser?.uid) {
          setLoading(false);
          return;
        }

        const response = await fetch('/api/messages', {
          headers: {
            'x-user-id': currentUser.uid,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setConversations(data.data || []);
        } else {
          console.error('Failed to fetch conversations');
          setConversations([]);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [currentUser]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation || !currentUser?.uid) {
        setMessages([]);
        return;
      }

      try {
        const response = await fetch(`/api/messages/${selectedConversation.id}`, {
          headers: {
            'x-user-id': currentUser.uid,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setMessages(data.data || []);
        } else {
          console.error('Failed to fetch messages');
          setMessages([]);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        setMessages([]);
      }
    };

    fetchMessages();
  }, [selectedConversation, currentUser]);

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedConversation && currentUser?.uid) {
      try {
        const response = await fetch(`/api/messages/${selectedConversation.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.uid,
          },
          body: JSON.stringify({
            text: newMessage,
            type: 'text',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const newMessageData = data.message;
          
          // Add the new message to the messages list
          setMessages(prev => [...prev, newMessageData]);
          setNewMessage('');
          
          // Update conversation's last message
          setConversations(prev => 
            prev.map(conv => 
              conv.id === selectedConversation.id 
                ? { ...conv, lastMessage: newMessageData, updatedAt: new Date().toISOString() }
                : conv
            )
          );
        } else {
          console.error('Failed to send message');
        }
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setShowImageUpload(true);
    }
  };

  const handleSendImage = () => {
    if (selectedFile && selectedConversation) {
      const message: Message = {
        id: Date.now().toString(),
        text: 'Sent an image',
        senderId: 'currentUser',
        timestamp: new Date().toISOString(),
        type: 'image',
        status: 'sent',
      };
      setMessages([...messages, message]);
      setSelectedFile(null);
      setFilePreview('');
      setShowImageUpload(false);
      
      // Simulate delivery and read status
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === message.id 
              ? { ...msg, status: 'delivered', deliveredAt: new Date().toISOString() }
              : msg
          )
        );
      }, 2000);
    }
  };

  const handleVoiceResult = (text: string) => {
    setNewMessage(text);
    setVoiceTranscript(text);
    setVoiceError(null);
    // Auto-send voice input after a short delay
    setTimeout(() => {
      handleSendMessage();
    }, 1000);
  };

  const handleVoiceError = (error: string) => {
    setVoiceError(error);
    setIsVoiceListening(false);
  };

  const handleMakeOffer = () => {
    if (offerAmount && !isNaN(Number(offerAmount)) && selectedConversation) {
      const message: Message = {
        id: Date.now().toString(),
        text: `I'd like to offer $${offerAmount} for this item`,
        senderId: 'currentUser',
        timestamp: new Date().toISOString(),
        type: 'offer',
        offer: { amount: Number(offerAmount), currency: 'USD' },
        status: 'sent',
      };
      setMessages([...messages, message]);
      setOfferAmount('');
      setShowOfferModal(false);
      
      // Update conversation's last message
      setConversations(prev => 
        prev.map(conv => 
          conv.id === selectedConversation.id 
            ? { ...conv, lastMessage: message, updatedAt: message.timestamp }
            : conv
        )
      );

      // Simulate delivery and read status
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === message.id 
              ? { ...msg, status: 'delivered', deliveredAt: new Date().toISOString() }
              : msg
          )
        );
      }, 2000);
    }
  };

  const handleNavigateToProfile = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  const handleNavigateToListing = (listingId: string) => {
    router.push(`/listings/${listingId}`);
  };

  const handleCallUser = () => {
    if (selectedConversation) {
      showToast(`Calling ${selectedConversation.otherUser.name}...`, 'success');
      // In a real app, this would initiate a call
    }
  };

  const handleEmailUser = () => {
    if (selectedConversation) {
      showToast(`Opening email to ${selectedConversation.otherUser.name}...`, 'success');
      // In a real app, this would open email client
    }
  };

  const handleReportUser = () => {
    if (selectedConversation) {
      showToast(`Report submitted for ${selectedConversation.otherUser.name}`, 'success');
      setShowMoreOptions(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.listingTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getStatusIcon = (status: string, isOwnMessage: boolean) => {
    if (!isOwnMessage) return null;
    
    switch (status) {
      case 'sending':
        return <div className="w-3 h-3 border border-gray-400 rounded-full animate-pulse" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string, deliveredAt?: string, readAt?: string) => {
    switch (status) {
      case 'sending':
        return 'Sending...';
      case 'sent':
        return 'Sent';
      case 'delivered':
        return deliveredAt ? `Delivered ${formatTime(deliveredAt)}` : 'Delivered';
      case 'read':
        return readAt ? `Read ${formatTime(readAt)}` : 'Read';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Logo size="md" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-2">Messages</h1>
          <p className="text-lg text-gray-400">Connect with buyers and sellers</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[600px]">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <div className="card h-full">
              <div className="p-4 border-b border-dark-600">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Conversations</h2>
                  <button
                    onClick={() => setShowNewChatModal(true)}
                    className="btn-ghost p-2 rounded-xl hover:bg-dark-700/50"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-500"
                  />
                </div>
              </div>

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length > 0 ? (
                  filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={`p-4 border-b border-dark-600 cursor-pointer transition-colors ${
                        selectedConversation?.id === conversation.id
                          ? 'bg-accent-500/20 border-accent-500/30'
                          : 'hover:bg-dark-700/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <img
                            src={conversation.listingImage}
                            alt={conversation.listingTitle}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-dark-800 ${
                            conversation.otherUser.isOnline ? 'bg-green-500' : 'bg-gray-500'
                          }`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNavigateToProfile(conversation.otherUser.id);
                              }}
                              className="text-sm font-medium text-white truncate hover:text-accent-400 transition-colors"
                            >
                              {conversation.otherUser.name}
                            </button>
                            <span className="text-xs text-gray-400">
                              {formatTime(conversation.updatedAt)}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigateToListing(conversation.listingId);
                            }}
                            className="text-xs text-gray-400 truncate mb-1 hover:text-accent-400 transition-colors text-left w-full"
                          >
                            {conversation.listingTitle}
                          </button>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-300 truncate">
                              {conversation.lastMessage.type === 'offer' 
                                ? `Offered $${conversation.lastMessage.offer?.amount}`
                                : conversation.lastMessage.text
                              }
                            </p>
                            <div className="flex items-center space-x-2">
                              {conversation.lastMessage.senderId === 'currentUser' && (
                                <div className="flex items-center">
                                  {getStatusIcon(conversation.lastMessage.status, true)}
                                </div>
                              )}
                              {conversation.unreadCount > 0 && (
                                <span className="bg-accent-500 text-white text-xs px-2 py-1 rounded-full">
                                  {conversation.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-gray-400">No conversations found</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            <div className="card h-full flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-dark-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={selectedConversation.listingImage}
                          alt={selectedConversation.listingTitle}
                          className="w-10 h-10 rounded-lg object-cover cursor-pointer"
                          onClick={() => handleNavigateToListing(selectedConversation.listingId)}
                        />
                        <div>
                          <button
                            onClick={() => handleNavigateToProfile(selectedConversation.otherUser.id)}
                            className="text-white font-medium hover:text-accent-400 transition-colors"
                          >
                            {selectedConversation.otherUser.name}
                          </button>
                          <button
                            onClick={() => handleNavigateToListing(selectedConversation.listingId)}
                            className="text-sm text-gray-400 hover:text-accent-400 transition-colors block"
                          >
                            {selectedConversation.listingTitle}
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <button 
                          onClick={() => setShowMoreOptions(!showMoreOptions)}
                          className="btn-ghost p-2 rounded-xl hover:bg-dark-700/50"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        
                        {/* More Options Dropdown */}
                        {showMoreOptions && (
                          <div className="absolute right-0 top-full mt-2 w-48 bg-dark-800 rounded-lg border border-dark-600 shadow-xl z-50">
                            <div className="p-2">
                              <button
                                onClick={handleCallUser}
                                className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-white hover:bg-dark-700 rounded-lg transition-colors"
                              >
                                <Phone className="w-4 h-4" />
                                <span>Call</span>
                              </button>
                              <button
                                onClick={handleEmailUser}
                                className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-white hover:bg-dark-700 rounded-lg transition-colors"
                              >
                                <Mail className="w-4 h-4" />
                                <span>Email</span>
                              </button>
                              <button
                                onClick={handleReportUser}
                                className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
                              >
                                <Flag className="w-4 h-4" />
                                <span>Report</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderId === 'currentUser' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md ${
                          message.senderId === 'currentUser'
                            ? 'bg-accent-500 text-white'
                            : 'bg-dark-700 text-white'
                        } rounded-2xl px-4 py-2`}>
                          {message.type === 'offer' && message.offer && (
                            <div className="mb-2 p-2 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                              <p className="text-xs text-yellow-300">Offer: ${message.offer.amount}</p>
                            </div>
                          )}
                          <p className="text-sm">{message.text}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs opacity-70">
                              {formatTime(message.timestamp)}
                            </p>
                            {message.senderId === 'currentUser' && (
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(message.status, true)}
                                <span className="text-xs opacity-70">
                                  {getStatusText(message.status, message.deliveredAt, message.readAt)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-dark-600">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => document.getElementById('file-upload')?.click()}
                        className="btn-ghost p-2 rounded-xl hover:bg-dark-700/50"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => document.getElementById('image-upload')?.click()}
                        className="btn-ghost p-2 rounded-xl hover:bg-dark-700/50"
                      >
                        <Image className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowOfferModal(true)}
                        className="btn-ghost p-2 rounded-xl hover:bg-dark-700/50"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <div className="flex-1 relative">
                        <textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Type your message..."
                          rows={1}
                          className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-500 resize-none"
                        />
                      </div>
                      <VoiceInputButton
                        onResult={handleVoiceResult}
                        onError={handleVoiceError}
                        size="sm"
                        className="bg-gray-600 hover:bg-gray-500"
                      />
                      <button className="btn-ghost p-2 rounded-xl hover:bg-dark-700/50">
                        <Smile className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="btn btn-primary p-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Voice Input Status */}
                    <VoiceInputStatus 
                      isListening={isVoiceListening}
                      transcript={voiceTranscript}
                      error={voiceError}
                    />
                    
                    {/* Hidden file inputs */}
                    <input
                      id="file-upload"
                      type="file"
                      accept="*/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">💬</div>
                    <h3 className="text-lg font-medium text-white mb-2">
                      Select a conversation
                    </h3>
                    <p className="text-gray-400">
                      Choose a conversation from the list to start messaging
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg max-w-md w-full border border-dark-600">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Start New Conversation
                </h3>
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Search for a listing
                  </label>
                  <input
                    type="text"
                    placeholder="Enter listing title or ID..."
                    className="w-full px-3 py-2 border border-dark-600 rounded-md text-sm bg-dark-700 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-500"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowNewChatModal(false)}
                    className="flex-1 btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button className="flex-1 btn btn-primary">
                    Start Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg max-w-md w-full border border-dark-600">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Send Image
                </h3>
                <button
                  onClick={() => {
                    setShowImageUpload(false);
                    setSelectedFile(null);
                    setFilePreview('');
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {filePreview && (
                <div className="mb-4">
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowImageUpload(false);
                    setSelectedFile(null);
                    setFilePreview('');
                  }}
                  className="flex-1 btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendImage}
                  className="flex-1 btn btn-primary"
                >
                  Send Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg max-w-sm w-full border border-dark-600">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Make an Offer</h3>
                <button
                  onClick={() => setShowOfferModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Offer Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 border border-dark-600 rounded-md text-sm bg-dark-700 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-500"
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowOfferModal(false)}
                    className="flex-1 btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMakeOffer}
                    disabled={!offerAmount || isNaN(Number(offerAmount))}
                    className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send Offer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdowns */}
      {showMoreOptions && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowMoreOptions(false)}
        />
      )}
    </div>
  );
}
