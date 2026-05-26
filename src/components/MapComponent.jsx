import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component to update map view when coordinates change
function RecenterMap({ lat, lng }) {
  const map = useMap();
  React.useEffect(() => {
    if (lat && lng && lat !== 0 && lng !== 0) {
      map.setView([lat, lng], map.getZoom());
    }
  }, [lat, lng, map]);
  return null;
}

const MapComponent = React.memo(({ lat, lng }) => {
  const position = [lat || 0, lng || 0];
  const hasValidCoords = lat !== 0 && lng !== 0;

  return (
    <div className="map-wrapper">
      <MapContainer 
        center={position} 
        zoom={13} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
        />
        {hasValidCoords && (
          <Marker position={position}>
            <Popup>
              KitSat Current Location <br /> 
              {typeof lat === 'number' ? lat.toFixed(4) : 'N/A'}, 
              {typeof lng === 'number' ? lng.toFixed(4) : 'N/A'}
            </Popup>
          </Marker>
        )}
        <RecenterMap lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
});

export default MapComponent;
