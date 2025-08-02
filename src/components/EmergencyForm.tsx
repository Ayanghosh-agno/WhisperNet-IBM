import React, { useState, useEffect } from 'react';
import { MapPin, Send, ArrowLeft } from 'lucide-react';
import { useEmergency } from '../context/EmergencyContext';
import { EmergencyData } from '../types/emergency';

interface EmergencyFormProps {
  onNavigate: (route: string) => void;
}

export const EmergencyForm: React.FC<EmergencyFormProps> = ({ onNavigate }) => {
  const { submitEmergencyData, getCurrentLocation } = useEmergency();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<EmergencyData>({
    situationType: '',
    location: '',
    description: '',
    numberOfThreats: '',
    timestamp: new Date(),
  });

  useEffect(() => {
    getCurrentLocation().then(location => {
      setFormData(prev => ({ ...prev, location }));
    });
  }, [getCurrentLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.situationType || !formData.description) return;

    setIsLoading(true);
    submitEmergencyData(formData);
    
    // Simulate AI processing time
    setTimeout(() => {
      setIsLoading(false);
      onNavigate('/summary');
    }, 2000);
  };

  const handleInputChange = (field: keyof EmergencyData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 pb-20">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onNavigate('/')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Go back to emergency trigger"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Emergency Details</h1>
              <p className="text-slate-600">Provide information to help authorities respond</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="situationType" className="block text-sm font-semibold text-slate-700 mb-2">
                Situation Type *
              </label>
              <select
                id="situationType"
                value={formData.situationType}
                onChange={(e) => handleInputChange('situationType', e.target.value)}
                className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none text-lg"
                required
              >
                <option value="">Select situation type</option>
                <option value="Intruder">Intruder</option>
                <option value="Medical">Medical Emergency</option>
                <option value="Domestic Abuse">Domestic Abuse</option>
                <option value="Fire">Fire</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-semibold text-slate-700 mb-2">
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>Current Location</span>
                </div>
              </label>
              <input
                id="location"
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none text-lg"
                placeholder="Location will be auto-filled..."
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none text-lg h-32 resize-none"
                placeholder="Type what's happening..."
                required
              />
            </div>

            <div>
              <label htmlFor="numberOfThreats" className="block text-sm font-semibold text-slate-700 mb-2">
                Number of Threats
              </label>
              <select
                id="numberOfThreats"
                value={formData.numberOfThreats}
                onChange={(e) => handleInputChange('numberOfThreats', e.target.value)}
                className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none text-lg"
              >
                <option value="">Unknown</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5+">5+</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading || !formData.situationType || !formData.description}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xl font-semibold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300"
            >
              <div className="flex items-center justify-center space-x-3">
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-6 h-6" />
                )}
                <span>{isLoading ? 'Processing with AI...' : 'Send to AI Agent'}</span>
              </div>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};