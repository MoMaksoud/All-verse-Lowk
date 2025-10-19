/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lng1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lng2 Longitude of second point
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get user's current location using geolocation API
 * @returns Promise with coordinates or null if denied/error
 */
export async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
}

/**
 * Geocode a location string to coordinates using a mock service
 * In production, you'd use Google Maps API, Mapbox, or similar
 * @param location Location string (e.g., "Tampa, FL" or "33620")
 * @returns Promise with coordinates or null if not found
 */
export async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  // Mock geocoding - in production, replace with real geocoding service
  const mockLocations: Record<string, { lat: number; lng: number }> = {
    'tampa': { lat: 27.9506, lng: -82.4572 },
    'tampa, fl': { lat: 27.9506, lng: -82.4572 },
    'miami': { lat: 25.7617, lng: -80.1918 },
    'miami, fl': { lat: 25.7617, lng: -80.1918 },
    'orlando': { lat: 28.5383, lng: -81.3792 },
    'orlando, fl': { lat: 28.5383, lng: -81.3792 },
    'jacksonville': { lat: 30.3322, lng: -81.6557 },
    'jacksonville, fl': { lat: 30.3322, lng: -81.6557 },
    '33620': { lat: 27.9506, lng: -82.4572 }, // Tampa ZIP
    '33101': { lat: 25.7617, lng: -80.1918 }, // Miami ZIP
    '32801': { lat: 28.5383, lng: -81.3792 }, // Orlando ZIP
  };

  const normalizedLocation = location.toLowerCase().trim();
  return mockLocations[normalizedLocation] || null;
}

/**
 * Format location for display
 * @param location Location object
 * @returns Formatted location string
 */
export function formatLocation(location?: { city: string; state: string; zipCode?: string }): string {
  if (!location) return '';
  
  const parts = [location.city, location.state];
  if (location.zipCode) {
    parts.push(location.zipCode);
  }
  
  return parts.join(', ');
}
/**
 * Check if a listing is within the specified distance from a location
 * @param listing Listing object with location
 * @param userLocation User's coordinates
 * @param maxDistance Maximum distance in miles
 * @returns True if within distance
 */
export function isWithinDistance(
  listing: { location?: { coordinates?: { lat: number; lng: number } } },
  userLocation: { lat: number; lng: number },
  maxDistance: number
): boolean {
  if (!listing.location?.coordinates) return false;
  
  const distance = calculateDistance(
    userLocation.lat,
    userLocation.lng,
    listing.location.coordinates.lat,
    listing.location.coordinates.lng
  );
  
  return distance <= maxDistance;
}

