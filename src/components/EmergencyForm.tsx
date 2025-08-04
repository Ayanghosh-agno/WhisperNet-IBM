import React, { useState } from 'react';
import { ArrowLeft, AlertCircle, MapPin, Users, Phone, MessageSquare, RefreshCw } from 'lucide-react';
import { useEmergency } from '../context/EmergencyContext';
import { LocationPicker } from './LocationPicker';

interface EmergencyFormProps {
  onNavigate: (route: string) => void;
}

export const EmergencyForm: React.FC<EmergencyFormProps> = ({ onNavigate }) => {
  const { emergencyData, updateEmergencyData } = useEmergency();
  const [isLoading, setIsLoading] = useState(false);
  const [showAdditionalContacts, setShowAdditionalContacts] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyData.description || !emergencyData.callNumber) return;

    setIsLoading(true);
    
    // Simulate AI processing time
    setTimeout(() => {
      setIsLoading(false);
      onNavigate('/summary');
    }, 2000);
  };

  const handleLocationChange = (locationData: { address: string; latitude: number; longitude: number }) => {
    updateEmergencyData({
      location: locationData.address,
      locationName: locationData.address,
      coordinates: { lat: locationData.latitude, lng: locationData.longitude }
    });
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as +919800374139
    if (digits.length <= 12) {
      return `+${digits}`;
    }
    return `+${digits.slice(0, 12)}`;
  };

  const handlePhoneChange = (field: 'callNumber' | 'emergencyContact1' | 'emergencyContact2', value: string) => {
    const formatted = formatPhoneNumber(value);
    updateEmergencyData({ [field]: formatted });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-red-50 p-3 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Emergency Details</h1>
              <p className="text-gray-600 mt-1">Provide information to help authorities respond effectively</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Emergency Type */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">
                  What type of emergency is this?
                </label>
              </div>
              <div className="relative">
                <select
                  value={emergencyData.situationType}
                  onChange={(e) => updateEmergencyData({ situationType: e.target.value })}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white text-gray-900"
                >
                  <option value="">Select emergency type...</option>
                  <option value="Intruder">Intruder</option>
                  <option value="Medical">Medical Emergency</option>
                  <option value="Domestic Abuse">Domestic Abuse</option>
                  <option value="Fire">Fire</option>
                  <option value="Other">Other</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Location */}
            <LocationPicker
              initialLocation={emergencyData.location}
              onLocationChange={handleLocationChange}
            />

            {/* Number of Threats */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">
                  Number of threats (if applicable)
                </label>
              </div>
              <div className="relative">
                <select
                  value={emergencyData.numberOfThreats}
                  onChange={(e) => updateEmergencyData({ numberOfThreats: e.target.value })}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white text-gray-900"
                >
                  <option value="">Select if applicable...</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5+">5+</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Emergency Call Number */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Phone className="w-5 h-5 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">
                  Emergency Call Number <span className="text-red-500">*</span>
                </label>
              </div>
              <input
                type="tel"
                value={emergencyData.callNumber}
                onChange={(e) => handlePhoneChange('callNumber', e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                required
              />
              <p className="text-sm text-gray-500">Format: +CountryCode followed by phone number (e.g., +919800374139)</p>
            </div>

            {/* Additional Emergency Contacts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <label className="text-sm font-medium text-gray-700">
                    Additional Emergency Contacts (Optional)
                  </label>
                </div>
                {!showAdditionalContacts ? (
                  <button
                    type="button"
                    onClick={() => setShowAdditionalContacts(true)}
                    className="text-red-500 text-sm font-medium hover:text-red-600 transition-colors flex items-center space-x-1"
                  >
                    <span>+</span>
                    <span>Add Contacts</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAdditionalContacts(false)}
                    className="text-red-500 text-sm font-medium hover:text-red-600 transition-colors flex items-center space-x-1"
                  >
                    <span>×</span>
                    <span>Hide</span>
                  </button>
                )}
              </div>

              {showAdditionalContacts && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Emergency Contact 1
                    </label>
                    <input
                      type="tel"
                      value={emergencyData.emergencyContact1}
                      onChange={(e) => handlePhoneChange('emergencyContact1', e.target.value)}
                      placeholder="+1234567890"
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Emergency Contact 2
                    </label>
                    <input
                      type="tel"
                      value={emergencyData.emergencyContact2}
                      onChange={(e) => handlePhoneChange('emergencyContact2', e.target.value)}
                      placeholder="+1234567890"
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  
                  <p className="text-sm text-gray-500">
                    These contacts will receive SMS notifications about your emergency
                  </p>
                </div>
              )}
            </div>

            {/* What's Happening */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">
                  What's happening?
                </label>
              </div>
              <textarea
                value={emergencyData.description}
                onChange={(e) => updateEmergencyData({ description: e.target.value })}
                placeholder="Type what's happening... Be as specific as possible"
                rows={4}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 placeholder-gray-400"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !emergencyData.description || !emergencyData.callNumber}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-lg font-semibold py-4 px-6 rounded-lg shadow-sm transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-red-300"
            >
              <div className="flex items-center justify-center space-x-3">
                {isLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Phone className="w-5 h-5" />
                )}
                <span>{isLoading ? 'Processing...' : 'Call SOS Now'}</span>
              </div>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};