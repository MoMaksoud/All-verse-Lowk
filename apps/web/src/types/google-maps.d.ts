// Google Maps TypeScript declarations
declare global {
  namespace google {
    namespace maps {
      namespace places {
        interface AutocompleteService {
          getPlacePredictions(
            request: {
              input: string;
              types?: string[];
              componentRestrictions?: { country: string };
            },
            callback: (
              predictions: Array<{
                place_id: string;
                description: string;
                structured_formatting: {
                  main_text: string;
                  secondary_text: string;
                };
                types: string[];
              }> | null,
              status: string
            ) => void
          ): void;
        }

        interface PlacesService {
          getDetails(
            request: {
              placeId: string;
              fields: string[];
            },
            callback: (
              place: {
                place_id?: string;
                formatted_address?: string;
                geometry?: {
                  location?: {
                    lat(): number;
                    lng(): number;
                  };
                };
                address_components?: Array<{
                  long_name: string;
                  short_name: string;
                  types: string[];
                }>;
                name?: string;
              } | null,
              status: string
            ) => void
          ): void;
        }

        const PlacesServiceStatus: {
          OK: string;
        };

        const AutocompleteService: new () => AutocompleteService;
        const PlacesService: new (element: HTMLElement) => PlacesService;
      }
    }
  }

  interface Window {
    google: typeof google;
  }
}

export {};
