import React, { useState } from 'react';
import { ArrowLeft, AlertCircle, MapPin, Users, Phone, MessageSquare, RefreshCw, AlertTriangle, X, Check } from 'lucide-react';
import { useEmergency } from '../context/EmergencyContext';
import { LocationPicker } from './LocationPicker';

interface EmergencyFormProps {
  onNavigate: (route: string) => void;
}

interface SavedContacts {
  callNumber: string;
  emergencyContact1: string;
  emergencyContact2: string;
}
export const EmergencyForm: React.FC<EmergencyFormProps> = ({ onNavigate }) => {
  const { emergencyData, updateEmergencyData } = useEmergency();
  const [isLoading, setIsLoading] = useState(false);
  const [showAdditionalContacts, setShowAdditionalContacts] = useState(false);
  const [phoneValidationError, setPhoneValidationError] = useState<string>('');
  const [showContactPopup, setShowContactPopup] = useState(false);
  const [savedContacts, setSavedContacts] = useState<SavedContacts | null>(null);

  // Check for saved contacts on component mount
  React.useEffect(() => {
    const saved = localStorage.getItem('whispernet_emergency_contacts');
    if (saved) {
      try {
        const contacts: SavedContacts = JSON.parse(saved);
        // Only show popup if we have at least the main call number
        if (contacts.callNumber) {
          setSavedContacts(contacts);
          setShowContactPopup(true);
        }
      } catch (error) {
        localStorage.removeItem('whispernet_emergency_contacts');
      }
    }
  }, []);

  const saveContactsToStorage = () => {
    const contactsToSave: SavedContacts = {
      callNumber: emergencyData.callNumber,
      emergencyContact1: emergencyData.emergencyContact1,
      emergencyContact2: emergencyData.emergencyContact2
    };
    
    localStorage.setItem('whispernet_emergency_contacts', JSON.stringify(contactsToSave));
  };

  const handleUseSavedContacts = () => {
    if (savedContacts) {
      updateEmergencyData({
        callNumber: savedContacts.callNumber,
        emergencyContact1: savedContacts.emergencyContact1,
        emergencyContact2: savedContacts.emergencyContact2
      });
      
      // Show additional contacts section if there are saved emergency contacts
      if (savedContacts.emergencyContact1 || savedContacts.emergencyContact2) {
        setShowAdditionalContacts(true);
      }
    }
    setShowContactPopup(false);
  };

  const handleDismissPopup = () => {
    setShowContactPopup(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyData.description || !emergencyData.callNumber || !isValidPhoneNumber(emergencyData.callNumber)) return;

    setIsLoading(true);
    
    // Save contacts to localStorage before proceeding
    saveContactsToStorage();
    
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
    
    // Allow empty value (for clearing the field)
    if (digits.length === 0) {
      return '';
    }
    
    // Format as +919800374139
    if (digits.length <= 12) {
      return `+${digits}`;
    }
    return `+${digits.slice(0, 12)}`;
  };

  const isValidPhoneNumber = (phoneNumber: string): boolean => {
    // Remove all non-digits
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Check if it has at least 10 digits (minimum for most countries) and at most 15 (ITU-T E.164 standard)
    if (digits.length < 10 || digits.length > 15) {
      return false;
    }
    
    // Check if it starts with a valid country code (1-4 digits)
    // Most country codes are 1-3 digits, but we allow up to 4 for flexibility
    const countryCodePattern = /^[1-9]\d{0,3}/;
    return countryCodePattern.test(digits);
  };

  const validatePhoneNumber = (phoneNumber: string): string => {
    if (!phoneNumber.trim()) {
      return 'Emergency call number is required';
    }
    
    if (!phoneNumber.startsWith('+')) {
      return 'Phone number must start with + followed by country code';
    }
    
    const digits = phoneNumber.replace(/\D/g, '');
    
    if (digits.length < 10) {
      return 'Phone number must have at least 10 digits';
    }
    
    if (digits.length > 15) {
      return 'Phone number cannot exceed 15 digits';
    }
    
    if (!isValidPhoneNumber(phoneNumber)) {
      return 'Please enter a valid phone number with country code';
    }
    
    return '';
  };

  const validateOptionalPhoneNumber = (phoneNumber: string): string => {
    // Skip validation if field is empty (optional field)
    if (!phoneNumber.trim()) {
      return '';
    }
    
    if (!phoneNumber.startsWith('+')) {
      return 'Phone number must start with + followed by country code';
    }
    
    const digits = phoneNumber.replace(/\D/g, '');
    
    if (digits.length < 10) {
      return 'Phone number must have at least 10 digits';
    }
    
    if (digits.length > 15) {
      return 'Phone number cannot exceed 15 digits';
    }
    
    if (!isValidPhoneNumber(phoneNumber)) {
      return 'Please enter a valid phone number with country code';
    }
    
    return '';
  };

  const handlePhoneChange = (field: 'callNumber' | 'emergencyContact1' | 'emergencyContact2', value: string) => {
    // For emergency contacts, allow clearing the field completely
    let formatted: string;
    if ((field === 'emergencyContact1' || field === 'emergencyContact2') && value.trim() === '') {
      formatted = '';
    } else {
      formatted = formatPhoneNumber(value);
    }
    
    updateEmergencyData({ [field]: formatted });
    
    // Validate main emergency call number
    if (field === 'callNumber') {
      const error = validatePhoneNumber(formatted);
      setPhoneValidationError(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      {/* Saved Contacts Popup */}
      {showContactPopup && savedContacts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Saved Emergency Contacts</h3>
                  <p className="text-sm text-gray-600">We found contacts you used earlier</p>
                </div>
              </div>
              <button
                onClick={handleDismissPopup}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Emergency Call Number:</p>
                <p className="text-gray-900 font-mono">{savedContacts.callNumber}</p>
                
                {(savedContacts.emergencyContact1 || savedContacts.emergencyContact2) && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Additional Contacts:</p>
                    <div className="space-y-1">
                      {savedContacts.emergencyContact1 && (
                        <p className="text-gray-900 font-mono text-sm">{savedContacts.emergencyContact1}</p>
                      )}
                      {savedContacts.emergencyContact2 && (
                        <p className="text-gray-900 font-mono text-sm">{savedContacts.emergencyContact2}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <p className="text-sm text-gray-600">
                Do you want to use these emergency contacts for this session?
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleUseSavedContacts}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Yes, Use These</span>
              </button>
              <button
                onClick={handleDismissPopup}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors"
              >
                No, Enter New
              </button>
            </div>
          </div>
        </div>
      )}
      
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
                className={`w-full p-4 border rounded-lg focus:ring-2 text-gray-900 transition-colors ${
                  phoneValidationError 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                required
              />
              {phoneValidationError && (
                <p className="text-sm text-red-600 flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{phoneValidationError}</span>
                </p>
              )}
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
                      className={`w-full p-4 border rounded-lg focus:ring-2 text-gray-900 transition-colors ${
                        emergencyData.emergencyContact1 && validateOptionalPhoneNumber(emergencyData.emergencyContact1)
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    />
                    {emergencyData.emergencyContact1 && validateOptionalPhoneNumber(emergencyData.emergencyContact1) && (
                      <p className="text-sm text-red-600 flex items-center space-x-1 mt-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{validateOptionalPhoneNumber(emergencyData.emergencyContact1)}</span>
                      </p>
                    )}
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
                      className={`w-full p-4 border rounded-lg focus:ring-2 text-gray-900 transition-colors ${
                        emergencyData.emergencyContact2 && validateOptionalPhoneNumber(emergencyData.emergencyContact2)
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    />
                    {emergencyData.emergencyContact2 && validateOptionalPhoneNumber(emergencyData.emergencyContact2) && (
                      <p className="text-sm text-red-600 flex items-center space-x-1 mt-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{validateOptionalPhoneNumber(emergencyData.emergencyContact2)}</span>
                      </p>
                    )}
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
                  What's happening? <span className="text-red-500">*</span>
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
              disabled={
                isLoading || 
                !emergencyData.description || 
                !emergencyData.callNumber || 
                phoneValidationError !== '' || 
                !isValidPhoneNumber(emergencyData.callNumber) ||
                (emergencyData.emergencyContact1 && validateOptionalPhoneNumber(emergencyData.emergencyContact1) !== '') ||
                (emergencyData.emergencyContact2 && validateOptionalPhoneNumber(emergencyData.emergencyContact2) !== '')
              }
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