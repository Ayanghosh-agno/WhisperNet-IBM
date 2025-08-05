import React, { useState, useEffect, useRef } from 'react';
import { Eye, Clock, MapPin, Users, AlertCircle, Bot, User, Headphones, Shield, Send, MessageCircle } from 'lucide-react';
import { supabase, SOSSession, SOSMessage } from '../lib/supabase';

interface LiveChatViewProps {
  sessionId: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'responder' | 'system';
  source_type: 'user' | 'ai' | 'responder' | 'system';
  timestamp: Date;
}

interface AIMessage {
  id: string;
  question: string;
  reply: string;
  timestamp: Date;
  isLoading?: boolean;
}

export const LiveChatView: React.FC<LiveChatViewProps> = ({ sessionId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionData, setSessionData] = useState<SOSSession | null>(null);
  const [responderProcessingStatus, setResponderProcessingStatus] = useState<string>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiQuestion, setAiQuestion] = useState('');
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiMessagesEndRef = useRef<HTMLDivElement>(null);

  // Debug log for processing status changes
  useEffect(() => {
    console.log('LiveChatView - responderProcessingStatus changed:', responderProcessingStatus);
  }, [responderProcessingStatus]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-scroll AI chat to bottom
  useEffect(() => {
    aiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);
  // Fetch session data and messages
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        // Fetch session information
        const { data: session, error: sessionError } = await supabase
          .from('sos_sessions')
          .select('*')
          .eq('session_id', sessionId)
          .single();

        if (sessionError) {
          setError('Session not found or access denied');
          setIsLoading(false);
          return;
        }

        console.log('LiveChatView - Fetched session data:', session);
        setSessionData(session);
        const processingStatus = session.responder_processing_status || 'idle';
        console.log('LiveChatView - Setting processing status to:', processingStatus);
        setResponderProcessingStatus(processingStatus);

        // Fetch messages for this session
        const { data: messagesData, error: messagesError } = await supabase
          .from('sos_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (messagesError) {
          setError('Failed to load messages');
          setIsLoading(false);
          return;
        }

        const formattedMessages: Message[] = messagesData
          .filter((msg: SOSMessage) => msg.message !== 'User input required.')
          .map((msg: SOSMessage) => ({
            id: msg.id,
            text: msg.message,
            sender: msg.sender,
            source_type: msg.source_type || 'user',
            timestamp: new Date(msg.created_at || Date.now())
          }));

        setMessages(formattedMessages);
        setIsConnected(true);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load session data');
        setIsLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!sessionId || !isConnected) return;

    const subscription = supabase
      .channel(`live_chat_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sos_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const newMessage = payload.new as SOSMessage;
          
          // Filter out system messages
          if (newMessage.message === 'User input required.') {
            return;
          }
          
          const formattedMessage: Message = {
            id: newMessage.id,
            text: newMessage.message,
            sender: newMessage.sender,
            source_type: newMessage.source_type || 'user',
            timestamp: new Date(newMessage.created_at || Date.now())
          };
          
          setMessages(prev => [...prev, formattedMessage]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sos_sessions',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('LiveChatView - Session update received:', payload);
          setSessionData(payload.new as SOSSession);
          const processingStatus = payload.new.responder_processing_status || 'idle';
          console.log('LiveChatView - Processing status update:', processingStatus);
          setResponderProcessingStatus(processingStatus);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId, isConnected]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const getMessageIcon = (message: Message) => {
    switch (message.source_type) {
      case 'user':
        return <User className="w-4 h-4" />;
      case 'ai':
        return <Bot className="w-4 h-4" />;
      case 'responder':
        return <Headphones className="w-4 h-4" />;
      case 'system':
        return <Shield className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getMessageLabel = (message: Message) => {
    switch (message.source_type) {
      case 'user':
        return 'Victim';
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

  const getCallStatusColor = () => {
    if (!sessionData) return 'text-gray-500';
    
    switch (sessionData.callStatus) {
      case 'ringing':
        return 'text-orange-600';
      case 'queued':
        return 'text-yellow-600';
      case 'in-progress':
        return 'text-green-600';
      case 'completed':
        return 'text-blue-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getCallStatusText = () => {
    if (!sessionData) return 'Unknown';
    
    switch (sessionData.callStatus) {
      case 'ringing':
        return 'Calling';
      case 'queued':
        return 'Queued';
      case 'in-progress':
        return 'Active Call';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return sessionData.callStatus || 'Unknown';
    }
  };

  const handleAskAI = async () => {
    if (!aiQuestion.trim() || isAskingAI) return;

    const questionText = aiQuestion.trim();
    const messageId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Add loading message
    const loadingMessage: AIMessage = {
      id: messageId,
      question: questionText,
      reply: '',
      timestamp: new Date(),
      isLoading: true
    };
    
    setAiMessages(prev => [...prev, loadingMessage]);
    setAiQuestion('');
    setIsAskingAI(true);

    try {
      const { data, error } = await supabase.functions.invoke('contact-ai-helper', {
        body: {
          session_id: sessionId,
          question: questionText
        }
      });

      if (error) {
        throw new Error(`AI helper error: ${error.message}`);
      }

      // Update the message with the actual reply
      setAiMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, reply: data.answer, isLoading: false }
          : msg
      ));
    } catch (error) {
      console.error('Failed to get AI response:', error);
      
      // Update with error message
      setAiMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, reply: 'Sorry, I encountered an error processing your question. Please try again.', isLoading: false }
          : msg
      ));
    } finally {
      setIsAskingAI(false);
    }
  };

  const handleAIKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskAI();
    }
  };

  const suggestedQuestions = [
    "Who is in danger?",
    "What happened?", 
    "What should I do now?",
    "Where exactly is the emergency?",
    "How serious is the situation?"
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading emergency session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Please verify the session ID and ensure you have proper access permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Eye className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Live Emergency Monitor</h1>
                <p className="text-sm text-gray-500">Session: {sessionId}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getCallStatusColor()} bg-opacity-10`}>
                <div className={`w-2 h-2 rounded-full ${getCallStatusColor().replace('text-', 'bg-')} ${
                  sessionData?.callStatus === 'in-progress' ? 'animate-pulse' : ''
                }`}></div>
                <span>{getCallStatusText()}</span>
              </div>
              
              {sessionData?.created_at && (
                <div className="text-sm text-gray-500">
                  Started: {formatDate(new Date(sessionData.created_at))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Emergency Details Panel */}
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>Emergency Details</span>
              </h2>
              
              {sessionData && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Situation Type</label>
                    <p className="text-gray-900 font-medium">{sessionData.situation}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>Location</span>
                    </label>
                    <p className="text-gray-900">{sessionData.location}</p>
                    {(sessionData.location_lat && sessionData.location_long) && (
                      <a
                        href={`https://www.google.com/maps?q=${sessionData.location_lat},${sessionData.location_long}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 mt-1 transition-colors"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>View on Map</span>
                      </a>
                    )}
                  </div>
                  
                  {sessionData.number_of_threat > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>Number of Threats</span>
                      </label>
                      <p className="text-gray-900 font-medium">{sessionData.number_of_threat}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">AI Guide</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        sessionData.ai_guide_enabled ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                      <span className="text-sm text-gray-900">
                        {sessionData.ai_guide_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>Session Started</span>
                    </label>
                    <p className="text-gray-900">{formatDate(new Date(sessionData.created_at || Date.now()))}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* AI Assistant Panel */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
              <div className="p-4 border-b border-gray-200">
                <button
                  onClick={() => setShowAIChat(!showAIChat)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center space-x-2">
                    <Bot className="w-5 h-5 text-blue-600" />
                    <span className="text-lg font-semibold text-gray-900">AI Assistant</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {aiMessages.length > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                        {aiMessages.length}
                      </span>
                    )}
                    <svg 
                      className={`w-4 h-4 text-gray-400 transition-transform ${showAIChat ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                <p className="text-sm text-gray-500 mt-1">Ask questions about this emergency</p>
              </div>
              
              {showAIChat && (
                <div className="p-4 space-y-4">
                  {/* Suggested Questions */}
                  {aiMessages.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Quick questions:</p>
                      <div className="space-y-1">
                        {suggestedQuestions.map((question, index) => (
                          <button
                            key={index}
                            onClick={() => setAiQuestion(question)}
                            className="w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* AI Chat Messages */}
                  {aiMessages.length > 0 && (
                    <div className="max-h-48 overflow-y-auto space-y-3 mb-4">
                      {aiMessages.map((aiMsg) => (
                        <div key={aiMsg.id} className="space-y-2">
                          {/* Question */}
                          <div className="flex justify-end">
                            <div className="bg-blue-600 text-white px-3 py-2 rounded-lg max-w-xs">
                              <p className="text-sm">{aiMsg.question}</p>
                              <p className="text-xs text-blue-100 mt-1">{formatTime(aiMsg.timestamp)}</p>
                            </div>
                          </div>
                          
                          {/* Reply */}
                          <div className="flex justify-start">
                            <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded-lg max-w-xs">
                              <div className="flex items-center space-x-1 mb-1">
                                <Bot className="w-3 h-3 text-blue-600" />
                                <span className="text-xs font-medium text-gray-500">AI Assistant</span>
                              </div>
                              {aiMsg.isLoading ? (
                                <div className="flex items-center space-x-2">
                                  <div className="flex space-x-1">
                                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                  </div>
                                  <span className="text-sm text-gray-600">Analyzing emergency data...</span>
                                </div>
                              ) : (
                                <p className="text-sm">{aiMsg.reply}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={aiMessagesEndRef} />
                    </div>
                  )}
                  
                  {/* AI Input */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={aiQuestion}
                        onChange={(e) => setAiQuestion(e.target.value)}
                        onKeyPress={handleAIKeyPress}
                        placeholder="Ask about this emergency..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        disabled={isAskingAI}
                      />
                      <button
                        onClick={handleAskAI}
                        disabled={!aiQuestion.trim() || isAskingAI}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                      >
                        {isAskingAI ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Ask the AI assistant about the emergency situation, location, or what actions to take.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Messages Panel */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[calc(100vh-180px)] flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Live Conversation</h2>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-600">Live</span>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No messages yet. Monitoring for activity...</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.source_type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="max-w-md">
                        <div className={`px-4 py-3 rounded-2xl ${getMessageStyle(message)}`}>
                          <div className="flex items-center space-x-2 mb-1">
                            {getMessageIcon(message)}
                            <span className={`text-xs font-medium ${
                              message.source_type === 'user' ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {getMessageLabel(message)}
                            </span>
                            <span className={`text-xs ${
                              message.source_type === 'user' ? 'text-blue-100' : 'text-gray-400'
                            }`}>
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">{message.text}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
                
                {/* Processing Indicator */}
                {responderProcessingStatus !== 'idle' && (
                  <div className="flex justify-start mb-4">
                    <div className="max-w-md">
                      <div className="px-4 py-3 rounded-2xl bg-yellow-50 border border-yellow-200">
                        <div className="flex items-center space-x-2 mb-1">
                          <Headphones className="w-4 h-4 text-yellow-600" />
                          <span className="text-xs font-medium text-yellow-600">Emergency Responder</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-yellow-800">
                            {responderProcessingStatus === 'processing_audio' 
                              ? 'Processing audio message...' 
                              : 'Generating response...'}
                          </span>
                          <div className="flex space-x-1">
                            <div className="w-1 h-1 bg-yellow-600 rounded-full animate-bounce"></div>
                            <div className="w-1 h-1 bg-yellow-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-1 h-1 bg-yellow-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Bar */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-gray-600">Monitoring active</span>
                    </div>
                    <div className="text-gray-500">
                      {messages.length} message{messages.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  <div className="text-gray-500">
                    Last updated: {formatTime(new Date())}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};