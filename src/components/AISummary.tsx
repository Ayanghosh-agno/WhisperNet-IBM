import React from 'react';
import { Phone, Edit, ArrowLeft, MessageSquare } from 'lucide-react';
import { useEmergency } from '../context/EmergencyContext';

interface AISummaryProps {
  onNavigate: (route: string) => void;
}

export const AISummary: React.FC<AISummaryProps> = ({ onNavigate }) => {
  const { state } = useEmergency();

  const handleMakeCall = () => {
    // In a real app, this would trigger the backend API to make the call
    console.log('Making emergency call with AI summary:', state.aiSummary);
    onNavigate('/chat');
  };

  const handleEditMessage = () => {
    onNavigate('/form');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 pb-20">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onNavigate('/form')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Go back to emergency form"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">AI Summary</h1>
              <p className="text-slate-600">Review the message before sending to authorities</p>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
            <div className="flex items-start space-x-3">
              <MessageSquare className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-blue-800 mb-2">
                  Here's what WhisperNet will communicate to authorities:
                </h3>
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <p className="text-slate-800 leading-relaxed">
                    {state.aiSummary || 'Generating AI summary...'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleMakeCall}
              className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-xl font-semibold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-green-300"
            >
              <div className="flex items-center justify-center space-x-3">
                <Phone className="w-6 h-6" />
                <span>Make the Call</span>
              </div>
            </button>

            <button
              onClick={handleEditMessage}
              className="w-full bg-slate-600 hover:bg-slate-700 active:bg-slate-800 text-white text-lg font-semibold py-3 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-slate-300"
            >
              <div className="flex items-center justify-center space-x-3">
                <Edit className="w-5 h-5" />
                <span>Edit Message</span>
              </div>
            </button>
          </div>

          <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg">
            <p className="font-semibold mb-2">What happens next:</p>
            <ul className="space-y-1">
              <li>• Your message will be sent to emergency dispatch</li>
              <li>• Authorities may ask follow-up questions through chat</li>
              <li>• Your responses will be converted to speech for them</li>
              <li>• Help is on the way</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};