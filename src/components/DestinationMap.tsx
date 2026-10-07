import React, { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface DestinationMapProps {
  latitude: number;
  longitude: number;
  onLocationChange: (latitude: number, longitude: number) => void;
}

const destinationIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width: 34px;
      height: 34px;
      background: #D96C45;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 10px;
        height: 10px;
        background: white;
        border-radius: 50%;
      "></div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 34]
});

const MapController: React.FC<{
  latitude: number;
  longitude: number;
}> = ({ latitude, longitude }) => {
  const map = useMap();

  useEffect(() => {
    map.setView([latitude, longitude], 16);
  }, [latitude, longitude, map]);

  return null;
};

const MapClickHandler: React.FC<{
  onLocationChange: (latitude: number, longitude: number) => void;
}> = ({ onLocationChange }) => {
  useMapEvents({
    click(event) {
      onLocationChange(
        event.latlng.lat,
        event.latlng.lng
      );
    }
  });

  return null;
};

export const DestinationMap: React.FC<DestinationMapProps> = ({
  latitude,
  longitude,
  onLocationChange
}) => {
  return (
    <div className="w-full h-[280px] rounded-xl overflow-hidden border border-[#E4DCC8] shadow-sm">
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController
          latitude={latitude}
          longitude={longitude}
        />

        <MapClickHandler
          onLocationChange={onLocationChange}
        />

        <Marker
          position={[latitude, longitude]}
          icon={destinationIcon}
        />
      </MapContainer>
    </div>
  );
};