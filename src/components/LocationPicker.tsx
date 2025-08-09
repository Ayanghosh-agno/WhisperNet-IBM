import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { MapPin, Navigation, RefreshCw } from 'lucide-react';
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
    lat: 22.566688, // Default coordinates from screenshot
    lng: 87.862007
  });
  const [address, setAddress] = useState<string>(initialLocation || 'Bajepratappur, Bardhaman, Burdwan - I, Purba Bardhaman, West Bengal, 713');
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

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <MapPin className="w-5 h-5 text-gray-500" />
        <label className="text-sm font-medium text-gray-700">Your location</label>
      </div>
      
      <div className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={address}
            onChange={handleAddressChange}
            className="w-full p-4 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            placeholder="Enter your location..."
          />
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={isLoadingLocation}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Get current location"
          >
            {isLoadingLocation ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Navigation className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsMapVisible(!isMapVisible)}
            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <MapPin className="w-4 h-4" />
            <span>{isMapVisible ? 'Hide Map' : 'Show Map & Adjust Location'}</span>
          </button>
          <div className="text-sm text-gray-500">
            {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
          </div>
        </div>
      </div>

      {isMapVisible && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
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
          
          <div className="p-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>Tap anywhere on the map to update your location</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};