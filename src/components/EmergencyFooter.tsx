import React, { useState, useEffect } from 'react';
import { MapPin, Clock } from 'lucide-react';
import { useEmergency } from '../context/EmergencyContext';

export const EmergencyFooter: React.FC = () => {
  const { isEmergencyActive, emergencyData, elapsedTime } = useEmergency();
  const [location, setLocation] = useState<string>('Location not set');

  useEffect(() => {
    if (isEmergencyActive && emergencyData.locationName) {
      // Extract just the city/area from the full address for footer display
      const parts = emergencyData.locationName.split(',');
      const shortLocation = parts.length > 2 ? `${parts[0]}, ${parts[1]}` : emergencyData.locationName;
      setLocation(shortLocation);
    }
  }, [isEmergencyActive, emergencyData.locationName]);

  const formatElapsedTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isEmergencyActive) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white p-4 shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <span className="font-semibold">EMERGENCY ACTIVE</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock size={16} />
            <span>{formatElapsedTime(elapsedTime)}</span>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <MapPin size={16} />
          <span className="truncate max-w-32 sm:max-w-none">{location}</span>
        </div>
      </div>
    </div>
  );
};