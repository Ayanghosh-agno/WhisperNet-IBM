import React from 'react';
import { AlertTriangle, Shield } from 'lucide-react';
import { useEmergency } from '../context/EmergencyContext';

interface EmergencyTriggerProps {
  onNavigate: (route: string) => void;
}

export const EmergencyTrigger: React.FC<EmergencyTriggerProps> = ({ onNavigate }) => {
  const { startEmergency } = useEmergency();

  const handleStartEmergency = () => {
    startEmergency();
    onNavigate('/form');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="bg-white p-6 rounded-full shadow-lg">
              <Shield className="w-12 h-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">WhisperNet</h1>
          <p className="text-slate-600 text-lg">
            Silent emergency communication powered by AI
          </p>
        </div>

        <div className="space-y-6">
          <button
            onClick={handleStartEmergency}
            className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xl font-semibold py-6 px-8 rounded-2xl shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-300"
            aria-label="Start Emergency - This will begin the emergency communication process"
          >
            <div className="flex items-center justify-center space-x-3">
              <AlertTriangle className="w-8 h-8" />
              <span>Start Emergency</span>
            </div>
          </button>

          <div className="text-sm text-slate-500 space-y-2">
            <p>• Tap to begin silent emergency communication</p>
            <p>• Your location will be shared with authorities</p>
            <p>• AI will help communicate your situation clearly</p>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          <p>For immediate life-threatening emergencies, call 911 directly</p>
        </div>
      </div>
    </div>
  );
};