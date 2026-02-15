import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon issue with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
}

// Component to handle map clicks
function LocationMarker({ position, onLocationChange }: { 
  position: [number, number]; 
  onLocationChange: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onLocationChange(lat, lng);
    },
  });

  useEffect(() => {
    // Center map on position when it changes
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);

  return position ? <Marker position={position} /> : null;
}

export default function MapPicker({ latitude, longitude, onLocationChange }: MapPickerProps) {
  const [position, setPosition] = useState<[number, number]>([latitude, longitude]);

  useEffect(() => {
    setPosition([latitude, longitude]);
  }, [latitude, longitude]);

  const handleLocationChange = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onLocationChange(lat, lng);
  };

  return (
    <MapContainer
      center={position}
      zoom={16}
      style={{ height: '400px', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationMarker position={position} onLocationChange={handleLocationChange} />
    </MapContainer>
  );
}
