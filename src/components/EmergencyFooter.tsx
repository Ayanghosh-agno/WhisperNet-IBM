import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Phone } from 'lucide-react';
import { useEmergency } from '../context/EmergencyContext';

export const EmergencyFooter: React.FC = () => {
  const { isEmergencyActive, emergencyData, elapsedTime, callStatus, isSOSInitiated } = useEmergency();
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

  if (!isEmergencyActive) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 ${getBackgroundColor()} text-white p-3 shadow-lg`}>
      <div className="max-w-4xl mx-auto flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>
            <Phone size={16} />
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
      </div>
    </div>
  );
};