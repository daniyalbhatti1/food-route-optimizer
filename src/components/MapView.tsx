'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapViewProps {
  center: [number, number];
  markers: Array<{
    id: string;
    lat: number;
    lng: number;
    title: string;
    color?: string;
  }>;
  route?: {
    geometry: any;
    legs: Array<{
      distanceMeters: number;
      durationSec: number;
      geometry: any;
    }>;
  };
  onMarkerClick?: (markerId: string) => void;
}

export default function MapView({ center, markers, route, onMarkerClick }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!mapboxToken) {
      console.error('Mapbox token not found');
      return;
    }

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: center,
      zoom: 12
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    // Wait for map to load before doing anything else
    map.current.on('load', () => {
      console.log('Map loaded successfully');
      console.log('Map container dimensions:', {
        width: mapContainer.current?.offsetWidth,
        height: mapContainer.current?.offsetHeight,
        clientWidth: mapContainer.current?.clientWidth,
        clientHeight: mapContainer.current?.clientHeight
      });
    });

    map.current.on('error', (e) => {
      console.error('Mapbox error:', e);
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [center]);

  // Update markers when markers prop changes
  useEffect(() => {
    if (!map.current) return;

    // Wait for map to be loaded before adding markers
    if (!map.current.isStyleLoaded()) {
      const handleStyleLoad = () => {
        updateMarkers();
      };
      map.current.on('style.load', handleStyleLoad);
      return () => {
        if (map.current) {
          map.current.off('style.load', handleStyleLoad);
        }
      };
    }

    updateMarkers();
  }, [markers, onMarkerClick]);

  const updateMarkers = () => {
    if (!map.current) return;

    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    markers.forEach((markerData, index) => {
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = markerData.color || '#3B82F6';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';

      // Add marker number
      const number = document.createElement('div');
      number.style.color = 'white';
      number.style.fontSize = '12px';
      number.style.fontWeight = 'bold';
      number.style.textAlign = 'center';
      number.style.lineHeight = '16px';
      number.textContent = (index + 1).toString();
      el.appendChild(number);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([markerData.lng, markerData.lat])
        .addTo(map.current!);

      if (onMarkerClick) {
        el.addEventListener('click', () => onMarkerClick(markerData.id));
      }

      markersRef.current.push(marker);
    });
  };

  // Update route when route prop changes
  useEffect(() => {
    if (!map.current || !route) return;

    // Wait for map to be loaded before adding sources
    if (!map.current.isStyleLoaded()) {
      const handleStyleLoad = () => {
        updateRoute();
      };
      map.current.on('style.load', handleStyleLoad);
      return () => {
        if (map.current) {
          map.current.off('style.load', handleStyleLoad);
        }
      };
    }

    updateRoute();
  }, [route]);

  const updateRoute = () => {
    if (!map.current || !route || !route.geometry) return;

    // Remove existing route layers
    if (map.current.getSource('route')) {
      map.current.removeLayer('route-line');
      map.current.removeSource('route');
    }

    // Check if geometry has coordinates
    if (!route.geometry.coordinates || !Array.isArray(route.geometry.coordinates) || route.geometry.coordinates.length === 0) {
      console.warn('Route geometry has no valid coordinates');
      return;
    }

    // Add route source and layer
    map.current.addSource('route', {
      type: 'geojson',
      data: route.geometry
    });

    map.current.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#3B82F6',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });

    // Fit map to route bounds
    if (route.geometry.coordinates.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      route.geometry.coordinates.forEach((coord: [number, number]) => {
        bounds.extend(coord);
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }
  };

  return (
    <div className="relative w-full h-[400px] rounded-lg overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Map controls overlay */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-2 z-10">
        <div className="text-sm font-medium text-gray-700">
          {markers.length} stops
        </div>
        {route && route.legs && Array.isArray(route.legs) && (
          <div className="text-xs text-gray-500">
            {route.legs.reduce((total, leg) => total + (leg.distanceMeters || 0), 0).toFixed(0)}m total
          </div>
        )}
      </div>
    </div>
  );
}
