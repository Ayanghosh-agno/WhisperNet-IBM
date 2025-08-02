import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { EmergencyState, EmergencyData, ChatMessage } from '../types/emergency';
import { supabase, SOSSession, SOSMessage } from '../lib/supabase';

interface EmergencyContextType {
  state: EmergencyState;
  startEmergency: () => void;
  submitEmergencyData: (data: EmergencyData) => void;
  setAiSummary: (summary: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  endEmergency: () => void;
  initiateSOSCall: () => Promise<void>;
  hangupCall: () => Promise<void>;
  toggleAIGuide: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
}

const EmergencyContext = createContext<EmergencyContextType | undefined>(undefined);

export const useEmergency = () => {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error('useEmergency must be used within an EmergencyProvider');
  }
  return context;
};

interface EmergencyProviderProps {
  children: React.ReactNode;
}

export const EmergencyProvider: React.FC<EmergencyProviderProps> = ({ children }) => {
  const [state, setState] = useState<EmergencyState>({
    isActive: false,
    data: null,
    aiSummary: '',
    chatMessages: [],
    startTime: null,
    sessionId: null,
    callStatus: 'idle',
    aiGuideEnabled: true,
  });

  // Generate unique session ID
  const generateSessionId = (): string => {
    return `sos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const startEmergency = () => {
    const sessionId = generateSessionId();
    setState(prev => ({
      ...prev,
      isActive: true,
      startTime: new Date(),
      sessionId,
      callStatus: 'idle',
      chatMessages: [],
      aiSummary: '',
    }));
  };

  const submitEmergencyData = (data: EmergencyData) => {
    setState(prev => ({
      ...prev,
      data,
    }));
    
    // Generate AI summary
    setTimeout(() => {
      const summary = generateAISummary(data);
      setAiSummary(summary);
    }, 1500);
  };

  const setAiSummary = (summary: string) => {
    setState(prev => ({
      ...prev,
      aiSummary: summary,
    }));
  };

  const addChatMessage = (message: ChatMessage) => {
    setState(prev => ({
      ...prev,
      chatMessages: [...prev.chatMessages, message],
    }));
  };

  const initiateSOSCall = async () => {
    if (!state.sessionId || !state.data) {
      throw new Error('No session or emergency data available');
    }

    try {
      setState(prev => ({ ...prev, callStatus: 'initiating' }));

      // Call the SOS edge function
      const { data: result, error } = await supabase.functions.invoke('SOS', {
        body: {
          sessionId: state.sessionId,
          situation: state.data.situationType,
          location: state.data.location,
          locationLat: state.data.coordinates?.latitude,
          locationLong: state.data.coordinates?.longitude,
          numberOfThreats: parseInt(state.data.numberOfThreats) || 0,
          emergencyContact: state.data.emergencyContact,
          additionalContacts: state.data.additionalContacts,
          description: state.data.situationDescription,
          aiSummary: state.aiSummary,
        }
      });

      if (error) {
        console.error('SOS call failed:', error);
        setState(prev => ({ ...prev, callStatus: 'failed' }));
        throw error;
      }

      console.log('SOS call initiated successfully:', result);
      
    } catch (error) {
      console.error('Error initiating SOS call:', error);
      setState(prev => ({ ...prev, callStatus: 'failed' }));
      throw error;
    }
  };

  const hangupCall = async () => {
    if (!state.sessionId) return;

    try {
      const { error } = await supabase.functions.invoke('hangup-call', {
        body: { sessionId: state.sessionId }
      });

      if (error) {
        console.error('Error hanging up call:', error);
        throw error;
      }

      setState(prev => ({ ...prev, callStatus: 'completed' }));
    } catch (error) {
      console.error('Error hanging up call:', error);
    }
  };

  const toggleAIGuide = async () => {
    if (!state.sessionId) return;

    const newAIGuideState = !state.aiGuideEnabled;
    
    try {
      const { error } = await supabase
        .from('sos_sessions')
        .update({ ai_guide_enabled: newAIGuideState })
        .eq('session_id', state.sessionId);

      if (error) {
        console.error('Error updating AI guide setting:', error);
        return;
      }

      setState(prev => ({ ...prev, aiGuideEnabled: newAIGuideState }));
    } catch (error) {
      console.error('Error toggling AI guide:', error);
    }
  };

  const sendMessage = async (message: string) => {
    if (!state.sessionId) return;

    try {
      const messageData: Omit<SOSMessage, 'id' | 'created_at'> = {
        session_id: state.sessionId,
        sender: 'user',
        source_type: 'user',
        message,
        sent_to_responder: false,
      };

      const { data, error } = await supabase
        .from('sos_messages')
        .insert([messageData])
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      // Add to local state
      const chatMessage: ChatMessage = {
        id: data.id,
        sender: 'user',
        message: data.message,
        timestamp: new Date(data.created_at!),
        willBeSpoken: true,
      };

      addChatMessage(chatMessage);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const endEmergency = () => {
    setState({
      isActive: false,
      data: null,
      aiSummary: '',
      chatMessages: [],
      startTime: null,
      sessionId: null,
      callStatus: 'idle',
      aiGuideEnabled: true,
    });
  };

  // Real-time subscriptions
  useEffect(() => {
    if (!state.sessionId) return;

    // Subscribe to call status changes
    const sessionSubscription = supabase
      .channel(`session_${state.sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sos_sessions',
          filter: `session_id=eq.${state.sessionId}`,
        },
        (payload) => {
          const session = payload.new as SOSSession;
          setState(prev => ({
            ...prev,
            callStatus: session.callStatus || 'idle',
            aiGuideEnabled: session.ai_guide_enabled,
          }));
        }
      )
      .subscribe();

    // Subscribe to new messages
    const messagesSubscription = supabase
      .channel(`messages_${state.sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sos_messages',
          filter: `session_id=eq.${state.sessionId}`,
        },
        (payload) => {
          const message = payload.new as SOSMessage;
          
          // Only add messages that aren't from the current user to avoid duplicates
          if (message.sender !== 'user') {
            const chatMessage: ChatMessage = {
              id: message.id,
              sender: message.sender === 'responder' ? 'authority' : message.sender as 'user' | 'authority',
              message: message.message,
              timestamp: new Date(message.created_at!),
              sourceType: message.source_type,
            };

            setState(prev => ({
              ...prev,
              chatMessages: [...prev.chatMessages, chatMessage],
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionSubscription);
      supabase.removeChannel(messagesSubscription);
    };
  }, [state.sessionId]);

  // Load existing messages when session starts
  useEffect(() => {
    if (!state.sessionId) return;

    const loadMessages = async () => {
      try {
        const { data: messages, error } = await supabase
          .from('sos_messages')
          .select('*')
          .eq('session_id', state.sessionId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading messages:', error);
          return;
        }

        const chatMessages: ChatMessage[] = messages.map(msg => ({
          id: msg.id,
          sender: msg.sender === 'responder' ? 'authority' : msg.sender as 'user' | 'authority',
          message: msg.message,
          timestamp: new Date(msg.created_at!),
          sourceType: msg.source_type,
          willBeSpoken: msg.sender === 'user',
        }));

        setState(prev => ({
          ...prev,
          chatMessages,
        }));
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();
  }, [state.sessionId]);

  const generateAISummary = (data: EmergencyData): string => {
    const { situationType, location, situationDescription, numberOfThreats, emergencyContact, additionalContacts } = data;
    
    const contactInfo = additionalContacts.length > 0 
      ? ` Additional contacts to notify: ${additionalContacts.join(', ')}.`
      : '';
    
    const threatInfo = numberOfThreats ? ` Number of individuals involved: ${numberOfThreats}.` : '';
    
    return `Emergency Alert: ${situationType} situation reported at ${location}. ${situationDescription}${threatInfo} Emergency contact: ${emergencyContact}.${contactInfo} Silent communication in progress. Immediate assistance requested.`;
  };

  const value: EmergencyContextType = {
    state,
    startEmergency,
    submitEmergencyData,
    setAiSummary,
    addChatMessage,
    endEmergency,
    initiateSOSCall,
    hangupCall,
    toggleAIGuide,
    sendMessage,
  };

  return (
    <EmergencyContext.Provider value={value}>
      {children}
    </EmergencyContext.Provider>
  );
};