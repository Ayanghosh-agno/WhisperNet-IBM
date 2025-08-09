import React, { useState, useEffect, useRef } from 'react';
import { Eye, Clock, MapPin, Users, AlertCircle, Bot, User, Headphones, Shield, Send, MessageCircle, ExternalLink, Loader2, Phone, PhoneCall, CheckCircle, XCircle, Timer } from 'lucide-react';
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

        setSessionData(session);
        const processingStatus = session.responder_processing_status || 'idle';
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
          setSessionData(payload.new as SOSSession);
          const processingStatus = payload.new.responder_processing_status || 'idle';
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
        return 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg';
      case 'ai':
        return 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm';
      case 'responder':
        return 'bg-white text-gray-800 shadow-md border border-gray-200';
      case 'system':
        return 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border border-amber-200 shadow-sm';
      default:
        return 'bg-white text-gray-800 shadow-md border border-gray-200';
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
    if (!sessionData) return 'text-gray-500 bg-gray-100';
    
    switch (sessionData.callStatus) {
      case 'ringing':
        return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'queued':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'in-progress':
        return 'text-green-700 bg-green-100 border-green-200';
      case 'completed':
        return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'failed':
        return 'text-red-700 bg-red-100 border-red-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getCallStatusText = () => {
    if (!sessionData) return 'Unknown';
    
    switch (sessionData.callStatus) {
      case 'ringing':
        return 'Calling Emergency Services';
      case 'queued':
        return 'Call Queued';
      case 'in-progress':
        return 'Active Emergency Call';
      case 'completed':
        return 'Call Completed';
      case 'failed':
        return 'Call Failed';
      default:
        return sessionData.callStatus || 'Unknown Status';
    }
  };

  const getCallStatusIcon = () => {
    if (!sessionData) return <Phone className="w-5 h-5" />;
    
    switch (sessionData.callStatus) {
      case 'ringing':
        return <Phone className="w-5 h-5 animate-pulse" />;
      case 'queued':
        return <Timer className="w-5 h-5" />;
      case 'in-progress':
        return <PhoneCall className="w-5 h-5" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5" />;
      case 'failed':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Phone className="w-5 h-5" />;
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Emergency Session</h2>
          <p className="text-gray-600">Connecting to live monitoring dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Access Error</h1>
          <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">
              Please verify the session ID and ensure you have proper access permissions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      {/* Enhanced Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="flex flex-col bp788:flex-row bp788:items-center bp788:justify-between space-y-4 bp788:space-y-0">
            <div className="flex items-center space-x-3 bp788:space-x-4">
              <div className="w-12 h-12 bp788:w-14 bp788:h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                <div className="text-white">
                  {getCallStatusIcon()}
                </div>
              </div>
              <div>
                <h1 className="text-xl bp788:text-2xl font-bold text-gray-900">Live Emergency Monitor</h1>
                <div className="flex flex-col bp788:flex-row bp788:items-center bp788:space-x-3 mt-1">
                  <span className="text-sm text-gray-500">Session ID:</span>
                  <code className="text-xs bp788:text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-700 break-all">{sessionId}</code>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col bp788:flex-row bp788:items-center space-y-3 bp788:space-y-0 bp788:space-x-6">
              <div className={`flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2 rounded-xl border ${getCallStatusColor()}`}>
                {getCallStatusIcon()}
                <div className={`w-3 h-3 rounded-full ${
                  sessionData?.callStatus === 'in-progress' ? 'bg-green-500 animate-pulse' : 
                  sessionData?.callStatus === 'ringing' ? 'bg-orange-500 animate-bounce' :
                  'bg-current'
                }`}></div>
                <span className="text-sm bp788:text-base font-semibold">{getCallStatusText()}</span>
              </div>
              
              {sessionData?.created_at && (
                <div className="text-left bp788:text-right">
                  <div className="text-xs bp788:text-sm font-medium text-gray-700">Session Started</div>
                  <div className="text-xs bp788:text-sm text-gray-500">{formatDate(new Date(sessionData.created_at))}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 bp788:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
          {/* Enhanced Emergency Details Panel */}
          <div className="bp788:col-span-2 space-y-4 sm:space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 sm:p-6 border-b border-red-200">
                <h2 className="text-lg sm:text-xl font-bold text-red-900 flex items-center space-x-3">
                  <AlertCircle className="w-6 h-6" />
                  <span>Emergency Details</span>
                </h2>
              </div>
              
              {sessionData && (
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Situation Type</label>
                    <p className="text-lg font-bold text-gray-900 mt-1">{sessionData.situation}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>Location</span>
                    </label>
                    <p className="text-gray-900 mt-2 leading-relaxed">{sessionData.location}</p>
                    {(sessionData.location_lat && sessionData.location_long) && (
                      <a
                        href={`https://www.google.com/maps?q=${sessionData.location_lat},${sessionData.location_long}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 mt-3 font-medium transition-colors group"
                      >
                        <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span>View on Google Maps</span>
                      </a>
                    )}
                  </div>
                  
                  {sessionData.number_of_threat > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>Number of Threats</span>
                      </label>
                      <p className="text-2xl font-bold text-red-600 mt-1">{sessionData.number_of_threat}</p>
                    </div>
                  )}
                  
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">AI Guide Status</label>
                    <div className="flex items-center space-x-3 mt-2">
                      <div className={`w-3 h-3 rounded-full ${
                        sessionData.ai_guide_enabled ? 'bg-green-500 shadow-green-200 shadow-lg' : 'bg-gray-400'
                      }`}></div>
                      <span className={`text-sm font-medium ${
                        sessionData.ai_guide_enabled ? 'text-green-700' : 'text-gray-600'
                      }`}>
                        {sessionData.ai_guide_enabled ? 'Active & Assisting' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>Session Timeline</span>
                    </label>
                    <p className="text-gray-900 mt-2 font-medium">{formatDate(new Date(sessionData.created_at || Date.now()))}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Enhanced AI Assistant Panel */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-100 p-3 sm:p-4 border-b border-blue-200">
                <button
                  onClick={() => setShowAIChat(!showAIChat)}
                  className="w-full flex items-center justify-between text-left group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-base sm:text-lg font-bold text-blue-900">AI Emergency Assistant</span>
                      <p className="text-xs sm:text-sm text-blue-700">Ask questions about this emergency</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {aiMessages.length > 0 && (
                      <span className="text-xs bg-blue-600 text-white px-2 sm:px-3 py-1 rounded-full font-semibold shadow-sm">
                        {aiMessages.length}
                      </span>
                    )}
                    <svg 
                      className={`w-5 h-5 text-blue-600 transition-transform group-hover:scale-110 ${showAIChat ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
              </div>
              
              {showAIChat && (
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  {/* Enhanced Suggested Questions */}
                  {aiMessages.length === 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <MessageCircle className="w-5 h-5 text-blue-600" />
                        <p className="text-sm font-semibold text-gray-800">Quick Questions</p>
                      </div>
                      <div className="grid gap-2">
                        {suggestedQuestions.map((question, index) => (
                          <button
                            key={index}
                            onClick={() => setAiQuestion(question)}
                            className="w-full text-left text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-50 p-3 rounded-xl transition-all duration-200 border border-blue-100 hover:border-blue-200 hover:shadow-sm group"
                          >
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-blue-400 rounded-full group-hover:bg-blue-600 transition-colors"></div>
                              <span className="font-medium">{question}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Enhanced AI Chat Messages */}
                  {aiMessages.length > 0 && (
                    <div className="max-h-64 overflow-y-auto space-y-4 mb-4 pr-2">
                      {aiMessages.map((aiMsg) => (
                        <div key={aiMsg.id} className="space-y-3">
                          {/* Question */}
                          <div className="flex justify-end">
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-2xl max-w-xs shadow-lg">
                              <p className="text-sm font-medium">{aiMsg.question}</p>
                              <p className="text-xs text-blue-100 mt-2">{formatTime(aiMsg.timestamp)}</p>
                            </div>
                          </div>
                          
                          {/* Reply */}
                          <div className="flex justify-start">
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 px-4 py-3 rounded-2xl max-w-xs shadow-md border border-gray-200">
                              <div className="flex items-center space-x-2 mb-2">
                                <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                                  <Bot className="w-3 h-3 text-white" />
                                </div>
                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">AI Assistant</span>
                              </div>
                              {aiMsg.isLoading ? (
                                <div className="flex items-center space-x-3">
                                  <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                  </div>
                                  <span className="text-sm text-blue-700 font-medium">Analyzing emergency data...</span>
                                </div>
                              ) : (
                                <p className="text-sm leading-relaxed">{aiMsg.reply}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={aiMessagesEndRef} />
                    </div>
                  )}
                  
                  {/* Enhanced AI Input */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={aiQuestion}
                          onChange={(e) => setAiQuestion(e.target.value)}
                          onKeyPress={handleAIKeyPress}
                          placeholder="Ask about this emergency..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm transition-all duration-200"
                          disabled={isAskingAI}
                        />
                      </div>
                      <button
                        onClick={handleAskAI}
                        disabled={!aiQuestion.trim() || isAskingAI}
                        className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                      >
                        {isAskingAI ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Get instant AI-powered insights about the emergency situation, location details, or recommended actions.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Chat Messages Panel */}
          <div className="bp788:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 h-[80vh] bp788:h-[calc(100vh-200px)] flex flex-col overflow-hidden">
              {/* Enhanced Chat Header */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 sm:p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900">Live Conversation</h2>
                      <p className="text-xs sm:text-sm text-gray-600">Real-time emergency communication</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="flex items-center space-x-2 bg-green-100 px-2 sm:px-3 py-1 sm:py-2 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs sm:text-sm font-semibold text-green-700">Live</span>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 sm:px-3 py-1 sm:py-2 rounded-lg shadow-sm">
                      {messages.length} message{messages.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center py-8 sm:py-16">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                      <Eye className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">Monitoring Active</h3>
                    <p className="text-sm sm:text-base text-gray-500 px-4">Waiting for emergency communication to begin...</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.source_type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="max-w-xs sm:max-w-md lg:max-w-lg">
                        <div className={`px-4 sm:px-5 py-3 sm:py-4 rounded-2xl ${getMessageStyle(message)} transform transition-all duration-200 hover:scale-[1.02]`}>
                          <div className="flex items-center space-x-3 mb-3">
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center ${
                              message.source_type === 'user' ? 'bg-blue-500 bg-opacity-20' :
                              message.source_type === 'ai' ? 'bg-emerald-600 bg-opacity-20' :
                              message.source_type === 'responder' ? 'bg-gray-600 bg-opacity-20' :
                              'bg-amber-600 bg-opacity-20'
                            }`}>
                              {getMessageIcon(message)}
                            </div>
                            <div className="flex-1">
                              <span className={`text-xs sm:text-sm font-bold ${
                                message.source_type === 'user' ? 'text-blue-100' : 'text-gray-700'
                              }`}>
                                {getMessageLabel(message)}
                              </span>
                              <p className={`text-xs ${
                                message.source_type === 'user' ? 'text-blue-200' : 'text-gray-500'
                              }`}>
                                {formatTime(message.timestamp)}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm sm:text-base leading-relaxed font-medium">{message.text}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
                
                {/* Enhanced Processing Indicator */}
                {responderProcessingStatus !== 'idle' && (
                  <div className="flex justify-start">
                    <div className="max-w-xs sm:max-w-md lg:max-w-lg">
                      <div className="px-4 sm:px-5 py-3 sm:py-4 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 shadow-lg">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                            <Headphones className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <span className="text-xs sm:text-sm font-bold text-amber-800">Emergency Responder</span>
                            <p className="text-xs text-amber-600">Currently active</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-xs sm:text-sm text-amber-800 font-medium">
                            {responderProcessingStatus === 'processing_audio' 
                              ? 'Processing incoming audio message...' 
                              : 'Generating emergency response...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Status Bar */}
              <div className="p-3 sm:p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 text-xs sm:text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-green-200 shadow-lg"></div>
                      <span className="text-gray-700 font-medium">Real-time monitoring active</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-white px-2 sm:px-3 py-1 rounded-lg shadow-sm">
                      <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                      <span className="text-gray-600 font-medium">
                        {messages.length} message{messages.length !== 1 ? 's' : ''} tracked
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-gray-500 bg-white px-2 sm:px-3 py-1 rounded-lg shadow-sm">
                    <span className="font-medium">Last sync: {formatTime(new Date())}</span>
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