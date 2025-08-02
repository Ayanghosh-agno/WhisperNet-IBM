import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { useEmergency } from '../context/EmergencyContext';

interface EmergencyTriggerProps {
  onNavigate: (route: string) => void;
}

export const EmergencyTrigger: React.FC<EmergencyTriggerProps> = ({ onNavigate }) => {
  const { startEmergency } = useEmergency();

  const handleEmergencyStart = () => {
    startEmergency();
    onNavigate('/form');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">WhisprNet</h1>
          <p className="text-gray-300 text-lg">Silent Emergency Communication</p>
        </div>

        {/* Emergency Trigger Button */}
        <div className="mb-8">
          <button
            onClick={handleEmergencyStart}
            className="w-full h-32 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-2xl rounded-2xl shadow-2xl transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-500 focus:ring-opacity-50"
            aria-label="Start Emergency"
          >
            <div className="flex items-center justify-center space-x-3">
              <AlertTriangle className="w-8 h-8" />
              <span>Start Emergency</span>
            </div>
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-white font-semibold mb-3">How WhisprNet Works</h2>
          <div className="text-gray-300 text-sm space-y-2">
            <p>1. Tap "Start Emergency" to begin</p>
            <p>2. Fill out the emergency form</p>
            <p>3. AI will create a summary for authorities</p>
            <p>4. Chat interface for real-time communication</p>
          </div>
        </div>

        {/* Stealth Access Note */}
        <div className="mt-6 text-gray-400 text-xs">
          <p>Bookmark this page for quick access during emergencies</p>
        </div>
      </div>
    </div>
  );
};