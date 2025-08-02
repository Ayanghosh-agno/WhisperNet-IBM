export interface EmergencyData {
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

export interface ChatMessage {
  id: string;
  sender: 'user' | 'authority' | 'system';
  message: string;
  timestamp: Date;
  willBeSpoken?: boolean;
  sourceType?: 'user' | 'ai' | 'responder' | 'system';
}

export interface EmergencyState {
  isActive: boolean;
  data: EmergencyData | null;
  aiSummary: string;
  chatMessages: ChatMessage[];
  startTime: Date | null;
  sessionId: string | null;
  callStatus: string;
  aiGuideEnabled: boolean;
}