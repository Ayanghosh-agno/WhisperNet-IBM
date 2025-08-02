import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ChatMessage } from '../types/emergency';

interface EmergencyData {
  situationType: string;
  location: string;
  locationName: string;
  coordinates: { lat: number; lng: number } | null;
  description: string;
  numberOfThreats: string;
  timestamp: number;
  sessionId: string;
  callNumber: string;
  emergencyContact1: string;
  emergencyContact2: string;
}

interface EmergencyContextType {
  isEmergencyActive: boolean;
  emergencyData: EmergencyData;
  chatMessages: ChatMessage[];
  startEmergency: () => void;
  updateEmergencyData: (data: Partial<EmergencyData>) => void;
  addChatMessage: (message: ChatMessage) => void;
  endEmergency: () => void;
  elapsedTime: number;
  initiateSOSCall: () => Promise<boolean>;
  hangupCall: () => Promise<boolean>;
  callStatus: string;
  isSOSInitiated: boolean;
  startCallStatusMonitoring: () => void;
  stopCallStatusMonitoring: () => void;
  isAIGuideEnabled: boolean;
  toggleAIGuide: () => Promise<void>;
}

const EmergencyContext = createContext<EmergencyContextType | undefined>(undefined);

export const useEmergency = () => {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error('useEmergency must be used within an EmergencyProvider');
  }
  return context;
};

export const EmergencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [callStatus, setCallStatus] = useState('queued');
  const [isSOSInitiated, setIsSOSInitiated] = useState(false);
  const [isAIGuideEnabled, setIsAIGuideEnabled] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [emergencyData, setEmergencyData] = useState<EmergencyData>({
    situationType: '',
    location: '',
    locationName: '',
    coordinates: null,
    description: '',
    numberOfThreats: '',
    timestamp: 0,
    sessionId: '',
    callNumber: '+919800374139',
    emergencyContact1: '',
    emergencyContact2: '',
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isMonitoringCallStatus, setIsMonitoringCallStatus] = useState(false);

  // Monitor call status from database (only when explicitly started)
  useEffect(() => {
    if (!emergencyData.sessionId || !isSOSInitiated || !isMonitoringCallStatus) {
      return;
    }

    const fetchCallStatus = async () => {
      const { data, error } = await supabase
        .from('sos_sessions')
        .select('callStatus, ai_guide_enabled')
        .eq('session_id', emergencyData.sessionId)
        .single();

      if (data && !error) {
        setCallStatus(data.callStatus || 'queued');
        setIsAIGuideEnabled(data.ai_guide_enabled ?? true);
      }
    };

    // Initial fetch
    fetchCallStatus();

    // Set up real-time subscription on sos_sessions table
    const channel = supabase
      .channel(`sos_sessions_${emergencyData.sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sos_sessions',
          filter: `session_id=eq.${emergencyData.sessionId}`
        },
        (payload) => {
          const newStatus = payload.new.callStatus || 'queued';
          setCallStatus(newStatus);
          const aiGuideEnabled = payload.new.ai_guide_enabled ?? true;
          setIsAIGuideEnabled(aiGuideEnabled);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [emergencyData.sessionId, isSOSInitiated, isMonitoringCallStatus]);

  // Timer only runs when call status is 'in-progress'
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isEmergencyActive && isSOSInitiated && callStatus === 'in-progress') {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - emergencyData.timestamp) / 1000));
      }, 1000);
    } else if (!isSOSInitiated || callStatus !== 'in-progress') {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [isEmergencyActive, isSOSInitiated, callStatus, emergencyData.timestamp]);

  const startEmergency = () => {
    const timestamp = Date.now();
    const sessionId = `whispr-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    setEmergencyData(prev => ({ ...prev, timestamp, sessionId, callStatus: 'queued' }));
    setIsEmergencyActive(true);
    setCallStatus('queued');
    setIsSOSInitiated(false);
    setIsAIGuideEnabled(true);
    setElapsedTime(0);
  };

  const updateEmergencyData = (data: Partial<EmergencyData>) => {
    setEmergencyData(prev => ({ ...prev, ...data }));
  };

  const addChatMessage = (message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
  };

  const endEmergency = () => {
    setIsEmergencyActive(false);
    setCallStatus('queued');
    setIsSOSInitiated(false);
    setIsAIGuideEnabled(true);
    setElapsedTime(0);
    setChatMessages([]);
  };

  const initiateSOSCall = async (): Promise<boolean> => {
    setIsSOSInitiated(true);
    try {
      const payload = {
        session_id: emergencyData.sessionId,
        situation: emergencyData.description,
        location: emergencyData.locationName || emergencyData.location,
        number_of_threat: parseInt(emergencyData.numberOfThreats) || 0,
        location_lat: emergencyData.coordinates?.lat || null,
        location_long: emergencyData.coordinates?.lng || null,
        call_number: emergencyData.callNumber,
        emergency_contact_1: emergencyData.emergencyContact1 || null,
        emergency_contact_2: emergencyData.emergencyContact2 || null,
        ai_guide_enabled: isAIGuideEnabled
      };

      const { data, error } = await supabase.functions.invoke('SOS', {
        body: payload
      });

      if (error) {
        throw new Error(`SOS function error: ${error.message}`);
      }

      console.log('SOS call initiated successfully:', data);
      return true;
    } catch (error) {
      console.error('Failed to initiate SOS call:', error);
      return false;
    }
  };

  const hangupCall = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('hangup-call', {
        body: { session_id: emergencyData.sessionId }
      });

      if (error) {
        console.error('Failed to hang up call:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to hang up call:', error);
      return false;
    }
  };

  const toggleAIGuide = async () => {
    const newValue = !isAIGuideEnabled;
    setIsAIGuideEnabled(newValue);
    
    // Update in database
    if (emergencyData.sessionId) {
      try {
        const { error } = await supabase
          .from('sos_sessions')
          .update({ ai_guide_enabled: newValue })
          .eq('session_id', emergencyData.sessionId);
        
        if (error) {
          console.error('Failed to update AI guide setting:', error);
          // Revert the state if database update failed
          setIsAIGuideEnabled(!newValue);
        }
      } catch (error) {
        console.error('Failed to update AI guide setting:', error);
        // Revert the state if database update failed
        setIsAIGuideEnabled(!newValue);
      }
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const coordinates = { lat: latitude, lng: longitude };
          
          // Perform reverse geocoding to get address
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            
            if (data && data.display_name) {
              updateEmergencyData({
                location: data.display_name,
                locationName: data.display_name,
                coordinates
              });
            } else {
              // Fallback to coordinates if reverse geocoding fails
              updateEmergencyData({
                location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                locationName: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                coordinates
              });
            }
          } catch (error) {
            console.error('Reverse geocoding failed:', error);
            // Fallback to coordinates if reverse geocoding fails
            updateEmergencyData({
              location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              locationName: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              coordinates
            });
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  useEffect(() => {
    if (isEmergencyActive && !emergencyData.location) {
      getCurrentLocation();
    }
  }, [isEmergencyActive]);

  const startCallStatusMonitoring = () => {
    setIsMonitoringCallStatus(true);
  };

  const stopCallStatusMonitoring = () => {
    setIsMonitoringCallStatus(false);
  };

  return (
    <EmergencyContext.Provider
      value={{
        isEmergencyActive,
        emergencyData,
        chatMessages,
        startEmergency,
        updateEmergencyData,
        addChatMessage,
        endEmergency,
        elapsedTime,
        initiateSOSCall,
        hangupCall,
        callStatus,
        isSOSInitiated,
        startCallStatusMonitoring,
        stopCallStatusMonitoring,
        isAIGuideEnabled,
        toggleAIGuide,
      }}
    >
      {children}
    </EmergencyContext.Provider>
  );
};