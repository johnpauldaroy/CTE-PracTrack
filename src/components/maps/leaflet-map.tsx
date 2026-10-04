"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

// Loaded only through next/dynamic with ssr:false (see location-map.tsx) —
// Leaflet touches `window` at import time.

/** Provincial capitol, San Jose de Buenavista — the default view for Antique. */
export const ANTIQUE_CENTER: [number, number] = [10.7446, 121.9414];

export interface LeafletMapProps {
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  readOnly?: boolean;
  onPick?: (latitude: number, longitude: number) => void;
  className?: string;
}

// A CSS/SVG pin instead of Leaflet's default PNG marker, whose image paths
// break under bundlers and which wouldn't follow the app's theme colours.
const pinIcon = L.divIcon({
  className: "",
  iconSize: [32, 40],
  iconAnchor: [16, 38],
  html: `<svg width="32" height="40" viewBox="0 0 32 40" aria-hidden="true" style="filter: drop-shadow(0 2px 2px rgb(0 0 0 / 0.35))"><path d="M16 1C8.3 1 2 7.2 2 14.9 2 25.3 16 39 16 39s14-13.7 14-24.1C30 7.2 23.7 1 16 1z" style="fill: var(--secondary, #12213f)" stroke="white" stroke-width="2"/><circle cx="16" cy="15" r="5.5" style="fill: var(--primary, #e3a024)"/></svg>`,
});

function ClickToPick({ onPick }: { onPick: (latitude: number, longitude: number) => void }) {
  useMapEvents({ click: (event) => onPick(round(event.latlng.lat), round(event.latlng.lng)) });
  return null;
}

/**
 * Brings the point into view when it changes: pans if it's off-screen (set by
 * search, GPS, or typed coordinates) and zooms in from a province-level view so
 * the geofence circle is visible and the pin can be fine-tuned by dragging.
 */
function KeepInView({ point }: { point: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!point) return;
    if (map.getZoom() < 13 || !map.getBounds().pad(-0.15).contains(point)) {
      map.setView(point, Math.max(map.getZoom(), 17), { animate: true });
    }
  }, [map, point]);
  return null;
}

function round(value: number) {
  return Math.round(value * 10_000_000) / 10_000_000; // matches the Decimal(10, 7) columns
}

export default function LeafletMap({ latitude, longitude, radiusMeters, readOnly = false, onPick, className }: LeafletMapProps) {
  const point = useMemo<[number, number] | null>(
    () => (latitude !== null && longitude !== null ? [latitude, longitude] : null),
    [latitude, longitude],
  );

  return (
    <MapContainer
      center={point ?? ANTIQUE_CENTER}
      zoom={point ? 17 : 10}
      scrollWheelZoom={!readOnly}
      dragging
      className={className}
      style={{ zIndex: 0 }}
      attributionControl
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      {point && (
        <>
          <Circle
            center={point}
            radius={radiusMeters}
            pathOptions={{ color: "#e3a024", weight: 2, fillColor: "#e3a024", fillOpacity: 0.18 }}
          />
          <Marker
            position={point}
            icon={pinIcon}
            draggable={!readOnly}
            keyboard={!readOnly}
            title={readOnly ? "School location" : "Drag to adjust the school location"}
            eventHandlers={
              readOnly || !onPick
                ? undefined
                : {
                    dragend: (event) => {
                      const { lat, lng } = (event.target as L.Marker).getLatLng();
                      onPick(round(lat), round(lng));
                    },
                  }
            }
          />
        </>
      )}
      {!readOnly && onPick && <ClickToPick onPick={onPick} />}
      <KeepInView point={point} />
    </MapContainer>
  );
}
