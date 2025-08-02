export interface EmergencyData {
  situationType: string;
  location: string;
  description: string;
  situationDescription: string;
  emergencyContact: string;
  additionalContacts: string[];
  numberOfThreats: string;
  timestamp: Date;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'authority';
  message: string;
  timestamp: Date;
  willBeSpoken?: boolean;
}

export interface EmergencyState {
  isActive: boolean;
  data: EmergencyData | null;
  aiSummary: string;
  chatMessages: ChatMessage[];
  startTime: Date | null;
}