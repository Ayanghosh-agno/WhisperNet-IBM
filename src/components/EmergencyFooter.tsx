import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Phone, PhoneOff, Timer, PhoneCall, CheckCircle, XCircle } from 'lucide-react';
import { useEmergency } from '../context/EmergencyContext';

export const EmergencyFooter: React.FC = () => {
  const { isEmergencyActive, emergencyData, elapsedTime, callStatus, isSOSInitiated, hangupCall, endEmergency, isHangingUp } = useEmergency();
  const [location, setLocation] = useState<string>('Location not set');

  useEffect(() => {
    if (isEmergencyActive && emergencyData.locationName) {
      // Extract just the coordinates for footer display
      if (emergencyData.coordinates) {
        const { lat, lng } = emergencyData.coordinates;
        setLocation(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      } else {
        // Fallback to location string
        const parts = emergencyData.locationName.split(',');
        const shortLocation = parts.length > 2 ? `${parts[0]}, ${parts[1]}` : emergencyData.locationName;
        setLocation(shortLocation);
      }
    }
  }, [isEmergencyActive, emergencyData.locationName, emergencyData.coordinates]);

  const formatElapsedTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getCallStatusText = () => {
    if (!isSOSInitiated) {
      return 'Emergency Active';
    }
    
    switch (callStatus) {
      case 'ringing':
        return 'Calling Emergency Services';
      case 'queued':
        return 'Call Queued';
      case 'in-progress':
        return 'Connected to Emergency Services';
      case 'completed':
        return 'Call Completed';
      case 'failed':
        return 'Call Failed';
      default:
        return 'Calling Emergency Services';
    }
  };

  const getBackgroundColor = () => {
    if (!isSOSInitiated) {
      return 'bg-red-600';
    }
    
    switch (callStatus) {
      case 'ringing':
      case 'queued':
        return 'bg-orange-500';
      case 'in-progress':
        return 'bg-green-600';
      case 'completed':
        return 'bg-blue-600';
      case 'failed':
        return 'bg-red-700';
      default:
        return 'bg-orange-500';
    }
  };

  const handleEndCall = async () => {
    // Only attempt to hang up if there's an active call
    if (isSOSInitiated && (callStatus === 'ringing' || callStatus === 'in-progress' || callStatus === 'queued')) {
      const success = await hangupCall();
      if (!success) {
        console.error('Failed to hang up call');
        return;
      }
    }
    
    endEmergency();
  };

  const getCallStatusIcon = () => {
    switch (callStatus) {
      case 'ringing':
        return <Phone className="w-4 h-4 animate-pulse" />;
      case 'queued':
        return <Timer className="w-4 h-4" />;
      case 'in-progress':
        return <PhoneCall className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Phone className="w-4 h-4" />;
    }
  };

  if (!isEmergencyActive) return null;

  // Only show footer after SOS call is initiated, but keep it visible when call is completed
  if (!isSOSInitiated && callStatus !== 'completed') return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 ${getBackgroundColor()} text-white p-3 shadow-lg`}>
      <div className="max-w-4xl mx-auto flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {getCallStatusIcon()}
            <span className="font-medium">{getCallStatusText()}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <MapPin size={16} />
            <span className="truncate max-w-32 sm:max-w-none">{location}</span>
          </div>
        </div>
        
        {(isSOSInitiated && callStatus === 'in-progress') && (
          <div className="flex items-center space-x-1">
            <Clock size={16} />
            <span>{formatElapsedTime(elapsedTime)}</span>
          </div>
        )}
        
        {/* End Emergency Button */}
        <button
          onClick={handleEndCall}
          disabled={isHangingUp}
          className="ml-4 px-3 py-1.5 bg-red-700 hover:bg-red-800 disabled:bg-red-500 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center space-x-2 shadow-lg"
          title="End emergency session"
        >
          {isHangingUp ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="hidden sm:inline">Ending...</span>
            </>
          ) : (
            <>
              <PhoneOff className="w-4 h-4" />
              <span className="hidden sm:inline">End Session</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};