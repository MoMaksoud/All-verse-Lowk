'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Image, Paperclip, Smile, DollarSign, Clock, Check, CheckCheck } from 'lucide-react';
import { ListingWithSeller } from '@marketplace/types';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: string;
  type: 'text' | 'image' | 'offer' | 'question';
  offer?: {
    amount: number;
    currency: string;
  };
  status: 'sending' | 'sent' | 'delivered' | 'read';
  deliveredAt?: string;
  readAt?: string;
}

interface ChatWidgetProps {
  listing: ListingWithSeller;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export function ChatWidget({ listing, isOpen, onClose, onOpen }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [showQuickQuestions, setShowQuickQuestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickQuestions = [
    "Is this still available?",
    "Can you ship to my location?",
    "What's the condition like?",
    "Can I see more photos?",
    "Is the price negotiable?",
    "When can I pick it up?"
  ];

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      // Load initial messages
      const initialMessages: Message[] = [
        {
          id: '1',
          text: `Hi! I'm interested in your ${listing.title}`,
          senderId: 'currentUser',
          timestamp: new Date().toISOString(),
          type: 'text',
          status: 'read',
          deliveredAt: new Date(Date.now() - 5000).toISOString(),
          readAt: new Date(Date.now() - 3000).toISOString(),
        },
        {
          id: '2',
          text: 'Hello! Thanks for your interest. How can I help you?',
          senderId: listing.sellerId,
          timestamp: new Date(Date.now() + 1000).toISOString(),
          type: 'text',
          status: 'read',
          deliveredAt: new Date(Date.now() + 2000).toISOString(),
          readAt: new Date(Date.now() + 3000).toISOString(),
        },
      ];
      setMessages(initialMessages);
    }
  }, [isOpen, listing]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        text: newMessage,
        senderId: 'currentUser',
        timestamp: new Date().toISOString(),
        type: 'text',
        status: 'sent',
      };
      setMessages([...messages, message]);
      setNewMessage('');
      
      // Simulate delivery after 2 seconds
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === message.id 
              ? { ...msg, status: 'delivered', deliveredAt: new Date().toISOString() }
              : msg
          )
        );
      }, 2000);

      // Simulate read status after 5 seconds
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === message.id 
              ? { ...msg, status: 'read', readAt: new Date().toISOString() }
              : msg
          )
        );
      }, 5000);
      
      // Simulate seller response
      setTimeout(() => {
        const response: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Thanks for your message! I\'ll get back to you soon.',
          senderId: listing.sellerId,
          timestamp: new Date().toISOString(),
          type: 'text',
          status: 'sent',
        };
        setMessages(prev => [...prev, response]);

        // Simulate delivery and read for response
        setTimeout(() => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === response.id 
                ? { ...msg, status: 'delivered', deliveredAt: new Date().toISOString() }
                : msg
            )
          );
        }, 2000);
      }, 2000);
    }
  };

  const handleQuickQuestion = (question: string) => {
    const message: Message = {
      id: Date.now().toString(),
      text: question,
      senderId: 'currentUser',
      timestamp: new Date().toISOString(),
      type: 'question',
      status: 'sent',
    };
    setMessages([...messages, message]);
    setShowQuickQuestions(false);
    
    // Simulate delivery and read
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === message.id 
            ? { ...msg, status: 'delivered', deliveredAt: new Date().toISOString() }
            : msg
        )
      );
    }, 2000);

    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === message.id 
            ? { ...msg, status: 'read', readAt: new Date().toISOString() }
            : msg
        )
      );
    }, 5000);
    
    // Simulate seller response
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Let me check on that for you...',
        senderId: listing.sellerId,
        timestamp: new Date().toISOString(),
        type: 'text',
        status: 'sent',
      };
      setMessages(prev => [...prev, response]);

      // Simulate delivery for response
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === response.id 
              ? { ...msg, status: 'delivered', deliveredAt: new Date().toISOString() }
              : msg
          )
        );
      }, 2000);
    }, 1500);
  };

  const handleMakeOffer = () => {
    if (offerAmount && !isNaN(Number(offerAmount))) {
      const message: Message = {
        id: Date.now().toString(),
        text: `I'd like to offer $${offerAmount} for this item`,
        senderId: 'currentUser',
        timestamp: new Date().toISOString(),
        type: 'offer',
        offer: { amount: Number(offerAmount), currency: listing.currency },
        status: 'sent',
      };
      setMessages([...messages, message]);
      setOfferAmount('');
      setShowOfferModal(false);
      
      // Simulate delivery and read
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === message.id 
              ? { ...msg, status: 'delivered', deliveredAt: new Date().toISOString() }
              : msg
          )
        );
      }, 2000);

      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === message.id 
              ? { ...msg, status: 'read', readAt: new Date().toISOString() }
              : msg
          )
        );
      }, 5000);
      
      // Simulate seller response
      setTimeout(() => {
        const response: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Thanks for your offer! I\'ll consider it and get back to you.',
          senderId: listing.sellerId,
          timestamp: new Date().toISOString(),
          type: 'text',
          status: 'sent',
        };
        setMessages(prev => [...prev, response]);

        // Simulate delivery for response
        setTimeout(() => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === response.id 
                ? { ...msg, status: 'delivered', deliveredAt: new Date().toISOString() }
                : msg
            )
          );
        }, 2000);
      }, 2000);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (status: string, isOwnMessage: boolean) => {
    if (!isOwnMessage) return null;
    
    switch (status) {
      case 'sending':
        return <div className="w-2 h-2 border border-gray-400 rounded-full animate-pulse" />;
      case 'sent':
        return <Check className="w-2 h-2 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-2 h-2 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-2 h-2 text-blue-400" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sending':
        return 'Sending...';
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'read':
        return 'Read';
      default:
        return '';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onOpen}
        className="fixed bottom-6 right-6 z-40 btn btn-primary rounded-full p-4 shadow-lg hover:scale-105 transition-transform"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-dark-800 rounded-2xl border border-dark-600 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-dark-600 bg-dark-700 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={listing.photos[0] || 'https://via.placeholder.com/40x40/1e293b/64748b?text=No+Image'}
              alt={listing.title}
              className="w-10 h-10 rounded-lg object-cover"
            />
            <div>
              <h3 className="text-white font-medium text-sm">Chat with Seller</h3>
              <p className="text-gray-400 text-xs truncate">{listing.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost p-1 rounded-lg hover:bg-dark-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.senderId === 'currentUser' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs ${
              message.senderId === 'currentUser'
                ? 'bg-accent-500 text-white'
                : 'bg-dark-700 text-white'
            } rounded-2xl px-3 py-2`}>
              {message.type === 'offer' && message.offer && (
                <div className="mb-1 p-1 bg-yellow-500/20 rounded text-xs text-yellow-300">
                  Offer: ${message.offer.amount}
                </div>
              )}
              <p className="text-xs">{message.text}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs opacity-70">
                  {formatTime(message.timestamp)}
                </p>
                {message.senderId === 'currentUser' && (
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(message.status, true)}
                    <span className="text-xs opacity-70">
                      {getStatusText(message.status)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-t border-dark-600 bg-dark-700">
        <div className="flex items-center space-x-2 mb-2">
          <button
            onClick={() => setShowQuickQuestions(!showQuickQuestions)}
            className="btn-ghost p-1 rounded text-xs hover:bg-dark-600"
          >
            Quick Questions
          </button>
          <button
            onClick={() => setShowOfferModal(true)}
            className="btn-ghost p-1 rounded text-xs hover:bg-dark-600 flex items-center gap-1"
          >
            <DollarSign className="w-3 h-3" />
            Make Offer
          </button>
        </div>

        {/* Quick Questions Panel */}
        {showQuickQuestions && (
          <div className="mb-3 p-2 bg-dark-600 rounded-lg">
            <div className="grid grid-cols-2 gap-1">
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickQuestion(question)}
                  className="text-xs text-gray-300 hover:text-white p-1 rounded hover:bg-dark-500 text-left"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="flex items-center space-x-2">
          <button className="btn-ghost p-1 rounded hover:bg-dark-600">
            <Paperclip className="w-4 h-4" />
          </button>
          <button className="btn-ghost p-1 rounded hover:bg-dark-600">
            <Image className="w-4 h-4" />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-500 text-sm"
            />
          </div>
          <button className="btn-ghost p-1 rounded hover:bg-dark-600">
            <Smile className="w-4 h-4" />
          </button>
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="btn btn-primary p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-lg max-w-sm w-full border border-dark-600 p-4">
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
      )}
    </div>
  );
}
