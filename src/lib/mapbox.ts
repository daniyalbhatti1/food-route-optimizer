import { GeocodeResult, MatrixResult, RouteLeg } from './types';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function getMapboxToken(): string {
  if (!MAPBOX_TOKEN) {
    throw new Error('NEXT_PUBLIC_MAPBOX_TOKEN is required');
  }
  return MAPBOX_TOKEN;
}

// Geocode an address to get coordinates
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const encodedAddress = encodeURIComponent(address);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${getMapboxToken()}&limit=1`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      throw new Error(`No results found for address: ${address}`);
    }
    
    const feature = data.features[0];
    const [lng, lat] = feature.center;
    
    return {
      lat,
      lng,
      placeName: feature.place_name
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error(`Failed to geocode address: ${address}`);
  }
}

// Build a matrix of travel times and distances between points
export async function buildMatrix(points: Array<{ lat: number; lng: number }>): Promise<MatrixResult> {
  if (points.length > 25) {
    throw new Error('Matrix API supports maximum 25 points');
  }
  
  const coordinates = points.map(p => `${p.lng},${p.lat}`).join(';');
  const url = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving-traffic/${coordinates}?access_token=${getMapboxToken()}&annotations=duration,distance`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Matrix API failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      durations: data.durations,
      distances: data.distances
    };
  } catch (error) {
    console.error('Matrix API error:', error);
    throw new Error('Failed to build travel matrix');
  }
}

// Get directions between two points
export async function getDirections(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<RouteLeg> {
  const coordinates = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinates}?access_token=${getMapboxToken()}&geometries=geojson&overview=full`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Directions API failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found between points');
    }
    
    const route = data.routes[0];
    
    return {
      distanceMeters: route.distance,
      durationSec: route.duration,
      geometry: route.geometry
    };
  } catch (error) {
    console.error('Directions API error:', error);
    throw new Error('Failed to get directions');
  }
}

// Get directions for a sequence of points (optimized route)
export async function getRouteDirections(
  points: Array<{ lat: number; lng: number }>
): Promise<RouteLeg[]> {
  if (points.length < 2) {
    return [];
  }
  
  const coordinates = points.map(p => `${p.lng},${p.lat}`).join(';');
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinates}?access_token=${getMapboxToken()}&geometries=geojson&overview=full&steps=true`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Directions API failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found for sequence');
    }
    
    const route = data.routes[0];
    const legs: RouteLeg[] = [];
    
    // Use the full route geometry and split it into legs
    const fullCoordinates = route.geometry.coordinates;
    let currentIndex = 0;
    
    for (let i = 0; i < route.legs.length; i++) {
      const leg = route.legs[i];
      
      // Calculate how many coordinates this leg should have
      // This is an approximation - we'll use the leg's distance proportion
      const totalDistance = route.legs.reduce((sum, l) => sum + l.distance, 0);
      const legProportion = leg.distance / totalDistance;
      const legCoordinateCount = Math.max(2, Math.floor(fullCoordinates.length * legProportion));
      
      // Extract coordinates for this leg
      const endIndex = Math.min(currentIndex + legCoordinateCount, fullCoordinates.length);
      const legCoordinates = fullCoordinates.slice(currentIndex, endIndex);
      
      legs.push({
        distanceMeters: leg.distance,
        durationSec: leg.duration,
        geometry: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: legCoordinates
          }
        }
      });
      
      currentIndex = endIndex - 1; // Overlap by 1 to ensure continuity
    }
    
    return legs;
  } catch (error) {
    console.error('Route directions error:', error);
    // Fallback to individual leg calculations
    return await getIndividualLegs(points);
  }
}

// Fallback: get individual legs between consecutive points
async function getIndividualLegs(
  points: Array<{ lat: number; lng: number }>
): Promise<RouteLeg[]> {
  const legs: RouteLeg[] = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    try {
      const leg = await getDirections(points[i], points[i + 1]);
      legs.push(leg);
    } catch (error) {
      console.error(`Failed to get leg ${i} to ${i + 1}:`, error);
      // Add a fallback leg with estimated values
      legs.push({
        distanceMeters: 0,
        durationSec: 0,
        geometry: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [points[i].lng, points[i].lat],
              [points[i + 1].lng, points[i + 1].lat]
            ]
          }
        }
      });
    }
  }
  
  return legs;
}
