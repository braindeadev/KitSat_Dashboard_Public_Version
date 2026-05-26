import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

const DEFAULT_CENTER = [60.1695, 24.9354];

function MapEffects({ lat, lng }) {
  const map = useMap();
  React.useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(t);
  }, [map]);
  React.useEffect(() => {
    if (lat == null || lng == null) return;
    const c = map.getCenter();
    if (c.lat === lat && c.lng === lng) return;
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

const MapComponent = React.memo(({ lat, lng, route = [] }) => {
  const hasValidCoords = lat != null && lng != null;
  const initialCenter = useMemo(
    () => (hasValidCoords ? [lat, lng] : DEFAULT_CENTER),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const markerPosition = useMemo(() => [lat ?? 0, lng ?? 0], [lat, lng]);
  const showRoute = route.length >= 2;

  return (
    <div className="map-wrapper">
      <MapContainer
        center={initialCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
        />
        {showRoute && (
          <Polyline
            positions={route}
            pathOptions={{ color: '#fbbf24', weight: 3, opacity: 0.9 }}
          />
        )}
        {hasValidCoords && (
          <Marker position={markerPosition}>
            <Popup>
              KitSat Current Location <br />
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </Popup>
          </Marker>
        )}
        <MapEffects lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
});

export default MapComponent;
