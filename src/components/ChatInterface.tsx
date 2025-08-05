import React, { useState, useEffect, useRef } from 'react';
import { Send, Volume2, Mic, Phone, PhoneOff, Home, Bot, NutOff as BotOff } from 'lucide-react';
import { useEmergency } from '../context/EmergencyContext';
import { supabase, WhisprMessage } from '../lib/supabase';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'responder' | 'system';
  source_type: 'user' | 'ai' | 'responder' | 'system';
  timestamp: Date;
  willSpeak?: boolean;
}

interface ChatInterfaceProps {
  onNavigate: (route: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onNavigate }) => {
  const { emergencyData, endEmergency, hangupCall, callStatus, isSOSInitiated, startCallStatusMonitoring, stopCallStatusMonitoring, isAIGuideEnabled, toggleAIGuide, responderProcessingStatus } = useEmergency();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isHangingUp, setIsHangingUp] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Start call status monitoring when component mounts
  useEffect(() => {
    startCallStatusMonitoring();
    return () => {
      stopCallStatusMonitoring();
    };
  }, [startCallStatusMonitoring, stopCallStatusMonitoring]);

  const getStatusMessage = () => {
    switch (callStatus) {
      case 'ringing':
        return 'Calling emergency services...';
      case 'queued':
        return 'Your emergency call is queued and will be connected shortly...';
      case 'in-progress':
        return 'Connected to emergency services';
      case 'completed':
        return 'Emergency call completed';
      case 'failed':
        return 'Emergency call failed. Please try again or call directly.';
      default:
        return 'Connecting to emergency services...';
    }
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case 'ringing':
        return 'text-amber-700 bg-amber-50 border-amber-300';
      case 'queued':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'in-progress':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'completed':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };
  // Fetch messages from Supabase
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('sos_messages')
        .select('*')
        .eq('session_id', emergencyData.sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      const formattedMessages: Message[] = data
        .filter((msg: WhisprMessage) => msg.message !== 'User input required.')
        .map((msg: WhisprMessage) => ({
        id: parseInt(msg.id.replace(/-/g, '').substring(0, 8), 16),
        text: msg.message,
        sender: msg.sender,
        source_type: msg.source_type,
        timestamp: new Date(msg.created_at || Date.now()),
        willSpeak: msg.source_type === 'user' && msg.sender === 'user'
        }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!emergencyData.sessionId) return;

    // Initial fetch
    fetchMessages();

    // Set up real-time subscription
    const subscription = supabase
      .channel('sos_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sos_messages',
          filter: `session_id=eq.${emergencyData.sessionId}`
        },
        (payload) => {
          const newMessage = payload.new as WhisprMessage;
          
          // Filter out "User input required." messages
          if (newMessage.message === 'User input required.') {
            return;
          }
          
          const formattedMessage: Message = {
            id: parseInt(newMessage.id.replace(/-/g, '').substring(0, 8), 16),
            text: newMessage.message,
            sender: newMessage.sender,
            source_type: newMessage.source_type,
            timestamp: new Date(newMessage.created_at || Date.now()),
            willSpeak: newMessage.source_type === 'user' && newMessage.sender === 'user'
          };
          
          setMessages(prev => [...prev, formattedMessage]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [emergencyData.sessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      const { error } = await supabase
        .from('sos_messages')
        .insert({
          session_id: emergencyData.sessionId,
          sender: 'user',
          source_type: 'user',
          message: inputText.trim(),
          sent_to_responder: false
        });

      if (error) {
        console.error('Error sending message:', error);
        return;
      }

      setInputText('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleEndCall = async () => {
    setIsHangingUp(true);
    
    // Only attempt to hang up if there's an active call
    if (isSOSInitiated && (callStatus === 'ringing' || callStatus === 'in-progress' || callStatus === 'queued')) {
      const success = await hangupCall();
      if (!success) {
        // Show error message or handle failure
        console.error('Failed to hang up call');
      }
    }
    
    setIsHangingUp(false);
    setIsConnected(false);
    endEmergency();
  };

  // Auto-disconnect when call is completed
  useEffect(() => {
    if (callStatus === 'completed') {
      setIsConnected(false);
    }
  }, [callStatus]);

  const handleGoHome = () => {
    onNavigate('/');
  };

  const getMessageStyle = (message: Message) => {
    switch (message.source_type) {
      case 'user':
        return 'bg-blue-600 text-white';
      case 'ai':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'responder':
        return 'bg-white text-gray-800 shadow-sm border border-gray-200';
      case 'system':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      default:
        return 'bg-white text-gray-800 shadow-sm border border-gray-200';
    }
  };

  const getMessageLabel = (message: Message) => {
    switch (message.source_type) {
      case 'user':
        return 'You';
      case 'ai':
        return 'AI Assistant';
      case 'responder':
        return 'Emergency Responder';
      case 'system':
        return 'System';
      default:
        return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading emergency chat...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Phone className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Emergency Services</h1>
              <p className="text-sm text-gray-500">
                {isConnected ? (isSOSInitiated ? getStatusMessage() : 'Preparing emergency call...') : 'Disconnected'} • {formatTime(new Date())}
              </p>
            </div>
          </div>
          <button
            onClick={handleEndCall}
            disabled={isHangingUp}
            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            title="End emergency session"
          >
            {isHangingUp ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <PhoneOff className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Call Status Banner */}
      {isSOSInitiated && callStatus !== 'in-progress' && callStatus !== 'completed' && (
        <div className={`border-b px-4 py-3 ${getStatusColor()}`}>
          <div className="flex items-center space-x-2">
            <div className="relative">
              {callStatus === 'ringing' ? (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-current animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              ) : (
                <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
              )}
            </div>
            <span className="text-sm font-medium">{getStatusMessage()}</span>
            {callStatus === 'ringing' && (
              <div className="ml-auto">
                <div className="flex items-center space-x-1 text-xs opacity-75">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  <span>Connecting...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Messages */}
      {/* AI Guide Toggle */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isAIGuideEnabled ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              {isAIGuideEnabled ? (
                <Bot className="w-4 h-4 text-blue-600" />
              ) : (
                <BotOff className="w-4 h-4 text-gray-500" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">AI Assistant</h3>
              <p className="text-xs text-gray-500">
                {isAIGuideEnabled 
                  ? 'AI will provide quick replies to responders' 
                  : 'Manual responses only - AI assistance disabled'
                }
              </p>
            </div>
          </div>
          
          <button
            onClick={toggleAIGuide}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isAIGuideEnabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={isAIGuideEnabled}
            aria-label="Toggle AI assistance"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isAIGuideEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.source_type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${getMessageStyle(message)}`}
            >
              <p className={`text-xs font-medium mb-1 ${
                message.source_type === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {getMessageLabel(message)}
              </p>
              <p className="text-sm">{message.text}</p>
              <p className={`text-xs mt-1 ${
                message.source_type === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {formatTime(message.timestamp)}
              </p>
              {message.willSpeak && message.source_type === 'user' && (
                <div className="mt-2 p-2 bg-blue-500 bg-opacity-20 rounded-lg">
                  <div className="flex items-center space-x-2 text-xs">
                    <Volume2 className="w-3 h-3" />
                    <span>This message will be spoken out loud</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 relative z-10">
        <div className="flex items-center space-x-2">
          <button
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Voice message"
          >
            <Mic className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              disabled={!isConnected || callStatus === 'failed' || callStatus === 'completed'}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || !isConnected || callStatus === 'failed' || callStatus === 'completed'}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        {(!isConnected || callStatus === 'completed') && (
          <div className="mt-4 space-y-3">
            {isHangingUp && (
              <div className="text-center text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Ending emergency call...</span>
                </div>
              </div>
            )}
            <div className="text-center text-sm text-red-600">
              {callStatus === 'completed' 
                ? 'Emergency call completed. Contact emergency services if you need further assistance.'
                : 'Emergency session ended. Contact emergency services if you need further assistance.'
              }
            </div>
            <button
              onClick={handleGoHome}
              disabled={isHangingUp}
              className="w-full h-12 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-gray-500 focus:ring-opacity-50"
            >
              <div className="flex items-center justify-center space-x-2">
                <Home className="w-5 h-5" />
                <span>Return to Home</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};