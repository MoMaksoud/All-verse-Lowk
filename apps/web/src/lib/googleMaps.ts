// Google Maps Places API service
export interface GooglePlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

export interface GooglePlaceDetails {
  place_id: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  name: string;
}

class GoogleMapsService {
  private apiKey: string;
  private autocompleteService: any = null;
  private placesService: any = null;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    
    console.log('🗺️ Google Maps Service initialized');
    console.log('API Key present:', !!this.apiKey);
    console.log('API Key value:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'MISSING');
    
    if (typeof window !== 'undefined' && this.apiKey) {
      this.initializeServices();
    }
  }

  private initializeServices() {
    if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
      this.autocompleteService = new (window as any).google.maps.places.AutocompleteService();
      this.placesService = new (window as any).google.maps.places.PlacesService(
        document.createElement('div')
      );
    }
  }

  private loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Google Maps can only be loaded in browser'));
        return;
      }

      // Check if Google Maps is already loaded
      if ((window as any).google?.maps?.places) {
        this.initializeServices();
        resolve();
        return;
      }

      // Check if script is already being loaded
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        // Wait for the script to load
        const checkLoaded = () => {
          if ((window as any).google?.maps?.places) {
            this.initializeServices();
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
        return;
      }

      // Load the Google Maps script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        this.initializeServices();
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps script'));
      };
      
      document.head.appendChild(script);
    });
  }

  async getPlacePredictions(input: string): Promise<GooglePlacePrediction[]> {
    console.log('🔍 getPlacePredictions called with:', input);
    
    if (!input || input.length < 2) {
      console.log('❌ Input too short, returning empty array');
      return [];
    }

    if (!this.apiKey) {
      console.log('❌ No API key, returning empty array');
      return [];
    }

    try {
      await this.loadGoogleMapsScript();
      
      if (!this.autocompleteService) {
        throw new Error('Autocomplete service not initialized');
      }

      return new Promise((resolve, reject) => {
        this.autocompleteService!.getPlacePredictions(
          {
            input,
            types: ['geocode'], // Restrict to geographical locations
            componentRestrictions: { country: 'us' }, // Restrict to US
          },
          (predictions: any, status: any) => {
            if (status === (window as any).google?.maps?.places?.PlacesServiceStatus?.OK && predictions) {
              const formattedPredictions = predictions.map((prediction: any) => ({
                place_id: prediction.place_id,
                description: prediction.description,
                structured_formatting: {
                  main_text: prediction.structured_formatting.main_text,
                  secondary_text: prediction.structured_formatting.secondary_text,
                },
                types: prediction.types,
              }));
              resolve(formattedPredictions);
            } else {
              resolve([]);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error getting place predictions:', error);
      return [];
    }
  }

  async getPlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
    try {
      await this.loadGoogleMapsScript();
      
      if (!this.placesService) {
        throw new Error('Places service not initialized');
      }

      return new Promise((resolve, reject) => {
        this.placesService!.getDetails(
          {
            placeId,
            fields: ['place_id', 'formatted_address', 'geometry', 'address_components', 'name'],
          },
          (place: any, status: any) => {
            if (status === (window as any).google?.maps?.places?.PlacesServiceStatus?.OK && place) {
              resolve({
                place_id: place.place_id || '',
                formatted_address: place.formatted_address || '',
                geometry: {
                  location: {
                    lat: place.geometry?.location?.lat() || 0,
                    lng: place.geometry?.location?.lng() || 0,
                  },
                },
                address_components: place.address_components || [],
                name: place.name || '',
              });
            } else {
              resolve(null);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  // Helper method to format location from place details
  formatLocationFromPlaceDetails(placeDetails: GooglePlaceDetails): string {
    const components = placeDetails.address_components;
    let city = '';
    let state = '';
    let country = '';

    for (const component of components) {
      if (component.types.includes('locality')) {
        city = component.long_name;
      } else if (component.types.includes('administrative_area_level_1')) {
        state = component.short_name;
      } else if (component.types.includes('country')) {
        country = component.short_name;
      }
    }

    if (city && state) {
      return `${city}, ${state}`;
    } else if (city) {
      return city;
    } else {
      return placeDetails.formatted_address;
    }
  }
}

// Export singleton instance
export const googleMapsService = new GoogleMapsService();
