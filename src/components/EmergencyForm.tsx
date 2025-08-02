import React, { useState, useEffect } from 'react';
import { Send, ArrowLeft, Plus, X, Phone } from 'lucide-react';
import { useEmergency } from '../context/EmergencyContext';
import { EmergencyData } from '../types/emergency';
import { LocationPicker } from './LocationPicker';

interface EmergencyFormProps {
  onNavigate: (route: string) => void;
}

export const EmergencyForm: React.FC<EmergencyFormProps> = ({ onNavigate }) => {
  const { submitEmergencyData } = useEmergency();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<EmergencyData>({
    situationType: '',
    location: '',
    description: '',
    situationDescription: '',
    emergencyContact: '',
    additionalContacts: [],
    numberOfThreats: '',
    timestamp: new Date(),
  });
  const [additionalContactInput, setAdditionalContactInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.situationType || !formData.situationDescription || !formData.emergencyContact) return;

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

  const handleLocationChange = (locationData: { address: string; latitude: number; longitude: number }) => {
    setFormData(prev => ({ ...prev, location: locationData.address }));
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

  const handlePhoneChange = (field: 'emergencyContact', value: string) => {
    const formatted = formatPhoneNumber(value);
    setFormData(prev => ({ ...prev, [field]: formatted }));
  };

  const handleAdditionalContactChange = (value: string) => {
    setAdditionalContactInput(formatPhoneNumber(value));
  };

  const addAdditionalContact = () => {
    if (additionalContactInput && formData.additionalContacts.length < 2) {
      setFormData(prev => ({
        ...prev,
        additionalContacts: [...prev.additionalContacts, additionalContactInput]
      }));
      setAdditionalContactInput('');
    }
  };

  const removeAdditionalContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalContacts: prev.additionalContacts.filter((_, i) => i !== index)
    }));
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

            <LocationPicker
              initialLocation={formData.location}
              onLocationChange={handleLocationChange}
            />

            <div>
              <label htmlFor="situationDescription" className="block text-sm font-semibold text-slate-700 mb-2">
                Situation Description *
              </label>
              <textarea
                id="situationDescription"
                value={formData.situationDescription}
                onChange={(e) => handleInputChange('situationDescription', e.target.value)}
                placeholder="Describe what's happening in detail..."
                rows={4}
                className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none text-lg resize-none"
                required
              />
            </div>

            <div>
              <label htmlFor="emergencyContact" className="block text-sm font-semibold text-slate-700 mb-2">
                <div className="flex items-center space-x-1">
                  <Phone className="w-4 h-4" />
                  <span>Emergency Contact Number *</span>
                </div>
              </label>
              <input
                id="emergencyContact"
                type="tel"
                value={formData.emergencyContact}
                onChange={(e) => handlePhoneChange('emergencyContact', e.target.value)}
                placeholder="+919800374139"
                className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none text-lg"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Format: +919800374139</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Additional Emergency Contacts (Optional)
              </label>
              <p className="text-xs text-slate-600 mb-3">Add up to 2 additional contacts who will receive text alerts</p>
              
              {formData.additionalContacts.map((contact, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <div className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                    {contact}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAdditionalContact(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Remove contact"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {formData.additionalContacts.length < 2 && (
                <div className="flex space-x-2">
                  <input
                    type="tel"
                    value={additionalContactInput}
                    onChange={(e) => handleAdditionalContactChange(e.target.value)}
                    placeholder="+919800374139"
                    className="flex-1 p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addAdditionalContact}
                    disabled={!additionalContactInput}
                    className="bg-slate-600 hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white p-3 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-slate-300"
                    aria-label="Add additional contact"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              )}
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
              disabled={isLoading || !formData.situationType || !formData.situationDescription || !formData.emergencyContact}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xl font-semibold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300"
            >
              <div className="flex items-center justify-center space-x-3">
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-6 h-6" />
                )}
                <span>{isLoading ? 'Processing with AI...' : 'Call SOS Now'}</span>
              </div>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};