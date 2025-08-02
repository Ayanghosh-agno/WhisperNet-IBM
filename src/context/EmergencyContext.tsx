import React, { createContext, useContext, useState, useEffect } from 'react';
import { EmergencyState, EmergencyData, ChatMessage } from '../types/emergency';

interface EmergencyContextType {
  state: EmergencyState;
  startEmergency: () => void;
  submitEmergencyData: (data: EmergencyData) => void;
  setAiSummary: (summary: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  endEmergency: () => void;
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
  });

  const startEmergency = () => {
    setState(prev => ({
      ...prev,
      isActive: true,
      startTime: new Date(),
    }));
  };

  const submitEmergencyData = (data: EmergencyData) => {
    setState(prev => ({
      ...prev,
      data,
    }));
    
    // Simulate AI processing
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

  const endEmergency = () => {
    setState({
      isActive: false,
      data: null,
      aiSummary: '',
      chatMessages: [],
      startTime: null,
    });
  };

  const generateAISummary = (data: EmergencyData): string => {
    const { situationType, location, situationDescription, numberOfThreats, emergencyContact, additionalContacts } = data;
    
    const contactInfo = additionalContacts.length > 0 
      ? ` Additional contacts to notify: ${additionalContacts.join(', ')}.`
      : '';
    
    return `Emergency Alert: ${situationType} situation reported at ${location}. ${situationDescription} Number of individuals involved: ${numberOfThreats || 'Unknown'}. Emergency contact: ${emergencyContact}.${contactInfo} Immediate assistance requested. Please respond with priority dispatch.`;
  };

  const value: EmergencyContextType = {
    state,
    startEmergency,
    submitEmergencyData,
    setAiSummary,
    addChatMessage,
    endEmergency,
  };

  return (
    <EmergencyContext.Provider value={value}>
      {children}
    </EmergencyContext.Provider>
  );
};