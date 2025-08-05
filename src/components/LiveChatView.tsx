import React, { useState, useEffect, useRef } from 'react';
import { Eye, Clock, MapPin, Users, AlertCircle, Bot, User, Headphones, Shield } from 'lucide-react';
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

export const LiveChatView: React.FC<LiveChatViewProps> = ({ sessionId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionData, setSessionData] = useState<SOSSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Emergency Details Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-4">
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
          </div>

          {/* Chat Messages Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[calc(100vh-200px)] flex flex-col">
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