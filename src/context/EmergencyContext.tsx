import React, { createContext, useContext, useState, useEffect } from 'react';
import { EmergencyState, EmergencyData, ChatMessage } from '../types/emergency';

interface EmergencyContextType {
  state: EmergencyState;
  startEmergency: () => void;
  submitEmergencyData: (data: EmergencyData) => void;
  setAiSummary: (summary: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  endEmergency: () => void;
  getCurrentLocation: () => Promise<string>;
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

  const getCurrentLocation = async (): Promise<string> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve('Location not available');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        },
        () => {
          resolve('Location not available');
        },
        { timeout: 5000 }
      );
    });
  };

  const generateAISummary = (data: EmergencyData): string => {
    const { situationType, location, description, numberOfThreats } = data;
    
    return `Emergency Alert: ${situationType} situation reported at ${location}. ${description} Number of individuals involved: ${numberOfThreats}. Immediate assistance requested. Please respond with priority dispatch.`;
  };

  const value: EmergencyContextType = {
    state,
    startEmergency,
    submitEmergencyData,
    setAiSummary,
    addChatMessage,
    endEmergency,
    getCurrentLocation,
  };

  return (
    <EmergencyContext.Provider value={value}>
      {children}
    </EmergencyContext.Provider>
  );
};