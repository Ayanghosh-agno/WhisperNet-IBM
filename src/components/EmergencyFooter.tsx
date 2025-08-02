import React, { useState, useEffect } from 'react';
import { MapPin, Clock } from 'lucide-react';
import { useEmergency } from '../context/EmergencyContext';

export const EmergencyFooter: React.FC = () => {
  const { state } = useEmergency();
  const [location, setLocation] = useState<string>('Location not set');
  const [elapsedTime, setElapsedTime] = useState<string>('00:00');

  useEffect(() => {
    if (state.isActive && state.data?.location) {
      // Extract just the city/area from the full address for footer display
      const parts = state.data.location.split(',');
      const shortLocation = parts.length > 2 ? `${parts[0]}, ${parts[1]}` : state.data.location;
      setLocation(shortLocation);
    }
  }, [state.isActive, state.data?.location]);

  useEffect(() => {
    if (!state.startTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - state.startTime!.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [state.startTime]);

  if (!state.isActive) return null;

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
            <span>{elapsedTime}</span>
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