import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { MapPin, Navigation, Map, Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  initialLocation?: string;
  onLocationChange: (locationData: LocationData) => void;
}

const MapClickHandler: React.FC<{ onLocationSelect: (lat: number, lng: number) => void }> = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const LocationPicker: React.FC<LocationPickerProps> = ({ initialLocation, onLocationChange }) => {
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>({
    lat: 40.7128, // Default to NYC
    lng: -74.0060
  });
  const [address, setAddress] = useState<string>(initialLocation || '');
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoadingGeocode, setIsLoadingGeocode] = useState(false);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsLoadingGeocode(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        const formattedAddress = data.display_name;
        setAddress(formattedAddress);
        
        const locationData: LocationData = {
          address: formattedAddress,
          latitude: lat,
          longitude: lng
        };
        onLocationChange(locationData);
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      const fallbackAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddress(fallbackAddress);
      
      const locationData: LocationData = {
        address: fallbackAddress,
        latitude: lat,
        longitude: lng
      };
      onLocationChange(locationData);
    } finally {
      setIsLoadingGeocode(false);
    }
  }, [onLocationChange]);

  const getCurrentLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    
    if (!navigator.geolocation) {
      setAddress('Geolocation not supported');
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ lat: latitude, lng: longitude });
        reverseGeocode(latitude, longitude);
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setAddress('Location access denied');
        setIsLoadingLocation(false);
      },
      { 
        timeout: 10000,
        enableHighAccuracy: true,
        maximumAge: 300000 // 5 minutes
      }
    );
  }, [reverseGeocode]);

  const handleMapLocationSelect = useCallback((lat: number, lng: number) => {
    setCoordinates({ lat, lng });
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setAddress(newAddress);
    
    // Update parent with current coordinates and new address
    const locationData: LocationData = {
      address: newAddress,
      latitude: coordinates.lat,
      longitude: coordinates.lng
    };
    onLocationChange(locationData);
  };

  // Auto-detect location on component mount
  useEffect(() => {
    if (!initialLocation) {
      getCurrentLocation();
    }
  }, [initialLocation, getCurrentLocation]);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="location" className="block text-sm font-semibold text-slate-700 mb-2">
          <div className="flex items-center space-x-1">
            <MapPin className="w-4 h-4" />
            <span>Current Location</span>
          </div>
        </label>
        
        <div className="space-y-3">
          <input
            id="location"
            type="text"
            value={address}
            onChange={handleAddressChange}
            className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none text-lg"
            placeholder="Enter your location or use GPS..."
          />
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={isLoadingLocation}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300"
            >
              <div className="flex items-center justify-center space-x-2">
                {isLoadingLocation ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Navigation className="w-5 h-5" />
                )}
                <span>{isLoadingLocation ? 'Getting Location...' : 'Get Current Location'}</span>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => setIsMapVisible(!isMapVisible)}
              className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-slate-300"
            >
              <div className="flex items-center justify-center space-x-2">
                <Map className="w-5 h-5" />
                <span>{isMapVisible ? 'Hide Map' : 'Show Map & Adjust'}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {isMapVisible && (
        <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Adjust Your Location</h3>
              {isLoadingGeocode && (
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Getting address...</span>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-600 mt-1">Click anywhere on the map to set your exact location</p>
          </div>
          
          <div className="h-80 relative">
            <MapContainer
              center={[coordinates.lat, coordinates.lng]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[coordinates.lat, coordinates.lng]} />
              <MapClickHandler onLocationSelect={handleMapLocationSelect} />
            </MapContainer>
          </div>
          
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <div className="text-sm text-slate-600">
              <p className="font-semibold">Selected Coordinates:</p>
              <p>{coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};